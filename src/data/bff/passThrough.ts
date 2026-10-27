import { Effect, Option } from "effect";
import {
  HttpClient,
  HttpClientRequest,
  type HttpClientResponse,
  type HttpMethod,
} from "effect/http";
import { type NextRequest, NextResponse } from "next/server";
import { BackendFailure } from "@/data/session/AuthRepository";
import {
  type ResolvedSession,
  renewSession,
  resolveSession,
} from "@/data/session/resolveSession";
import {
  readSessionCookies,
  type SessionUpdate,
  writeSessionUpdate,
} from "@/data/session/sessionCookies";
import type { AccessToken, RefreshToken } from "@/data/session/Tokens";

/**
 * Forwards a browser request to `BE_URL/<path>` with its query string, method,
 * headers and body. It swaps the browser's cookies for the session's Bearer,
 * renews the session first when the access token is stale, and on a backend
 * 401 renews once and retries. A rejected renewal ends the session (401, both
 * cookies cleared); an unreachable backend answers 502 and keeps the session.
 */
export function passThrough(
  request: NextRequest,
  path: ReadonlyArray<string>,
): Effect.Effect<NextResponse, never, HttpClient.HttpClient> {
  return Option.match(backendPath(path), {
    onNone: () => Effect.succeed(errorResponse(400, "Invalid path")),
    onSome: (target) =>
      Effect.gen(function* () {
        const send = yield* backendSender(request, target);
        const cookies = readSessionCookies(request.cookies);
        const session = yield* resolveSession(cookies);
        const result = yield* forward(
          send,
          session,
          session.update._tag === "Unchanged"
            ? cookies.refreshToken
            : Option.none(),
        );
        const response = toNextResponse(result.response);
        writeSessionUpdate(response.cookies, result.session);
        return response;
      }).pipe(
        Effect.catchTag("BackendFailure", () =>
          Effect.succeed(errorResponse(502, "Backend unavailable")),
        ),
      ),
  });
}

/**
 * The backend path for the `/proxy/[...path]` segments, each segment
 * percent-encoded so it cannot add a scheme, host, query or extra segment.
 * Dot segments are rejected, so the path cannot climb above `BE_URL`.
 */
export function backendPath(
  segments: ReadonlyArray<string>,
): Option.Option<string> {
  return segments.length > 0 && segments.every(isPlainSegment)
    ? Option.some(`/${segments.map(encodeURIComponent).join("/")}`)
    : Option.none();
}

type Forwarded = {
  readonly response: Response;
  readonly session: SessionUpdate;
};

type Send = (
  accessToken: Option.Option<AccessToken>,
) => Effect.Effect<Response, BackendFailure, HttpClient.HttpClient>;

/**
 * Sends the request with the session's Bearer. On a 401 it renews the session
 * with `retryWith`, if given, and sends once more.
 */
function forward(
  send: Send,
  session: ResolvedSession,
  retryWith: Option.Option<RefreshToken>,
): Effect.Effect<Forwarded, BackendFailure, HttpClient.HttpClient> {
  switch (session._tag) {
    case "SignedIn":
      return send(Option.some(session.accessToken)).pipe(
        Effect.flatMap((response) =>
          response.status === 401 && Option.isSome(retryWith)
            ? renewSession(retryWith.value).pipe(
                Effect.flatMap((renewed) =>
                  forward(send, renewed, Option.none()),
                ),
              )
            : Effect.succeed({ response, session: session.update }),
        ),
      );
    case "SignedOut":
      return session.update._tag === "Ended"
        ? Effect.succeed({
            response: errorResponse(401, "Session expired"),
            session: session.update,
          })
        : send(Option.none()).pipe(
            Effect.map((response) => ({ response, session: session.update })),
          );
  }
}

/**
 * Reads the browser request once, so it can be sent again after a renewal,
 * and returns a function sending it with the given Bearer.
 */
function backendSender(
  request: NextRequest,
  target: string,
): Effect.Effect<Send> {
  return Effect.promise(() => request.arrayBuffer()).pipe(
    Effect.map((body) => {
      const base = HttpClientRequest.make(
        request.method as HttpMethod.HttpMethod,
      )(target + request.nextUrl.search, {
        headers: forwardedHeaders(request.headers, REQUEST_HEADERS_TO_DROP),
      });
      const withBody =
        body.byteLength === 0
          ? base
          : HttpClientRequest.bodyUint8Array(
              base,
              new Uint8Array(body),
              request.headers.get("content-type") ?? undefined,
            );
      return (accessToken) =>
        HttpClient.execute(
          Option.match(accessToken, {
            onNone: () => withBody,
            onSome: (token) => HttpClientRequest.bearerToken(withBody, token),
          }),
        ).pipe(
          Effect.catchReason("HttpClientError", "StatusCodeError", (reason) =>
            Effect.succeed(reason.response),
          ),
          Effect.flatMap(toWebResponse),
          Effect.mapError((cause) => new BackendFailure({ cause })),
        );
    }),
  );
}

function toWebResponse(response: HttpClientResponse.HttpClientResponse) {
  return response.arrayBuffer.pipe(
    Effect.map(
      (body) =>
        new Response(NULL_BODY_STATUSES.has(response.status) ? null : body, {
          status: response.status,
          headers: forwardedHeaders(
            new Headers(response.headers),
            RESPONSE_HEADERS_TO_DROP,
          ),
        }),
    ),
  );
}

function toNextResponse(response: Response): NextResponse {
  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

function errorResponse(status: number, message: string): NextResponse {
  return NextResponse.json({ message }, { status });
}

function forwardedHeaders(
  headers: Headers,
  drop: ReadonlySet<string>,
): Headers {
  return new Headers(
    [...headers].filter(([name]) => !drop.has(name.toLowerCase())),
  );
}

function isPlainSegment(segment: string): boolean {
  return segment !== "" && segment !== "." && segment !== "..";
}

const HOP_BY_HOP_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

/**
 * The browser's cookies and credentials stay in the BFF; fetch sets the host,
 * length and encoding for the backend hop itself.
 */
const REQUEST_HEADERS_TO_DROP: ReadonlySet<string> = new Set([
  ...HOP_BY_HOP_HEADERS,
  "cookie",
  "authorization",
  "host",
  "content-length",
  "accept-encoding",
]);

/**
 * The backend's cookies must not land on the BFF's origin, and fetch has
 * already decoded the body, so its encoding and length no longer apply.
 */
const RESPONSE_HEADERS_TO_DROP: ReadonlySet<string> = new Set([
  ...HOP_BY_HOP_HEADERS,
  "set-cookie",
  "content-encoding",
  "content-length",
]);

const NULL_BODY_STATUSES: ReadonlySet<number> = new Set([101, 204, 205, 304]);
