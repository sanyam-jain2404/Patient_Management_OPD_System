import express from "express";
import validate from "../middleware/validate.js";
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { register, login, getMe } from "../controllers/authController.js";

const router = express.Router();

router.post(
    "/register",
    validate([
        { field: "name", required: true },
        { field: "email", required: true, type: "email" },
        { field: "password", required: true },
        { field: "phone", type: "phone" },
        { field: "dateOfBirth", type: "date" }
    ]),
    register
);

router.post(
    "/login",
    validate([
        {
            field: "email",
            required: true,
            type: "email",
            message: "A valid email is required"
        },
        {
            field: "password",
            required: true,
            message: "Password is required"
        }
    ]),
    login
);

router.get("/me", protect, getMe);

router.get(
    "/admin-test",
    protect,
    authorizeRoles("admin"),
    (req, res) => res.status(200).json({ success: true, message: "Admin access granted" })
);

export default router;
