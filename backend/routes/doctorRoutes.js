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


const isValidTime = (value) => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const isValidDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));

/**
 * GET /api/doctors/me/availability
 * Doctor views their weekly schedule and date-specific exceptions.
 */
router.get("/me/availability", protect, authorizeRoles("doctor"), async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user._id })
            .select("isAvailable weeklySchedule availabilityExceptions");
        if (!doctor) return res.status(404).json({ success: false, message: "Doctor profile not found" });
        return res.status(200).json({
            success: true,
            data: {
                isAvailable: doctor.isAvailable,
                weeklySchedule: doctor.weeklySchedule || [],
                availabilityExceptions: doctor.availabilityExceptions || []
            }
        });
    } catch (error) {
        console.error("Get doctor availability error:", error.message);
        return res.status(500).json({ success: false, message: "Unable to fetch doctor availability" });
    }
});

/**
 * PUT /api/doctors/me/availability
 * Replace the current doctor's weekly schedule and date exceptions.
 */
router.put("/me/availability", protect, authorizeRoles("doctor"), async (req, res) => {
    try {
        const { weeklySchedule, availabilityExceptions } = req.body;
        if (weeklySchedule !== undefined && !Array.isArray(weeklySchedule)) {
            return res.status(400).json({ success: false, message: "weeklySchedule must be an array" });
        }
        if (availabilityExceptions !== undefined && !Array.isArray(availabilityExceptions)) {
            return res.status(400).json({ success: false, message: "availabilityExceptions must be an array" });
        }

        const schedule = weeklySchedule ?? [];
        const exceptions = availabilityExceptions ?? [];
        const seenDays = new Set();
        for (const day of schedule) {
            if (!Number.isInteger(day.dayOfWeek) || day.dayOfWeek < 0 || day.dayOfWeek > 6 || seenDays.has(day.dayOfWeek)) {
                return res.status(400).json({ success: false, message: "Each dayOfWeek must be unique and between 0 (Sunday) and 6 (Saturday)" });
            }
            seenDays.add(day.dayOfWeek);
            if (typeof day.isWorking !== "boolean") {
                return res.status(400).json({ success: false, message: "isWorking must be a boolean" });
            }
            if (day.isWorking) {
                if (!isValidTime(day.startTime) || !isValidTime(day.endTime) || day.startTime >= day.endTime) {
                    return res.status(400).json({ success: false, message: "Working days need valid startTime and endTime (HH:MM), with start before end" });
                }
                const hasBreak = day.breakStart != null || day.breakEnd != null;
                if (hasBreak && (!isValidTime(day.breakStart) || !isValidTime(day.breakEnd) || day.breakStart >= day.breakEnd || day.breakStart < day.startTime || day.breakEnd > day.endTime)) {
                    return res.status(400).json({ success: false, message: "Break must be valid and fall within working hours" });
                }
            }
        }

        const seenDates = new Set();
        for (const exception of exceptions) {
            if (!isValidDate(exception.date) || seenDates.has(exception.date) || typeof exception.isAvailable !== "boolean") {
                return res.status(400).json({ success: false, message: "Each exception needs a unique YYYY-MM-DD date and boolean isAvailable" });
            }
            seenDates.add(exception.date);
            if (exception.isAvailable && (!isValidTime(exception.startTime) || !isValidTime(exception.endTime) || exception.startTime >= exception.endTime)) {
                return res.status(400).json({ success: false, message: "Available exceptions need valid startTime and endTime" });
            }
        }

        const doctor = await Doctor.findOne({ userId: req.user._id });
        if (!doctor) return res.status(404).json({ success: false, message: "Doctor profile not found" });
        if (weeklySchedule !== undefined) doctor.weeklySchedule = schedule;
        if (availabilityExceptions !== undefined) doctor.availabilityExceptions = exceptions;
        await doctor.save();

        return res.status(200).json({
            success: true,
            message: "Doctor availability updated successfully",
            data: {
                weeklySchedule: doctor.weeklySchedule,
                availabilityExceptions: doctor.availabilityExceptions
            }
        });
    } catch (error) {
        console.error("Update doctor availability error:", error.message);
        return res.status(500).json({ success: false, message: "Unable to update doctor availability" });
    }
});

export default router;
