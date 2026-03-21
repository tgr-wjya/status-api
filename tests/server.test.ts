/**
 * Test runner for my trivial server app.
 *
 * Test structure overview:
 * 1) Headers
 *    - GET / should include `X-Powered-By` header
 * 2) GET /
 *    - returns app, author, version, date and uptime (status 200)
 * 3) GET /health
 *    - healthy: status 200, body { status: "ok" }
 *    - degraded: set `Bun.env.HEALTH_DEGRADED = "true"` before importing the app (or use factory) expect status 503 and degraded body
 * 4) POST /echo
 *    - success: POST JSON { name, text } (name min 3 chars, text min 5 chars) => status 201, body echoes both fields
 *    - validation failure: status 422 for too-short or missing fields
 *
 *
 * @author Tegar Wijaya Kusuma
 * @date 20 March 2026
 */

import { describe, expect, it } from "bun:test";
import {
	availableEndpointsArray,
	RootHandler,
	type RootResponse,
	statusApiApp,
} from "../src/app";
import type { AllError, ElysiaValidationError, WildcardError } from "./types";

const BASE_URL = Bun.env.BASE_URL ?? "http://localhost:3000";

let app: typeof statusApiApp;
app = statusApiApp;

describe("Testing Wildcards error on global", () => {
	it.each([
		`${BASE_URL}/912912`,
		`${BASE_URL}/echo/sad19nn`,
		`${BASE_URL}/health/12sada`,
	])("Returns 404 with wildcard fields on %s", async (url) => {
		const response = await app.handle(new Request(url, { method: "GET" }));

		expect(response.status).toBe(404);
		const body = (await response.json()) as WildcardError;
		expect(body).toHaveProperty("error", "Not Found");
		expect(body).toHaveProperty("timestamp");
		expect(body.availableEndpoints).toEqual(availableEndpointsArray);
		expect(body.availableEndpoints).toBeArray();
	});
});

describe("Testing headers", () => {
	it("Should return headers X-Powered-By (Elysia + Bun + Azure Container App)", async () => {
		const response = await app.handle(
			new Request(`${BASE_URL}`, {
				method: "GET",
			}),
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Powered-By")).toBe(
			"Elysia + Bun + Azure Container App",
		);
	});
});

describe("Testing /root, /echo and /health", () => {
	describe("GET /root", () => {
		it("Should return app name, author, version, date and uptime", async () => {
			const response = await app.handle(
				new Request(`${BASE_URL}`, {
					method: "GET",
				}),
			);

			expect(response.status).toBe(200);
			const data = (await response.json()) as RootResponse;
			expect(data.app).toEqual(RootHandler.app);
			expect(data.author).toEqual(RootHandler.author);
			expect(data.version).toEqual(RootHandler.version);
			expect(data).toHaveProperty("date");
			expect(data).toHaveProperty("uptime");
		});
	});

	describe("GET /health", () => {
		it("Should return status: ok with 200", async () => {
			const response = await app.handle(
				new Request(`${BASE_URL}/health`, {
					method: "GET",
				}),
			);

			expect(response.status).toBe(200);
			const healthy = await response.json();
			expect(healthy).toEqual({ status: "ok" });
		});

		it("Should return status: degraded with 503", async () => {
			Bun.env.HEALTH_DEGRADED = "true";

			const response = await app.handle(
				new Request(`${BASE_URL}/health`, {
					method: "GET",
				}),
			);

			expect(response.status).toBe(503);
			const degraded = await response.json();
			expect(degraded).toEqual({ status: "degraded" });

			Bun.env.HEALTH_DEGRADED = "false";
		});
	});

	describe("POST /echo", () => {
		it("Should return name and text field body with 201", async () => {
			const echoThis = {
				name: "Tegar",
				text: "made with ◉‿◉",
			};

			const response = await app.handle(
				new Request(`${BASE_URL}/echo`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(echoThis),
				}),
			);

			expect(response.status).toBe(201);
			const echo = await response.json();
			expect(echo).toEqual(echoThis);
		});

		it("Should reject name field shorter than 3 chars with 422", async () => {
			const rejectNameField = {
				name: "Ab",
				text: "Should Pass This",
			};

			const response = await app.handle(
				new Request(`${BASE_URL}/echo`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(rejectNameField),
				}),
			);

			expect(response.status).toBe(422);
			const echo1 = (await response.json()) as AllError;
			const validation1 = echo1.error as unknown as ElysiaValidationError;
			expect(validation1.type).toBe("validation");
			expect(validation1.on).toBe("body");
			expect(validation1.property).toBe("/name");
		});

		it("Should reject text field shorter than 5 chars with 422", async () => {
			const rejectTextField = {
				name: "Alice",
				text: "Nice",
			};

			const response = await app.handle(
				new Request(`${BASE_URL}/echo`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(rejectTextField),
				}),
			);

			expect(response.status).toBe(422);
			const echo = (await response.json()) as AllError;
			const validation2 = echo.error as unknown as ElysiaValidationError;
			expect(validation2.type).toBe("validation");
			expect(validation2.on).toBe("body");
			expect(validation2.property).toBe("/text");
		});
	});
});
