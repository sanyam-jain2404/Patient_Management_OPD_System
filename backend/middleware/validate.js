/**
 * Lightweight input validation helper.
 * No external validation library required — keeps the dependency footprint small.
 */

const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

const isValidPhone = (phone) =>
    /^\d{10}$/.test(String(phone || "").replace(/\D/g, ""));

const sanitizeString = (val) =>
    String(val || "").trim().replace(/[<>]/g, "");

export const validate = (rules) => {
    return (req, res, next) => {
        const errors = [];
        const body = req.body;

        for (const rule of rules) {
            const { field, required, type, min, max, pattern, message } = rule;
            const value = body[field];

            if (required && (value === undefined || value === null || String(value).trim() === "")) {
                errors.push(message || `${field} is required`);
                continue;
            }

            if (value === undefined || value === null) continue;

            if (type === "email" && !isValidEmail(value)) {
                errors.push(message || `${field} must be a valid email address`);
            }

            if (type === "phone" && !isValidPhone(value)) {
                errors.push(message || `${field} must be a valid 10-digit phone number`);
            }

            if (type === "number" && isNaN(Number(value))) {
                errors.push(message || `${field} must be a number`);
            }

            if (type === "number" && min !== undefined && Number(value) < min) {
                errors.push(message || `${field} must be at least ${min}`);
            }

            if (type === "number" && max !== undefined && Number(value) > max) {
                errors.push(message || `${field} must be at most ${max}`);
            }

            if (type === "date" && isNaN(Date.parse(value))) {
                errors.push(message || `${field} must be a valid date`);
            }

            if (pattern && !pattern.test(String(value))) {
                errors.push(message || `${field} has an invalid format`);
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors
            });
        }

        // Sanitize string fields
        for (const key of Object.keys(body)) {
            if (typeof body[key] === "string") {
                body[key] = sanitizeString(body[key]);
            }
        }

        next();
    };
};

export const isValidObjectId = (id) =>
    /^[0-9a-fA-F]{24}$/.test(String(id || ""));

export default validate;