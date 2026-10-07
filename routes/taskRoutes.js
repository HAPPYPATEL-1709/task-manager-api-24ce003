const express = require("express");
const Task = require("../models/Task");
const authMiddleware = require("../middleware/auth");
const { validateTask, validateTaskUpdate } = require("../middleware/validation");
const {
    getCache,
    setCache,
    delCache,
    delCacheKeys,
    getCacheStats
} = require("../utils/cache");

const router = express.Router();

// Protect ALL task routes with JWT Authentication Middleware
router.use(authMiddleware);

/**
 * @route   GET /tasks/cache/stats
 * @desc    Debug endpoint returning cache hits, misses, hit rate, and active keys
 * @access  Private
 */
router.get("/cache/stats", (req, res) => {
    const stats = getCacheStats();
    res.status(200).json({
        message: "Real-time NodeCache Statistics",
        stats
    });
});

/**
 * @route   GET /tasks
 * @desc    Get all tasks for authenticated user with in-memory caching (60s TTL)
 * @access  Private
 */
router.get("/", async (req, res, next) => {
    try {
        const userId = req.user.id;
        const cacheKey = `tasks_${userId}`;
        const bypassCache = req.query.bypassCache === "true" || req.headers["x-bypass-cache"] === "true";

        // 1. Check cache first if bypass is not requested
        if (!bypassCache) {
            const cachedTasks = getCache(cacheKey);
            if (cachedTasks) {
                res.setHeader("X-Cache", "HIT");
                res.setHeader("X-Cache-Key", cacheKey);
                return res.status(200).json(cachedTasks);
            }
        }

        // 2. Cache MISS or bypass -> Query MongoDB
        const startTime = Date.now();
        const tasks = await Task.find({
            $or: [{ user: userId }, { user: { $exists: false } }]
        }).sort({ createdAt: -1 });
        const dbQueryTimeMs = Date.now() - startTime;

        // 3. Store result in cache with standard TTL (60s)
        if (!bypassCache) {
            setCache(cacheKey, tasks, 60);
        }

        res.setHeader("X-Cache", "MISS");
        res.setHeader("X-Cache-Key", cacheKey);
        res.setHeader("X-DB-Time-Ms", dbQueryTimeMs.toString());
        res.status(200).json(tasks);
    } catch (err) {
        next(err);
    }
});

/**
 * @route   GET /tasks/:id
 * @desc    Get single task with individual task caching
 * @access  Private
 */
router.get("/:id", async (req, res, next) => {
    try {
        const taskId = req.params.id;
        const cacheKey = `task_${taskId}`;
        const bypassCache = req.query.bypassCache === "true";

        // 1. Check single task cache
        if (!bypassCache) {
            const cachedTask = getCache(cacheKey);
            if (cachedTask) {
                res.setHeader("X-Cache", "HIT");
                return res.status(200).json(cachedTask);
            }
        }

        // 2. Query MongoDB
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        // 3. Store in cache
        if (!bypassCache) {
            setCache(cacheKey, task, 60);
        }

        res.setHeader("X-Cache", "MISS");
        res.status(200).json(task);
    } catch (err) {
        next(err);
    }
});

/**
 * @route   POST /tasks
 * @desc    Create new task & INVALIDATE cached user tasks
 * @access  Private
 */
router.post("/", validateTask, async (req, res, next) => {
    try {
        const { title, description, priority } = req.body;
        const userId = req.user.id;

        const task = await Task.create({
            title: title.trim(),
            description: description.trim(),
            priority: priority || "medium",
            completed: false,
            user: userId
        });

        // CACHE INVALIDATION: Invalidate the user's tasks list cache on write
        delCache(`tasks_${userId}`);
        delCache("all_tasks");

        res.status(201).json(task);
    } catch (err) {
        next(err);
    }
});

/**
 * @route   PUT /tasks/:id
 * @desc    Update task & INVALIDATE cached task and list
 * @access  Private
 */
router.put("/:id", validateTaskUpdate, async (req, res, next) => {
    try {
        const taskId = req.params.id;
        const userId = req.user.id;

        const task = await Task.findByIdAndUpdate(
            taskId,
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

        // CACHE INVALIDATION: Clear updated task cache & list cache
        delCacheKeys([`tasks_${userId}`, `task_${taskId}`, "all_tasks"]);

        res.status(200).json(task);
    } catch (err) {
        next(err);
    }
});

/**
 * @route   DELETE /tasks/:id
 * @desc    Delete task & INVALIDATE cached task and list
 * @access  Private
 */
router.delete("/:id", async (req, res, next) => {
    try {
        const taskId = req.params.id;
        const userId = req.user.id;

        const task = await Task.findByIdAndDelete(taskId);

        if (!task) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        // CACHE INVALIDATION: Clear deleted task cache & list cache
        delCacheKeys([`tasks_${userId}`, `task_${taskId}`, "all_tasks"]);

        res.status(200).json({
            message: "Task deleted successfully",
            task
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
