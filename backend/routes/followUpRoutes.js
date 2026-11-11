
import express from "express";
import mongoose from "mongoose";

import FollowUp from "../models/FollowUp.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";

import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = express.Router();

/*
GET /api/follow-ups

Patient  -> Own follow-ups
Doctor   -> Follow-ups recommended by them
Admin    -> All follow-ups
*/

router.get("/", protect, async (req, res) => {
    try {
        let filter = {};

        if (req.user.role === "patient") {
            const patient = await Patient.findOne({
                userId: req.user._id
            });

            if (!patient) {
                return res.status(404).json({
                    success: false,
                    message: "Patient profile not found."
                });
            }

            filter.patientId = patient._id;
        }

        else if (req.user.role === "doctor") {
            const doctor = await Doctor.findOne({
                userId: req.user._id
            });

            if (!doctor) {
                return res.status(404).json({
                    success: false,
                    message: "Doctor profile not found."
                });
            }

            filter.doctorId = doctor._id;
        }

        else if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view follow-ups."
            });
        }

        const followUps = await FollowUp.find(filter)
            .populate("patientId", "name phone email")
            .populate({
                path: "doctorId",
                select: "specialization",
                populate: {
                    path: "userId",
                    select: "name email"
                }
            })
            .populate("consultationId", "diagnosis consultationDate")
            .populate("appointmentId", "appointmentDate appointmentTime tokenNumber status")
            .sort({ dueDate: 1 });

        res.status(200).json({
            success: true,
            count: followUps.length,
            data: followUps
        });

    } catch (error) {
        console.error("Fetch follow-ups error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch follow-ups."
        });
    }
});


/*
PATCH /api/follow-ups/:id/status

Doctor/Admin can update follow-up status.
Patient cannot update status.
*/

router.patch(
    "/:id/status",
    protect,
    authorizeRoles("doctor", "admin"),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!mongoose.isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid follow-up ID."
                });
            }

            const allowedStatuses = [
                "Completed",
                "Missed",
                "Cancelled"
            ];

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid status. Allowed: Completed, Missed, Cancelled."
                });
            }

            const followUp = await FollowUp.findById(id);

            if (!followUp) {
                return res.status(404).json({
                    success: false,
                    message: "Follow-up not found."
                });
            }

            // Doctor can update only their own recommended follow-ups.
            if (req.user.role === "doctor") {
                const doctor = await Doctor.findOne({
                    userId: req.user._id
                });

                if (!doctor || !followUp.doctorId.equals(doctor._id)) {
                    return res.status(403).json({
                        success: false,
                        message: "You can only update your own follow-ups."
                    });
                }
            }

            if (
                ["Completed", "Missed", "Cancelled"].includes(followUp.status)
            ) {
                return res.status(400).json({
                    success: false,
                    message: `This follow-up is already ${followUp.status}.`
                });
            }

            followUp.status = status;

            if (status === "Completed") {
                followUp.completedAt = new Date();
            }

            if (status === "Missed") {
                followUp.missedAt = new Date();
            }

            await followUp.save();

            res.status(200).json({
                success: true,
                message: `Follow-up marked as ${status}.`,
                data: followUp
            });

        } catch (error) {
            console.error("Update follow-up error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to update follow-up status."
            });
        }
    }
);

export default router;
