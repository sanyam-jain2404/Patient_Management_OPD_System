import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import TokenCounter from "../models/TokenCounter.js";
import User from "../models/User.js";
import mongoose from "mongoose";

/**
 * allocationService
 * ----------------
 * Implements the "smart doctor allocation" algorithm described in the spec.
 *
 * For a given department/category:
 *   1. Fetch all VERIFIED doctors in that department who are AVAILABLE.
 *   2. Count ACTIVE workload per doctor.
 *   3. Exclude Completed / Cancelled / No Show appointments.
 *   4. Assign to the doctor with the LOWEST workload.
 *   5. Tie-break by estimated waiting time.
 *   6. Race-safe token generation using MongoDB transactions.
 *
 * Active workload = count of appointments whose status is one of:
 *   Booked, Waiting, In Consultation
 * for the SAME day. We count today's active appointments.
 */

const ACTIVE_STATUSES = ["Booked", "Waiting", "In Consultation"];

/**
 * Count a doctor's active workload for a given date.
 * @param {string} doctorId
 * @param {string} date YYYY-MM-DD
 */
export async function countActiveWorkload(doctorId, date) {
    return Appointment.countDocuments({
        doctorId,
        appointmentDate: date,
        status: { $in: ACTIVE_STATUSES }
    });
}

/**
 * Estimate waiting time (minutes) for a doctor on a given date.
 * Formula: patientsAhead × avgConsultationMinutes
 * We subtract the currently-running consultation's elapsed time.
 */
export async function estimateWaitingTime(doctorId, date, avgMinutes) {
    const running = await Appointment.findOne({
        doctorId,
        appointmentDate: date,
        status: "In Consultation"
    }).sort({ consultationStartedAt: 1 });

    const query = {
        doctorId,
        appointmentDate: date,
        status: { $in: ACTIVE_STATUSES }
    };

    if (running) {
        const patientsAhead = await Appointment.countDocuments({
            ...query,
            tokenNumber: { $gt: running.tokenNumber }
        });
        const elapsed = (Date.now() - running.consultationStartedAt.getTime()) / 60000;
        const remaining = Math.max(avgMinutes - elapsed, 0);
        return Math.round(patientsAhead * avgMinutes + remaining);
    }

    const patientsAhead = await Appointment.countDocuments(query);
    return Math.round(patientsAhead * avgMinutes);
}

/**
 * Fetch all verified, available doctors for a department, with their
 * user details populated. Internal helper.
 */
async function getAvailableDoctors(departmentId) {
    const verifiedUsers = await User.find({
        role: "doctor",
        isVerified: true
    }).select("_id");

    const verifiedUserIds = verifiedUsers.map(user => user._id);

    // Try to find doctors explicitly assigned to this department
    let doctors = await Doctor.find({
        departmentId,
        userId: { $in: verifiedUserIds },
        isAvailable: true
    })
        .populate({
            path: "userId",
            select: "name email"
        });

    // FALLBACK: If no doctors found by departmentId, match by specialization name
    // This handles cases where doctors registered without selecting a department
    if (doctors.length === 0) {
        const Department = (await import("../models/Department.js")).default;
        const department = await Department.findById(departmentId);

        if (department) {
            const baseName = department.name.replace(/s$/, "").trim(); // handle Orthopedics vs Orthopedic
            doctors = await Doctor.find({
                specialization: { $regex: new RegExp("^" + baseName, "i") },
                userId: { $in: verifiedUserIds },
                isAvailable: true
            }).populate({
                path: "userId",
                select: "name email"
            });

            // Auto-heal missing departmentId for these doctors
            for (const doc of doctors) {
                if (!doc.departmentId) {
                    doc.departmentId = departmentId;
                    await doc.save();
                }
            }
        }
    }

    return doctors.sort((a, b) => (a.specialization || "").localeCompare(b.specialization || ""));
}

/**
 * Find the best doctor for a department/category.
 * Returns { doctor, workload, estimatedWaitMinutes, doctorName } or null if none available.
 */
export async function findBestDoctor(departmentId, date) {
    const doctors = await getAvailableDoctors(departmentId);
    if (doctors.length === 0) return null;

    const candidates = await Promise.all(
        doctors.map(async (d) => {
            const workload = await countActiveWorkload(d._id, date);
            const avgMinutes = d.avgConsultationMinutes || d.consultationDuration || 10;
            const wait = await estimateWaitingTime(d._id, date, avgMinutes);
            return {
                doctor: d,
                doctorName: d.userId?.name || d.specialization,
                workload,
                estimatedWaitMinutes: wait
            };
        })
    );

    // Sort: lowest workload first, then lowest estimated wait as tie-breaker
    candidates.sort((a, b) => {
        if (a.workload !== b.workload) return a.workload - b.workload;
        return a.estimatedWaitMinutes - b.estimatedWaitMinutes;
    });

    return candidates[0];
}

/**
 * Allocate a token + assign doctor for a new appointment.
 * Uses a MongoDB transaction so token generation is race-safe.
 *
 * @param {Object} data
 * @param {string} data.patientId
 * @param {string} data.departmentId
 * @param {string} data.date YYYY-MM-DD
 * @param {string} data.time HH:MM
 * @param {string} data.symptoms
 * @param {string} data.reason
 * @param {string} data.priority Normal | Emergency
 */
export async function allocateAppointment(data) {
    const { patientId, departmentId, date, time, symptoms, reason, priority } = data;

    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        // 1. Find best doctor
        const best = await findBestDoctor(departmentId, date);
        if (!best) {
            await session.abortTransaction();
            return {
                success: false,
                message: "No available doctor found for this department right now."
            };
        }

        const doctor = best.doctor;

        // 2. Generate next token atomically
        const counter = await TokenCounter.findOneAndUpdate(
            { doctorId: doctor._id, date },
            { $inc: { lastToken: 1 } },
            { new: true, upsert: true, session }
        );

        const tokenNumber = counter.lastToken;

        // 3. Create appointment
        const [appointment] = await Appointment.create(
            [{
                patientId,
                doctorId: doctor._id,
                departmentId,
                tokenNumber,
                appointmentDate: date,
                appointmentTime: time,
                status: "Booked",
                priority: priority || "Normal",
                symptoms: symptoms || "",
                reason: reason || "",
                estimatedWaitMinutes: best.estimatedWaitMinutes
            }],
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        return {
            success: true,
            appointment,
            doctor: {
                _id: doctor._id,
                name: best.doctorName,
                specialization: doctor.specialization
            },
            tokenNumber,
            estimatedWaitMinutes: best.estimatedWaitMinutes,
            workload: best.workload
        };
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
    }
}

export default { allocateAppointment, findBestDoctor, countActiveWorkload, estimateWaitingTime };