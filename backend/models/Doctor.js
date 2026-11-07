import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true
        },
        departmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            index: true
        },
        specialization: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        qualification: {
            type: String,
            required: true,
            trim: true
        },
        experience: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        consultationDuration: {
            type: Number,
            default: 10,
            min: 1
        },
        isAvailable: {
            type: Boolean,
            default: true,
            index: true
        },
        // Cached workload for fast allocation decisions
        activePatientCount: {
            type: Number,
            default: 0,
            min: 0
        },
        // Cached average consultation duration (minutes)
        avgConsultationMinutes: {
            type: Number,
            default: 10,
            min: 1
        }
    },
    {
        timestamps: true
    }
);

doctorSchema.index({ specialization: 1, isAvailable: 1 });

const Doctor = mongoose.model("Doctor", doctorSchema);
export default Doctor;