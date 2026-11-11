
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import TokenCounter from "../models/TokenCounter.js";
import User from "../models/User.js";
import mongoose from "mongoose";

const ACTIVE_STATUSES = ["Booked", "Waiting", "In Consultation"];

/*
 * 1. Count active appointments of a doctor.
 */
export async function countActiveWorkload(doctorId, date) {
    return Appointment.countDocuments({
        doctorId,
        appointmentDate: date,
        status: { $in: ACTIVE_STATUSES }
    });
}

/*
 * 2. Calculate estimated waiting time.
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

        const elapsed = running.consultationStartedAt
            ? (Date.now() - running.consultationStartedAt.getTime()) / 60000
            : 0;

        const remaining = Math.max(avgMinutes - elapsed, 0);

        return Math.round(
            patientsAhead * avgMinutes + remaining
        );
    }

    const patientsAhead = await Appointment.countDocuments(query);

    return Math.round(patientsAhead * avgMinutes);
}

/*
 * 3. Check doctor availability at selected date and time.
 */
export function isDoctorAvailableAt(doctor, date, time) {
    if (!doctor.isAvailable) return false;

    // Existing doctors without a configured schedule remain compatible.
    if (
        !Array.isArray(doctor.weeklySchedule) ||
        doctor.weeklySchedule.length === 0
    ) {
        return true;
    }

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date || "") ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(time || "")
    ) {
        return false;
    }

    const dayOfWeek = new Date(
        `${date}T00:00:00.000Z`
    ).getUTCDay();

    const exception = (doctor.availabilityExceptions || [])
        .find(item => item.date === date);

    let hours;

    if (exception) {
        if (!exception.isAvailable) return false;

        hours = {
            startTime: exception.startTime,
            endTime: exception.endTime
        };
    } else {
        hours = doctor.weeklySchedule.find(
            item => item.dayOfWeek === dayOfWeek
        );

        if (!hours || !hours.isWorking) return false;
    }

    if (
        !hours.startTime ||
        !hours.endTime ||
        time < hours.startTime ||
        time >= hours.endTime
    ) {
        return false;
    }

    // Break time applies to weekly schedules.
    if (
        !exception &&
        hours.breakStart &&
        hours.breakEnd &&
        time >= hours.breakStart &&
        time < hours.breakEnd
    ) {
        return false;
    }

    return true;
}

/*
 * 4. Fetch verified and available doctors.
 */
async function getAvailableDoctors(departmentId, date, time) {
    const verifiedUsers = await User.find({
        role: "doctor",
        isVerified: true
    }).select("_id");

    const verifiedUserIds = verifiedUsers.map(
        user => user._id
    );

    let doctors = await Doctor.find({
        departmentId,
        userId: { $in: verifiedUserIds },
        isAvailable: true
    }).populate({
        path: "userId",
        select: "name email"
    });

    // Fallback: match doctors by specialization.
    if (doctors.length === 0) {
        const Department = (
            await import("../models/Department.js")
        ).default;

        const department = await Department.findById(departmentId);

        if (department) {
            const baseName = department.name
                .replace(/s$/, "")
                .trim();

            doctors = await Doctor.find({
                specialization: {
                    $regex: new RegExp("^" + baseName, "i")
                },
                userId: { $in: verifiedUserIds },
                isAvailable: true
            }).populate({
                path: "userId",
                select: "name email"
            });

            // Auto-heal missing departmentId.
            for (const doc of doctors) {
                if (!doc.departmentId) {
                    doc.departmentId = departmentId;
                    await doc.save();
                }
            }
        }
    }

    if (date && time) {
        doctors = doctors.filter(
            doctor => isDoctorAvailableAt(doctor, date, time)
        );
    }

    return doctors.sort((a, b) =>
        (a.specialization || "").localeCompare(
            b.specialization || ""
        )
    );
}

/*
 * 5. Find best doctor.
 *
 * Normal appointment:
 * Lowest workload doctor.
 *
 * Follow-up appointment:
 * Only the original doctor.
 */
export async function findBestDoctor(
    departmentId,
    date,
    time,
    preferredDoctorId = null
) {
    let doctors = await getAvailableDoctors(
        departmentId,
        date,
        time
    );

    if (preferredDoctorId) {
        doctors = doctors.filter(
            doctor =>
                doctor._id.toString() ===
                preferredDoctorId.toString()
        );
    }

    if (doctors.length === 0) return null;

    const candidates = await Promise.all(
        doctors.map(async doctor => {
            const workload = await countActiveWorkload(
                doctor._id,
                date
            );

            const avgMinutes =
                doctor.avgConsultationMinutes ||
                doctor.consultationDuration ||
                10;

            const wait = await estimateWaitingTime(
                doctor._id,
                date,
                avgMinutes
            );

            return {
                doctor,
                doctorName:
                    doctor.userId?.name ||
                    doctor.specialization,
                workload,
                estimatedWaitMinutes: wait
            };
        })
    );

    candidates.sort((a, b) => {
        if (a.workload !== b.workload) {
            return a.workload - b.workload;
        }

        return (
            a.estimatedWaitMinutes -
            b.estimatedWaitMinutes
        );
    });

    return candidates[0];
}

/*
 * 6. Allocate appointment and generate token.
 *
 * Normal appointment:
 * Smart doctor allocation.
 *
 * Follow-up appointment:
 * Original doctor allocation.
 *
 * Token generation:
 * MongoDB transaction.
 */
export async function allocateAppointment(data) {
    const {
        patientId,
        departmentId,
        date,
        time,
        symptoms,
        reason,
        followUpOf,
        followUpId,
        preferredDoctorId,
        priority
    } = data;

    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // Find the best available doctor.
        const best = await findBestDoctor(
            departmentId,
            date,
            time,
            preferredDoctorId
        );

        if (!best) {
            await session.abortTransaction();

            return {
                success: false,
                message: preferredDoctorId
                    ? "Your original doctor is not available at the selected date and time. Please choose another time."
                    : "No doctor is available for this department at the selected date and time."
            };
        }

        const doctor = best.doctor;

        // Generate token atomically.
        const counter = await TokenCounter.findOneAndUpdate(
            {
                doctorId: doctor._id,
                date
            },
            {
                $inc: { lastToken: 1 }
            },
            {
                new: true,
                upsert: true,
                session
            }
        );

        const tokenNumber = counter.lastToken;

        // Create appointment.
        const [appointment] = await Appointment.create(
            [
                {
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
                    estimatedWaitMinutes:
                        best.estimatedWaitMinutes,

                    ...(followUpOf
                        ? { followUpOf }
                        : {}),

                    ...(followUpId
                        ? { followUpId }
                        : {})
                }
            ],
            { session }
        );

        await session.commitTransaction();

        return {
            success: true,
            appointment,
            doctor: {
                _id: doctor._id,
                name: best.doctorName,
                specialization: doctor.specialization
            },
            tokenNumber,
            estimatedWaitMinutes:
                best.estimatedWaitMinutes,
            workload: best.workload
        };

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        throw error;

    } finally {
        await session.endSession();
    }
}

export default {
    allocateAppointment,
    findBestDoctor,
    countActiveWorkload,
    estimateWaitingTime
};
