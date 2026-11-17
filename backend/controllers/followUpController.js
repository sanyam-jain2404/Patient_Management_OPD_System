import mongoose from "mongoose";
import FollowUp from "../models/FollowUp.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import { ok, badRequest, forbidden, notFound, serverError } from "../utils/respond.js";

export const getFollowUps = async (req, res) => {
    try {
        let filter = {};

        if (req.user.role === "patient") {
            const patient = await Patient.findOne({ userId: req.user._id });
            if (!patient) return notFound(res, "Patient profile not found.");
            filter.patientId = patient._id;

        } else if (req.user.role === "doctor") {
            const doctor = await Doctor.findOne({ userId: req.user._id });
            if (!doctor) return notFound(res, "Doctor profile not found.");
            filter.doctorId = doctor._id;

        } else if (req.user.role !== "admin") {
            return forbidden(res, "You are not authorized to view follow-ups.");
        }

        const followUps = await FollowUp.find(filter)
            .populate("patientId", "name phone email")
            .populate({
                path: "doctorId",
                select: "specialization",
                populate: { path: "userId", select: "name email" }
            })
            .populate({
                path: "consultationId",
                select: "diagnosis consultationDate departmentId",
                populate: { path: "departmentId", select: "name" }
            })
            .populate("appointmentId", "appointmentDate appointmentTime tokenNumber status")
            .sort({ dueDate: 1 });

        return ok(res, { count: followUps.length, data: followUps });

    } catch (error) {
        console.error("Fetch follow-ups error:", error);
        return serverError(res, "Unable to fetch follow-ups.");
    }
};

export const updateFollowUpStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!mongoose.isValidObjectId(id)) return badRequest(res, "Invalid follow-up ID.");

        const allowedStatuses = ["Completed", "Missed", "Cancelled"];

        if (!allowedStatuses.includes(status)) {
            return badRequest(res, "Invalid status. Allowed: Completed, Missed, Cancelled.");
        }

        const followUp = await FollowUp.findById(id);

        if (!followUp) return notFound(res, "Follow-up not found.");

        if (req.user.role === "doctor") {
            const doctor = await Doctor.findOne({ userId: req.user._id });
            if (!doctor || !followUp.doctorId.equals(doctor._id)) {
                return forbidden(res, "You can only update your own follow-ups.");
            }
        }

        if (["Completed", "Missed", "Cancelled"].includes(followUp.status)) {
            return badRequest(res, `This follow-up is already ${followUp.status}.`);
        }

        followUp.status = status;
        if (status === "Completed") followUp.completedAt = new Date();
        if (status === "Missed") followUp.missedAt = new Date();

        await followUp.save();

        return ok(res, { message: `Follow-up marked as ${status}.`, data: followUp });

    } catch (error) {
        console.error("Update follow-up error:", error);
        return serverError(res, "Unable to update follow-up status.");
    }
};
