import express from "express";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { createDischarge, getDischarges } from "../controllers/dischargeController.js";

const router = express.Router();

router.post("/:patientId", protect, authorizeRoles("admin", "doctor"), createDischarge);
router.get("/", protect, authorizeRoles("admin", "doctor"), getDischarges);

export default router;
