const request = require("supertest");
const app = require("../server");

describe("Task Management API Automated CI Test Suite", () => {
    // Test 1: Service Health Check Endpoint (Fixed and verified for 200 OK)
    test("GET /health returns status 200 and OK status", async () => {
        const res = await request(app).get("/health");
        expect(res.statusCode).toBe(200); // Fixed: 200 OK status verification
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
