import { Option, type Schema } from "effect";
import type { HttpClientError } from "effect/http";

/**
 * The status the backend answered when it refused the request; none when the
 * request failed in transport or the answer had the wrong shape.
 */
export function rejectedStatus(
  error: HttpClientError.HttpClientError | Schema.SchemaError,
): Option.Option<number> {
  return error._tag === "HttpClientError" &&
    error.reason._tag === "StatusCodeError"
    ? Option.some(error.reason.response.status)
    : Option.none();
}
