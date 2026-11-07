import express from "express";
import Doctor from "../models/Doctor.js";
import User from "../models/User.js";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import mongoose from "mongoose";

const router = express.Router();

/**
 * GET /api/doctors
 * Fetch all verified doctors.
 */
router.get("/", protect, async (req, res) => {
    try {
        const { departmentId, specialization } = req.query;
        let query = { isVerified: true };

        if (departmentId) query.departmentId = departmentId;
        if (specialization) query.specialization = specialization;

        const doctors = await Doctor.find(query)
            .populate({ path: "userId", select: "name email avatar" })
            .populate("departmentId", "name")
            .sort({ specialization: 1 });

        res.status(200).json({
            success: true,
            count: doctors.length,
            data: doctors
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Unable to fetch doctors"
        });
    }
});

/**
 * GET /api/doctors/me
 * Fetch current doctor profile.
 */
router.get("/me", protect, authorizeRoles("doctor"), async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user._id })
            .populate({ path: "userId", select: "name email avatar" })
            .populate("departmentId", "name");

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found"
            });
        }

        res.status(200).json({
            success: true,
            data: doctor
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Unable to fetch doctor profile"
        });
    }
});

/**
 * PATCH /api/doctors/me
 * Update own doctor profile (availability, duration, etc.)
 */
router.patch("/me", protect, authorizeRoles("doctor"), async (req, res) => {
    try {
        const { isAvailable, consultationDuration, specialization, qualification, experience } = req.body;

        const doctor = await Doctor.findOne({ userId: req.user._id });
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found"
            });
        }

        if (isAvailable !== undefined) doctor.isAvailable = isAvailable;
        if (consultationDuration) doctor.consultationDuration = consultationDuration;
        if (specialization) doctor.specialization = specialization;
        if (qualification) doctor.qualification = qualification;
        if (experience !== undefined) doctor.experience = experience;

        await doctor.save();

        res.status(200).json({
            success: true,
            message: "Doctor profile updated",
            data: doctor
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Unable to update doctor profile"
        });
    }
});

export default router;
