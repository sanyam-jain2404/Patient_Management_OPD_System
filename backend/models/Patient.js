import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            unique: true,
            index: true
        },
        name: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        age: {
            type: Number,
            required: true,
            min: 0
        },
        gender: {
            type: String,
            enum: ["Male", "Female", "Other"],
            required: true
        },
        phone: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            default: ""
        },
        bloodGroup: {
            type: String,
            enum: ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−", ""],
            default: ""
        },
        address: {
            type: String,
            trim: true,
            default: ""
        },
        emergencyContact: {
            type: String,
            trim: true,
            default: ""
        },
        medicalHistory: {
            type: String,
            trim: true,
            default: ""
        },
        avatar: {
            type: String,
            trim: true,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

patientSchema.index({ name: "text" });

const Patient = mongoose.model("Patient", patientSchema);
export default Patient;