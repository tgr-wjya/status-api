/**
 * Test runner for my trivial server app.
 *
 * Test structure overview:
 * 1) Headers
 *    - GET / should include `X-Powered-By` header
 * 2) GET /
 *    - returns app, author, version and uptime (status 200)
 * 3) GET /health
 *    - healthy: status 200, body { status: "ok" }
 *    - degraded: set `Bun.env.HEALTH_DEGRADED = "true"` before importing the app (or use factory) expect status 503 and degraded body
 * 4) POST /echo
 *    - success: POST JSON { field } (min length) => status 201, body echoes field
 *    - validation failure: expect 400 (invalid/missing field)
 *
 *
 * @author Tegar Wijaya Kusuma
 * @date 13 March 2026
 */

import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { buildServerApp } from "../src/app";

const BASE_URL = Bun.env.BASE_URL ?? "http://localhost:3000";
let app: typeof buildServerApp;

describe("TESTING SERVER", () => {
	beforeEach(() => {
		app = buildServerApp;
	});

	it("Should return headers", async () => {
		const response = await app.handle(new Request(`${BASE_URL}`));

		expect(response.headers.get("X-Powered-By")).toBe("Elysia + Bun + Azure");
	});

	describe("GET /root", () => {
		it("Should return app name, author, version and uptime", async () => {
			const response = await app.handle(new Request(`${BASE_URL}`));

			const data = await response.json();
			expect(data).toHaveProperty("app", "Docker-Mastery");
			expect(data).toHaveProperty("author", "Tegar Wijaya Kusuma");
			expect(data).toHaveProperty("version", "v1");
			expect(data).toHaveProperty("uptime");
			expect(typeof data.uptime).toBe("string");
		});
	});

	describe("GET /health", () => {
		it("Should return status: ok with 200", async () => {
			const response = await app.handle(new Request(`${BASE_URL}/health`));

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toEqual({
				status: "ok",
			});
		});
	});

	describe("GET /health degraded", () => {
		beforeEach(() => {
			Bun.env.HEALTH_DEGRADED = "true";
		});

		afterEach(() => {
			Bun.env.HEALTH_DEGRADED = "false";
		});

		it("Should return status: degraded with 503", async () => {
			const response = await app.handle(new Request(`${BASE_URL}/health`));

			expect(response.status).toBe(503);
			const data = await response.json();
			expect(data).toEqual({ status: "degraded" });
		});
	});

	describe("GET /echo", () => {
		it("Should return the field value with 201", async () => {
			const response = await app.handle(
				new Request(`${BASE_URL}/echo`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ field: "hello" }),
				}),
			);

			expect(response.status).toBe(201);
			const data = await response.text();
			expect(data).toBe("hello");
		});

		it("Should reject field shorter than 3 chars with 422", async () => {
			const response = await app.handle(
				new Request(`${BASE_URL}/echo`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ field: "hi" }),
				}),
			);

			expect(response.status).toBe(422);
		});
	});
});
