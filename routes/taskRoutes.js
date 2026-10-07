const express = require("express");
const Task = require("../models/Task");
const authMiddleware = require("../middleware/auth");
const { validateTask, validateTaskUpdate } = require("../middleware/validation");

const router = express.Router();

// Protect ALL task routes with JWT Authentication Middleware
router.use(authMiddleware);

/**
 * @route   GET /tasks
 * @desc    Get all tasks for the authenticated user
 * @access  Private
 */
router.get("/", async (req, res, next) => {
    try {
        // Query tasks belonging to the authenticated user, or tasks with no user assigned (legacy fallback)
        const tasks = await Task.find({
            $or: [{ user: req.user.id }, { user: { $exists: false } }]
        }).sort({ createdAt: -1 });

        res.status(200).json(tasks);
    } catch (err) {
        next(err);
    }
});

/**
 * @route   GET /tasks/:id
 * @desc    Get single task by ID
 * @access  Private
 */
router.get("/:id", async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        res.status(200).json(task);
    } catch (err) {
        next(err);
    }
});

/**
 * @route   POST /tasks
 * @desc    Create a new task for the authenticated user
 * @access  Private
 */
router.post("/", validateTask, async (req, res, next) => {
    try {
        const { title, description, priority } = req.body;

        const task = await Task.create({
            title: title.trim(),
            description: description.trim(),
            priority: priority || "medium",
            completed: false,
            user: req.user.id
        });

        res.status(201).json(task);
    } catch (err) {
        next(err);
    }
});

/**
 * @route   PUT /tasks/:id
 * @desc    Update an existing task
 * @access  Private
 */
router.put("/:id", validateTaskUpdate, async (req, res, next) => {
    try {
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!task) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        res.status(200).json(task);
    } catch (err) {
        next(err);
    }
});

/**
 * @route   DELETE /tasks/:id
 * @desc    Delete a task
 * @access  Private
 */
router.delete("/:id", async (req, res, next) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);

        if (!task) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        res.status(200).json({
            message: "Task deleted successfully",
            task
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
