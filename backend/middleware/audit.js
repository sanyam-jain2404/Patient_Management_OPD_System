import AuditLog from "../models/AuditLog.js";

/**
 * Audit middleware — logs important actions to the AuditLog collection.
 * Designed to be lightweight and non-blocking.
 */
export const audit = (action, resource) => {
    return async (req, res, next) => {
        // Capture original json() to intercept response body for "after" snapshot
        const originalJson = res.json.bind(res);
        res.json = function (body) {
            res._auditAfter = body;
            return originalJson(body);
        };

        res.on("finish", async () => {
            try {
                await AuditLog.create({
                    userId: req.user?._id,
                    userRole: req.user?.role,
                    action,
                    resource,
                    resourceId: req.params?.id || req.params?.appointmentId || req.params?.patientId,
                    method: req.method,
                    ip: req.ip || req.headers["x-forwarded-for"] || "",
                    userAgent: req.headers["user-agent"] || "",
                    note: res._auditNote || ""
                });
            } catch (err) {
                console.error("Audit log failed:", err.message);
            }
        });

        next();
    };
};

export const setAuditNote = (note) => (req, res, next) => {
    res._auditNote = note;
    next();
};

export default audit;