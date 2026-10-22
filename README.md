# Task Management API — Full Stack Backend

[![CI Pipeline](https://github.com/HAPPYPATEL-1709/task-manager-api-24ce003/actions/workflows/ci.yml/badge.svg)](https://github.com/HAPPYPATEL-1709/task-manager-api-24ce003/actions/workflows/ci.yml)

A robust Express.js, MongoDB, and Mongoose REST API implementing JWT authentication, middleware pipelines, in-memory caching, query optimization, event-driven asynchronous background processing, full multi-container Docker & Docker Compose orchestration, and an automated GitHub Actions CI/CD pipeline.

---

## Practicals Index
- [Practical 7: Authentication and Middleware Pipeline](#practical-7-authentication--middleware-pipeline)
- [Practical 9: In-Memory Caching and Query Optimization](#practical-9-in-memory-caching--query-optimization)
- [Practical 10: Asynchronous Processing with Event-Driven Architecture](#practical-10-asynchronous-processing-with-event-driven-architecture)
- [Practical 11: Containerization with Docker and Docker Compose](#practical-11-containerization-with-docker-and-docker-compose)
- [Practical 12: CI/CD Pipeline with GitHub Actions](#practical-12-cicd-pipeline-with-github-actions)

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

## Practical 11: Containerization with Docker and Docker Compose

Orchestrates the entire multi-container full-stack application using Docker and Docker Compose with a single command.

### Multi-Container Architecture
```
docker-compose.yml
├── frontend (React + Vite, port 5173:5173)
├── backend (Node.js/Express, port 5000:5000)
└── mongodb (official mongo image, port 27017:27017, volume: mongo-data)
Network: app-network (bridge)
frontend ──► backend ──► mongodb
```

- **Single Command Launch**: `docker-compose up --build`
- **Data Persistence**: Named volume `mongo-data` for MongoDB state preservation across restarts.
- **Documentation**: Full details in [docs/docker_containerization.md](docs/docker_containerization.md).

---

## Practical 12: CI/CD Pipeline with GitHub Actions

Automates testing and integration of the backend application using a cloud-hosted GitHub Actions CI pipeline on every push and pull request to `main`.

### CI Architecture & Workflow Diagram
```
git push origin main
       │
       ▼
GitHub Actions Trigger (on: push, branches: [main])
       │
       ▼
Job: build-and-test (Runner: ubuntu-latest)
├── 1. actions/checkout@v4 (Clone repository)
├── 2. actions/setup-node@v4 (Node.js 18 + npm cache)
├── 3. npm install (Install runtime & dev dependencies)
└── 4. npm test (Jest + Supertest test execution)
       │
       ▼
Status: Green checkmark (Pass) or Red X (Fail) on GitHub
```

### Pipeline Key Deliverables
1. **Workflow File (`.github/workflows/ci.yml`)**: Automated trigger on `push` and `pull_request` to `main`, running on `ubuntu-latest` with Node 18.
2. **Automated Test Suite (`tests/api.test.js`)**: Jest + Supertest testing health endpoints, route protection, validation pipelines, and 404 handlers.
3. **Status Badge**: Real-time CI workflow status badge embedded at the top of this README.
4. **Failure & Recovery Demonstration**: Verified deliberate failure (Red ❌) caused by broken assertion and immediate recovery (Green ✅) once resolved. Full logs in [docs/ci_cd_pipeline.md](docs/ci_cd_pipeline.md).

### Key Viva Questions & Answers
- **Difference between CI and CD?** Continuous Integration (CI) is the practice of automatically testing and building code on every commit to verify that new changes integrate without regressions. Continuous Deployment (CD) automatically releases/deploys validated code into staging or production environments. This practical implements Continuous Integration (CI).
- **Why automatic testing on push catches problems earlier?** Shortens the feedback loop from weeks/days to minutes. Isolates regressions to the exact commit that introduced them, eliminating compound integration failures before release.
- **What happens if test file path is wrong?** The pipeline still fails with exit code 1 at the `npm test` step, but the failure log shows a file resolution/test discovery error rather than an assertion difference.

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
- `GET /health` — Service health check endpoint

---

## Automated Test Suites

```bash
# Run Jest CI Automated Test Suite (Practical 12)
npm test

# Run Practical 7 Auth & Middleware Test Suite
node test_practical7.js

# Run Practical 9 Caching & Benchmark Suite
node test_practical9.js

# Run Practical 10 Event-Driven Architecture Suite
node test_practical10.js
```