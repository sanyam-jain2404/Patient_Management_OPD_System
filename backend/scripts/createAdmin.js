
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

const createAdmin = async () => {
    try {
        const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

        if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
            throw new Error(
                "Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD first."
            );
        }

        if (ADMIN_PASSWORD.length < 12) {
            throw new Error(
                "Admin password must be at least 12 characters."
            );
        }

        await connectDB();

        // Never create another admin if one already exists
        const existingAdmin = await User.findOne({ role: "admin" });

        if (existingAdmin) {
            throw new Error(
                "An admin already exists. Admin creation stopped."
            );
        }

        const email = ADMIN_EMAIL.toLowerCase().trim();

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            throw new Error(
                "This email already belongs to an account. Use another email."
            );
        }

        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

        const admin = await User.create({
            name: ADMIN_NAME.trim(),
            email,
            password: hashedPassword,
            role: "admin",
            isVerified: true
        });

        console.log("Admin created successfully!");
        console.log("Admin email:", admin.email);
    } catch (error) {
        console.error("Admin creation failed:", error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

createAdmin();
