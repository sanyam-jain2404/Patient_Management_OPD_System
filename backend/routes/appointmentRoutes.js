import express from "express";
import Appointment from "../models/Appointment.js";
import Department from "../models/Department.js";
import Doctor from "../models/Doctor.js";
import { allocateAppointment } from "../services/allocationService.js";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
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
 * PATCH /api/appointments/:id/status
 * Doctor or Admin updates appointment status (Waiting, In Consultation, Completed, Cancelled, No Show)
 */
router.patch("/:id/status", protect, authorizeRoles("admin", "doctor"), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, cancelReason } = req.body;

        const validStatuses = ["Booked", "Waiting", "In Consultation", "Completed", "Cancelled", "No Show"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status value."
            });
        }

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

        appointment.status = status;
        if (status === "In Consultation" && !appointment.consultationStartedAt) {
            appointment.consultationStartedAt = new Date();
        }
        if (status === "Completed" && !appointment.consultationEndedAt) {
            appointment.consultationEndedAt = new Date();
        }
        if (status === "Cancelled") {
            appointment.cancelledAt = new Date();
            appointment.cancelReason = cancelReason || "Cancelled by staff/doctor";
        }
        if (status === "No Show") {
            appointment.noShowMarkedAt = new Date();
        }

        await appointment.save();

        res.status(200).json({
            success: true,
            message: `Appointment status updated to ${status}`,
            data: appointment
        });
    } catch (error) {
        console.error("Update appointment status error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to update appointment status"
        });
    }
});

export default router;
