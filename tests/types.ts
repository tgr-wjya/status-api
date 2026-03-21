/**
 * New ValidationError interface for test runner
 *
 * @author Tegar Wijaya Kusuma
 * @date 20 March 2026
 */

export interface ElysiaValidationError {
	type: "validation";
	on: "params" | "body" | "query" | "headers";
	property: string;
	errors: unknown[];
}

export interface WildcardError {
	error: string;
	timestamp: string;
	availableEndpoints: string[];
}

export interface AllError {
	error: string;
	timestamp: string;
}
