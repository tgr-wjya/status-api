/**
 * My trivial system status API
 *
 * @author Tegar Wijaya Kusuma
 * @date 13 March 2026
 */

import { Elysia, t } from "elysia";
import swagger from "@elysiajs/swagger";

const PORT = Bun.env.PORT ?? 3000;
const HOSTNAME = Bun.env.HOSTNAME ?? "0.0.0.0";
export const HEALTH_DEGRADED = Bun.env.HEALTH_DEGRADED ?? false;
const MIN_FIELD_LENGTH = 3;

export const app = new Elysia()
	.onAfterHandle(({ set }) => {
		set.headers["X-Powered-By"] = "Elysia + Bun + Azure";
	})

	.get("/", () => ({
		app: "Docker-Mastery",
		author: "Tegar Wijaya Kusuma",
		version: "v1",
		uptime: `${Math.floor(process.uptime())}`,
	}))

	.get("/health", ({ set }) => {
		// This whole server is designed to be trivial, this simple conditional perfect for our situation.
		if (HEALTH_DEGRADED === true) {
			set.status = 503;
			throw new Error({ status: "degraded" });
		} else {
			set.status = 200;
			return { status: "ok" };
		}
	})

	.get(
		"/echo",
		async ({ set, body }) => {
			set.status = 201;
			return body.field;
		},
		{
			body: t.Object({
				field: t.String({ minLength: MIN_FIELD_LENGTH }),
			}),
		},
	)

	.use(swagger())
	.listen({ port: PORT, hostname: HOSTNAME });

console.log(`Elysia listening at http://localhost:${app.server?.port}`);
console.log(
	`Swagger listening at http://localhost:${app.server?.port}/swagger`,
);
