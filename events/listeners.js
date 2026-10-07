const taskEvents = require("./taskEvents");

// In-memory event audit log buffer for testing and status inspection
const eventAuditLog = [];

/**
 * Helper to record event audit entry
 */
const recordAuditEntry = (eventType, payload, startTimestamp, finishTimestamp) => {
    eventAuditLog.push({
        id: eventAuditLog.length + 1,
        eventType,
        title: payload.task?.title || payload.title || "Untitled",
        userEmail: payload.user?.email || "anonymous",
        dispatchedAt: startTimestamp,
        completedAt: finishTimestamp,
        durationMs: new Date(finishTimestamp).getTime() - new Date(startTimestamp).getTime()
    });

    if (eventAuditLog.length > 50) {
        eventAuditLog.shift(); // keep last 50 events
    }
};

/**
 * 1. Event Listener: 'task-created'
 * Decouples background notification sending (e.g. Email / Push / Audit logging)
 * from the critical HTTP response path.
 */
taskEvents.on("task-created", (data) => {
    const startTimestamp = new Date().toISOString();
    const taskTitle = data.task?.title || data.title || "Untitled";
    const userEmail = data.user?.email || "Unknown User";

    console.log(`[Notification Worker] 🚀 'task-created' event received at ${startTimestamp}`);
    console.log(`[Notification Worker]   ├─ Task Title: "${taskTitle}"`);
    console.log(`[Notification Worker]   └─ Assigned User: ${userEmail}`);

    // Simulate background email/webhook dispatch with artificial delay (500ms)
    setTimeout(() => {
        const finishTimestamp = new Date().toISOString();
        console.log(`[Notification Worker] ✅ Background processing finished at ${finishTimestamp} for "${taskTitle}"`);
        recordAuditEntry("task-created", data, startTimestamp, finishTimestamp);
    }, 500);
});

/**
 * 2. Event Listener: 'task-updated'
 */
taskEvents.on("task-updated", (data) => {
    const startTimestamp = new Date().toISOString();
    const taskTitle = data.task?.title || data.title || "Untitled";

    console.log(`[Audit Worker] 📝 'task-updated' event received at ${startTimestamp} for "${taskTitle}"`);

    setTimeout(() => {
        const finishTimestamp = new Date().toISOString();
        console.log(`[Audit Worker] ✅ Task update logged at ${finishTimestamp}`);
        recordAuditEntry("task-updated", data, startTimestamp, finishTimestamp);
    }, 300);
});

/**
 * 3. Event Listener: 'task-deleted' (Supplementary Problem)
 */
taskEvents.on("task-deleted", (data) => {
    const startTimestamp = new Date().toISOString();
    const taskTitle = data.title || "Untitled";

    console.log(`[Audit Worker] 🗑️ 'task-deleted' event received at ${startTimestamp} for "${taskTitle}"`);

    setTimeout(() => {
        const finishTimestamp = new Date().toISOString();
        console.log(`[Audit Worker] ✅ Task deletion audit recorded at ${finishTimestamp}`);
        recordAuditEntry("task-deleted", data, startTimestamp, finishTimestamp);
    }, 200);
});

/**
 * 4. Error Event Listener (Prevents unhandled event errors from crashing Node.js process)
 */
taskEvents.on("error", (err) => {
    console.error(`[Event Error Worker] ⚠️ Event handler encountered an error: ${err.message}`);
});

console.log(" Task Event Listeners registered and active.");

module.exports = {
    getEventHistory: () => [...eventAuditLog]
};
