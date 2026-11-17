import express from "express";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { recordConsultation, getPatientHistory } from "../controllers/consultationController.js";

const router = express.Router();

router.post("/", protect, authorizeRoles("doctor"), recordConsultation);
router.get("/patient/:patientId", protect, authorizeRoles("patient", "doctor", "admin"), getPatientHistory);

export default router;
