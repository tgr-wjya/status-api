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
 * @date 17 March 2026
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

    expect(response.headers.get("X-Powered-By")).toBe("Elysia + Bun + Azure Container App");
  });

  describe("GET /root", () => {
    it("Should return app name, author, version, date and uptime", async () => {
      const response = await app.handle(new Request(`${BASE_URL}`));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("app", "Docker-Mastery");
      expect(data).toHaveProperty("author", "Tegar Wijaya Kusuma");
      expect(data).toHaveProperty("version", "v1.3");
      expect(data).toHaveProperty("date");
      expect(typeof data.date).toBe("string");
      expect(new Date(data.date).toISOString()).toBe(data.date);
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

  describe("POST /echo", () => {
    it("Should return the name and text with 201", async () => {
      const payload = { name: "John", text: "Hello world!" };
      const response = await app.handle(
        new Request(`${BASE_URL}/echo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      );
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toEqual(payload);
    });

    it("Should reject name shorter than 3 chars with 422", async () => {
      const payload = { name: "Al", text: "Hello world!" };
      const response = await app.handle(
        new Request(`${BASE_URL}/echo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      );
      expect(response.status).toBe(422);
    });

    it("Should reject text shorter than 5 chars with 422", async () => {
      const payload = { name: "John", text: "Hey" };
      const response = await app.handle(
        new Request(`${BASE_URL}/echo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      );
      expect(response.status).toBe(422);
    });

    it("Should reject missing fields with 422", async () => {
      const payload = { name: "John" };
      const response = await app.handle(
        new Request(`${BASE_URL}/echo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      );
      expect(response.status).toBe(422);
    });
  });
});
