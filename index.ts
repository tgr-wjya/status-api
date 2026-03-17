/**
 * Entrypoint for my System Status API
 *
 * @author Tegar Wijaya Kusuma
 * @date 18 March 2026
 */

import { statusApiApp } from "./src/app";

const PORT = Bun.env.PORT ?? 3000;
const HOSTNAME = Bun.env.HOSTNAME ?? "0.0.0.0";

statusApiApp.listen({ port: PORT, hostname: HOSTNAME });

console.log(
	`Elysia listening at http://localhost:${statusApiApp.server?.port}`,
);
console.log(
	`Swagger listening at http://localhost:${statusApiApp.server?.port}/swagger`,
);
