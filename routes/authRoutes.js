const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");
const { validateRegister, validateLogin } = require("../middleware/validation");

const router = express.Router();

/**
 * Generate JWT Token helper
 */
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            email: user.email,
            name: user.name
        },
        process.env.JWT_SECRET || "default_jwt_secret_key",
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "1h"
        }
    );
};

/**
 * @route   POST /register (or /auth/register)
 * @desc    Register a new user, hash password, return JWT token
 * @access  Public
 */
router.post("/register", validateRegister, async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            return res.status(400).json({
                error: "A user with this email address already exists"
            });
        }

        // Create new user (password is securely hashed via pre-save hook)
        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password
        });

        // Generate JWT token
        const token = generateToken(user);

        res.status(201).json({
            message: "User registered successfully",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * @route   POST /login (or /auth/login)
 * @desc    Authenticate user credentials, return JWT token
 * @access  Public
 */
router.post("/login", validateLogin, async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        // Verify password using bcrypt compare
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        // Sign JWT
        const token = generateToken(user);

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * @route   GET /me (or /auth/me)
 * @desc    Get currently logged-in user profile from decoded JWT
 * @access  Private (Protected by authMiddleware)
 */
router.get("/me", authMiddleware, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({
                error: "User not found"
            });
        }

        res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
