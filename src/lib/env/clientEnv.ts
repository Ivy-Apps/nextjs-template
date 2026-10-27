import { Schema } from "effect";

/**
 * The environment the browser sees: `NEXT_PUBLIC_*` variables only. Next
 * inlines them at build time, and only where the code reads
 * `process.env.NEXT_PUBLIC_X` literally, so list each one in `clientEnv`
 * below, never `process.env` as a whole.
 */
export const ClientEnv = Schema.Struct({});
export type ClientEnv = typeof ClientEnv.Type;

/** The decoded client environment; throws at import when it is invalid. */
export const clientEnv: ClientEnv = Schema.decodeUnknownSync(ClientEnv)({
  // NEXT_PUBLIC_X: process.env.NEXT_PUBLIC_X,
});
