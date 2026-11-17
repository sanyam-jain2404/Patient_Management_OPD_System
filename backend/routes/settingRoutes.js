import express from "express";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { getSettings, updateSettings } from "../controllers/settingController.js";

const router = express.Router();

router.get("/", protect, authorizeRoles("admin"), getSettings);
router.put("/", protect, authorizeRoles("admin"), updateSettings);

export default router;
