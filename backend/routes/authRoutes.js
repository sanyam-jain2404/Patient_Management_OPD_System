import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import Doctor from "../models/Doctor.js";
import mongoose from "mongoose";
import Patient from "../models/Patient.js";

const router = express.Router();

router.post("/register", async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role,

            // Existing Doctor fields - unchanged
            specialization,
            qualification,
            experience,
            departmentId,

            // New Patient fields
            phone,
            dateOfBirth,
            gender,
            address
        } = req.body;

        if (!name?.trim() || !email?.trim() || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters"
            });
        }

        const selectedRole = role || "patient";

        if (!["patient", "doctor"].includes(selectedRole)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role. Admin registration is not allowed."
            });
        }

        // Doctor-specific validation
        if (selectedRole === "doctor") {
            if (!specialization?.trim() || !qualification?.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Specialization and qualification are required"
                });
            }
        }

        // Normalize role - ensure it's lowercase for consistency
        const normalizedRole = selectedRole.toLowerCase();

        const normalizedEmail = email.toLowerCase().trim();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        // Patient-specific registration
        if (normalizedRole === "patient") {

            // Validate required patient details
            if (!phone?.trim() || !dateOfBirth || !gender) {
                return res.status(400).json({
                    success: false,
                    message: "Phone, date of birth and gender are required."
                });
            }

            // Validate phone number
            const cleanPhone = phone.trim().replace(/[\s()-]/g, "");

            if (!/^\+?\d{10,15}$/.test(cleanPhone)) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid phone number."
                });
            }

            // Validate date of birth format
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid date of birth."
                });
            }

            const birthDate = new Date(`${dateOfBirth}T00:00:00.000Z`);

            if (
                Number.isNaN(birthDate.getTime()) ||
                birthDate.toISOString().slice(0, 10) !== dateOfBirth
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid date of birth."
                });
            }

            const today = new Date();

            const todayUTC = Date.UTC(
                today.getUTCFullYear(),
                today.getUTCMonth(),
                today.getUTCDate()
            );

            if (birthDate.getTime() > todayUTC) {
                return res.status(400).json({
                    success: false,
                    message: "Date of birth cannot be in the future."
                });
            }

            // Calculate age automatically
            let age = today.getUTCFullYear() - birthDate.getUTCFullYear();

            const beforeBirthday =
                today.getUTCMonth() < birthDate.getUTCMonth() ||
                (
                    today.getUTCMonth() === birthDate.getUTCMonth() &&
                    today.getUTCDate() < birthDate.getUTCDate()
                );

            if (beforeBirthday) {
                age--;
            }

            // Validate gender
            if (!["Male", "Female", "Other"].includes(gender)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid gender selection."
                });
            }

            // Create User and Patient together using transaction
            const session = await mongoose.startSession();

            try {
                await session.withTransaction(async () => {

                    const [user] = await User.create(
                        [{
                            name: name.trim(),
                            email: normalizedEmail,
                            password: hashedPassword,
                            role: "patient",
                            isVerified: true,
                            phone: cleanPhone
                        }],
                        { session }
                    );

                    await Patient.create(
                        [{
                            userId: user._id,
                            name: name.trim(),
                            email: normalizedEmail,
                            phone: cleanPhone,
                            dateOfBirth: birthDate,
                            age,
                            gender,
                            address: address?.trim() || ""
                        }],
                        { session }
                    );
                });

            } finally {
                await session.endSession();
            }

            return res.status(201).json({
                success: true,
                message: "Patient registered successfully.",
                data: {
                    name,
                    email: normalizedEmail,
                    role: "patient"
                }
            });
        }


        // Resolve departmentId for doctor if omitted
        let assignedDeptId = departmentId;
        if (selectedRole === "doctor" && !assignedDeptId && specialization) {
            const Department = (await import("../models/Department.js")).default;
            const baseName = specialization.trim().replace(/s$/, "");
            const foundDept = await Department.findOne({
                name: new RegExp("^" + baseName, "i")
            });
            if (foundDept) {
                assignedDeptId = foundDept._id;
            }
        }

        // Create common User account
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: normalizedRole,
            isVerified: normalizedRole === "patient",

            // Doctor-specific fields
            ...(normalizedRole === "doctor" && {
                specialization: specialization.trim(),
                qualification: qualification.trim(),
                experience: Number(experience || 0),
                departmentId: assignedDeptId || undefined
            })
        });

        // Create separate Doctor profile
        if (selectedRole === "doctor") {
            try {
                await Doctor.create({
                    userId: user._id,
                    specialization: specialization.trim(),
                    qualification: qualification.trim(),
                    experience: Number(experience || 0),
                    departmentId: assignedDeptId || undefined
                });
            } catch (profileError) {
                // Remove User if Doctor profile creation fails
                await User.findByIdAndDelete(user._id);
                throw profileError;
            }
        }

        return res.status(201).json({
            success: true,
            message: selectedRole === "doctor"
                ? "Doctor registered. Verification is pending."
                : "Patient registered successfully.",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified
            }
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists"
            });
        }

        if (
            error.name === "ValidationError" ||
            error.name === "CastError"
        ) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        console.error("Registration error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to register user"
        });
    }
});


router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim()
        }).select("+password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        if (user.role === "doctor" && !user.isVerified) {
            return res.status(403).json({
                success: false,
                message: "Doctor account is awaiting verification"
            });
        }

        const token = jwt.sign(
            {
                userId: user._id.toString(),
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "1d"
            }
        );

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified
            }
        });
    } catch (error) {
        console.error("Login error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to log in"
        });
    }
});


router.get("/me", protect, (req, res) => {
    res.status(200).json({
        success: true,
        user: req.user
    });
});
router.get(
    "/admin-test",
    protect,
    authorizeRoles("admin"),
    (req, res) => {
        res.status(200).json({
            success: true,
            message: "Admin access granted"
        });
    }
);

export default router;