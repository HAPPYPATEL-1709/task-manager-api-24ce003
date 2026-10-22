# Practical 11: Containerization with Docker and Docker Compose

**Course Outcome / Program Outcome:** CO5 / PO3, PO5  
**Subject:** Advanced Web Frameworks (AWF)  
**Deliverable:** Full-stack Containerization of Task Management Application  

---

## 1. Objective

To containerize the full-stack Task Management application (React Frontend, Node.js/Express Backend, and MongoDB Database) using Docker and orchestrate all three services simultaneously with Docker Compose using a single command.

---

## 2. Architecture & Networking Diagram

```
                        Host Machine / Browser
                                   │
                  ┌────────────────┴────────────────┐
                  │ http://localhost:5173           │ http://localhost:5000
                  ▼                                 ▼
       ┌───────────────────────┐         ┌───────────────────────┐
       │   Frontend Container  │         │   Backend Container   │
       │     (React / Vite)    │         │    (Node / Express)   │
       │       Port: 5173      │         │       Port: 5000      │
       └──────────┬────────────┘         └──────────┬────────────┘
                  │                                 │
                  │  (Browser calls backend at      │
                  │   http://localhost:5000)        │
                  │                                 │
                  └─────────┐             ┌─────────┘
                            │             │
                            ▼             ▼
       ═══════════════════════════════════════════════════════════
                 Docker Bridge Network: `app-network`
       ═══════════════════════════════════════════════════════════
                                          │
                                          │ mongodb://mongodb:27017/taskdb
                                          ▼
                               ┌───────────────────────┐
                               │   MongoDB Container   │
                               │      (Image: mongo)   │
                               │       Port: 27017     │
                               └──────────┬────────────┘
                                          │
                                          ▼
                               ┌───────────────────────┐
                               │  Named Docker Volume  │
                               │     `mongo-data`      │
                               │   (/data/db on host)  │
                               └───────────────────────┘
```

---

## 3. Container Services Specification

| Service | Technology / Base Image | Container Port | Host Port | Network | Data Persistence |
|---|---|---|---|---|---|
| **frontend** | `node:18` (React + Vite Preview) | 5173 | 5173 | `app-network` | Stateless (built bundle) |
| **backend** | `node:18` (Express REST API) | 5000 | 5000 | `app-network` | Stateless |
| **mongodb** | `mongo:latest` | 27017 | 27017 | `app-network` | Named Volume `mongo-data` |

---

## 4. Dockerfiles Implementation

### 4.1 Backend Dockerfile (`task-manager-api/Dockerfile`)

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

#### Layer Optimization Strategy
- **Layer 1-2**: Setting base image `node:18` and working directory `/app`.
- **Layer 3-4**: Copying `package*.json` and executing `npm install` before copying source code. Docker caches the dependency installation layer; subsequent source code modifications do not trigger a slow `npm install` re-execution.
- **Layer 5**: Copying source files.
- **Layer 6-7**: Exposing container port 5000 and defining default launch command.

### 4.2 Frontend Dockerfile (`task-manager-frontend/Dockerfile`)

```dockerfile
FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host"]
```

#### Multi-Stage Alternative (`Dockerfile.multistage` - Nginx)
To satisfy the supplementary problem for extreme image size reduction, a multi-stage Nginx build is also provided:
```dockerfile
# Stage 1: Build production bundle
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Minimalist Nginx production server
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
*Result: Image size drops from ~1.1 GB down to ~25 MB.*

### 4.3 `.dockerignore` Implementation
Excludes non-essential and sensitive files from the Docker build context:
- `node_modules`: Prevents overwriting container Linux dependencies with host OS binaries and avoids sending gigabytes of files to Docker daemon.
- `.env`: Prevents baking database credentials or secrets into immutable container images.
- `.git`: Reduces build context size.

---

## 5. Docker Compose Orchestration (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    container_name: task-manager-mongodb
    restart: always
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_DATABASE=taskdb
    volumes:
      - mongo-data:/data/db
    networks:
      - app-network

  backend:
    build:
      context: ./task-manager-api
      dockerfile: Dockerfile
    container_name: task-manager-backend
    restart: always
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - MONGO_URI=mongodb://mongodb:27017/taskdb
      - JWT_SECRET=super_secret_jwt_practical_11_compose_2026
      - JWT_EXPIRES_IN=1h
    depends_on:
      - mongodb
    networks:
      - app-network

  frontend:
    build:
      context: ./task-manager-frontend
      dockerfile: Dockerfile
    container_name: task-manager-frontend
    restart: always
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:5000
    depends_on:
      - backend
    networks:
      - app-network

volumes:
  mongo-data:
    name: mongo-data
    driver: local

networks:
  app-network:
    name: app-network
    driver: bridge
```

---

## 6. Key Questions & Theoretical Analysis

### Q1: Why does the backend container need to reference the MongoDB container by its service name (`mongodb`) rather than `localhost`?
**Answer:**  
In Docker, every container executes in its own isolated network namespace with its own dedicated network stack and loopback interface (`localhost` / `127.0.0.1`).
- If the backend requests `localhost:27017`, it looks for a MongoDB process inside the *backend container itself*, which fails because MongoDB is not running there.
- When containers join a custom Docker bridge network (`app-network`), Docker provides an automatic embedded DNS server (listening at `127.0.0.11`). This DNS server automatically resolves any container's service name (e.g. `mongodb`) to its private IP address assigned on that bridge network.
- Hence, inter-container communication uses `mongodb://mongodb:27017/taskdb`.

### Q2: What is the difference between `EXPOSE` in a Dockerfile and the `ports` mapping in `docker-compose.yml`?
**Answer:**  
- **`EXPOSE` (Dockerfile)**: Metadata / documentation instruction. It communicates that the application inside the container listens on that port. It does **not** make the port accessible to the host machine's browser or external network.
- **`ports` (docker-compose.yml)**: Publishes and binds ports across the container boundary in `<HOST_PORT>:<CONTAINER_PORT>` format. It configures host network forwarding rules so that external clients (e.g., your browser at `http://localhost:5173`) can route requests directly into the container.

### Q3: Why is it considered bad practice to copy `node_modules` into a Docker image instead of running `npm install` inside the container?
**Answer:**  
1. **Architecture & OS Incompatibility**: Many Node modules contain native C/C++ compiled binaries (e.g., `bcrypt`, native crypto, bindings). If compiled on Windows or macOS host machines, these binaries will crash with `EXEC_FORMAT_ERROR` or missing shared library errors inside the Linux container.
2. **Build Context Bloat**: Copying hundreds of megabytes of `node_modules` across the Docker socket significantly slows down image build times.
3. **Reproducibility & Determinism**: Executing `npm install` (or `npm ci`) inside the container ensures clean, reproducible installation matching the container's exact Node.js and Linux environment specified in `package-lock.json`.

---

## 7. Step-by-Step Execution & Verification Guide

### Step 1: Verify Docker Installation
```bash
docker --version
docker compose version
```

### Step 2: Build and Start Stack
```bash
# Builds images and starts all 3 containers in foreground
docker-compose up --build

# Or start detached in background:
docker-compose up --build -d
```

### Step 3: Verify Running Containers
```bash
docker ps
```
*Expected output shows 3 healthy containers running:*
- `task-manager-frontend` on `0.0.0.0:5173->5173/tcp`
- `task-manager-backend` on `0.0.0.0:5000->5000/tcp`
- `task-manager-mongodb` on `0.0.0.0:27017->27017/tcp`

### Step 4: Verify Application End-to-End
- **Frontend Web UI**: Open `http://localhost:5173` in host browser. Register a user and manage tasks.
- **Backend Health Check**: Open `http://localhost:5000/health`. Returns `{ "status": "OK", "service": "Task Management API" }`.
- **Database Persistence**: Stop the containers with `docker-compose down`, start them again with `docker-compose up -d`. All previously created tasks remain intact because data is stored in the `mongo-data` named volume.

### Step 5: Teardown
```bash
# Stop containers but preserve volume data
docker-compose down

# Stop containers and destroy volume data (fresh wipe)
docker-compose down -v
```

---

## 8. Troubleshooting Guide

| Symptom | Probable Cause | Corrective Action |
|---|---|---|
| **Backend cannot connect to MongoDB** | Connection string still configured with `localhost` instead of Compose service name | Set `MONGO_URI=mongodb://mongodb:27017/taskdb` in `docker-compose.yml`. |
| **Port already in use (`bind: address already in use`)** | Another local process (local MongoDB, Express server, or old container) occupies 5000, 5173, or 27017 | Run `docker ps` to find and stop conflicting containers (`docker stop <id>`) or terminate local background Node processes. |
| **Build is extremely slow** | Host `node_modules` or `.git` directory is copied into build context | Verify `.dockerignore` contains `node_modules` and `.git`. |
| **Code changes not reflected** | Docker used cached intermediate image layers | Run `docker-compose up --build` to force rebuild of modified layers. |
