import { Effect, Schema } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import { BackendHttpClient } from "@/data/http/BackendHttpClient";
import {
  type BackendFailure,
  type InvalidCredentials,
  login,
} from "@/data/session/AuthRepository";
import { writeSessionUpdate } from "@/data/session/sessionCookies";
import { Credentials, type LoginFailure } from "@/types/Auth";

/**
 * Logs in with `Credentials`: sets the session cookies and answers the `User`,
 * or a `LoginFailure` (400, 401 or 502).
 */
export async function POST(request: NextRequest) {
  return Effect.runPromise(
    Effect.promise(() => request.json().catch(() => undefined)).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(Credentials)),
      Effect.flatMap(login),
      Effect.map(({ user, tokens }) => {
        const response = NextResponse.json(user);
        writeSessionUpdate(response.cookies, { _tag: "Renewed", tokens });
        return response;
      }),
      Effect.catch((error) => Effect.succeed(failureResponse(error))),
      Effect.provide(BackendHttpClient),
    ),
  );
}

function failureResponse(
  error: Schema.SchemaError | InvalidCredentials | BackendFailure,
): NextResponse {
  switch (error._tag) {
    case "SchemaError":
      return failure(400, { _tag: "InvalidRequest" });
    case "InvalidCredentials":
      return failure(401, { _tag: "InvalidCredentials" });
    case "BackendFailure":
      return failure(502, { _tag: "BackendUnavailable" });
  }
}

function failure(status: number, body: LoginFailure): NextResponse {
  return NextResponse.json(body, { status });
}
