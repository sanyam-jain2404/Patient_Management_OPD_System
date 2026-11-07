import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            index: true
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Doctor",
            index: true
        },
        type: {
            type: String,
            enum: ["Appointment", "FollowUp", "Delay", "Queue", "System"],
            required: true,
            index: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        message: {
            type: String,
            required: true,
            trim: true
        },
        relatedId: {
            type: mongoose.Schema.Types.ObjectId
        },
        relatedModel: {
            type: String,
            enum: ["Appointment", "FollowUp", "Consultation", "Delay"]
        },
        isRead: {
            type: Boolean,
            default: false
        },
        readAt: {
            type: Date
        },
        // Reserved for future email/SMS/WhatsApp integration
        channels: {
            type: [String],
            enum: ["in_app", "email", "sms", "whatsapp"],
            default: ["in_app"]
        },
        emailSent: {
            type: Boolean,
            default: false
        },
        smsSent: {
            type: Boolean,
            default: false
        },
        whatsappSent: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

notificationSchema.index({ patientId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;