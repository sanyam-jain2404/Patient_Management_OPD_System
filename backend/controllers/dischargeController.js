import mongoose from "mongoose";
import Discharge from "../models/Discharge.js";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import Consultation from "../models/Consultation.js";
import { ok, created, badRequest, notFound, conflict, serverError } from "../utils/respond.js";

export const createDischarge = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { vitals, prescribedDisease, prescription, dischargeNotes } = req.body;

        if (!mongoose.isValidObjectId(patientId)) return badRequest(res, "Invalid patient ID");

        const patient = await Patient.findById(patientId);
        if (!patient) return notFound(res, "Patient not found");

        let doctorId;

        if (req.user.role === "doctor") {
            const doctor = await Doctor.findOne({ userId: req.user._id });
            if (!doctor) return notFound(res, "Doctor profile not found");
            doctorId = doctor._id;
        }

        const appointmentQuery = {
            patientId,
            ...(doctorId ? { doctorId } : {}),
            status: { $nin: ["Cancelled", "No Show", "Discharged"] }
        };

        const appointments = await Appointment.find(appointmentQuery)
            .sort({ consultationEndedAt: -1, createdAt: -1 });

        let appointment = null;

        for (const item of appointments) {
            const alreadyDischarged = await Discharge.exists({ appointmentId: item._id });
            const consultationExists = await Consultation.exists({ appointmentId: item._id });

            if (!alreadyDischarged && consultationExists) {
                appointment = item;
                break;
            }
        }

        if (!appointment) {
            const existingDischarge = await Discharge.findOne({
                patientId,
                ...(doctorId ? { doctorId } : {})
            }).sort({ dischargeDate: -1 });

            if (existingDischarge) {
                return res.status(409).json({ success: false, alreadyDischarged: true, message: "This patient has already been discharged." });
            }

            return badRequest(res, "No eligible completed appointment found for discharge.");
        }

        const discharge = await Discharge.create({
            patientId,
            doctorId: appointment.doctorId,
            appointmentId: appointment._id,
            vitals,
            prescribedDisease,
            prescription,
            dischargeNotes
        });

        appointment.status = "Discharged";
        await appointment.save();

        return created(res, { message: "Patient discharged successfully", data: discharge });

    } catch (error) {
        console.error("Discharge error:", error);
        return serverError(res, error.message || "Unable to discharge patient");
    }
};

export const getDischarges = async (req, res) => {
    try {
        let query = {};

        if (req.user.role === "doctor") {
            const doctor = await Doctor.findOne({ userId: req.user._id });
            if (!doctor) return notFound(res, "Doctor not found");
            query.doctorId = doctor._id;
        }

        const records = await Discharge.find(query)
            .populate("patientId")
            .populate({ path: "doctorId", populate: { path: "userId", select: "name" } })
            .sort({ dischargeDate: -1 });

        return ok(res, { count: records.length, data: records });
    } catch {
        return serverError(res, "Unable to fetch discharge records");
    }
};
