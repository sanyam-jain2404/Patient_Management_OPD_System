
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
            type: String,
            required: true,
            index: true
        },

        appointmentTime: {
            type: String,
            required: true
        },

        status: {
            type: String,
            enum: [
                "Booked",
                "Waiting",
                "In Consultation",
                "Completed",
                "Discharged",
                "Cancelled",
                "No Show"
            ],
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

        // Original appointment reference.
        // This is retained for follow-up history.
        followUpOf: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Appointment",
            default: null
        },

        // FollowUp record linked to this appointment.
        // This reference will be removed when cancelled,
        // allowing the patient to book the follow-up again.
        followUpId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FollowUp",
            default: null
        }
    },
    {
        timestamps: true
    }
);


// 1. Unique token per doctor per date
appointmentSchema.index(
    {
        doctorId: 1,
        appointmentDate: 1,
        tokenNumber: 1
    },
    {
        unique: true
    }
);


// 2. Only one appointment can be linked
// to a particular FollowUp record at a time.
appointmentSchema.index(
    {
        followUpId: 1
    },
    {
        unique: true,
        partialFilterExpression: {
            followUpId: {
                $type: "objectId"
            }
        }
    }
);


const Appointment = mongoose.model(
    "Appointment",
    appointmentSchema
);

export default Appointment;
