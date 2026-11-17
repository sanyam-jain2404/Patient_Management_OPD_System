import mongoose from "mongoose";

import Appointment from "../models/Appointment.js";
import Department from "../models/Department.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import FollowUp from "../models/FollowUp.js";
import Consultation from "../models/Consultation.js";

import { allocateAppointment } from "../services/allocationService.js";
import { recalculateDoctorQueue } from "../services/queueService.js";

import { getTodayIST, isValidDate, isValidTime } from "../utils/dateUtils.js";
import { ok, created, badRequest, forbidden, notFound, conflict, serverError } from "../utils/respond.js";


/* =====================================================
   1. BOOK APPOINTMENT
   POST /api/appointments
   ===================================================== */

export const bookAppointment = async (req, res) => {
    try {
        const {
            departmentId,
            date,
            time,
            symptoms,
            reason,
            priority,
            patientId: targetPatientId,
            followUpId
        } = req.body;

        if (!["patient", "admin"].includes(req.user.role)) {
            return forbidden(res, "You are not authorized to book appointments.");
        }

        if (!departmentId || !date || !time) {
            return badRequest(res, "Department, appointment date, and time are required.");
        }

        if (
            !mongoose.isValidObjectId(departmentId) ||
            (targetPatientId && !mongoose.isValidObjectId(targetPatientId))
        ) {
            return badRequest(res, "Invalid department or patient ID.");
        }

        if (!isValidDate(date)) {
            return badRequest(res, "Invalid appointment date.");
        }

        if (!isValidTime(time)) {
            return badRequest(res, "Invalid appointment time.");
        }

        const department = await Department.findById(departmentId);

        if (!department || !department.isActive) {
            return notFound(res, "Department not found or inactive.");
        }

        let patientId;

        if (req.user.role === "patient") {
            const patient = await Patient.findOne({ userId: req.user._id });

            if (!patient) return notFound(res, "Patient profile not found.");

            patientId = patient._id;
        } else {
            if (!targetPatientId) {
                return badRequest(res, "Patient ID is required for admin booking.");
            }

            const patient = await Patient.findById(targetPatientId);

            if (!patient) return notFound(res, "Patient not found.");

            patientId = patient._id;
        }

        let followUp = null;
        let followUpOf = null;
        let preferredDoctorId = null;

        if (followUpId) {
            if (!mongoose.isValidObjectId(followUpId)) {
                return badRequest(res, "Invalid follow-up ID.");
            }

            followUp = await FollowUp.findById(followUpId);

            if (!followUp) return notFound(res, "Follow-up record not found.");

            if (followUp.patientId.toString() !== patientId.toString()) {
                return forbidden(res, "This follow-up does not belong to this patient.");
            }

            if (
                followUp.appointmentId ||
                !["Pending", "Reminder Sent"].includes(followUp.status)
            ) {
                return conflict(res, "This follow-up has already been booked or cannot be booked.");
            }

            const consultation = await Consultation.findById(followUp.consultationId);

            if (!consultation) return notFound(res, "Original consultation not found.");

            if (consultation.patientId.toString() !== patientId.toString()) {
                return forbidden(res, "Consultation does not belong to this patient.");
            }

            followUpOf = consultation.appointmentId;
            preferredDoctorId = followUp.doctorId;

            if (!followUpOf) {
                return badRequest(res, "Original appointment reference not found.");
            }

            if (consultation.departmentId.toString() !== departmentId.toString()) {
                return badRequest(res, "Please select the original consultation department.");
            }

            const existingAppointment = await Appointment.findOne({ followUpId: followUp._id });

            if (existingAppointment) {
                return conflict(res, "An appointment has already been booked for this follow-up.");
            }
        }

        const result = await allocateAppointment({
            patientId,
            departmentId,
            date,
            time,
            symptoms,
            reason,
            priority,
            followUpOf,
            followUpId: followUp?._id || null,
            preferredDoctorId
        });

        if (!result.success) {
            return badRequest(res, result.message);
        }

        if (followUp) {
            const updatedFollowUp = await FollowUp.findOneAndUpdate(
                {
                    _id: followUp._id,
                    status: { $in: ["Pending", "Reminder Sent"] },
                    appointmentId: null
                },
                {
                    $set: {
                        appointmentId: result.appointment._id,
                        status: "Appointment Booked"
                    }
                },
                { new: true }
            );

            if (!updatedFollowUp) {
                await Appointment.deleteOne({ _id: result.appointment._id });
                return conflict(res, "This follow-up has already been booked.");
            }
        }

        return created(res, {
            message: followUp
                ? "Follow-up appointment booked successfully!"
                : `Appointment booked successfully! Assigned to Dr. ${result.doctor.name} (Token #${result.tokenNumber})`,
            data: {
                appointment: result.appointment,
                assignedDoctor: result.doctor,
                tokenNumber: result.tokenNumber,
                estimatedWaitMinutes: result.estimatedWaitMinutes,
                isFollowUp: Boolean(followUp)
            }
        });

    } catch (error) {
        console.error("Appointment booking error:", error);

        if (error.code === 11000) {
            return conflict(res, "This follow-up appointment has already been booked.");
        }

        return serverError(res, "Unable to book appointment: " + error.message);
    }
};


/* =====================================================
   2. GET APPOINTMENTS
   GET /api/appointments
   ===================================================== */

export const getAppointments = async (req, res) => {
    try {
        let query = {};

        const {
            date,
            status,
            departmentId,
            page: pageParam,
            limit: limitParam
        } = req.query;

        const hasPagination = pageParam !== undefined || limitParam !== undefined;
        const page = pageParam === undefined ? 1 : Number.parseInt(pageParam, 10);
        const limit = limitParam === undefined ? 10 : Number.parseInt(limitParam, 10);

        if (
            (hasPagination && (!Number.isInteger(page) || page < 1)) ||
            (hasPagination && (!Number.isInteger(limit) || limit < 1 || limit > 100))
        ) {
            return badRequest(res, "Page must be at least 1 and limit must be between 1 and 100");
        }

        if (date) query.appointmentDate = date;
        if (status) query.status = status;
        if (departmentId) query.departmentId = departmentId;

        if (req.user.role === "patient") {
            const patient = await Patient.findOne({ userId: req.user._id });

            if (!patient) return ok(res, { count: 0, data: [] });

            query.patientId = patient._id;

        } else if (req.user.role === "doctor") {
            const doctor = await Doctor.findOne({ userId: req.user._id });

            if (!doctor) return ok(res, { count: 0, data: [] });

            query.doctorId = doctor._id;

        } else if (req.user.role !== "admin") {
            return forbidden(res, "Access denied.");
        }

        const total = await Appointment.countDocuments(query);
        const appointmentQuery = Appointment.find(query)
            .populate("patientId", "name age gender phone blood")
            .populate({
                path: "doctorId",
                populate: { path: "userId", select: "name email" }
            })
            .populate("departmentId", "name")
            .sort({ appointmentDate: 1, tokenNumber: 1 });

        if (hasPagination) {
            appointmentQuery.skip((page - 1) * limit).limit(limit);
        }

        const appointments = await appointmentQuery;

        return ok(res, {
            count: total,
            total,
            currentPage: hasPagination ? page : 1,
            limit: hasPagination ? limit : total,
            totalPages: hasPagination ? Math.ceil(total / limit) : 1,
            data: appointments
        });

    } catch (error) {
        console.error("Fetch appointments error:", error.message);
        return serverError(res, "Unable to fetch appointments.");
    }
};


/* =====================================================
   3. CALL NEXT PATIENT
   POST /api/appointments/call-next
   ===================================================== */

export const callNextPatient = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const date = req.body.date || getTodayIST();

        if (!isValidDate(date)) {
            return badRequest(res, "Invalid appointment date.");
        }

        const today = getTodayIST();

        if (date > today) {
            return forbidden(res, "You cannot start consultations for future appointments.");
        }

        let result = null;
        let calledDoctorId;
        let calledAppointmentDate;

        await session.withTransaction(async () => {

            const doctor = await Doctor.findOne({ userId: req.user._id }).session(session);

            if (!doctor) {
                result = { status: 404, body: { success: false, message: "Doctor profile not found." } };
                return;
            }

            const activeAppointment = await Appointment.findOne({
                doctorId: doctor._id,
                appointmentDate: date,
                status: "In Consultation"
            }).session(session);

            if (activeAppointment) {
                result = {
                    status: 409,
                    body: { success: false, message: "A consultation is already in progress.", data: activeAppointment }
                };
                return;
            }

            const nextAppointment = await Appointment.findOne({
                doctorId: doctor._id,
                appointmentDate: date,
                status: { $in: ["Booked", "Waiting"] }
            })
                .sort({ priority: 1, tokenNumber: 1, bookedAt: 1 })
                .session(session);

            if (!nextAppointment) {
                result = { status: 404, body: { success: false, message: "No patients are waiting in your queue." } };
                return;
            }

            const updatedAppointment = await Appointment.findOneAndUpdate(
                {
                    _id: nextAppointment._id,
                    doctorId: doctor._id,
                    status: { $in: ["Booked", "Waiting"] }
                },
                { $set: { status: "In Consultation", consultationStartedAt: new Date() } },
                { new: true, session }
            );

            if (!updatedAppointment) {
                throw new Error("Patient queue changed. Please try again.");
            }

            calledDoctorId = doctor._id;
            calledAppointmentDate = date;

            result = {
                status: 200,
                body: { success: true, message: "Next patient called successfully.", data: updatedAppointment }
            };
        });

        if (result?.status === 200) {
            try {
                await recalculateDoctorQueue(calledDoctorId, calledAppointmentDate);
            } catch (queueError) {
                console.error("Queue recalculation failed:", queueError.message);
            }
        }

        return res.status(result.status).json(result.body);

    } catch (error) {
        console.error("Call next patient error:", error);
        return serverError(res, "Unable to call next patient.");
    } finally {
        await session.endSession();
    }
};


/* =====================================================
   4. UPDATE APPOINTMENT STATUS
   PATCH /api/appointments/:id/status
   ===================================================== */

export const updateAppointmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, cancelReason } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return badRequest(res, "Invalid appointment ID.");
        }

        const appointment = await Appointment.findById(id);

        if (!appointment) return notFound(res, "Appointment not found.");

        if (req.user.role === "patient") {
            if (status !== "Cancelled") {
                return forbidden(res, "Patients can only cancel appointments.");
            }

            const patient = await Patient.findOne({ userId: req.user._id });

            if (!patient || appointment.patientId.toString() !== patient._id.toString()) {
                return forbidden(res, "You cannot cancel another patient's appointment.");
            }
        }

        if (req.user.role === "doctor") {
            const doctor = await Doctor.findOne({ userId: req.user._id });

            if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
                return forbidden(res, "You are not authorized to update this appointment.");
            }
        }

        const currentStatus = appointment.status;

        if (status === "Cancelled") {
            if (!["Booked", "Waiting"].includes(currentStatus)) {
                return conflict(res, `Cannot cancel an appointment with status ${currentStatus}.`);
            }

            appointment.status = "Cancelled";
            appointment.cancelledAt = new Date();
            appointment.cancelReason =
                cancelReason?.trim() ||
                (req.user.role === "patient" ? "Cancelled by patient" : "Cancelled by staff/doctor");

        } else if (status === "Waiting" && req.user.role !== "patient" && currentStatus === "Booked") {
            appointment.status = "Waiting";

        } else if (
            status === "No Show" &&
            req.user.role !== "patient" &&
            ["Booked", "Waiting"].includes(currentStatus)
        ) {
            appointment.status = "No Show";
            appointment.noShowMarkedAt = new Date();

        } else {
            return conflict(res, `Invalid status transition from ${currentStatus} to ${status}.`);
        }

        if (appointment.followUpId) {
            appointment.followUpId = null;
        }

        await appointment.save();

        if (appointment.followUpOf && appointment.status === "Cancelled") {
            await FollowUp.findOneAndUpdate(
                { appointmentId: appointment._id, status: "Appointment Booked" },
                { $set: { status: "Pending" }, $unset: { appointmentId: 1 } }
            );
        }

        try {
            await recalculateDoctorQueue(appointment.doctorId, appointment.appointmentDate);
        } catch (queueError) {
            console.error("Queue recalculation failed:", queueError.message);
        }

        return ok(res, {
            message: `Appointment ${status.toLowerCase()} successfully.`,
            data: appointment
        });

    } catch (error) {
        console.error("Update appointment status error:", error);
        return serverError(res, "Unable to update appointment status.");
    }
};


/* =====================================================
   5. GET QUEUE
   GET /api/appointments/queue?date=YYYY-MM-DD
   ===================================================== */

export const getQueue = async (req, res) => {
    try {
        const { date, doctorId } = req.query;

        const queueDate = date || getTodayIST();

        if (!isValidDate(queueDate)) {
            return badRequest(res, "Invalid date. Use YYYY-MM-DD.");
        }

        const query = {
            appointmentDate: queueDate,
            status: { $in: ["Booked", "Waiting", "In Consultation"] }
        };

        if (req.user.role === "doctor") {
            const doctor = await Doctor.findOne({ userId: req.user._id });

            if (!doctor) return notFound(res, "Doctor profile not found.");

            query.doctorId = doctor._id;

        } else if (req.user.role === "admin") {
            if (doctorId) {
                if (!mongoose.isValidObjectId(doctorId)) {
                    return badRequest(res, "Invalid doctor ID.");
                }
                query.doctorId = doctorId;
            }

        } else if (req.user.role === "patient") {
            const patient = await Patient.findOne({ userId: req.user._id });

            if (!patient) return res.json({ success: true, count: 0, data: [] });

            query.patientId = patient._id;

        } else {
            return forbidden(res, "Access denied.");
        }

        const appointments = await Appointment.find(
            req.user.role === "patient"
                ? {
                    appointmentDate: queueDate,
                    status: { $in: ["Booked", "Waiting", "In Consultation"] },
                    doctorId: { $in: await Appointment.distinct("doctorId", query) }
                }
                : query
        )
            .populate("patientId", "name")
            .populate({
                path: "doctorId",
                populate: { path: "userId", select: "name" }
            })
            .lean();

        const groups = new Map();

        for (const appointment of appointments) {
            const id = String(appointment.doctorId?._id);
            if (!groups.has(id)) groups.set(id, []);
            groups.get(id).push(appointment);
        }

        const queueResults = [];

        for (const [id, items] of groups) {
            const doctor = await Doctor.findById(id).lean();
            const avgMinutes = doctor?.avgConsultationMinutes || doctor?.consultationDuration || 10;

            items.sort((a, b) => {
                if (a.status === "In Consultation") return -1;
                if (b.status === "In Consultation") return 1;
                if (a.priority !== b.priority) return a.priority === "Emergency" ? -1 : 1;
                return a.tokenNumber - b.tokenNumber;
            });

            const running = items.find(item => item.status === "In Consultation");
            let remainingMinutes = 0;

            if (running) {
                const elapsed = running.consultationStartedAt
                    ? (Date.now() - new Date(running.consultationStartedAt).getTime()) / 60000
                    : 0;
                remainingMinutes = Math.max(0, avgMinutes - elapsed);
            }

            let waitingAhead = 0;

            for (const appointment of items) {
                const inConsultation = appointment.status === "In Consultation";
                const estimatedWaitMinutes = inConsultation
                    ? 0
                    : Math.round(remainingMinutes + waitingAhead * avgMinutes);

                queueResults.push({
                    appointmentId: appointment._id,
                    doctorId: id,
                    doctorName: appointment.doctorId?.userId?.name || "Unknown Doctor",
                    patientId: appointment.patientId?._id,
                    patientName: appointment.patientId?.name || "Unknown Patient",
                    tokenNumber: appointment.tokenNumber,
                    priority: appointment.priority,
                    status: appointment.status,
                    appointmentTime: appointment.appointmentTime,
                    queuePosition: inConsultation ? 0 : waitingAhead + 1,
                    estimatedWaitMinutes
                });

                if (!inConsultation) waitingAhead++;
            }
        }

        const data = req.user.role === "patient"
            ? queueResults.filter(item => String(item.patientId) === String(query.patientId))
            : queueResults;

        return res.status(200).json({ success: true, date: queueDate, count: data.length, data });

    } catch (error) {
        console.error("Queue error:", error);
        return serverError(res, "Unable to fetch waiting queue.");
    }
};
