/**
 * App System Status API
 *
 * Endpoints:
 * GET /root - returns app name, author, version, date and uptime
 * GET /health - returns `{ status: "ok" }` with `200`, or `{ status: "degraded" }` with `503`
 * POST /echo - returns whatever JSON body send
 *
 * @author Tegar Wijaya Kusuma
 * @date 20 March 2026
 */

import { swagger } from "@elysiajs/swagger";
import { Elysia, t, ValidationError } from "elysia";
import { NotFoundException } from "./errors/errors";

/**
 * HTTP Code Const
 */
const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_SERVICE_UNAVAILABLE = 503;
// Schema validation Const
const MIN_TEXT_LENGTH = 5;
const MIN_NAME_LENGTH = 3;
const APP_VERSION = "v3";

export const availableEndpointsArray = ["GET /", "GET /health", "POST /echo"];

export interface RootResponse {
	app: string;
	author: string;
	version: string;
	date: string;
	uptime: string;
}

export const RootHandler: RootResponse = {
	app: "Status-API",
	author: "Tegar Wijaya Kusuma",
	version: `${APP_VERSION}`,
	date: `${new Date().toISOString()}`, // ISO 8601 format
	uptime: `${Math.floor(process.uptime())}`, // Uptime in seconds
};

export const statusApiApp = new Elysia()
	// Add custom X-Powered-By header to all responses
	.onAfterHandle(({ set }) => {
		set.headers["X-Powered-By"] = "Elysia + Bun + Azure Container App";
	})

	.onError(({ error, set }) => {
		const extra: Record<string, unknown> = {};

		if (error instanceof NotFoundException) {
			set.status = error.status;
			extra.availableEndpoints = error.availableEndpoints;
		} else if (error instanceof ValidationError) {
			set.status = error.status;
			extra.error = JSON.parse(error.message);
		}
		return {
			error:
				extra.error ??
				(error instanceof Error ? error.message : "Unknown error"),
			timestamp: new Date().toISOString(),
			...extra,
		};
	})

	.get(
		"/",
		({ set }) => {
			const Handler = RootHandler;

			set.status = 200;
			return Handler;
		},
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
				set.status = HTTP_SERVICE_UNAVAILABLE;
				return { status: "degraded" };
			}
			set.status = HTTP_OK;
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
		({ set, body }) => {
			set.status = HTTP_CREATED;
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
						url: "http://localhost:3000",
						description: "Local",
					},
					{
						url: "https://status-api.ashypebble-debb1f65.southeastasia.azurecontainerapps.io",
						description: "Production",
					},
				],
			},
		}),
	)

	/**
	 * Wildcard handler
	 */
	.all("/*", () => {
		throw new NotFoundException(availableEndpointsArray);
	});
