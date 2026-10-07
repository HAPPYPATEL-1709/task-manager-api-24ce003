const jwt = require("jsonwebtoken");

/**
 * Authentication Middleware
 * Extracts and verifies JWT from Authorization header (Bearer <token>)
 * Sets req.user with decoded payload upon successful verification
 */
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader) {
        return res.status(401).json({
            error: "Access denied. No authorization header provided."
        });
    }

    // Header format must be "Bearer <token>"
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({
            error: "Invalid token format. Expected 'Bearer <token>'."
        });
    }

    const token = parts[1];
    if (!token) {
        return res.status(401).json({
            error: "Access denied. Token missing."
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret_key");
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({
                error: "Token has expired. Please log in again."
            });
        }
        return res.status(401).json({
            error: "Invalid token. Verification failed."
        });
    }
};

module.exports = authMiddleware;
