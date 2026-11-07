import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true
        },
        userRole: {
            type: String,
            enum: ["patient", "doctor", "admin"]
        },
        action: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        resource: {
            type: String,
            required: true,
            trim: true
        },
        resourceId: {
            type: mongoose.Schema.Types.ObjectId
        },
        method: {
            type: String,
            trim: true
        },
        ip: {
            type: String,
            trim: true
        },
        userAgent: {
            type: String,
            trim: true
        },
        before: {
            type: mongoose.Schema.Types.Mixed
        },
        after: {
            type: mongoose.Schema.Types.Mixed
        },
        note: {
            type: String,
            trim: true,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;