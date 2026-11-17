import express from "express";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { getActivities } from "../controllers/activityController.js";

const router = express.Router();

router.get("/", protect, authorizeRoles("admin", "doctor"), getActivities);

export default router;
