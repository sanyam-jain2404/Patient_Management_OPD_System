import mongoose from "mongoose";

const followUpSchema = new mongoose.Schema(
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
            required: true
        },
        consultationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Consultation"
        },
        instructions: {
            type: String,
            trim: true,
            required: true
        },
        dueDate: {
            type: Date,
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: ["Pending", "Reminder Sent", "Appointment Booked", "Completed", "Missed", "Cancelled"],
            default: "Pending",
            index: true
        },
        reminderSentAt: {
            type: Date
        },
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Appointment"
        },
        completedAt: {
            type: Date
        },
        missedAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

const FollowUp = mongoose.model("FollowUp", followUpSchema);
export default FollowUp;