import express from "express";
import Consultation from "../models/Consultation.js";
import Appointment from "../models/Appointment.js";
import FollowUp from "../models/FollowUp.js";
import Doctor from "../models/Doctor.js";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import mongoose from "mongoose";

const router = express.Router();

/**
 * POST /api/consultations
 * Doctor records a consultation, diagnosis, prescription, and optional follow-up.
 */
router.post("/", protect, authorizeRoles("doctor"), async (req, res) => {
    try {
        const {
            appointmentId,
            diagnosis,
            treatment,
            notes,
            medicines,
            followUpRecommendation,
            followUpDate
        } = req.body;

        if (!appointmentId || !diagnosis) {
            return res.status(400).json({
                success: false,
                message: "Appointment ID and diagnosis are required."
            });
        }

        if (!mongoose.isValidObjectId(appointmentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment ID."
            });
        }

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found."
            });
        }

        const doctorRecord = await Doctor.findOne({ userId: req.user._id });
        if (!doctorRecord || appointment.doctorId.toString() !== doctorRecord._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to record consultation for this appointment."
            });
        }

        // Check if consultation already exists for this appointment
        const existing = await Consultation.findOne({ appointmentId });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Consultation record already exists for this appointment."
            });
        }

        const consultation = await Consultation.create({
            patientId: appointment.patientId,
            doctorId: doctorRecord._id,
            appointmentId: appointment._id,
            departmentId: appointment.departmentId,
            consultationDate: new Date(),
            symptoms: appointment.symptoms,
            diagnosis: diagnosis.trim(),
            treatment: treatment?.trim() || "",
            notes: notes?.trim() || "",
            medicines: medicines || [],
            followUpRecommendation: followUpRecommendation?.trim() || "",
            followUpDate: followUpDate ? new Date(followUpDate) : undefined
        });

        // Mark appointment as Completed
        appointment.status = "Completed";
        appointment.consultationEndedAt = new Date();
        await appointment.save();

        // If follow-up date is provided, create a FollowUp reminder
        if (followUpDate) {
            await FollowUp.create({
                patientId: appointment.patientId,
                doctorId: doctorRecord._id,
                consultationId: consultation._id,
                instructions: followUpRecommendation || "Follow-up visit recommended",
                dueDate: new Date(followUpDate)
            });
        }

        res.status(201).json({
            success: true,
            message: "Consultation and prescription recorded successfully",
            data: consultation
        });
    } catch (error) {
        console.error("Record consultation error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to record consultation: " + error.message
        });
    }
});

/**
 * GET /api/consultations/patient/:patientId
 * View treatment history for a specific patient.
 * Patients can view their own history; Doctors/Admins can view authorized patient history.
 */
router.get("/patient/:patientId", protect, async (req, res) => {
    try {
        const { patientId } = req.params;
        if (!mongoose.isValidObjectId(patientId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid patient ID."
            });
        }

        if (req.user.role === "patient") {
            const Patient = (await import("../models/Patient.js")).default;
            const patientRecord = await Patient.findOne({ userId: req.user._id });
            if (!patientRecord || patientRecord._id.toString() !== patientId) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied to this patient's history."
                });
            }
        }

        const consultations = await Consultation.find({ patientId, isDeleted: false })
            .populate("doctorId", "specialization")
            .populate({
                path: "doctorId",
                populate: { path: "userId", select: "name" }
            })
            .populate("departmentId", "name")
            .sort({ consultationDate: -1 });

        res.status(200).json({
            success: true,
            count: consultations.length,
            data: consultations
        });
    } catch (error) {
        console.error("Fetch treatment history error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to fetch treatment history"
        });
    }
});

export default router;
