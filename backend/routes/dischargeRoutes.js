import express from "express";
import mongoose from "mongoose";
import Discharge from "../models/Discharge.js";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import Consultation from "../models/Consultation.js";

const router = express.Router();

// Create discharge record
router.post("/:patientId", protect, authorizeRoles("admin", "doctor"), async (req, res) => {
    try {
        const { patientId } = req.params;
        const { vitals, prescribedDisease, prescription, dischargeNotes } = req.body;

        if (!mongoose.isValidObjectId(patientId)) {
            return res.status(400).json({ success: false, message: "Invalid patient ID" });
        }

        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ success: false, message: "Patient not found" });
        }

        let doctorId;

        if (req.user.role === "doctor") {
            const doctor = await Doctor.findOne({ userId: req.user._id });
            if (!doctor) {
                return res.status(404).json({ success: false, message: "Doctor profile not found" });
            }
            doctorId = doctor._id;
        }

        const appointmentQuery = {
            patientId,
            ...(doctorId ? { doctorId } : {}),
            status: {
                $nin: ["Cancelled", "No Show", "Discharged"]
            }
        };

        const appointments = await Appointment.find(appointmentQuery)
            .sort({ consultationEndedAt: -1, createdAt: -1 });

        let appointment = null;

        for (const item of appointments) {
            const alreadyDischarged = await Discharge.exists({
                appointmentId: item._id
            });

            const consultationExists = await Consultation.exists({
                appointmentId: item._id
            });

            if (!alreadyDischarged && consultationExists) {
                appointment = item;
                break;
            }
        }

        if (!appointment) {
            const existingDischarge = await Discharge.findOne({
                patientId,
                ...(doctorId ? { doctorId } : {})
            }).sort({ dischargeDate: -1 });

            if (existingDischarge) {
                return res.status(409).json({
                    success: false,
                    alreadyDischarged: true,
                    message: "This patient has already been discharged."
                });
            }

            return res.status(400).json({
                success: false,
                message: "No eligible completed appointment found for discharge."
            });
        }

        const discharge = await Discharge.create({
            patientId,
            doctorId: appointment.doctorId,
            appointmentId: appointment._id,
            vitals,
            prescribedDisease,
            prescription,
            dischargeNotes
        });

        appointment.status = "Discharged";
        await appointment.save();

        res.status(201).json({
            success: true,
            message: "Patient discharged successfully",
            data: discharge
        });

    } catch (error) {
        console.error("Discharge error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Unable to discharge patient"
        });
    }
});

// Get discharged patients
router.get("/", protect, authorizeRoles("admin", "doctor"), async (req, res) => {
    try {
        let query = {};

        if (req.user.role === "doctor") {
            const doctor = await Doctor.findOne({ userId: req.user._id });
            if (!doctor) {
                return res.status(404).json({ success: false, message: "Doctor not found" });
            }
            query.doctorId = doctor._id;
        }

        const records = await Discharge.find(query)
            .populate("patientId")
            .populate({
                path: "doctorId",
                populate: { path: "userId", select: "name" }
            })
            .sort({ dischargeDate: -1 });

        res.json({ success: true, count: records.length, data: records });
    } catch (error) {
        res.status(500).json({ success: false, message: "Unable to fetch discharge records" });
    }
});

export default router;
