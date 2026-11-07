import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
    {
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: true,
            index: true
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Doctor",
            required: true,
            index: true
        },
        departmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            required: true
        },
        tokenNumber: {
            type: Number,
            required: true
        },
        appointmentDate: {
            type: String, // YYYY-MM-DD
            required: true,
            index: true
        },
        appointmentTime: {
            type: String, // HH:MM (24h)
            required: true
        },
        status: {
            type: String,
            enum: ["Booked", "Waiting", "In Consultation", "Completed", "Cancelled", "No Show"],
            default: "Booked",
            index: true
        },
        priority: {
            type: String,
            enum: ["Normal", "Emergency"],
            default: "Normal"
        },
        symptoms: {
            type: String,
            trim: true,
            default: ""
        },
        reason: {
            type: String,
            trim: true,
            default: ""
        },
        bookedAt: {
            type: Date,
            default: Date.now
        },
        consultationStartedAt: {
            type: Date
        },
        consultationEndedAt: {
            type: Date
        },
        cancelledAt: {
            type: Date
        },
        cancelReason: {
            type: String,
            trim: true,
            default: ""
        },
        noShowMarkedAt: {
            type: Date
        },
        estimatedWaitMinutes: {
            type: Number,
            default: 0
        },
        estimatedStartAt: {
            type: Date
        },
        followUpOf: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Appointment"
        }
    },
    {
        timestamps: true
    }
);

// Unique token per doctor per date
appointmentSchema.index(
    { doctorId: 1, appointmentDate: 1, tokenNumber: 1 },
    { unique: true }
);

const Appointment = mongoose.model("Appointment", appointmentSchema);
export default Appointment;