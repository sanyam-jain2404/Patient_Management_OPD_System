import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Department from "../models/Department.js";

dotenv.config();

const DEPARTMENTS = [
    { name: "General Medicine", description: "General health consultations and routine checkups" },
    { name: "Cardiology", description: "Heart and cardiovascular care" },
    { name: "Dermatology", description: "Skin, hair, and nail treatments" },
    { name: "Orthopedic", description: "Bone, joint, and muscle care" },
    { name: "Neurology", description: "Brain, spine, and nervous system disorders" },
    { name: "Pediatrics", description: "Infant, child, and adolescent healthcare" },
    { name: "ENT", description: "Ear, nose, and throat specialist care" },
    { name: "Gynecology", description: "Women's reproductive health and maternal care" }
];

const seed = async () => {
    try {
        await connectDB();
        for (const dept of DEPARTMENTS) {
            await Department.updateOne(
                { name: dept.name },
                { $set: dept },
                { upsert: true }
            );
        }
        console.log("Departments seeded successfully!");
    } catch (err) {
        console.error("Seeding failed:", err.message);
    } finally {
        await mongoose.disconnect();
    }
};

seed();
