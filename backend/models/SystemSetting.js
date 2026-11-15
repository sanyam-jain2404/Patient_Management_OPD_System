import mongoose from "mongoose";

const systemSettingSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            unique: true,
            default: "default"
        },
        hospitalName: {
            type: String,
            default: "City OPD Clinic",
            trim: true
        },
        doctorName: {
            type: String,
            default: "Dr. Sharma",
            trim: true
        },
        city: {
            type: String,
            default: "New Delhi",
            trim: true
        },
        phone: {
            type: String,
            default: "",
            trim: true
        },
        capacity: {
            type: Number,
            default: 50,
            min: 1
        },
        doctors: {
            type: [String],
            default: [
                "General Physician",
                "Cardiologist",
                "Dermatologist",
                "Orthopedic",
                "Neurologist",
                "Pediatrician",
                "ENT Specialist"
            ]
        }
    },
    {
        timestamps: true
    }
);

const SystemSetting = mongoose.model("SystemSetting", systemSettingSchema);
export default SystemSetting;
