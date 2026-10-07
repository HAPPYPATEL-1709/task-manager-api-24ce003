const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Register Event-Driven Architecture Listeners on startup
require("./events/listeners");

const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Core Middlewares
app.use(express.json());
app.use(cors());

// 2. Global Request Logging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// 3. Content-Type Validation Middleware for mutating requests
app.use((req, res, next) => {
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
        const contentType = req.headers["content-type"];
        if (!contentType || !contentType.includes("application/json")) {
            return res.status(400).json({
                error: "Content-Type must be application/json"
            });
        }
    }
    next();
});

// 4. API Routes
// Auth endpoints mounted at both /auth and root for complete compatibility
app.use("/auth", authRoutes);
app.use("/", authRoutes); // supports /register, /login, /me

// Protected Task endpoints with caching and event emissions
app.use("/tasks", taskRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        service: "Task Management API"
    });
});

// 5. 404 Route Not Found Handler
app.use(notFoundHandler);

// 6. Global Centralized Error Handling Middleware
app.use(errorHandler);

// 7. Database Connection and Server Startup
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("CRITICAL ERROR: MONGO_URI is not defined in .env file");
    process.exit(1);
}

mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log("-------------------------------------------------");
        console.log(" Connected to MongoDB successfully");
        console.log(` Server running on http://localhost:${PORT}`);
        console.log("-------------------------------------------------");
        app.listen(PORT);
    })
    .catch((err) => {
        console.error("MongoDB connection failed:", err.message);
    });

module.exports = app;