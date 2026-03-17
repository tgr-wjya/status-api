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
 * @date 18 March 2026
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { statusApiApp } from "../src/app";

const BASE_URL = Bun.env.BASE_URL ?? "http://localhost:3000";
const app = statusApiApp;
const JSON_HEADERS = { "Content-Type": "application/json" };

const handleRequest = (path: string, init?: RequestInit) =>
	app.handle(new Request(`${BASE_URL}${path}`, init));

describe("TESTING SERVER", () => {
	describe("Headers", () => {
		it("Should return headers", async () => {
			const response = await handleRequest("/");

			expect(response.headers.get("X-Powered-By")).toBe(
				"Elysia + Bun + Azure Container App",
			);
		});
	});

	describe("GET /", () => {
		it("Should return app name, author, version, date and uptime", async () => {
			const response = await handleRequest("/");

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty("app", "Docker-Mastery");
			expect(data).toHaveProperty("author", "Tegar Wijaya Kusuma");
			expect(data).toHaveProperty("version", "v2");
			expect(data).toHaveProperty("date");
			expect(typeof data.date).toBe("string");
			expect(new Date(data.date).toISOString()).toBe(data.date);
			expect(data).toHaveProperty("uptime");
			expect(typeof data.uptime).toBe("string");
		});
	});

	describe("GET /health", () => {
		it("Should return status: ok with 200", async () => {
			const response = await handleRequest("/health");

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
			const response = await handleRequest("/health");

			expect(response.status).toBe(503);
			const data = await response.json();
			expect(data).toEqual({ status: "degraded" });
		});
	});

	describe("POST /echo", () => {
		it("Should return the name and text with 201", async () => {
			const payload = { name: "John", text: "Hello world!" };
			const response = await handleRequest("/echo", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify(payload),
			});
			expect(response.status).toBe(201);
			const data = await response.json();
			expect(data).toEqual(payload);
		});

		it("Should reject name shorter than 3 chars with 422", async () => {
			const payload = { name: "Al", text: "Hello world!" };
			const response = await handleRequest("/echo", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify(payload),
			});
			expect(response.status).toBe(422);
		});

		it("Should reject text shorter than 5 chars with 422", async () => {
			const payload = { name: "John", text: "Hey" };
			const response = await handleRequest("/echo", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify(payload),
			});
			expect(response.status).toBe(422);
		});

		it("Should reject missing fields with 422", async () => {
			const payload = { name: "John" };
			const response = await handleRequest("/echo", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify(payload),
			});
			expect(response.status).toBe(422);
		});
	});

	describe("Swagger docs", () => {
		it("Should return the Swagger UI", async () => {
			const response = await handleRequest("/swagger");

			expect(response.status).toBe(200);
			expect(response.headers.get("content-type")).toContain("text/html");
		});

		it("Should return the OpenAPI JSON document", async () => {
			const response = await handleRequest("/swagger/json");

			expect(response.status).toBe(200);
			expect(response.headers.get("content-type")).toContain(
				"application/json",
			);
			const document = await response.json();
			expect(document).toHaveProperty("openapi", "3.0.3");
			expect(document).toHaveProperty(
				"info.title",
				"Docker-Mastery Status API",
			);
			expect(document.paths).toHaveProperty("/");
			expect(document.paths).toHaveProperty("/health");
			expect(document.paths).toHaveProperty("/echo");
		});
	});

	describe("Wildcard handler", () => {
		it("Should return 404 and an Array for an invalid path", async () => {
			const response = await handleRequest("/999", {
				method: "PATCH",
			});

			expect(response.status).toBe(404);
			expect(response.headers.get("content-type")).toContain(
				"application/json",
			);
			const wildcard = await response.json();
			expect(wildcard).toEqual(["GET /", "GET /health", "POST /echo"]);
		});
	});
});
