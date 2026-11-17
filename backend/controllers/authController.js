import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import { ok, created, badRequest, forbidden, conflict, serverError } from "../utils/respond.js";

export const register = async (req, res) => {
    try {
        const {
            name, email, password, role,
            specialization, qualification, experience, departmentId,
            phone, dateOfBirth, gender, address
        } = req.body;

        if (!name?.trim() || !email?.trim() || !password) {
            return badRequest(res, "Name, email and password are required");
        }

        if (password.length < 8) {
            return badRequest(res, "Password must be at least 8 characters");
        }

        const selectedRole = role || "patient";

        if (!["patient", "doctor"].includes(selectedRole)) {
            return badRequest(res, "Invalid role. Admin registration is not allowed.");
        }

        if (selectedRole === "doctor") {
            if (!specialization?.trim() || !qualification?.trim()) {
                return badRequest(res, "Specialization and qualification are required");
            }
        }

        const normalizedRole = selectedRole.toLowerCase();
        const normalizedEmail = email.toLowerCase().trim();

        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return conflict(res, "An account with this email already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        if (normalizedRole === "patient") {
            if (!phone?.trim() || !dateOfBirth || !gender) {
                return badRequest(res, "Phone, date of birth and gender are required.");
            }

            const cleanPhone = phone.trim().replace(/[\s()-]/g, "");

            if (!/^\+?\d{10,15}$/.test(cleanPhone)) {
                return badRequest(res, "Please enter a valid phone number.");
            }

            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
                return badRequest(res, "Invalid date of birth.");
            }

            const birthDate = new Date(`${dateOfBirth}T00:00:00.000Z`);

            if (Number.isNaN(birthDate.getTime()) || birthDate.toISOString().slice(0, 10) !== dateOfBirth) {
                return badRequest(res, "Please enter a valid date of birth.");
            }

            const today = new Date();
            const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

            if (birthDate.getTime() > todayUTC) {
                return badRequest(res, "Date of birth cannot be in the future.");
            }

            let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
            const beforeBirthday =
                today.getUTCMonth() < birthDate.getUTCMonth() ||
                (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() < birthDate.getUTCDate());

            if (beforeBirthday) age--;

            if (!["Male", "Female", "Other"].includes(gender)) {
                return badRequest(res, "Invalid gender selection.");
            }

            const session = await mongoose.startSession();

            try {
                await session.withTransaction(async () => {
                    const [user] = await User.create(
                        [{ name: name.trim(), email: normalizedEmail, password: hashedPassword, role: "patient", isVerified: true, phone: cleanPhone }],
                        { session }
                    );

                    await Patient.create(
                        [{ userId: user._id, name: name.trim(), email: normalizedEmail, phone: cleanPhone, dateOfBirth: birthDate, age, gender, address: address?.trim() || "" }],
                        { session }
                    );
                });
            } finally {
                await session.endSession();
            }

            return created(res, { message: "Patient registered successfully.", data: { name, email: normalizedEmail, role: "patient" } });
        }

        let assignedDeptId = departmentId;
        if (selectedRole === "doctor" && !assignedDeptId && specialization) {
            const Department = (await import("../models/Department.js")).default;
            const baseName = specialization.trim().replace(/s$/, "");
            const foundDept = await Department.findOne({ name: new RegExp("^" + baseName, "i") });
            if (foundDept) assignedDeptId = foundDept._id;
        }

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: normalizedRole,
            isVerified: normalizedRole === "patient",
            ...(normalizedRole === "doctor" && {
                specialization: specialization.trim(),
                qualification: qualification.trim(),
                experience: Number(experience || 0),
                departmentId: assignedDeptId || undefined
            })
        });

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
                await User.findByIdAndDelete(user._id);
                throw profileError;
            }
        }

        return created(res, {
            message: selectedRole === "doctor"
                ? "Doctor registered. Verification is pending."
                : "Patient registered successfully.",
            data: { id: user._id, name: user.name, email: user.email, role: user.role, isVerified: user.isVerified }
        });

    } catch (error) {
        if (error.code === 11000) return conflict(res, "An account with this email already exists");
        if (error.name === "ValidationError" || error.name === "CastError") return badRequest(res, error.message);

        console.error("Registration error:", error);
        return serverError(res, "Unable to register user");
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return badRequest(res, "Email and password are required");
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        if (user.role === "doctor" && !user.isVerified) {
            return forbidden(res, "Doctor account is awaiting verification");
        }

        const token = jwt.sign(
            { userId: user._id.toString(), role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
        );

        return ok(res, {
            message: "Login successful",
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, isVerified: user.isVerified }
        });

    } catch (error) {
        console.error("Login error:", error.message);
        return serverError(res, "Unable to log in");
    }
};

export const getMe = (req, res) => {
    return ok(res, { user: req.user });
};
