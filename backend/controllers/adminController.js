import mongoose from "mongoose";
import User from "../models/User.js";
import { ok, badRequest, notFound, serverError } from "../utils/respond.js";

export const getPendingDoctors = async (req, res) => {
    try {
        const doctors = await User.find({ role: "doctor", isVerified: false })
            .select("_id name email createdAt");

        return ok(res, { count: doctors.length, data: doctors });
    } catch {
        return serverError(res, "Unable to fetch pending doctors");
    }
};

export const verifyDoctor = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) return badRequest(res, "Invalid doctor ID");

        const doctor = await User.findOne({ _id: id, role: "doctor" });

        if (!doctor) return notFound(res, "Doctor not found");

        if (doctor.isVerified) {
            return ok(res, { message: "Doctor is already verified" });
        }

        doctor.isVerified = true;
        await doctor.save();

        return ok(res, {
            message: "Doctor verified successfully",
            data: { id: doctor._id, name: doctor.name, email: doctor.email, role: doctor.role, isVerified: doctor.isVerified }
        });
    } catch {
        return serverError(res, "Unable to verify doctor");
    }
};
