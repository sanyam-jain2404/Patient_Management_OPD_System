
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import connectDB from "../config/db.js";
import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import Department from "../models/Department.js";

dotenv.config();

const DEPARTMENTS = [
    { name: "General Medicine", description: "General health checkups and consultations" },
    { name: "Cardiology", description: "Heart and cardiovascular care" },
    { name: "Dermatology", description: "Skin, hair and nail care" },
    { name: "Orthopedic", description: "Bone, joint and muscle care" },
    { name: "Neurology", description: "Brain and nervous system care" },
    { name: "Pediatrics", description: "Child healthcare" },
    { name: "ENT", description: "Ear, nose and throat care" },
    { name: "Gynecology", description: "Women's healthcare" }
];

const DOCTORS = [
    {
        name: "Dr. Rahul Sharma",
        email: "doctor1@opd.com",
        specialization: "General Medicine",
        qualification: "MBBS, MD",
        experience: 8,
        department: "General Medicine"
    },
    {
        name: "Dr. Priya Verma",
        email: "doctor2@opd.com",
        specialization: "Cardiology",
        qualification: "MBBS, MD Cardiology",
        experience: 10,
        department: "Cardiology"
    },
    {
        name: "Dr. Amit Kumar",
        email: "doctor3@opd.com",
        specialization: "Dermatology",
        qualification: "MBBS, MD Dermatology",
        experience: 6,
        department: "Dermatology"
    },
    {
        name: "Dr. Neha Gupta",
        email: "doctor4@opd.com",
        specialization: "Orthopedic",
        qualification: "MBBS, MS Orthopedics",
        experience: 7,
        department: "Orthopedic"
    }
];

const PATIENTS = [
    {
        name: "Aarav Singh",
        email: "patient1@opd.com",
        age: 22,
        gender: "Male",
        phone: "9000000001"
    },
    {
        name: "Ananya Sharma",
        email: "patient2@opd.com",
        age: 25,
        gender: "Female",
        phone: "9000000002"
    },
    {
        name: "Rohan Verma",
        email: "patient3@opd.com",
        age: 30,
        gender: "Male",
        phone: "9000000003"
    },
    {
        name: "Sneha Gupta",
        email: "patient4@opd.com",
        age: 28,
        gender: "Female",
        phone: "9000000004"
    },
    {
        name: "Kabir Jain",
        email: "patient5@opd.com",
        age: 35,
        gender: "Male",
        phone: "9000000005"
    }
];

const seedDatabase = async () => {
    try {
        const adminPassword = process.env.ADMIN_PASSWORD;
        const userPassword = process.env.SEED_USER_PASSWORD;

        if (!adminPassword || adminPassword.length < 12) {
            throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
        }

        if (!userPassword || userPassword.length < 8) {
            throw new Error("SEED_USER_PASSWORD must be at least 8 characters.");
        }

        await connectDB();

        // Safety check: never seed a different database accidentally.
        if (mongoose.connection.name !== "opd_patient_management") {
            throw new Error(
                `Wrong database: ${mongoose.connection.name}. Seeding stopped.`
            );
        }

        console.log("\nStarting OPD database seeding...\n");

        // 1. Create departments
        const departmentMap = {};

        for (const department of DEPARTMENTS) {
            const savedDepartment = await Department.findOneAndUpdate(
                { name: department.name },
                { $set: department },
                { upsert: true, new: true, runValidators: true }
            );

            departmentMap[department.name] = savedDepartment._id;
        }

        console.log("8 Departments created.");

        // 2. Create admin
        const adminEmail = (
            process.env.ADMIN_EMAIL || "admin@opd.com"
        ).toLowerCase().trim();

        const adminHash = await bcrypt.hash(adminPassword, 12);

        await User.findOneAndUpdate(
            { email: adminEmail },
            {
                $set: {
                    name: process.env.ADMIN_NAME || "OPD Admin",
                    email: adminEmail,
                    password: adminHash,
                    role: "admin",
                    isVerified: true
                }
            },
            { upsert: true, new: true, runValidators: true }
        );

        console.log("1 Admin created.");

        // 3. Create doctors and their profiles
        const userHash = await bcrypt.hash(userPassword, 12);

        for (const doctor of DOCTORS) {
            const departmentId = departmentMap[doctor.department];

            const user = await User.findOneAndUpdate(
                { email: doctor.email },
                {
                    $set: {
                        name: doctor.name,
                        email: doctor.email,
                        password: userHash,
                        role: "doctor",
                        isVerified: true,
                        specialization: doctor.specialization,
                        qualification: doctor.qualification,
                        experience: doctor.experience,
                        departmentId,
                        isAvailable: true
                    }
                },
                { upsert: true, new: true, runValidators: true }
            );

            await Doctor.findOneAndUpdate(
                { userId: user._id },
                {
                    $set: {
                        userId: user._id,
                        departmentId,
                        specialization: doctor.specialization,
                        qualification: doctor.qualification,
                        experience: doctor.experience,
                        isAvailable: true,
                        activePatientCount: 0,
                        avgConsultationMinutes: 10
                    }
                },
                { upsert: true, new: true, runValidators: true }
            );
        }

        console.log("4 Doctors and profiles created.");

        // 4. Create patients and their profiles
        for (const patient of PATIENTS) {
            const user = await User.findOneAndUpdate(
                { email: patient.email },
                {
                    $set: {
                        name: patient.name,
                        email: patient.email,
                        password: userHash,
                        role: "patient",
                        isVerified: true
                    }
                },
                { upsert: true, new: true, runValidators: true }
            );

            await Patient.findOneAndUpdate(
                { userId: user._id },
                {
                    $set: {
                        userId: user._id,
                        name: patient.name,
                        email: patient.email,
                        age: patient.age,
                        gender: patient.gender,
                        phone: patient.phone
                    }
                },
                { upsert: true, new: true, runValidators: true }
            );
        }

        console.log("5 Patients and profiles created.");

        // 5. Final counts
        console.log("\n========== SEED SUMMARY ==========");
        console.log("Users:", await User.countDocuments());
        console.log("Doctors:", await Doctor.countDocuments());
        console.log("Patients:", await Patient.countDocuments());
        console.log("Departments:", await Department.countDocuments());
        console.log("==================================");
        console.log("\nOPD database seeded successfully!");

    } catch (error) {
        console.error("\nSeeding failed:", error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

seedDatabase();
