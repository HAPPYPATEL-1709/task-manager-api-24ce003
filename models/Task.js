const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Title is required"],
        trim: true
    },

    description: {
        type: String,
        required: [true, "Description is required"],
        trim: true
    },

    completed: {
        type: Boolean,
        default: false
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    priority: {
        type: String,
        enum: {
            values: ["low", "medium", "high"],
            message: "Priority must be low, medium, or high"
        },
        default: "medium"
    }
});

// Pre-save hook: automatically trim whitespace from title
taskSchema.pre("save", function () {
    if (this.title) {
        this.title = this.title.trim();
    }
});

module.exports = mongoose.model("Task", taskSchema);