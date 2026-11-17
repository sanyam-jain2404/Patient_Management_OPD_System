import express from "express";
import validate from "../middleware/validate.js";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { getDepartments, createDepartment } from "../controllers/departmentController.js";

const router = express.Router();

router.get("/", protect, getDepartments);
router.post("/", protect, authorizeRoles("admin"), validate([{ field: "name", required: true }]), createDepartment);

export default router;
