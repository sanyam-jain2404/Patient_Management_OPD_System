
import mongoose from "mongoose";

const dischargeSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: true
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Appointment",
    required: true,
    unique: true
  },
  dischargeDate: {
    type: Date,
    default: Date.now
  },
  vitals: {
    bp: String,
    temp: String,
    pulse: String,
    weight: String
  },
  prescribedDisease: String,
  prescription: String,
  dischargeNotes: String
}, { timestamps: true });

export default mongoose.model("Discharge", dischargeSchema);
