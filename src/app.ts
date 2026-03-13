/**
 * App System Status API
 *
 * Endpoints:
 * GET /root - returns app name, version, uptime
 * GET /health - returns `{ status: "ok" }` with `200`, or `{ status: "degraded" }` with `503`
 * POST /echo - returns whatever JSON body send
 *
 * @author Tegar Wijaya Kusuma
 * @date 14 March 2026
 */

import { Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";

export const HEALTH_DEGRADED = Bun.env.HEALTH_DEGRADED ?? false;
const MIN_FIELD_LENGTH = 3;

export const buildServerApp = new Elysia()
	.onAfterHandle(({ set }) => {
		set.headers["X-Powered-By"] = "Elysia + Bun + Azure";
	})

	.get("/", () => ({
		app: "Docker-Mastery",
		author: "Tegar Wijaya Kusuma",
		version: "v2",
		uptime: `${Math.floor(process.uptime())}`,
	}))

	.get("/health", ({ set }) => {
		// This whole server is designed to be trivial, this simple conditional perfect for our situation.
		if (Bun.env.HEALTH_DEGRADED === "true") {
			set.status = 503;
			return { status: "degraded" };
		}
		set.status = 200;
		return { status: "ok" };
	})

	.post(
		"/echo",
		async ({ set, body }) => {
			set.status = 201;
			// The body uses json indeed, but this will return only text from body.field send
			return body.field;
		},
		{
			body: t.Object({
				field: t.String({ minLength: MIN_FIELD_LENGTH }),
			}),
		},
	)

	.use(swagger());
