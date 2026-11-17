import express from "express";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { getPendingDoctors, verifyDoctor } from "../controllers/adminController.js";

const router = express.Router();

router.get("/pending-doctors", protect, authorizeRoles("admin"), getPendingDoctors);
router.patch("/doctors/:id/verify", protect, authorizeRoles("admin"), verifyDoctor);

export default router;
