import express from "express";
import Patient from "../models/Patient.js";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = express.Router();
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