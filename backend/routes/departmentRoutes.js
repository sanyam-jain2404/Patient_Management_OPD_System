import express from "express";
import Department from "../models/Department.js";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = express.Router();

/**
 * GET /api/departments
 * Fetch all active departments. Public or protected (depending on requirements).
 * Let's keep it protected to authenticated users.
 */
router.get("/", protect, async (req, res) => {
    try {
        const departments = await Department.find({ isActive: true }).sort({ name: 1 });
        res.status(200).json({
            success: true,
            count: departments.length,
            data: departments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Unable to fetch departments"
        });
    }
});

/**
 * POST /api/departments
 * Admin creates a new department.
 */
router.post("/", protect, authorizeRoles("admin"), async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Department name is required"
            });
        }
        const department = await Department.create({ name, description });
        res.status(201).json({
            success: true,
            data: department
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Unable to create department"
        });
    }
});

export default router;
