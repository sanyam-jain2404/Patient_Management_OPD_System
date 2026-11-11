import express from "express";
import Appointment from "../models/Appointment.js";
import Consultation from "../models/Consultation.js";
import FollowUp from "../models/FollowUp.js";
import Discharge from "../models/Discharge.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("admin", "doctor"),
  async (req, res) => {
    try {
      let appointmentQuery = {};
      let consultationQuery = {};
      let followUpQuery = {};
      let dischargeQuery = {};

      // Doctor can only see their own activities
      if (req.user.role === "doctor") {
        const doctor = await Doctor.findOne({
          userId: req.user._id
        });

        if (!doctor) {
          return res.status(404).json({
            success: false,
            message: "Doctor profile not found"
          });
        }

        appointmentQuery.doctorId = doctor._id;
        consultationQuery.doctorId = doctor._id;
        followUpQuery.doctorId = doctor._id;
        dischargeQuery.doctorId = doctor._id;
      }

      const [
        appointments,
        consultations,
        followUps,
        discharges
      ] = await Promise.all([
        Appointment.find(appointmentQuery)
          .populate("patientId", "name")
          .sort({ bookedAt: -1 }),

        Consultation.find({
          ...consultationQuery,
          isDeleted: false
        })
          .populate("patientId", "name")
          .sort({ consultationDate: -1 }),

        FollowUp.find(followUpQuery)
          .populate("patientId", "name")
          .sort({ createdAt: -1 }),

        Discharge.find(dischargeQuery)
          .populate("patientId", "name")
          .populate({
            path: "doctorId",
            populate: {
              path: "userId",
              select: "name"
            }
          })
          .sort({ dischargeDate: -1 })
      ]);

      const events = [];

      // Appointment activities
      appointments.forEach((appointment) => {
        const patientName =
          appointment.patientId?.name || "Unknown Patient";

        const addEvent = (date, name, icon, subtitle, label, type) => {
          if (!date) return;

          events.push({
            id: `${appointment._id}-${label}`,
            type,
            icon,
            name: patientName,
            subtitle,
            label,
            date,
            category:
              type === "admission" ? "Admission" : "System"
          });
        };

        addEvent(
          appointment.bookedAt,
          "Appointment Booked",
          "📅",
          `Token #${appointment.tokenNumber}`,
          "Booked",
          "admission"
        );

        addEvent(
          appointment.consultationStartedAt,
          "Consultation Started",
          "🩺",
          `Token #${appointment.tokenNumber}`,
          "Started",
          "system"
        );

        addEvent(
          appointment.consultationEndedAt,
          "Consultation Completed",
          "✅",
          `Token #${appointment.tokenNumber}`,
          "Completed",
          "system"
        );

        addEvent(
          appointment.cancelledAt,
          "Appointment Cancelled",
          "❌",
          appointment.cancelReason || "No reason provided",
          "Cancelled",
          "system"
        );

        addEvent(
          appointment.noShowMarkedAt,
          "Patient No Show",
          "⚠️",
          `Token #${appointment.tokenNumber}`,
          "No Show",
          "system"
        );
      });

      // Consultation activities
      consultations.forEach((consultation) => {
        events.push({
          id: `${consultation._id}-consultation`,
          type: "system",
          icon: "📋",
          name: consultation.patientId?.name || "Unknown Patient",
          subtitle: `Diagnosis: ${consultation.diagnosis}`,
          label: "Prescription Saved",
          date:
            consultation.createdAt ||
            consultation.consultationDate,
          category: "System"
        });
      });

      // Follow-up activities
      followUps.forEach((followUp) => {
        events.push({
          id: `${followUp._id}-followup`,
          type: "system",
          icon: "🔔",
          name: followUp.patientId?.name || "Unknown Patient",
          subtitle: followUp.instructions,
          label: "Follow-up Created",
          date: followUp.createdAt,
          category: "System"
        });
      });

      // Discharge activities
      discharges.forEach((discharge) => {
        events.push({
          id: `${discharge._id}-discharge`,
          type: "system",
          icon: "🚪",
          name: discharge.patientId?.name || "Unknown Patient",
          subtitle:
            discharge.dischargeNotes ||
            discharge.prescribedDisease ||
            "Patient successfully discharged",
          label: "Patient Discharged",
          date: discharge.dischargeDate || discharge.createdAt,
          category: "Discharge"
        });
      });

      // Latest activity first
      events.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      return res.status(200).json({
        success: true,
        count: events.length,
        data: events
      });

    } catch (error) {
      console.error("Activity fetch error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch activities"
      });
    }
  }
);

export default router;
