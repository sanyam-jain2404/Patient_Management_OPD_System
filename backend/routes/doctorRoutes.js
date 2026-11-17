import express from "express";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { getAllDoctors, getOwnProfile, updateOwnProfile, updateDoctorByAdmin, getOwnAvailability, updateOwnAvailability } from "../controllers/doctorController.js";

const router = express.Router();

router.get("/", protect, getAllDoctors);
router.get("/me/availability", protect, authorizeRoles("doctor"), getOwnAvailability);
router.put("/me/availability", protect, authorizeRoles("doctor"), updateOwnAvailability);
router.get("/me", protect, authorizeRoles("doctor"), getOwnProfile);
router.patch("/me", protect, authorizeRoles("doctor"), updateOwnProfile);
router.patch("/:id", protect, authorizeRoles("admin"), updateDoctorByAdmin);

export default router;
