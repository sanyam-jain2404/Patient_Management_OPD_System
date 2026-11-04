const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Please log in first"
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to access this resource"
            });
        }

        if (req.user.role === "doctor" && !req.user.isVerified) {
            return res.status(403).json({
                success: false,
                message: "Doctor account verification is pending"
            });
        }

        next();
    };
};

export default authorizeRoles;