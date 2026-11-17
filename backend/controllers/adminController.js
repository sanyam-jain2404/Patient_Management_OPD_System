import mongoose from "mongoose";
import User from "../models/User.js";

export const getPendingDoctors = async (req, res) => {
    try {
        const doctors = await User.find({
            role: "doctor",
            isVerified: false
        }).select("_id name email createdAt");

        res.status(200).json({
            success: true,
            count: doctors.length,
            data: doctors
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "Unable to fetch pending doctors"
        });
    }
};

export const verifyDoctor = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid doctor ID"
            });
        }

        const doctor = await User.findOne({
            _id: id,
            role: "doctor"
        });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found"
            });
        }

        if (doctor.isVerified) {
            return res.status(200).json({
                success: true,
                message: "Doctor is already verified"
            });
        }

        doctor.isVerified = true;
        await doctor.save();

        res.status(200).json({
            success: true,
            message: "Doctor verified successfully",
            data: {
                id: doctor._id,
                name: doctor.name,
                email: doctor.email,
                role: doctor.role,
                isVerified: doctor.isVerified
            }
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "Unable to verify doctor"
        });
    }
};
