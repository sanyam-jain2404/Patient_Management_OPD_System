import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
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
            trim: true
        },

        address: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

const Patient = mongoose.model("Patient", patientSchema);

export default Patient;