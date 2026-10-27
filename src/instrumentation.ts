import { serverEnv } from "@/lib/env/serverEnv";

/** Runs once at server start: an invalid environment stops the server. */
export function register(): void {
  serverEnv();
}
