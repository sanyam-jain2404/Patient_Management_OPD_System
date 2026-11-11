import express from "express";
import Appointment from "../models/Appointment.js";
import Department from "../models/Department.js";
import Doctor from "../models/Doctor.js";
import { allocateAppointment } from "../services/allocationService.js";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { recalculateDoctorQueue } from "../services/queueService.js";
import mongoose from "mongoose";

const router = express.Router();

/**
 * POST /api/appointments
 * Patient or Admin books an appointment.
 * Automatically runs Smart Doctor Allocation based on department.
 */
router.post("/", protect, async (req, res) => {
    try {
        const { departmentId, date, time, symptoms, reason, priority, patientId: targetPatientId } = req.body;

        if (!departmentId || !date || !time) {
            return res.status(400).json({
                success: false,
                message: "Department, appointment date, and time are required."
            });
        }

        if (!mongoose.isValidObjectId(departmentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid department ID."
            });
        }

        const department = await Department.findById(departmentId);
        if (!department || !department.isActive) {
            return res.status(404).json({
                success: false,
                message: "Department not found or inactive."
            });
        }

        // Determine patientId: if admin/receptionist is booking for a patient, use targetPatientId;
        // otherwise if patient is booking, use their associated patient record or user ID.
        let patientId = targetPatientId;
        if (req.user.role === "patient") {
            // For patient role, check if user has a Patient document or use req.user.userId
            const Patient = (await import("../models/Patient.js")).default;
            let patientRecord = await Patient.findOne({
                userId: req.user._id
            });
            if (!patientRecord) {
                // Create a basic patient profile for this user if not exists
                patientRecord = await Patient.create({
                    userId: req.user._id,
                    name: req.user.name,
                    age: req.user.age || 30, // default placeholder from user profile
                    gender: req.user.gender || "Other",
                    phone: req.user.phone || "9999999999"
                });
            }
            patientId = patientRecord._id;
        }

        if (!patientId || !mongoose.isValidObjectId(patientId)) {
            return res.status(400).json({
                success: false,
                message: "Valid patient ID is required for booking."
            });
        }

        // Run smart allocation
        const result = await allocateAppointment({
            patientId,
            departmentId,
            date,
            time,
            symptoms,
            reason,
            priority
        });

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }

        res.status(201).json({
            success: true,
            message: `Appointment booked successfully! Assigned to Dr. ${result.doctor.name} (Token #${result.tokenNumber})`,
            data: {
                appointment: result.appointment,
                assignedDoctor: result.doctor,
                tokenNumber: result.tokenNumber,
                estimatedWaitMinutes: result.estimatedWaitMinutes
            }
        });
    } catch (error) {
        console.error("Appointment booking error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to book appointment: " + error.message
        });
    }
});

/**
 * GET /api/appointments
 * View appointments based on role:
 * - Patient: sees their own appointments
 * - Doctor: sees appointments assigned to them
 * - Admin: sees all appointments
 */
router.get("/", protect, async (req, res) => {
    try {
        let query = {};
        const { date, status, departmentId } = req.query;

        if (date) query.appointmentDate = date;
        if (status) query.status = status;
        if (departmentId) query.departmentId = departmentId;

        if (req.user.role === "patient") {
            const Patient = (await import("../models/Patient.js")).default;
            const patientRecord = await Patient.findOne({
                userId: req.user._id
            });
            if (!patientRecord) {
                return res.status(200).json({ success: true, count: 0, data: [] });
            }
            query.patientId = patientRecord._id;
        } else if (req.user.role === "doctor") {
            // Find Doctor record for this user
            const doctorRecord = await Doctor.findOne({ userId: req.user._id });
            if (!doctorRecord) {
                return res.status(200).json({ success: true, count: 0, data: [] });
            }
            query.doctorId = doctorRecord._id;
        }

        const appointments = await Appointment.find(query)
            .populate("patientId", "name age gender phone blood")
            .populate({
                path: "doctorId",
                populate: { path: "userId", select: "name email" }
            })
            .populate("departmentId", "name")
            .sort({ appointmentDate: 1, tokenNumber: 1 });

        res.status(200).json({
            success: true,
            count: appointments.length,
            data: appointments
        });
    } catch (error) {
        console.error("Fetch appointments error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to fetch appointments"
        });
    }
});

/**
 * POST /api/appointments/call-next
 * Doctor calls the next patient from their queue.
 */

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

                // Save details for ETA recalculation
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

            // Recalculate queue after transaction commits
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

                const Patient = (
                    await import("../models/Patient.js")
                ).default;

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

            // Only Booked or Waiting appointments can be cancelled
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

            // Admin and Doctor can move Booked to Waiting
            else if (
                status === "Waiting" &&
                req.user.role !== "patient" &&
                currentStatus === "Booked"
            ) {
                appointment.status = "Waiting";
            }

            // Admin and Doctor can mark Booked/Waiting as No Show
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

            await appointment.save();

            // Recalculate queue after status change
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



/**
 * GET /api/appointments/queue?date=YYYY-MM-DD
 *
 * Doctor: apni queue
 * Admin: all doctors, optionally filter by doctorId
 * Patient: apne appointment ki queue position
 */

router.get("/queue", protect, async (req, res) => {
    try {
        const { date, doctorId } = req.query;

        const queueDate =
            date || new Date().toLocaleDateString("en-CA", {
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
            const Patient = (
                await import("../models/Patient.js")
            ).default;

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

        // Find the relevant doctors' appointments.
        // For patients, calculate positions using the full doctor queue,
        // not only the patient's own appointments.

        let appointments = await Appointment.find(
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
                // Already running consultation stays first.
                if (a.status === "In Consultation") return -1;
                if (b.status === "In Consultation") return 1;

                // Emergency patients ahead of normal patients.
                if (a.priority !== b.priority) {
                    return a.priority === "Emergency" ? -1 : 1;
                }

                // FIFO within the same priority.
                return a.tokenNumber - b.tokenNumber;
            });

            const running = items.find(
                a => a.status === "In Consultation"
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

        res.status(200).json({
            success: true,
            date: queueDate,
            count: data.length,
            data
        });

    } catch (error) {
        console.error("Queue error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch waiting queue."
        });
    }
});
export default router;
