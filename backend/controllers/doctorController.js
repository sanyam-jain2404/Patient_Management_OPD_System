import Doctor from "../models/Doctor.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { isValidDate, isValidTime } from "../utils/dateUtils.js";
import { ok, badRequest, notFound, serverError } from "../utils/respond.js";

export const getAllDoctors = async (req, res) => {
    try {
        const { departmentId, specialization, search, page: pageParam, limit: limitParam } = req.query;
        const hasPagination = pageParam !== undefined || limitParam !== undefined;
        const page = pageParam === undefined ? 1 : Number.parseInt(pageParam, 10);
        const limit = limitParam === undefined ? 10 : Number.parseInt(limitParam, 10);

        if (
            (hasPagination && (!Number.isInteger(page) || page < 1)) ||
            (hasPagination && (!Number.isInteger(limit) || limit < 1 || limit > 100))
        ) {
            return badRequest(res, "Page must be at least 1 and limit must be between 1 and 100");
        }

        const verifiedUserQuery = { role: "doctor", isVerified: true };
        const verifiedUsers = await User.find(verifiedUserQuery).select("_id");
        const verifiedUserIds = verifiedUsers.map(user => user._id);

        const userSearchIds = search?.trim()
            ? (await User.find({
                ...verifiedUserQuery,
                $or: [
                    { name: { $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
                    { email: { $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }
                ]
            }).select("_id")).map(user => user._id)
            : [];

        let query = { userId: { $in: verifiedUserIds } };

        if (departmentId) query.departmentId = departmentId;
        if (specialization) query.specialization = specialization;

        if (search?.trim()) {
            const searchPattern = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            query.$or = [
                { userId: { $in: userSearchIds } },
                { specialization: { $regex: searchPattern, $options: "i" } }
            ];
        }

        const total = await Doctor.countDocuments(query);
        const doctorQuery = Doctor.find(query)
            .populate({ path: "userId", select: "name email avatar" })
            .populate("departmentId", "name")
            .sort({ specialization: 1 });

        if (hasPagination) {
            doctorQuery.skip((page - 1) * limit).limit(limit);
        }

        const doctors = await doctorQuery;

        return ok(res, {
            count: total,
            total,
            currentPage: hasPagination ? page : 1,
            limit: hasPagination ? limit : total,
            totalPages: hasPagination ? Math.ceil(total / limit) : 1,
            data: doctors
        });

    } catch (error) {
        console.error("Fetch doctors error:", error);
        return serverError(res, "Unable to fetch doctors");
    }
};

export const getOwnProfile = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user._id })
            .populate({ path: "userId", select: "name email avatar" })
            .populate("departmentId", "name");

        if (!doctor) return notFound(res, "Doctor profile not found");

        return ok(res, { data: doctor });
    } catch {
        return serverError(res, "Unable to fetch doctor profile");
    }
};

export const updateOwnProfile = async (req, res) => {
    try {
        const { isAvailable, consultationDuration, specialization, qualification, experience } = req.body;

        if (isAvailable !== undefined && typeof isAvailable !== "boolean") {
            return badRequest(res, "isAvailable must be a boolean");
        }

        if (
            consultationDuration !== undefined &&
            (!Number.isFinite(Number(consultationDuration)) || Number(consultationDuration) < 1)
        ) {
            return badRequest(res, "Consultation duration must be at least 1 minute");
        }

        if (
            experience !== undefined &&
            (!Number.isFinite(Number(experience)) || Number(experience) < 0)
        ) {
            return badRequest(res, "Experience must be a valid non-negative number");
        }

        const doctor = await Doctor.findOne({ userId: req.user._id });
        if (!doctor) return notFound(res, "Doctor profile not found");

        if (isAvailable !== undefined) doctor.isAvailable = isAvailable;
        if (consultationDuration !== undefined) doctor.consultationDuration = Number(consultationDuration);

        if (specialization !== undefined) {
            if (typeof specialization !== "string" || !specialization.trim()) {
                return badRequest(res, "Specialization must be a non-empty string");
            }
            doctor.specialization = specialization.trim();
        }

        if (qualification !== undefined) {
            if (typeof qualification !== "string" || !qualification.trim()) {
                return badRequest(res, "Qualification must be a non-empty string");
            }
            doctor.qualification = qualification.trim();
        }

        if (experience !== undefined) doctor.experience = Number(experience);

        await doctor.save();

        return ok(res, { message: "Doctor profile updated", data: doctor });
    } catch {
        return serverError(res, "Unable to update doctor profile");
    }
};

export const updateDoctorByAdmin = async (req, res) => {
    try {
        const { specialization, qualification, experience, departmentId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return badRequest(res, "Invalid doctor ID");
        }

        if (
            (specialization !== undefined && (typeof specialization !== "string" || !specialization.trim())) ||
            (qualification !== undefined && (typeof qualification !== "string" || !qualification.trim()))
        ) {
            return badRequest(res, "Specialization and qualification must be non-empty strings");
        }

        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) return notFound(res, "Doctor not found");

        if (
            experience !== undefined &&
            (!Number.isFinite(Number(experience)) || Number(experience) < 0)
        ) {
            return badRequest(res, "Experience must be a valid non-negative number");
        }

        if (specialization !== undefined) doctor.specialization = specialization.trim();
        if (qualification !== undefined) doctor.qualification = qualification.trim();
        if (experience !== undefined) doctor.experience = Number(experience);

        if (departmentId !== undefined) {
            if (!mongoose.Types.ObjectId.isValid(departmentId)) {
                return badRequest(res, "Invalid department ID");
            }
            doctor.departmentId = departmentId;
        }

        await doctor.save();

        const user = await User.findById(doctor.userId);

        if (user) {
            if (specialization !== undefined) user.specialization = doctor.specialization;
            if (qualification !== undefined) user.qualification = doctor.qualification;
            if (experience !== undefined) user.experience = doctor.experience;
            if (departmentId !== undefined) user.departmentId = doctor.departmentId;
            await user.save();
        }

        const updatedDoctor = await Doctor.findById(doctor._id)
            .populate("userId", "name email")
            .populate("departmentId", "name");

        return ok(res, { message: "Doctor details updated successfully", data: updatedDoctor });

    } catch (error) {
        console.error("Update doctor error:", error);
        return serverError(res, "Unable to update doctor details");
    }
};

export const getOwnAvailability = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user._id })
            .select("isAvailable weeklySchedule availabilityExceptions");

        if (!doctor) return notFound(res, "Doctor profile not found");

        return ok(res, {
            data: {
                isAvailable: doctor.isAvailable,
                weeklySchedule: doctor.weeklySchedule || [],
                availabilityExceptions: doctor.availabilityExceptions || []
            }
        });
    } catch (error) {
        console.error("Get doctor availability error:", error.message);
        return serverError(res, "Unable to fetch doctor availability");
    }
};

export const updateOwnAvailability = async (req, res) => {
    try {
        const { weeklySchedule, availabilityExceptions } = req.body;

        if (weeklySchedule !== undefined && !Array.isArray(weeklySchedule)) {
            return badRequest(res, "weeklySchedule must be an array");
        }
        if (availabilityExceptions !== undefined && !Array.isArray(availabilityExceptions)) {
            return badRequest(res, "availabilityExceptions must be an array");
        }

        const schedule = weeklySchedule ?? [];
        const exceptions = availabilityExceptions ?? [];
        const seenDays = new Set();

        for (const day of schedule) {
            if (!Number.isInteger(day.dayOfWeek) || day.dayOfWeek < 0 || day.dayOfWeek > 6 || seenDays.has(day.dayOfWeek)) {
                return badRequest(res, "Each dayOfWeek must be unique and between 0 (Sunday) and 6 (Saturday)");
            }
            seenDays.add(day.dayOfWeek);

            if (typeof day.isWorking !== "boolean") {
                return badRequest(res, "isWorking must be a boolean");
            }

            if (day.isWorking) {
                if (!isValidTime(day.startTime) || !isValidTime(day.endTime) || day.startTime >= day.endTime) {
                    return badRequest(res, "Working days need valid startTime and endTime (HH:MM), with start before end");
                }
                const hasBreak = day.breakStart != null || day.breakEnd != null;
                if (hasBreak && (!isValidTime(day.breakStart) || !isValidTime(day.breakEnd) || day.breakStart >= day.breakEnd || day.breakStart < day.startTime || day.breakEnd > day.endTime)) {
                    return badRequest(res, "Break must be valid and fall within working hours");
                }
            }
        }

        const seenDates = new Set();
        for (const exception of exceptions) {
            if (!isValidDate(exception.date) || seenDates.has(exception.date) || typeof exception.isAvailable !== "boolean") {
                return badRequest(res, "Each exception needs a unique YYYY-MM-DD date and boolean isAvailable");
            }
            seenDates.add(exception.date);
            if (exception.isAvailable && (!isValidTime(exception.startTime) || !isValidTime(exception.endTime) || exception.startTime >= exception.endTime)) {
                return badRequest(res, "Available exceptions need valid startTime and endTime");
            }
        }

        const doctor = await Doctor.findOne({ userId: req.user._id });
        if (!doctor) return notFound(res, "Doctor profile not found");

        if (weeklySchedule !== undefined) doctor.weeklySchedule = schedule;
        if (availabilityExceptions !== undefined) doctor.availabilityExceptions = exceptions;
        await doctor.save();

        return ok(res, {
            message: "Doctor availability updated successfully",
            data: {
                weeklySchedule: doctor.weeklySchedule,
                availabilityExceptions: doctor.availabilityExceptions
            }
        });
    } catch (error) {
        console.error("Update doctor availability error:", error.message);
        return serverError(res, "Unable to update doctor availability");
    }
};
