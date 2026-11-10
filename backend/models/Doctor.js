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
        // Weekly working hours. dayOfWeek: Sunday=0 ... Saturday=6.
        // An empty schedule preserves the legacy isAvailable-only behaviour.
        weeklySchedule: {
            type: [{
                _id: false,
                dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
                isWorking: { type: Boolean, default: true },
                startTime: { type: String, default: "09:00" },
                endTime: { type: String, default: "17:00" },
                breakStart: { type: String, default: "13:00" },
                breakEnd: { type: String, default: "14:00" }
            }],
            default: []
        },
        // Date-specific leave or special working hours (YYYY-MM-DD).
        availabilityExceptions: {
            type: [{
                _id: false,
                date: { type: String, required: true },
                isAvailable: { type: Boolean, required: true },
                startTime: { type: String },
                endTime: { type: String },
                reason: { type: String, trim: true, maxlength: 200 }
            }],
            default: []
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