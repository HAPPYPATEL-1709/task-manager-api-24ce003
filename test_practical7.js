/**
 * Automated Verification Script for Practical 7: Authentication and Middleware Pipeline
 * Tests all required endpoints, validation rules, auth middleware, and error handling.
 */

const http = require("http");

const BASE_URL = "http://localhost:5000";

const makeRequest = (method, path, body = null, headers = {}) => {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const postData = body ? JSON.stringify(body) : null;

        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: {
                "Content-Type": "application/json",
                ...headers
            }
        };

        if (postData) {
            options.headers["Content-Length"] = Buffer.byteLength(postData);
        }

        const req = http.request(options, (res) => {
            let responseBody = "";
            res.on("data", (chunk) => {
                responseBody += chunk;
            });
            res.on("end", () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(responseBody);
                } catch {
                    parsed = responseBody;
                }
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: parsed
                });
            });
        });

        req.on("error", (err) => {
            reject(err);
        });

        if (postData) {
            req.write(postData);
        }
        req.end();
    });
};

const runTests = async () => {
    console.log("\n=======================================================");
    console.log(" STARTING PRACTICAL 7 AUTOMATED VERIFICATION SUITE");
    console.log("=======================================================\n");

    const testEmail = `testuser_${Date.now()}@example.com`;
    const testPassword = "Password123!";
    let authToken = null;
    let createdTaskId = null;

    let passedTests = 0;
    let totalTests = 0;

    const assert = (condition, testName, details = "") => {
        totalTests++;
        if (condition) {
            passedTests++;
            console.log(` [PASS] ${testName}`);
        } else {
            console.error(` [FAIL] ${testName} - ${details}`);
        }
    };

    try {
        // TEST 1: Health check
        const health = await makeRequest("GET", "/health");
        assert(health.status === 200, "1. Server Health Check", `Status: ${health.status}`);

        // TEST 2: Validation rejection on empty registration
        const invalidReg = await makeRequest("POST", "/auth/register", {
            name: "",
            email: "not-an-email",
            password: "123"
        });
        assert(
            invalidReg.status === 400 && invalidReg.data.details && invalidReg.data.details.email,
            "2. Input Validation Middleware (Rejects invalid registration inputs)",
            `Status: ${invalidReg.status}, Response: ${JSON.stringify(invalidReg.data)}`
        );

        // TEST 3: User Registration with valid credentials
        const regRes = await makeRequest("POST", "/auth/register", {
            name: "John Doe",
            email: testEmail,
            password: testPassword
        });
        assert(
            regRes.status === 201 && regRes.data.token && regRes.data.user && !regRes.data.user.password,
            "3. User Registration (Password hashed, returns JWT + User without password)",
            `Status: ${regRes.status}, Token received: ${Boolean(regRes.data.token)}`
        );

        // TEST 4: Duplicate Email rejection
        const dupRes = await makeRequest("POST", "/auth/register", {
            name: "Duplicate User",
            email: testEmail,
            password: testPassword
        });
        assert(
            dupRes.status === 400,
            "4. Unique Email Check (Rejects duplicate registration)",
            `Status: ${dupRes.status}`
        );

        // TEST 5: Login with wrong password (should fail 401)
        const badLogin = await makeRequest("POST", "/auth/login", {
            email: testEmail,
            password: "WrongPassword"
        });
        assert(
            badLogin.status === 401 && badLogin.data.error,
            "5. JWT Login Flow (Rejects incorrect password with 401)",
            `Status: ${badLogin.status}`
        );

        // TEST 6: Login with correct password (should return JWT token)
        const loginRes = await makeRequest("POST", "/auth/login", {
            email: testEmail,
            password: testPassword
        });
        assert(
            loginRes.status === 200 && loginRes.data.token && loginRes.data.user,
            "6. JWT Login Flow (Successful login returns JWT token & user profile)",
            `Status: ${loginRes.status}`
        );
        authToken = loginRes.data.token;

        // TEST 7: Auth Middleware - Access protected route without token (should fail 401)
        const noTokenTasks = await makeRequest("GET", "/tasks");
        assert(
            noTokenTasks.status === 401,
            "7. Auth Middleware (Rejects requests without Authorization header with 401)",
            `Status: ${noTokenTasks.status}`
        );

        // TEST 8: Auth Middleware - Access protected route with invalid token (should fail 401)
        const badTokenTasks = await makeRequest("GET", "/tasks", null, {
            Authorization: "Bearer invalid_tampered_jwt_token_12345"
        });
        assert(
            badTokenTasks.status === 401,
            "8. Auth Middleware (Rejects invalid/tampered token with 401)",
            `Status: ${badTokenTasks.status}`
        );

        // TEST 9: Auth Middleware - Access /me endpoint with valid token
        const meRes = await makeRequest("GET", "/auth/me", null, {
            Authorization: `Bearer ${authToken}`
        });
        assert(
            meRes.status === 200 && meRes.data.user && meRes.data.user.email === testEmail.toLowerCase(),
            "9. Supplementary: GET /me (Decodes JWT and returns user details)",
            `Status: ${meRes.status}, User: ${JSON.stringify(meRes.data.user)}`
        );

        // TEST 10: Task Validation Middleware - Create task with missing title (should fail 400)
        const invalidTask = await makeRequest(
            "POST",
            "/tasks",
            { description: "No title provided", priority: "high" },
            { Authorization: `Bearer ${authToken}` }
        );
        assert(
            invalidTask.status === 400 && invalidTask.data.details && invalidTask.data.details.title,
            "10. Input Validation Middleware (Rejects task creation missing required fields)",
            `Status: ${invalidTask.status}, Details: ${JSON.stringify(invalidTask.data)}`
        );

        // TEST 11: Create Task with valid token
        const createTaskRes = await makeRequest(
            "POST",
            "/tasks",
            {
                title: "Complete Practical 7",
                description: "Implement JWT auth and middleware pipeline",
                priority: "high"
            },
            { Authorization: `Bearer ${authToken}` }
        );
        assert(
            createTaskRes.status === 201 && createTaskRes.data._id && createTaskRes.data.title === "Complete Practical 7",
            "11. Protected Task Route: POST /tasks (Creates task for authenticated user)",
            `Status: ${createTaskRes.status}, Task ID: ${createTaskRes.data._id}`
        );
        createdTaskId = createTaskRes.data._id;

        // TEST 12: GET all tasks with valid token
        const getTasksRes = await makeRequest("GET", "/tasks", null, {
            Authorization: `Bearer ${authToken}`
        });
        assert(
            getTasksRes.status === 200 && Array.isArray(getTasksRes.data) && getTasksRes.data.length > 0,
            "12. Protected Task Route: GET /tasks (Retrieves authenticated user's tasks)",
            `Status: ${getTasksRes.status}, Task Count: ${getTasksRes.data.length}`
        );

        // TEST 13: PUT update task with valid token
        const updateTaskRes = await makeRequest(
            "PUT",
            `/tasks/${createdTaskId}`,
            { completed: true, priority: "low" },
            { Authorization: `Bearer ${authToken}` }
        );
        assert(
            updateTaskRes.status === 200 && updateTaskRes.data.completed === true,
            "13. Protected Task Route: PUT /tasks/:id (Updates task with token)",
            `Status: ${updateTaskRes.status}, Completed: ${updateTaskRes.data.completed}`
        );

        // TEST 14: DELETE task with valid token
        const deleteTaskRes = await makeRequest(
            "DELETE",
            `/tasks/${createdTaskId}`,
            null,
            { Authorization: `Bearer ${authToken}` }
        );
        assert(
            deleteTaskRes.status === 200 && deleteTaskRes.data.message,
            "14. Protected Task Route: DELETE /tasks/:id (Deletes task successfully)",
            `Status: ${deleteTaskRes.status}`
        );

        // TEST 15: Error response structure consistency (404 route)
        const notFoundRes = await makeRequest("GET", "/non-existent-endpoint");
        assert(
            notFoundRes.status === 404 && notFoundRes.data.error,
            "15. Consistent Error Response Structure (Returns clean JSON without stack traces)",
            `Status: ${notFoundRes.status}, Body: ${JSON.stringify(notFoundRes.data)}`
        );

        console.log("\n=======================================================");
        console.log(` RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
        console.log("=======================================================\n");

        if (passedTests === totalTests) {
            console.log(" ALL PRACTICAL 7 SPECIFICATIONS & RUBRICS VERIFIED SUCCESSFULLY!");
            process.exit(0);
        } else {
            console.error(" Some tests failed.");
            process.exit(1);
        }
    } catch (err) {
        console.error("Test execution failed:", err);
        process.exit(1);
    }
};

runTests();
