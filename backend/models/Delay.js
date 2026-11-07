import mongoose from "mongoose";

const delaySchema = new mongoose.Schema(
    {
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Appointment",
            required: true,
            index: true
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Doctor",
            required: true,
            index: true
        },
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: true
        },
        reason: {
            type: String,
            required: true,
            trim: true
        },
        customReason: {
            type: String,
            trim: true,
            default: ""
        },
        recordedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        recordedByRole: {
            type: String,
            enum: ["doctor", "admin"]
        },
        newEstimatedWaitMinutes: {
            type: Number,
            default: 0
        },
        newEstimatedStartAt: {
            type: Date
        },
        previousEstimatedWaitMinutes: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

delaySchema.index({ doctorId: 1, appointmentDate: 1 });

const Delay = mongoose.model("Delay", delaySchema);
export default Delay;