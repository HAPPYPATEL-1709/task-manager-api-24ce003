const express = require("express");

const app = express();

const PORT = 5000;


// -------------------------
// Built-in Middleware
// -------------------------

app.use(express.json());


// -------------------------
// Logging Middleware
// -------------------------

app.use((req, res, next) => {

    console.log(
        `${req.method} ${req.url} - ${new Date().toISOString()}`
    );

    next();

});

app.use((req, res, next) => {
    if (req.method === "POST" || req.method === "PUT") {
        if (req.headers["content-type"] !== "application/json") {
            return res.status(400).json({
                error: "Content-Type must be application/json"
            });
        }
    }

    next();
});


// -------------------------
// In-Memory Database
// -------------------------

let tasks = [

    {
        id: 1,
        title: "Learn React",
        completed: false
    },

    {
        id: 2,
        title: "Learn Node.js",
        completed: false
    }

];


// -------------------------
// GET All Tasks
// -------------------------

app.get("/tasks", (req, res) => {

    res.status(200).json(tasks);

});


// -------------------------
// GET Single Task
// -------------------------

app.get("/tasks/:id", (req, res) => {

    const id = Number(req.params.id);

    const task = tasks.find(
        (task) => task.id === id
    );

    if (!task) {

        return res.status(404).json({
            error: "Task not found"
        });

    }

    res.status(200).json(task);

});


// -------------------------
// POST Create Task
// -------------------------

app.post("/tasks", (req, res) => {

    const { title } = req.body;

    if (!title) {

        return res.status(400).json({
            error: "Title is required"
        });

    }

    const newTask = {

        id: tasks.length > 0
            ? tasks[tasks.length - 1].id + 1
            : 1,

        title: title,

        completed: false

    };

    tasks.push(newTask);

    res.status(201).json(newTask);

});


// -------------------------
// PUT Update Task
// -------------------------

app.put("/tasks/:id", (req, res) => {

    const id = Number(req.params.id);

    const task = tasks.find(
        (task) => task.id === id
    );

    if (!task) {

        return res.status(404).json({
            error: "Task not found"
        });

    }

    const { title, completed } = req.body;

    if (title !== undefined) {
        task.title = title;
    }

    if (completed !== undefined) {
        task.completed = completed;
    }

    res.status(200).json(task);

});


// -------------------------
// DELETE Task
// -------------------------

app.delete("/tasks/:id", (req, res) => {

    const id = Number(req.params.id);

    const taskIndex = tasks.findIndex(
        (task) => task.id === id
    );

    if (taskIndex === -1) {

        return res.status(404).json({
            error: "Task not found"
        });

    }

    const deletedTask = tasks.splice(taskIndex, 1);

    res.status(200).json({

        message: "Task deleted successfully",

        task: deletedTask[0]

    });

});


// -------------------------
// 404 Handler
// -------------------------

app.use((req, res) => {

    res.status(404).json({

        error: "Route not found",

        path: req.url

    });

});


// -------------------------
// Global Error Handler
// -------------------------

app.use((err, req, res, next) => {

    console.error(err.stack);

    res.status(500).json({

        error: "Something went wrong"

    });

});


// -------------------------
// Start Server
// -------------------------

app.listen(PORT, () => {

    console.log(
        `Server running on http://localhost:${PORT}`
    );

});