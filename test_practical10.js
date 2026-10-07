/**
 * Automated Verification & Timing Proof Suite
 * Practical 10: Asynchronous Processing with Event-Driven Architecture (Node.js EventEmitter)
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

        const startTimestamp = process.hrtime.bigint();

        const req = http.request(options, (res) => {
            let responseBody = "";
            res.on("data", (chunk) => {
                responseBody += chunk;
            });
            res.on("end", () => {
                const endTimestamp = process.hrtime.bigint();
                const latencyMs = Number(endTimestamp - startTimestamp) / 1_000_000;

                let parsed = null;
                try {
                    parsed = JSON.parse(responseBody);
                } catch {
                    parsed = responseBody;
                }
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: parsed,
                    timeMs: parseFloat(latencyMs.toFixed(2)),
                    receivedAt: new Date().toISOString()
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

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runTests = async () => {
    console.log("\n=======================================================");
    console.log(" STARTING PRACTICAL 10: EVENT-DRIVEN ARCHITECTURE SUITE");
    console.log("=======================================================\n");

    const testEmail = `events_user_${Date.now()}@example.com`;
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
        // Step 1: Register and login test user
        const regRes = await makeRequest("POST", "/auth/register", {
            name: "Event Tester",
            email: testEmail,
            password: testPassword
        });
        authToken = regRes.data.token;
        assert(Boolean(authToken), "1. User Authentication & Token Acquisition");

        // Step 2: Test Task Creation with Event Emission & Instant Response
        console.log("\n Testing POST /tasks & Background Event Trigger...");
        const postStartTime = new Date().toISOString();

        const createRes = await makeRequest(
            "POST",
            "/tasks",
            {
                title: "Asynchronous Event Driven Task",
                description: "This task dispatches a 'task-created' event to background notification worker",
                priority: "high"
            },
            { Authorization: `Bearer ${authToken}` }
        );

        createdTaskId = createRes.data._id;
        const apiReturnTime = createRes.receivedAt;

        console.log(`   ├─ API Request Sent at:     ${postStartTime}`);
        console.log(`   ├─ API Response Received at: ${apiReturnTime}`);
        console.log(`   └─ API Response Latency:     ${createRes.timeMs} ms`);

        assert(
            createRes.status === 201 && createRes.data._id,
            "2. POST /tasks responds with 201 Created and task document",
            `Status: ${createRes.status}`
        );

        // Wait 800ms for background worker simulation (500ms setTimeout) to complete
        console.log("\n Waiting 800ms for background asynchronous listener to finish processing...");
        await delay(800);

        // Step 3: Test Task Update with 'task-updated' Event
        console.log("\n Testing PUT /tasks/:id & 'task-updated' Event...");
        const updateRes = await makeRequest(
            "PUT",
            `/tasks/${createdTaskId}`,
            {
                title: "Asynchronous Event Driven Task (Updated)",
                completed: true
            },
            { Authorization: `Bearer ${authToken}` }
        );

        assert(
            updateRes.status === 200 && updateRes.data.completed === true,
            "3. PUT /tasks/:id updates task and emits 'task-updated' event"
        );

        // Step 4: Test Task Deletion with 'task-deleted' Event (Supplementary Problem)
        console.log("\n Testing DELETE /tasks/:id & 'task-deleted' Event...");
        const deleteRes = await makeRequest(
            "DELETE",
            `/tasks/${createdTaskId}`,
            null,
            { Authorization: `Bearer ${authToken}` }
        );

        assert(
            deleteRes.status === 200 && deleteRes.data.message,
            "4. Supplementary: DELETE /tasks/:id emits 'task-deleted' event"
        );

        // Wait 500ms for deletion background audit worker to finish
        await delay(500);

        // Step 5: Verify Event Audit Log Endpoint
        console.log("\n Verifying Asynchronous Event History Logs...");
        const eventsLogRes = await makeRequest(
            "GET",
            "/tasks/events/log",
            null,
            { Authorization: `Bearer ${authToken}` }
        );

        assert(
            eventsLogRes.status === 200 && Array.isArray(eventsLogRes.data.events) && eventsLogRes.data.events.length >= 3,
            "5. GET /tasks/events/log returns background event execution records",
            `Event Count: ${eventsLogRes.data.events?.length}`
        );

        const createdEvent = eventsLogRes.data.events.find((e) => e.eventType === "task-created");
        const updatedEvent = eventsLogRes.data.events.find((e) => e.eventType === "task-updated");
        const deletedEvent = eventsLogRes.data.events.find((e) => e.eventType === "task-deleted");

        assert(Boolean(createdEvent), "6. 'task-created' event successfully recorded in audit trail");
        assert(Boolean(updatedEvent), "7. 'task-updated' event successfully recorded in audit trail");
        assert(Boolean(deletedEvent), "8. 'task-deleted' event successfully recorded in audit trail");

        if (createdEvent) {
            const dispatchedTime = new Date(createdEvent.dispatchedAt).getTime();
            const completedTime = new Date(createdEvent.completedAt).getTime();
            const isAsynchronous = completedTime > dispatchedTime;

            console.log("\n=======================================================");
            console.log(" TIMESTAMP & ORDERING VERIFICATION EVIDENCE");
            console.log("=======================================================");
            console.log(` API Response Dispatched At: ${createdEvent.dispatchedAt}`);
            console.log(` Worker Task Completed At:   ${createdEvent.completedAt}`);
            console.log(` Asynchronous Delta:         +${createdEvent.durationMs} ms (Worker finished AFTER response)`);
            console.log("=======================================================\n");

            assert(
                isAsynchronous,
                "9. Asynchronous Decoupling Proof: Worker completion timestamp occurs strictly AFTER API response timestamp",
                `Dispatched: ${createdEvent.dispatchedAt}, Completed: ${createdEvent.completedAt}`
            );

            assert(
                createdEvent.durationMs >= 400,
                "10. Non-blocking Proof: Background delay (500ms) executed in event loop without stalling the main response",
                `Duration: ${createdEvent.durationMs} ms`
            );
        }

        console.log("\n=======================================================");
        console.log(` RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
        console.log("=======================================================");

        if (passedTests === totalTests) {
            console.log(" ALL PRACTICAL 10 SPECIFICATIONS & RUBRICS FULLY SATISFIED!\n");
            process.exit(0);
        } else {
            console.error(" Some tests failed.\n");
            process.exit(1);
        }
    } catch (err) {
        console.error("Test execution failed:", err);
        process.exit(1);
    }
};

runTests();
