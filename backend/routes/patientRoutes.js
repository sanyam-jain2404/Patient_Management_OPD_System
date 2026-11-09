import express from "express";
import Patient from "../models/Patient.js";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";


const router = express.Router();
// Get logged-in patient's own profile
router.get(
    "/me",
    protect,
    authorizeRoles("patient"),
    async (req, res) => {
        try {
            const patient = await Patient.findOne({
                userId: req.user._id
            });

            if (!patient) {
                return res.status(404).json({
                    success: false,
                    message: "Patient profile not found"
                });
            }

            res.status(200).json({
                success: true,
                data: patient
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Unable to fetch patient profile"
            });
        }
    }
);
// Get a specific patient's profile
router.get(
    "/:id",
    protect,
    authorizeRoles("admin", "doctor"),
    async (req, res) => {
        try {
            const { id } = req.params;

            if (!mongoose.isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid patient ID"
                });
            }

            const patient = await Patient.findById(id);

            if (!patient) {
                return res.status(404).json({
                    success: false,
                    message: "Patient not found"
                });
            }

            // Doctor can only access patients
            // with whom they have an appointment.
            if (req.user.role === "doctor") {
                const doctor = await Doctor.findOne({
                    userId: req.user._id
                });

                if (!doctor) {
                    return res.status(403).json({
                        success: false,
                        message: "Doctor profile not found"
                    });
                }

                const hasAppointment = await Appointment.exists({
                    patientId: patient._id,
                    doctorId: doctor._id
                });

                if (!hasAppointment) {
                    return res.status(403).json({
                        success: false,
                        message: "You are not authorized to view this patient"
                    });
                }
            }

            res.status(200).json({
                success: true,
                data: patient
            });

        } catch (error) {
            console.error("Fetch patient error:", error.message);

            res.status(500).json({
                success: false,
                message: "Unable to fetch patient"
            });
        }
    }
);
// Get patients assigned to the logged-in doctor
router.get(
    "/doctor",
    protect,
    authorizeRoles("doctor"),
    async (req, res) => {
        try {
            const doctor = await Doctor.findOne({
                userId: req.user._id
            });

            if (!doctor) {
                return res.status(404).json({
                    success: false,
                    message: "Doctor profile not found"
                });
            }

            // Find all patients who have appointments
            // assigned to this doctor (including completed ones)
            const patientIds = await Appointment.distinct(
                "patientId",
                { doctorId: doctor._id }
            );

            const patients = await Patient.find({
                _id: { $in: patientIds }
            }).sort({ createdAt: -1 });

            return res.status(200).json({
                success: true,
                count: patients.length,
                data: patients
            });

        } catch (error) {
            console.error("Doctor patients error:", error.message);

            return res.status(500).json({
                success: false,
                message: "Unable to fetch doctor patients"
            });
        }
    }
);
router.get(
    "/",
    protect,
    authorizeRoles("admin"),
    async (req, res) => {
        try {
            const patients = await Patient.find().sort({
                createdAt: -1
            });

            res.status(200).json({
                success: true,
                count: patients.length,
                data: patients
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Unable to fetch patients"
            });
        }
    }
);
router.post(
    "/",
    protect,
    authorizeRoles("admin"),
    async (req, res) => {
        try {
            const { name, age, gender, phone, address } = req.body;

            if (
                !name?.trim() ||
                age === undefined ||
                age === null ||
                age === "" ||
                !gender ||
                !phone?.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Name, age, gender and phone are required"
                });
            }

            const patient = await Patient.create({
                name: name.trim(),
                age,
                gender,
                phone: phone.trim(),
                address: address?.trim() || ""
            });

            res.status(201).json({
                success: true,
                message: "Patient registered successfully",
                data: patient
            });
        } catch (error) {
            if (error.name === "ValidationError") {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: "Unable to register patient"
            });
        }
    }
);

export default router;