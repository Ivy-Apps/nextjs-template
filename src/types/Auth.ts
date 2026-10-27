import { Schema } from "effect";

/** The body of `POST /api/auth/login`. */
export const Credentials = Schema.Struct({
  username: Schema.NonEmptyString,
  password: Schema.NonEmptyString,
});
export type Credentials = typeof Credentials.Type;

/**
 * The body of a failed `POST /api/auth/login`: 400 for a malformed body, 401
 * for wrong credentials, 502 when the backend is unreachable.
 */
export const LoginFailure = Schema.TaggedUnion({
  InvalidRequest: {},
  InvalidCredentials: {},
  BackendUnavailable: {},
});
export type LoginFailure = typeof LoginFailure.Type;
