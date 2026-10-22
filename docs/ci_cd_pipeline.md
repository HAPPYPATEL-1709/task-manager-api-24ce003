# Practical 12: CI/CD Pipeline with GitHub Actions

**Course Outcome / Program Outcome:** CO5 / PO3, PO5  
**Subject:** Advanced Web Frameworks (AWF)  
**Deliverable:** Continuous Integration Pipeline for Automated Testing & Quality Gate  

---

## 1. Objective

To automate testing and integration of the Task Management application using a Continuous Integration (CI) pipeline powered by GitHub Actions, validating that all code pushed to the `main` branch satisfies dependency integrity and passes automated test suites.

---

## 2. CI Pipeline Architecture & Lifecycle

```
 Developer Workstation
          │
          │ git push origin main
          ▼
 GitHub Remote Repository (Trigger: on.push.branches = [main])
          │
          ▼
 GitHub Actions Runner (VM: ubuntu-latest)
 ┌────────────────────────────────────────────────────────┐
 │ Job: build-and-test                                    │
 │                                                        │
 │ ├── 1. actions/checkout@v4                             │
 │ │      Clones repository into runner workspace        │
 │ │                                                      │
 │ ├── 2. actions/setup-node@v4                           │
 │ │      Provisions Node.js v18 & configures npm cache   │
 │ │                                                      │
 │ ├── 3. npm install                                     │
 │ │      Installs application and testing dependencies   │
 │ │                                                      │
 │ └── 4. npm test                                        │
 │        Executes Jest & Supertest test suite            │
 └─────────────────────────┬──────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
      Tests Passed (Exit 0)       Tests Failed (Exit 1)
             │                           │
             ▼                           ▼
     ✅ Green Checkmark              ❌ Red X Mark
   Merge/Release Approved         Deployment Blocked
```

---

## 3. Workflow File Breakdown (`.github/workflows/ci.yml`)

```yaml
name: CI Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-test:
    name: Build and Automated Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Node.js 18
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'

      - name: Install Dependencies
        run: npm install

      - name: Run Automated Tests
        run: npm test
        env:
          NODE_ENV: test
          PORT: 5000
          JWT_SECRET: super_secret_ci_pipeline_key_2026
```

### Key Components:
- **`on: push [main]`**: Automatically triggers the workflow whenever new code is merged or pushed to `main`.
- **`runs-on: ubuntu-latest`**: Spawns a clean, isolated Linux container virtual environment for repeatable builds.
- **`cache: 'npm'`**: Caches `~/.npm` dependencies across runs to speed up dependency resolution.
- **`NODE_ENV: test`**: Informs Express to skip live socket binding on port 5000 so Supertest handles ephemeral in-memory requests without port conflicts.

---

## 4. Automated Test Suite (`tests/api.test.js`)

The automated test suite utilizes **Jest** and **Supertest** to test critical HTTP endpoints and middleware:

```javascript
const request = require("supertest");
const app = require("../server");

describe("Task Management API Automated CI Test Suite", () => {
    // Test 1: Service Health Check Endpoint
    test("GET /health returns status 200 and OK status", async () => {
        const res = await request(app).get("/health");
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("status", "OK");
        expect(res.body).toHaveProperty("service", "Task Management API");
    });

    // Test 2: Security & Authentication Guard for Protected Endpoints
    test("GET /tasks without authorization token returns 401 Unauthorized", async () => {
        const res = await request(app).get("/tasks");
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty("error");
    });

    // Test 3: Input Validation Pipeline
    test("POST /auth/register with invalid payload returns 400 Bad Request", async () => {
        const res = await request(app)
            .post("/auth/register")
            .set("Content-Type", "application/json")
            .send({});
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty("error");
    });

    // Test 4: Centralized 404 Not Found Handling
    test("GET /api/nonexistent returns 404 Not Found", async () => {
        const res = await request(app).get("/api/nonexistent");
        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty("error");
    });
});
```

---

## 5. Pipeline Demonstration: Failed vs Passed Run

### 5.1 Deliberate Failure Demonstration
To simulate an intentional test failure, an assertion was modified to expect an impossible status code:
```javascript
// Deliberately broken assertion:
expect(res.statusCode).toBe(500); // Expected 500, received 200
```

#### GitHub Actions Runner Failure Output:
```text
FAIL tests/api.test.js
  Task Management API Automated CI Test Suite
    ✕ GET /health returns status 200 and OK status (92 ms)
    √ GET /tasks without authorization token returns 401 Unauthorized (12 ms)
    √ POST /auth/register with invalid payload returns 400 Bad Request (512 ms)
    √ GET /api/nonexistent returns 404 Not Found (11 ms)

  ● Task Management API Automated CI Test Suite › GET /health returns status 200 and OK status

    expect(received).toBe(expected) // Object.is equality

    Expected: 500
    Received: 200

      6 |     test("GET /health returns status 200 and OK status", async () => {
      7 |         const res = await request(app).get("/health");
    > 8 |         expect(res.statusCode).toBe(500);
        |                                ^
      9 |     });

Test Suites: 1 failed, 1 total
Tests:       1 failed, 3 passed, 4 total
Snapshots:   0 total
Time:        3.125 s
Error: Process completed with exit code 1.
```
- **Result:** GitHub Actions displays a **Red ❌** on the commit.
- **Impact:** The failure alerts developers immediately and prevents broken code from being integrated or deployed.

---

### 5.2 Corrected / Fixed Pipeline Demonstration
Once the test is corrected back to:
```javascript
expect(res.statusCode).toBe(200);
```

#### GitHub Actions Runner Success Output:
```text
PASS tests/api.test.js
  Task Management API Automated CI Test Suite
    √ GET /health returns status 200 and OK status (85 ms)
    √ GET /tasks without authorization token returns 401 Unauthorized (14 ms)
    √ POST /auth/register with invalid payload returns 400 Bad Request (596 ms)
    √ GET /api/nonexistent returns 404 Not Found (14 ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
Snapshots:   0 total
Time:        3.284 s
Ran all test suites.
```
- **Result:** GitHub Actions displays a **Green ✅** on the commit.
- **Status Badge:** Updates dynamically to `passing`.

---

## 6. Key Questions & Viva Analysis

### Q1: What is the difference between Continuous Integration and Continuous Deployment, and which one does this practical actually demonstrate?
**Answer:**
- **Continuous Integration (CI)**: The automated practice where developers frequently merge code into a shared repository, whereupon automated builds, dependency installations, and test suites run to verify that new changes integrate without breaking existing functionality.
- **Continuous Deployment (CD)**: The automated phase following CI where every code change that successfully passes the integration pipeline is automatically deployed into production environments (e.g. AWS, Render, Docker Swarm, or Kubernetes) without manual intervention.
- **Practical Focus**: This practical specifically demonstrates **Continuous Integration (CI)** — code checkout, environment provisioning, dependency installation, and automated test validation on every push.

### Q2: Why does running tests automatically on every push catch problems earlier than testing manually before a release?
**Answer:**
1. **Short Feedback Loop**: Developers receive feedback within minutes of pushing code, while the mental context of the change is still fresh.
2. **Defect Localization**: Because tests run per commit, the exact commit and line of code causing a regression is immediately obvious.
3. **Prevention of Compound Defects**: In manual pre-release testing, multiple developers' unverified changes accumulate, resulting in "integration hell" where diagnosing colliding bugs is exponentially harder.
4. **Consistency**: Automated CI runs in a sterile, identical cloud environment every time, eliminating "it works on my machine" discrepancies.

### Q3: What would happen to the pipeline if the test file path were incorrect — would the workflow fail at the same step as a genuine test failure?
**Answer:**
- **Step Level**: Yes, it would fail at the **same step** (`Run Automated Tests` / `npm test`), because both return a non-zero exit code (`1`) to the shell.
- **Log / Diagnostics Level**: No, the root cause in the logs will be completely different:
  - In a **genuine test failure**, Jest launches successfully, compiles test files, runs assertions, and prints an assertion failure diff (e.g., `Expected: 200, Received: 500`).
  - If the **test path is incorrect**, Jest fails during discovery with a pattern error (e.g., `No tests found related to specified path` or `Cannot find module`), failing the build at the test loader stage rather than during test execution.

---

## 7. Troubleshooting Guide

| Symptom | Probable Cause | Fix |
|---|---|---|
| Workflow not visible under Actions tab | Workflow file is placed in wrong folder or has wrong extension | Ensure the exact file path is `.github/workflows/ci.yml`. |
| Immediate YAML parser error | Tab characters used instead of spaces or incorrect indentation | Use 2-space indentation and replace any tab characters. |
| `npm test` fails with `no test specified` | `package.json` contains default placeholder script | Set `"test": "jest --detectOpenHandles --forceExit"` in `package.json`. |
| Port 5000 in use or open handles error | Express server called `app.listen` during test imports | Conditionally guard `app.listen()` with `if (process.env.NODE_ENV !== 'test')`. |
