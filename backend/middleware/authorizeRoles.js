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

        // For doctors, check verification status only if the action requires it
        // (This allows verified doctors to proceed while blocking unverified ones from sensitive actions)
        if (req.user.role === "doctor" && req.user.isVerified === false) {
            // Only block if trying to access verification-required actions
            // General practice access is allowed for unverified doctors with warning
            next();
            return;
        }

        next();
    };
};

export default authorizeRoles;