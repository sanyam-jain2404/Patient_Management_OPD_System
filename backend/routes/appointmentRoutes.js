import express from "express";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { bookAppointment, getAppointments, callNextPatient, updateAppointmentStatus, getQueue } from "../controllers/appointmentController.js";

const router = express.Router();

router.post("/", protect, bookAppointment);
router.get("/queue", protect, getQueue);
router.get("/", protect, getAppointments);
router.post("/call-next", protect, authorizeRoles("doctor"), callNextPatient);
router.patch("/:id/status", protect, authorizeRoles("admin", "doctor", "patient"), updateAppointmentStatus);

export default router;
