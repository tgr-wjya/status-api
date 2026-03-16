/**
 * App System Status API
 *
 * Endpoints:
 * GET /root - returns app name, version, uptime
 * GET /health - returns `{ status: "ok" }` with `200`, or `{ status: "degraded" }` with `503`
 * POST /echo - returns whatever JSON body send
 *
 * @author Tegar Wijaya Kusuma
 * @date 17 March 2026
 */

import { Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";

export const HEALTH_DEGRADED = Bun.env.HEALTH_DEGRADED ?? false;
const MIN_TEXT_LENGTH = 5;
const MIN_NAME_LENGTH = 3;

export const buildServerApp = new Elysia()
	.onAfterHandle(({ set }) => {
		set.headers["X-Powered-By"] = "Elysia + Bun + Azure Container App";
	})

	.get(
		"/",
		() => ({
			app: "Docker-Mastery",
			author: "Tegar Wijaya Kusuma",
			version: "v1.3",
			date: `${new Date().toISOString()}`,
			uptime: `${Math.floor(process.uptime())}`,
		}),
		{
			detail: {
				summary: "App info",
				responses: {
					200: {
						description: "Returns app name, author, version, date and uptime",
					},
				},
			},
		},
	)

	.get(
		"/health",
		({ set }) => {
			// This whole server is designed to be trivial, this simple conditional perfect for our situation.
			if (Bun.env.HEALTH_DEGRADED === "true") {
				set.status = 503;
				return { status: "degraded" };
			}
			set.status = 200;
			return { status: "ok" };
		},
		{
			detail: {
				summary: "Health check",
				responses: {
					200: { description: "Service is healthy" },
					503: { description: "Service is degraded" },
				},
			},
		},
	)

	.post(
		"/echo",
		async ({ set, body }) => {
			set.status = 201;
			return {
				name: body.name,
				text: body.text,
			};
		},
		{
			body: t.Object({
				name: t.String({ minLength: MIN_NAME_LENGTH }),
				text: t.String({ minLength: MIN_TEXT_LENGTH }),
			}),
			detail: {
				summary: "Echo field value",
				responses: {
					201: { description: "Returns the field string value" },
					422: { description: "Validation error — field too short or missing" },
				},
			},
		},
	)

	.use(
		swagger({
			documentation: {
				info: {
					title: "Docker-Mastery Status API",
					version: "1.0.0",
					description:
						"A minimal system status API deployed on Azure Container Apps.",
					contact: {
						name: "Tegar Wijaya Kusuma",
						url: "https://tgr-wjya.github.io",
						email: "tgr.wjya.queue.top126@pm.me",
					},
				},
				servers: [
					{
						url: "https://status-api.ashypebble-debb1f65.southeastasia.azurecontainerapps.io",
						description: "Production",
					},
					{
						url: "http://localhost:3000",
						description: "Local",
					},
				],
			},
		}),
	);
