import express from "express";
import validate from "../middleware/validate.js";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { getOwnProfile, getDoctorPatients, getAllPatients, getPatientById, createPatient, updatePatient } from "../controllers/patientController.js";

const router = express.Router();

router.get("/me", protect, authorizeRoles("patient"), getOwnProfile);
router.get("/doctor", protect, authorizeRoles("doctor"), getDoctorPatients);
router.get("/", protect, authorizeRoles("admin"), getAllPatients);
router.get("/:id", protect, authorizeRoles("admin", "doctor"), getPatientById);
router.post("/", protect, authorizeRoles("admin"), validate([
    { field: "name", required: true },
    { field: "age", required: true, type: "number", min: 0, max: 150 },
    { field: "gender", required: true },
    { field: "phone", required: true, type: "phone" }
]), createPatient);
router.put("/:id", protect, authorizeRoles("admin"), validate([
    { field: "age", type: "number", min: 0, max: 150 },
    { field: "phone", type: "phone" }
]), updatePatient);

export default router;
