
import express from "express";
import mongoose from "mongoose";

import Appointment from "../models/Appointment.js";
import Department from "../models/Department.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import FollowUp from "../models/FollowUp.js";
import Consultation from "../models/Consultation.js";

import { allocateAppointment } from "../services/allocationService.js";
import { recalculateDoctorQueue } from "../services/queueService.js";

import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = express.Router();


/* =====================================================
   1. BOOK APPOINTMENT
   POST /api/appointments

   Patient: Books own appointment
   Admin: Books appointment for a patient

   Supports:
   - Normal appointment
   - Follow-up appointment
   ===================================================== */

router.post("/", protect, async (req, res) => {
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
            return res.status(403).json({
                success: false,
                message: "You are not authorized to book appointments."
            });
        }

        if (!departmentId || !date || !time) {
            return res.status(400).json({
                success: false,
                message: "Department, appointment date, and time are required."
            });
        }

        if (
            !mongoose.isValidObjectId(departmentId) ||
            (targetPatientId &&
                !mongoose.isValidObjectId(targetPatientId))
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid department or patient ID."
            });
        }

        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            new Date(`${date}T00:00:00.000Z`)
                .toISOString()
                .slice(0, 10) !== date
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment date."
            });
        }
        // Prevent doctors from calling patients for future dates


        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment time."
            });
        }

        const department = await Department.findById(departmentId);

        if (!department || !department.isActive) {
            return res.status(404).json({
                success: false,
                message: "Department not found or inactive."
            });
        }

        let patientId;

        // Patient booking for themselves
        if (req.user.role === "patient") {
            const patient = await Patient.findOne({
                userId: req.user._id
            });

            if (!patient) {
                return res.status(404).json({
                    success: false,
                    message: "Patient profile not found."
                });
            }

            patientId = patient._id;
        }

        // Admin booking for another patient
        else {
            if (!targetPatientId) {
                return res.status(400).json({
                    success: false,
                    message: "Patient ID is required for admin booking."
                });
            }

            const patient = await Patient.findById(targetPatientId);

            if (!patient) {
                return res.status(404).json({
                    success: false,
                    message: "Patient not found."
                });
            }

            patientId = patient._id;
        }

        let followUp = null;
        let followUpOf = null;
        let preferredDoctorId = null;

        // Follow-up validation
        if (followUpId) {
            if (!mongoose.isValidObjectId(followUpId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid follow-up ID."
                });
            }

            followUp = await FollowUp.findById(followUpId);

            if (!followUp) {
                return res.status(404).json({
                    success: false,
                    message: "Follow-up record not found."
                });
            }

            // Verify patient ownership
            if (
                followUp.patientId.toString() !==
                patientId.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: "This follow-up does not belong to this patient."
                });
            }

            // Prevent duplicate booking
            if (
                followUp.appointmentId ||
                !["Pending", "Reminder Sent"].includes(followUp.status)
            ) {
                return res.status(409).json({
                    success: false,
                    message: "This follow-up has already been booked or cannot be booked."
                });
            }

            const consultation = await Consultation.findById(
                followUp.consultationId
            );

            if (!consultation) {
                return res.status(404).json({
                    success: false,
                    message: "Original consultation not found."
                });
            }

            if (
                consultation.patientId.toString() !==
                patientId.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: "Consultation does not belong to this patient."
                });
            }

            followUpOf = consultation.appointmentId;
            preferredDoctorId = followUp.doctorId;

            if (!followUpOf) {
                return res.status(400).json({
                    success: false,
                    message: "Original appointment reference not found."
                });
            }

            // Same department as original consultation
            if (
                consultation.departmentId.toString() !==
                departmentId.toString()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Please select the original consultation department."
                });
            }

            // Check existing follow-up appointment
            const existingAppointment = await Appointment.findOne({
                followUpId: followUp._id
            });

            if (existingAppointment) {
                return res.status(409).json({
                    success: false,
                    message: "An appointment has already been booked for this follow-up."
                });
            }
        }

        // Smart doctor allocation
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
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }

        // Link appointment with FollowUp
        if (followUp) {
            const updatedFollowUp =
                await FollowUp.findOneAndUpdate(
                    {
                        _id: followUp._id,
                        status: {
                            $in: ["Pending", "Reminder Sent"]
                        },
                        appointmentId: null
                    },
                    {
                        $set: {
                            appointmentId: result.appointment._id,
                            status: "Appointment Booked"
                        }
                    },
                    {
                        new: true
                    }
                );

            // If another request already booked it
            if (!updatedFollowUp) {
                await Appointment.deleteOne({
                    _id: result.appointment._id
                });

                return res.status(409).json({
                    success: false,
                    message: "This follow-up has already been booked."
                });
            }
        }

        return res.status(201).json({
            success: true,
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
            return res.status(409).json({
                success: false,
                message: "This follow-up appointment has already been booked."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to book appointment: " + error.message
        });
    }
});


/* =====================================================
   2. GET APPOINTMENTS
   GET /api/appointments

   Patient: Own appointments
   Doctor: Assigned appointments
   Admin: All appointments
   ===================================================== */

router.get("/", protect, async (req, res) => {
    try {
        let query = {};

        const { date, status, departmentId } = req.query;

        if (date) query.appointmentDate = date;
        if (status) query.status = status;
        if (departmentId) query.departmentId = departmentId;

        if (req.user.role === "patient") {
            const patient = await Patient.findOne({
                userId: req.user._id
            });

            if (!patient) {
                return res.status(200).json({
                    success: true,
                    count: 0,
                    data: []
                });
            }

            query.patientId = patient._id;

        } else if (req.user.role === "doctor") {
            const doctor = await Doctor.findOne({
                userId: req.user._id
            });

            if (!doctor) {
                return res.status(200).json({
                    success: true,
                    count: 0,
                    data: []
                });
            }

            query.doctorId = doctor._id;

        } else if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }

        const appointments = await Appointment.find(query)
            .populate("patientId", "name age gender phone blood")
            .populate({
                path: "doctorId",
                populate: {
                    path: "userId",
                    select: "name email"
                }
            })
            .populate("departmentId", "name")
            .sort({
                appointmentDate: 1,
                tokenNumber: 1
            });

        return res.status(200).json({
            success: true,
            count: appointments.length,
            data: appointments
        });

    } catch (error) {
        console.error("Fetch appointments error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch appointments."
        });
    }
});


/* =====================================================
   3. CALL NEXT PATIENT
   POST /api/appointments/call-next

   Doctor calls the next patient.
   ===================================================== */

router.post(
    "/call-next",
    protect,
    authorizeRoles("doctor"),
    async (req, res) => {
        const session = await mongoose.startSession();

        try {
            const date =
                req.body.date ||
                new Date().toLocaleDateString("en-CA", {
                    timeZone: "Asia/Kolkata"
                });

            if (
                !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
                new Date(`${date}T00:00:00Z`)
                    .toISOString()
                    .slice(0, 10) !== date
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid appointment date."
                });
            }
            const today = new Date().toLocaleDateString("en-CA", {
                timeZone: "Asia/Kolkata"
            });

            if (date > today) {
                return res.status(403).json({
                    success: false,
                    message: "You cannot start consultations for future appointments."
                });
            }

            let result = null;
            let calledDoctorId;
            let calledAppointmentDate;

            await session.withTransaction(async () => {

                const doctor = await Doctor.findOne({
                    userId: req.user._id
                }).session(session);

                if (!doctor) {
                    result = {
                        status: 404,
                        body: {
                            success: false,
                            message: "Doctor profile not found."
                        }
                    };
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
                        body: {
                            success: false,
                            message: "A consultation is already in progress.",
                            data: activeAppointment
                        }
                    };
                    return;
                }

                const nextAppointment = await Appointment.findOne({
                    doctorId: doctor._id,
                    appointmentDate: date,
                    status: {
                        $in: ["Booked", "Waiting"]
                    }
                })
                    .sort({
                        priority: 1,
                        tokenNumber: 1,
                        bookedAt: 1
                    })
                    .session(session);

                if (!nextAppointment) {
                    result = {
                        status: 404,
                        body: {
                            success: false,
                            message: "No patients are waiting in your queue."
                        }
                    };
                    return;
                }

                const updatedAppointment =
                    await Appointment.findOneAndUpdate(
                        {
                            _id: nextAppointment._id,
                            doctorId: doctor._id,
                            status: {
                                $in: ["Booked", "Waiting"]
                            }
                        },
                        {
                            $set: {
                                status: "In Consultation",
                                consultationStartedAt: new Date()
                            }
                        },
                        {
                            new: true,
                            session
                        }
                    );

                if (!updatedAppointment) {
                    throw new Error(
                        "Patient queue changed. Please try again."
                    );
                }

                calledDoctorId = doctor._id;
                calledAppointmentDate = date;

                result = {
                    status: 200,
                    body: {
                        success: true,
                        message: "Next patient called successfully.",
                        data: updatedAppointment
                    }
                };
            });

            if (result?.status === 200) {
                try {
                    await recalculateDoctorQueue(
                        calledDoctorId,
                        calledAppointmentDate
                    );
                } catch (queueError) {
                    console.error(
                        "Queue recalculation failed:",
                        queueError.message
                    );
                }
            }

            return res.status(result.status).json(result.body);

        } catch (error) {
            console.error("Call next patient error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to call next patient."
            });

        } finally {
            await session.endSession();
        }
    }
);


/* =====================================================
   4. UPDATE APPOINTMENT STATUS
   PATCH /api/appointments/:id/status

   Patient: Cancel own appointment
   Doctor: Update own appointment
   Admin: Manage appointments
   ===================================================== */

router.patch(
    "/:id/status",
    protect,
    authorizeRoles("admin", "doctor", "patient"),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { status, cancelReason } = req.body;

            if (!mongoose.isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid appointment ID."
                });
            }

            const appointment = await Appointment.findById(id);

            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    message: "Appointment not found."
                });
            }

            // Patient can only cancel their own appointment
            if (req.user.role === "patient") {
                if (status !== "Cancelled") {
                    return res.status(403).json({
                        success: false,
                        message: "Patients can only cancel appointments."
                    });
                }

                const patient = await Patient.findOne({
                    userId: req.user._id
                });

                if (
                    !patient ||
                    appointment.patientId.toString() !==
                    patient._id.toString()
                ) {
                    return res.status(403).json({
                        success: false,
                        message: "You cannot cancel another patient's appointment."
                    });
                }
            }

            // Doctor can only update their own appointments
            if (req.user.role === "doctor") {
                const doctor = await Doctor.findOne({
                    userId: req.user._id
                });

                if (
                    !doctor ||
                    appointment.doctorId.toString() !==
                    doctor._id.toString()
                ) {
                    return res.status(403).json({
                        success: false,
                        message: "You are not authorized to update this appointment."
                    });
                }
            }

            const currentStatus = appointment.status;

            // Cancellation
            if (status === "Cancelled") {
                if (!["Booked", "Waiting"].includes(currentStatus)) {
                    return res.status(409).json({
                        success: false,
                        message: `Cannot cancel an appointment with status ${currentStatus}.`
                    });
                }

                appointment.status = "Cancelled";
                appointment.cancelledAt = new Date();

                appointment.cancelReason =
                    cancelReason?.trim() ||
                    (
                        req.user.role === "patient"
                            ? "Cancelled by patient"
                            : "Cancelled by staff/doctor"
                    );
            }

            // Move Booked to Waiting
            else if (
                status === "Waiting" &&
                req.user.role !== "patient" &&
                currentStatus === "Booked"
            ) {
                appointment.status = "Waiting";
            }

            // Mark No Show
            else if (
                status === "No Show" &&
                req.user.role !== "patient" &&
                ["Booked", "Waiting"].includes(currentStatus)
            ) {
                appointment.status = "No Show";
                appointment.noShowMarkedAt = new Date();
            }

            else {
                return res.status(409).json({
                    success: false,
                    message: `Invalid status transition from ${currentStatus} to ${status}.`
                });
            }

            // Release FollowUp reference when appointment is cancelled
            if (appointment.followUpId) {
                appointment.followUpId = null;
            }
            await appointment.save();

            // If a follow-up appointment is cancelled,
            // allow the patient to book it again.
            if (
                appointment.followUpOf &&
                appointment.status === "Cancelled"
            ) {
                await FollowUp.findOneAndUpdate(
                    {
                        appointmentId: appointment._id,
                        status: "Appointment Booked"
                    },
                    {
                        $set: {
                            status: "Pending"
                        },
                        $unset: {
                            appointmentId: 1
                        }
                    }
                );
            }

            // Recalculate queue
            try {
                await recalculateDoctorQueue(
                    appointment.doctorId,
                    appointment.appointmentDate
                );
            } catch (queueError) {
                console.error(
                    "Queue recalculation failed:",
                    queueError.message
                );
            }

            return res.status(200).json({
                success: true,
                message: `Appointment ${status.toLowerCase()} successfully.`,
                data: appointment
            });

        } catch (error) {
            console.error("Update appointment status error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to update appointment status."
            });
        }
    }
);


/* =====================================================
   5. GET QUEUE
   GET /api/appointments/queue?date=YYYY-MM-DD

   Doctor: Own queue
   Admin: All doctors or selected doctor
   Patient: Own appointment queue position
   ===================================================== */

router.get("/queue", protect, async (req, res) => {
    try {
        const { date, doctorId } = req.query;

        const queueDate =
            date ||
            new Date().toLocaleDateString("en-CA", {
                timeZone: "Asia/Kolkata"
            });

        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(queueDate) ||
            new Date(`${queueDate}T00:00:00Z`)
                .toISOString()
                .slice(0, 10) !== queueDate
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid date. Use YYYY-MM-DD."
            });
        }

        const query = {
            appointmentDate: queueDate,
            status: {
                $in: ["Booked", "Waiting", "In Consultation"]
            }
        };

        if (req.user.role === "doctor") {
            const doctor = await Doctor.findOne({
                userId: req.user._id
            });

            if (!doctor) {
                return res.status(404).json({
                    success: false,
                    message: "Doctor profile not found."
                });
            }

            query.doctorId = doctor._id;

        } else if (req.user.role === "admin") {
            if (doctorId) {
                if (!mongoose.isValidObjectId(doctorId)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid doctor ID."
                    });
                }

                query.doctorId = doctorId;
            }

        } else if (req.user.role === "patient") {
            const patient = await Patient.findOne({
                userId: req.user._id
            });

            if (!patient) {
                return res.json({
                    success: true,
                    count: 0,
                    data: []
                });
            }

            query.patientId = patient._id;

        } else {
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }

        // For patients, calculate queue using the complete
        // queue of doctors assigned to their appointments.
        const appointments = await Appointment.find(
            req.user.role === "patient"
                ? {
                    appointmentDate: queueDate,
                    status: {
                        $in: ["Booked", "Waiting", "In Consultation"]
                    },
                    doctorId: {
                        $in: await Appointment.distinct(
                            "doctorId",
                            query
                        )
                    }
                }
                : query
        )
            .populate("patientId", "name")
            .populate({
                path: "doctorId",
                populate: {
                    path: "userId",
                    select: "name"
                }
            })
            .lean();

        const groups = new Map();

        for (const appointment of appointments) {
            const id = String(appointment.doctorId?._id);

            if (!groups.has(id)) {
                groups.set(id, []);
            }

            groups.get(id).push(appointment);
        }

        const queueResults = [];

        for (const [id, items] of groups) {
            const doctor = await Doctor.findById(id).lean();

            const avgMinutes =
                doctor?.avgConsultationMinutes ||
                doctor?.consultationDuration ||
                10;

            items.sort((a, b) => {
                // Current consultation stays first
                if (a.status === "In Consultation") return -1;
                if (b.status === "In Consultation") return 1;

                // Emergency patients first
                if (a.priority !== b.priority) {
                    return a.priority === "Emergency" ? -1 : 1;
                }

                // FIFO
                return a.tokenNumber - b.tokenNumber;
            });

            const running = items.find(
                item => item.status === "In Consultation"
            );

            let remainingMinutes = 0;

            if (running) {
                const elapsed = running.consultationStartedAt
                    ? (
                        Date.now() -
                        new Date(running.consultationStartedAt).getTime()
                    ) / 60000
                    : 0;

                remainingMinutes = Math.max(
                    0,
                    avgMinutes - elapsed
                );
            }

            let waitingAhead = 0;

            for (const appointment of items) {
                const inConsultation =
                    appointment.status === "In Consultation";

                const estimatedWaitMinutes = inConsultation
                    ? 0
                    : Math.round(
                        remainingMinutes +
                        waitingAhead * avgMinutes
                    );

                queueResults.push({
                    appointmentId: appointment._id,
                    doctorId: id,
                    doctorName:
                        appointment.doctorId?.userId?.name ||
                        "Unknown Doctor",
                    patientId: appointment.patientId?._id,
                    patientName:
                        appointment.patientId?.name ||
                        "Unknown Patient",
                    tokenNumber: appointment.tokenNumber,
                    priority: appointment.priority,
                    status: appointment.status,
                    appointmentTime: appointment.appointmentTime,
                    queuePosition: inConsultation
                        ? 0
                        : waitingAhead + 1,
                    estimatedWaitMinutes
                });

                if (!inConsultation) {
                    waitingAhead++;
                }
            }
        }

        const data = req.user.role === "patient"
            ? queueResults.filter(
                item =>
                    String(item.patientId) ===
                    String(query.patientId)
            )
            : queueResults;

        return res.status(200).json({
            success: true,
            date: queueDate,
            count: data.length,
            data
        });

    } catch (error) {
        console.error("Queue error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch waiting queue."
        });
    }
});


export default router;
