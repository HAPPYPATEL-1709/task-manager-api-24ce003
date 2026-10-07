# Task Management API — Full Stack Backend

A robust Express.js, MongoDB, and Mongoose REST API implementing JWT authentication, middleware pipelines, in-memory caching, query optimization, and event-driven asynchronous background processing.

---

## Practicals Index
- [Practical 7: Authentication and Middleware Pipeline](#practical-7-authentication--middleware-pipeline)
- [Practical 9: In-Memory Caching and Query Optimization](#practical-9-in-memory-caching--query-optimization)
- [Practical 10: Asynchronous Processing with Event-Driven Architecture](#practical-10-asynchronous-processing-with-event-driven-architecture)

---

## Practical 7: Authentication & Middleware Pipeline

- **User Registration & Login**: Password hashing with `bcryptjs` (10 rounds).
- **JWT Protection**: Signed JSON Web Tokens with 1h expiry attached to `Authorization: Bearer <token>`.
- **Validation Pipeline**: Server-side payload validation for user registration, login, and task operations.
- **Protected `/me` Route**: Retrieves currently authenticated user profile.

---

## Practical 9: In-Memory Caching & Query Optimization

- **In-Memory Caching (`node-cache`)**: Caches `GET /tasks` and `GET /tasks/:id` with 60-second TTL.
- **Cache Invalidation**: Automatic key eviction on `POST`, `PUT`, and `DELETE` requests so stale data is never served.
- **Debug & Analytics Endpoint**: `GET /tasks/cache/stats` provides real-time hit/miss metrics and hit rate percentage.
- **Performance Benchmark**: Reduced average latency from **152.73 ms** (MongoDB) to **3.23 ms** (node-cache HIT) — **47.3x Speedup (97.9% reduction)**. Full report in [docs/caching_benchmark.md](docs/caching_benchmark.md).

---

## Practical 10: Asynchronous Processing with Event-Driven Architecture

- **Native `EventEmitter`**: Dedicated singleton module in `events/taskEvents.js`.
- **Decoupled Side Effects**: Dispatches background notifications on `task-created`, `task-updated`, and `task-deleted` events.
- **Non-blocking Request Cycle**: API response returns immediately (`201 Created`) before background workers finish simulated work (500ms).
- **Error Safe**: Registered error subscriber prevents unhandled errors from terminating the Node process.
- **Event Audit Log**: `GET /tasks/events/log` exposes the history of dispatched background events and timing deltas. Full report in [docs/event_driven_architecture.md](docs/event_driven_architecture.md).

---

## API Endpoints Reference

### Authentication
- `POST /auth/register` — Register new user
- `POST /auth/login` — Login & receive JWT
- `GET /auth/me` — Get authenticated user details

### Tasks (Protected by Auth Middleware)
- `GET /tasks` — Get all tasks (Cached, 60s TTL)
- `GET /tasks/:id` — Get single task (Cached)
- `POST /tasks` — Create task (Invalidates cache, emits `task-created`)
- `PUT /tasks/:id` — Update task (Invalidates cache, emits `task-updated`)
- `DELETE /tasks/:id` — Delete task (Invalidates cache, emits `task-deleted`)
- `GET /tasks/cache/stats` — Real-time cache metrics & hit rate
- `GET /tasks/events/log` — Background event audit trail & timing deltas

---

## Automated Test Suites

```bash
# Run Practical 7 Test Suite
node test_practical7.js

# Run Practical 9 Caching & Benchmark Suite
node test_practical9.js

# Run Practical 10 Event-Driven Architecture Suite
node test_practical10.js
```