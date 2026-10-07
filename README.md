# Task Management API — Full Stack Backend

A robust Express.js, MongoDB, and Mongoose REST API implementing JWT authentication, middleware pipelines, in-memory caching, and query optimization.

---

## Practicals Index
- [Practical 7: Authentication and Middleware Pipeline](#practical-7-authentication--middleware-pipeline)
- [Practical 9: In-Memory Caching and Query Optimization](#practical-9-in-memory-caching--query-optimization)

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
- **Response Headers**: Returns `X-Cache: HIT` or `X-Cache: MISS` for transparent cache status inspection.

### Performance Benchmark Summary

| Condition | Average Latency | Speedup |
| :--- | :--- | :--- |
| **Uncached (MongoDB Cloud)** | `152.73 ms` | Baseline |
| **Cached In-Memory (`node-cache`)** | `3.23 ms` | **47.3x Faster (97.9% Latency Reduction)** |

Detailed benchmark readings and viva analysis are documented in [docs/caching_benchmark.md](docs/caching_benchmark.md).

---

## API Endpoints Reference

### Authentication
- `POST /auth/register` — Register new user
- `POST /auth/login` — Login & receive JWT
- `GET /auth/me` — Get authenticated user details

### Tasks (Protected by Auth Middleware)
- `GET /tasks` — Get all tasks (Cached, 60s TTL)
- `GET /tasks/:id` — Get single task (Cached)
- `POST /tasks` — Create task (Invalidates list cache)
- `PUT /tasks/:id` — Update task (Invalidates item & list cache)
- `DELETE /tasks/:id` — Delete task (Invalidates item & list cache)
- `GET /tasks/cache/stats` — Real-time cache metrics & hit rate

---

## Automated Test Suites

```bash
# Run Practical 7 Test Suite
node test_practical7.js

# Run Practical 9 Caching & Benchmark Suite
node test_practical9.js
```