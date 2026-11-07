import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        dosage: {
            type: String,
            trim: true,
            default: ""
        },
        duration: {
            type: String,
            trim: true,
            default: ""
        },
        frequency: {
            type: String,
            trim: true,
            default: ""
        },
        instructions: {
            type: String,
            trim: true,
            default: ""
        }
    },
    { _id: true }
);

const consultationSchema = new mongoose.Schema(
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
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Appointment",
            required: true,
            unique: true
        },
        departmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            required: true
        },
        consultationDate: {
            type: Date,
            required: true
        },
        symptoms: {
            type: String,
            trim: true,
            default: ""
        },
        diagnosis: {
            type: String,
            trim: true,
            required: true
        },
        treatment: {
            type: String,
            trim: true,
            default: ""
        },
        notes: {
            type: String,
            trim: true,
            default: ""
        },
        medicines: {
            type: [medicineSchema],
            default: []
        },
        followUpRecommendation: {
            type: String,
            trim: true,
            default: ""
        },
        followUpDate: {
            type: Date
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        deletedAt: {
            type: Date
        },
        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
);

// A patient's treatment history is best viewed as a timeline
consultationSchema.index({ patientId: 1, consultationDate: -1 });

const Consultation = mongoose.model("Consultation", consultationSchema);
export default Consultation;