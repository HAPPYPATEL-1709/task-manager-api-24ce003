# Task Management API — Full Stack Backend

A robust Express.js, MongoDB, and Mongoose REST API implementing JWT authentication, middleware pipelines, in-memory caching, query optimization, event-driven asynchronous background processing, and full multi-container Docker & Docker Compose orchestration.

---

## Practicals Index
- [Practical 7: Authentication and Middleware Pipeline](#practical-7-authentication--middleware-pipeline)
- [Practical 9: In-Memory Caching and Query Optimization](#practical-9-in-memory-caching--query-optimization)
- [Practical 10: Asynchronous Processing with Event-Driven Architecture](#practical-10-asynchronous-processing-with-event-driven-architecture)
- [Practical 11: Containerization with Docker and Docker Compose](#practical-11-containerization-with-docker-and-docker-compose)

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

### Key Implementation Deliverables
1. **Backend Dockerfile (`Dockerfile`)**: Containerizes Node/Express API with layer-cached `npm install` and `node:18` base image.
2. **Frontend Dockerfile (`Dockerfile.frontend`)**: Containerizes React application with production build and preview server on port `5173`.
3. **Multi-Container Orchestration (`docker-compose.yml`)**: Unifies `frontend`, `backend`, and `mongodb` on `app-network` with health dependency and port mappings.
4. **Data Persistence (`mongo-data`)**: Persistent named volume for MongoDB so database state survives container restarts and rebuilds.
5. **Build Optimization (`.dockerignore`)**: Excludes `node_modules` and `.env` from build context for fast, lean builds.
6. **Detailed Documentation**: See [docs/docker_containerization.md](docs/docker_containerization.md) for full report, architecture diagram, and troubleshooting.

### Quick Start (Single Command Run)

```bash
# 1. Verify Docker installation
docker --version
docker compose version

# 2. Build and launch all 3 containers with a single command
docker-compose up --build

# 3. Confirm all 3 containers are running
docker ps
```

### Accessing the Stack
- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/health](http://localhost:5000/health)
- **MongoDB Database**: `mongodb://localhost:27017/taskdb`

### Key Viva Questions & Answers
- **Why backend references `mongodb` rather than `localhost`?** Containers reside in isolated network namespaces. On a custom bridge network (`app-network`), Docker's built-in DNS resolves container service names (`mongodb`) to container IPs. `localhost` inside the backend container refers only to the container itself.
- **Difference between `EXPOSE` and `ports`?** `EXPOSE` is container documentation/metadata. `ports` in `docker-compose.yml` actually binds and publishes host ports to container ports so the host browser can access the service.
- **Why avoid copying `node_modules` into image?** Prevents host OS binary mismatches (e.g. Windows vs Linux native modules), reduces build context transfer time, and guarantees reproducible Linux builds via `npm install`.

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
# Run Practical 7 Test Suite
node test_practical7.js

# Run Practical 9 Caching & Benchmark Suite
node test_practical9.js

# Run Practical 10 Event-Driven Architecture Suite
node test_practical10.js
```