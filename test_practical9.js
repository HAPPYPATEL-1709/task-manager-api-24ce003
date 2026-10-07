/**
 * Automated Verification & Response Time Benchmark Suite
 * Practical 9: In-Memory Caching and Query Optimization (node-cache)
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
                    timeMs: parseFloat(latencyMs.toFixed(2))
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

const runBenchmark = async () => {
    console.log("\n=======================================================");
    console.log(" STARTING PRACTICAL 9: CACHING & BENCHMARK SUITE");
    console.log("=======================================================\n");

    const testEmail = `cache_user_${Date.now()}@example.com`;
    const testPassword = "Password123!";
    let authToken = null;
    let sampleTaskId = null;

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
        // Step 1: User Registration & Login
        const regRes = await makeRequest("POST", "/auth/register", {
            name: "Cache Tester",
            email: testEmail,
            password: testPassword
        });
        authToken = regRes.data.token;
        assert(authToken, "1. User Authentication & Token Acquisition");

        // Step 2: Seed initial tasks for realistic query measurement
        console.log("\n Seeding initial tasks for database query benchmarking...");
        for (let i = 1; i <= 5; i++) {
            const seedRes = await makeRequest(
                "POST",
                "/tasks",
                {
                    title: `Benchmark Task ${i}`,
                    description: `Testing database read latency vs in-memory cache speed for item ${i}`,
                    priority: i % 2 === 0 ? "high" : "medium"
                },
                { Authorization: `Bearer ${authToken}` }
            );
            if (i === 1) sampleTaskId = seedRes.data._id;
        }

        // Step 3: Test Cache MISS on initial fetch
        console.log("\n Executing Initial Request (Cache MISS)...");
        const initialGet = await makeRequest("GET", "/tasks", null, {
            Authorization: `Bearer ${authToken}`
        });
        assert(
            initialGet.status === 200 && initialGet.headers["x-cache"] === "MISS",
            "2. First GET /tasks produces Cache MISS and saves to node-cache",
            `X-Cache: ${initialGet.headers["x-cache"]}, Status: ${initialGet.status}`
        );

        // Step 4: Benchmark Cached Requests (Cache HIT - 5 samples)
        console.log("\n Recording 5 Cached GET /tasks requests (Cache HIT)...");
        const cachedReadings = [];
        for (let i = 1; i <= 5; i++) {
            const hitRes = await makeRequest("GET", "/tasks", null, {
                Authorization: `Bearer ${authToken}`
            });
            cachedReadings.push(hitRes.timeMs);
            console.log(`   Sample #${i} (CACHED HIT): ${hitRes.timeMs} ms [X-Cache: ${hitRes.headers["x-cache"]}]`);
            assert(hitRes.headers["x-cache"] === "HIT", `3.${i} Cache HIT verified for Sample #${i}`);
        }

        // Step 5: Benchmark Uncached Requests (Bypass cache - 5 samples)
        console.log("\n Recording 5 Uncached GET /tasks requests (Direct MongoDB query)...");
        const uncachedReadings = [];
        for (let i = 1; i <= 5; i++) {
            const missRes = await makeRequest("GET", "/tasks?bypassCache=true", null, {
                Authorization: `Bearer ${authToken}`
            });
            uncachedReadings.push(missRes.timeMs);
            console.log(`   Sample #${i} (UNCACHED DB): ${missRes.timeMs} ms [DB Time: ${missRes.headers["x-db-time-ms"] || "N/A"} ms]`);
        }

        // Step 6: Test Single-Task Endpoint Caching (GET /tasks/:id)
        console.log("\n Testing Single-Task Endpoint Caching (GET /tasks/:id)...");
        const singleMiss = await makeRequest("GET", `/tasks/${sampleTaskId}`, null, {
            Authorization: `Bearer ${authToken}`
        });
        assert(singleMiss.headers["x-cache"] === "MISS", "4. Initial GET /tasks/:id produces Cache MISS");

        const singleHit = await makeRequest("GET", `/tasks/${sampleTaskId}`, null, {
            Authorization: `Bearer ${authToken}`
        });
        assert(singleHit.headers["x-cache"] === "HIT", "5. Subsequent GET /tasks/:id produces Cache HIT");

        // Step 7: Test Cache Invalidation on POST
        console.log("\n Testing Cache Invalidation on POST /tasks...");
        await makeRequest(
            "POST",
            "/tasks",
            {
                title: "Post-Invalidation Task",
                description: "This task must trigger cache.del('tasks_<id>')",
                priority: "high"
            },
            { Authorization: `Bearer ${authToken}` }
        );

        const postInvalidationGet = await makeRequest("GET", "/tasks", null, {
            Authorization: `Bearer ${authToken}`
        });
        assert(
            postInvalidationGet.headers["x-cache"] === "MISS",
            "6. Cache Invalidation on POST: Subsequent GET is a MISS and fetches updated list"
        );

        // Step 8: Test Cache Invalidation on PUT
        console.log("\n Testing Cache Invalidation on PUT /tasks/:id...");
        // First re-cache the task
        await makeRequest("GET", `/tasks/${sampleTaskId}`, null, { Authorization: `Bearer ${authToken}` });

        // Update task
        await makeRequest(
            "PUT",
            `/tasks/${sampleTaskId}`,
            { title: "Updated Title After Invalidation", completed: true },
            { Authorization: `Bearer ${authToken}` }
        );

        const putInvalidationSingle = await makeRequest("GET", `/tasks/${sampleTaskId}`, null, {
            Authorization: `Bearer ${authToken}`
        });
        assert(
            putInvalidationSingle.headers["x-cache"] === "MISS" && putInvalidationSingle.data.title === "Updated Title After Invalidation",
            "7. Cache Invalidation on PUT: Cached single task and list are cleared and fresh data returned"
        );

        // Step 9: Test Cache Invalidation on DELETE
        console.log("\n Testing Cache Invalidation on DELETE /tasks/:id...");
        await makeRequest("GET", `/tasks/${sampleTaskId}`, null, { Authorization: `Bearer ${authToken}` }); // prime cache
        await makeRequest("DELETE", `/tasks/${sampleTaskId}`, null, { Authorization: `Bearer ${authToken}` });

        const deleteInvalidationGet = await makeRequest("GET", "/tasks", null, {
            Authorization: `Bearer ${authToken}`
        });
        assert(
            deleteInvalidationGet.headers["x-cache"] === "MISS",
            "8. Cache Invalidation on DELETE: Cleared cache successfully"
        );

        // Step 10: Check Cache Stats endpoint
        console.log("\n Checking Cache Statistics Endpoint...");
        const statsRes = await makeRequest("GET", "/tasks/cache/stats", null, {
            Authorization: `Bearer ${authToken}`
        });
        assert(
            statsRes.status === 200 && statsRes.data.stats && statsRes.data.stats.hits > 0,
            "9. Supplementary: GET /tasks/cache/stats returns active hits, misses, and hit rate",
            `Stats: ${JSON.stringify(statsRes.data.stats)}`
        );

        // Compute Benchmark Summary
        const avgCached = (cachedReadings.reduce((a, b) => a + b, 0) / cachedReadings.length).toFixed(2);
        const avgUncached = (uncachedReadings.reduce((a, b) => a + b, 0) / uncachedReadings.length).toFixed(2);
        const speedup = (avgUncached / avgCached).toFixed(1);
        const latencyReduction = (((avgUncached - avgCached) / avgUncached) * 100).toFixed(1);

        console.log("\n=======================================================");
        console.log(" PRACTICAL 9 EMPIRICAL BENCHMARK RESULTS");
        console.log("=======================================================");
        console.log(` Uncached DB Average Latency (5 samples): ${avgUncached} ms`);
        console.log(` Cached In-Memory Average Latency (5 samples): ${avgCached} ms`);
        console.log(` Response Time Reduction: ${latencyReduction}%`);
        console.log(` Speedup Factor: ${speedup}x Faster`);
        console.log(` Cache Hit Rate: ${statsRes.data.stats.hitRate}`);
        console.log(` Total Invalidations Handled: ${statsRes.data.stats.invalidations}`);
        console.log("=======================================================\n");

        if (passedTests === totalTests) {
            console.log(` ALL ${totalTests}/${totalTests} TESTS & CACHE SPECIFICATIONS VERIFIED!`);
            process.exit(0);
        } else {
            console.error(` Only ${passedTests}/${totalTests} passed.`);
            process.exit(1);
        }
    } catch (err) {
        console.error("Benchmark error:", err);
        process.exit(1);
    }
};

runBenchmark();
