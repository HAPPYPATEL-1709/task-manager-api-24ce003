/**
 * Input Validation Middleware
 * Enforces server-side validation rules before requests reach controllers
 */

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validate User Registration payload
const validateRegister = (req, res, next) => {
    const { name, email, password } = req.body;
    const errors = {};

    // 1. Name validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
        errors.name = "Name is required and must be at least 2 characters long";
    }

    // 2. Email validation (format and presence)
    if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
        errors.email = "A valid email address is required (e.g. user@example.com)";
    }

    // 3. Password length validation
    if (!password || typeof password !== "string" || password.length < 6) {
        errors.password = "Password is required and must be at least 6 characters long";
    }

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({
            error: "Validation failed",
            details: errors
        });
    }

    next();
};

// Validate User Login payload
const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    const errors = {};

    if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
        errors.email = "A valid email address is required";
    }

    if (!password || typeof password !== "string" || password.trim() === "") {
        errors.password = "Password is required";
    }

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({
            error: "Validation failed",
            details: errors
        });
    }

    next();
};

// Validate Task Creation payload
const validateTask = (req, res, next) => {
    const { title, description, priority } = req.body;
    const errors = {};

    // Rule 1: Title required & non-empty
    if (!title || typeof title !== "string" || title.trim().length === 0) {
        errors.title = "Task title is required and cannot be empty";
    }

    // Rule 2: Description required & non-empty
    if (!description || typeof description !== "string" || description.trim().length === 0) {
        errors.description = "Task description is required and cannot be empty";
    }

    // Rule 3: Priority check if supplied
    if (priority && !["low", "medium", "high"].includes(priority)) {
        errors.priority = "Priority must be one of: 'low', 'medium', or 'high'";
    }

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({
            error: "Validation failed",
            details: errors
        });
    }

    next();
};

// Validate Task Update payload
const validateTaskUpdate = (req, res, next) => {
    const { title, description, priority, completed } = req.body;
    const errors = {};

    if (title !== undefined) {
        if (typeof title !== "string" || title.trim().length === 0) {
            errors.title = "Task title cannot be empty";
        }
    }

    if (description !== undefined) {
        if (typeof description !== "string" || description.trim().length === 0) {
            errors.description = "Task description cannot be empty";
        }
    }

    if (priority !== undefined && !["low", "medium", "high"].includes(priority)) {
        errors.priority = "Priority must be one of: 'low', 'medium', or 'high'";
    }

    if (completed !== undefined && typeof completed !== "boolean") {
        errors.completed = "Completed must be a boolean value (true/false)";
    }

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({
            error: "Validation failed",
            details: errors
        });
    }

    next();
};

module.exports = {
    validateRegister,
    validateLogin,
    validateTask,
    validateTaskUpdate
};
