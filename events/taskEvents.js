const EventEmitter = require("events");

/**
 * TaskEvents - Custom Event Emitter for decoupling background side-effects
 * (Notifications, audit logging, email triggers) from the main HTTP request/response pipeline.
 */
class TaskEvents extends EventEmitter {}

// Create and export singleton instance
const taskEvents = new TaskEvents();

// Set max listeners to prevent memory leak warnings in high-load scenarios
taskEvents.setMaxListeners(20);

module.exports = taskEvents;
