import express from "express";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { getFollowUps, updateFollowUpStatus } from "../controllers/followUpController.js";

const router = express.Router();

router.get("/", protect, getFollowUps);
router.patch("/:id/status", protect, authorizeRoles("doctor", "admin"), updateFollowUpStatus);

export default router;
