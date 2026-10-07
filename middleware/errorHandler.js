/**
 * Centralized Global Error Handling Middleware
 * Ensures consistent JSON response structure without exposing sensitive stack traces
 */

const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: "Route not found",
        path: req.originalUrl
    });
};

const errorHandler = (err, req, res, next) => {
    // Log error internally for debugging
    console.error(`[Error] ${err.name || "Error"}: ${err.message}`);

    // Mongoose schema validation errors
    if (err.name === "ValidationError") {
        const details = {};
        for (const field in err.errors) {
            details[field] = err.errors[field].message;
        }
        return res.status(400).json({
            error: "Validation failed",
            details
        });
    }

    // Invalid MongoDB ObjectId
    if (err.name === "CastError") {
        return res.status(400).json({
            error: `Invalid resource identifier format for '${err.path}'`
        });
    }

    // Duplicate key error (e.g. unique email)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || "field";
        return res.status(400).json({
            error: `A record with this ${field} already exists`
        });
    }

    // Malformed JSON payload
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return res.status(400).json({
            error: "Invalid JSON format in request body"
        });
    }

    // JWT verification errors
    if (err.name === "JsonWebTokenError") {
        return res.status(401).json({
            error: "Invalid token"
        });
    }

    if (err.name === "TokenExpiredError") {
        return res.status(401).json({
            error: "Token has expired"
        });
    }

    // Generic server errors (hide stack trace from response)
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
        error: statusCode === 500 ? "Internal Server Error. Please try again later." : err.message
    });
};

module.exports = {
    notFoundHandler,
    errorHandler
};
