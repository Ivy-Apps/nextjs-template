/**
 * An in-memory DummyJSON standing in for `fetch`. It issues JWT-shaped tokens
 * that expire on the real clock (`Date.now()`, so `vi.setSystemTime` moves
 * it), answers the auth endpoints like DummyJSON does, serves the given static
 * routes and records every request it receives.
 *
 * - `POST /auth/login` {username, password, expiresInMins?}: 400 on wrong
 *   credentials, else the user with an access and a refresh token.
 * - `POST /auth/refresh` {refreshToken, expiresInMins?}: 403 on an unknown or
 *   expired refresh token, else a new token pair.
 * - `GET /auth/me`: 401 without a live Bearer, else the user.
 * - `/auth/<path>`: 401 without a live Bearer, else `/<path>`.
 * - `GET /todos/user/{id}`: that user's todos as `{todos, total, skip, limit}`.
 * - `POST /todos/add` {todo, completed, userId}: 400 on a malformed body, else
 *   201 with the todo under a made-up id. Like DummyJSON, it stores nothing.
 * - `PUT /todos/{id}` {completed} and `DELETE /todos/{id}`: 404 for an
 *   unknown id, else the changed todo, without storing the change.
 * - `<path>`: the static route, matched on the pathname; 404 otherwise. A
 *   static route also overrides a todos endpoint on the same pathname.
 */
export function fakeBackend(options: FakeBackendOptions = {}): FakeBackend {
  const routes = options.routes ?? {};
  const todos = options.todos ?? DEMO_TODOS;
  const issued = new Map<string, Token>();
  const requests: Array<ReceivedRequest> = [];

  const issue = (kind: Token["kind"], expiresInMins: number): string => {
    const exp = Math.floor(Date.now() / 1000) + expiresInMins * 60;
    const token = fakeJwt({ id: DEMO_USER.id, exp }, `${kind}-${issued.size}`);
    issued.set(token, { kind, exp });
    return token;
  };
  const issuePair = (expiresInMins: number) => ({
    accessToken: issue("access", expiresInMins),
    refreshToken: issue("refresh", REFRESH_TOKEN_LIFETIME_MINUTES),
  });
  const isLive = (token: string | undefined, kind: Token["kind"]) => {
    const found = token === undefined ? undefined : issued.get(token);
    return found?.kind === kind && found.exp * 1000 > Date.now();
  };

  const handle = async (request: ReceivedRequest): Promise<Response> => {
    const { pathname } = request.url;
    const bearer = request.headers
      .get("authorization")
      ?.match(/^Bearer (.+)$/)?.[1];
    const body = parseJson(request.body);

    if (request.method === "POST" && pathname === "/auth/login") {
      return body.username === DEMO_USERNAME && body.password === DEMO_PASSWORD
        ? withDummyCookies({ ...DEMO_USER, ...issuePair(minutes(body)) })
        : Response.json({ message: "Invalid credentials" }, { status: 400 });
    }
    if (request.method === "POST" && pathname === "/auth/refresh") {
      return isLive(stringField(body, "refreshToken"), "refresh")
        ? withDummyCookies(issuePair(minutes(body)))
        : Response.json(
            { message: "Invalid or expired refresh token" },
            { status: 403 },
          );
    }
    if (pathname.startsWith("/auth/")) {
      if (!isLive(bearer, "access")) {
        return Response.json(
          { message: "Invalid/expired Token!" },
          { status: 401 },
        );
      }
      if (pathname === "/auth/me") return Response.json(DEMO_USER);
      return resource(request.method, pathname.slice("/auth".length), body);
    }
    return resource(request.method, pathname, body);
  };
  const resource = (
    method: string,
    pathname: string,
    body: Record<string, unknown>,
  ): Response => {
    const [, collection, first, second] = pathname.split("/");
    if (collection !== "todos" || pathname in routes) {
      return serve(routes, pathname);
    }
    if (method === "GET" && first === "user") {
      const owned = todos.filter((todo) => String(todo.userId) === second);
      return Response.json({
        todos: owned,
        total: owned.length,
        skip: 0,
        limit: owned.length,
      });
    }
    if (method === "POST" && first === "add") {
      const { todo, completed, userId } = body;
      return typeof todo === "string" &&
        todo !== "" &&
        typeof completed === "boolean" &&
        typeof userId === "number"
        ? Response.json(
            { id: todos.length + 1, todo, completed, userId },
            { status: 201 },
          )
        : Response.json({ message: "Invalid todo" }, { status: 400 });
    }
    const found = todos.find((todo) => String(todo.id) === first);
    if (found === undefined) {
      return Response.json(
        { message: `Todo with id '${first}' not found` },
        { status: 404 },
      );
    }
    if (method === "PUT") {
      return Response.json({
        ...found,
        ...(typeof body.completed === "boolean"
          ? { completed: body.completed }
          : {}),
      });
    }
    if (method === "DELETE") {
      return Response.json({
        ...found,
        isDeleted: true,
        deletedOn: new Date().toISOString(),
      });
    }
    return serve(routes, pathname);
  };

  return {
    requests,
    fetch: async (input, init) => {
      const request = new Request(input, init);
      const received: ReceivedRequest = {
        method: request.method,
        url: new URL(request.url),
        headers: request.headers,
        body: await request.text(),
      };
      requests.push(received);
      return handle(received);
    },
    login: () => issuePair(DEFAULT_ACCESS_TOKEN_LIFETIME_MINUTES),
  };
}

export const FAKE_BE_URL = "https://be.test";

export type FakeBackend = {
  readonly fetch: typeof fetch;
  /** Every request received, oldest first. */
  readonly requests: ReadonlyArray<ReceivedRequest>;
  /** Issues a token pair for the demo user, as a login would. */
  readonly login: () => { accessToken: string; refreshToken: string };
};

export type FakeBackendOptions = {
  /** Static routes by pathname; they override the todos endpoints. */
  routes?: Record<string, Route>;
  /** Every user's todos; `DEMO_TODOS` by default. */
  todos?: ReadonlyArray<FakeTodo>;
};

export type Route = { status: number; body: unknown };

/** A todo in DummyJSON's shape. */
export type FakeTodo = {
  readonly id: number;
  readonly todo: string;
  readonly completed: boolean;
  readonly userId: number;
};

export type ReceivedRequest = {
  readonly method: string;
  readonly url: URL;
  readonly headers: Headers;
  readonly body: string;
};

export const DEMO_USERNAME = "emilys";
export const DEMO_PASSWORD = "emilyspass";
export const DEMO_USER = {
  id: 1,
  username: DEMO_USERNAME,
  email: "emily.johnson@x.dummyjson.com",
  firstName: "Emily",
  lastName: "Johnson",
  gender: "female",
  image: "https://dummyjson.com/icon/emilys/128",
};

/** The demo user's todos, then another user's. */
export const DEMO_TODOS: ReadonlyArray<FakeTodo> = [
  { id: 1, todo: "Buy milk", completed: false, userId: DEMO_USER.id },
  { id: 2, todo: "Water the plants", completed: true, userId: DEMO_USER.id },
  {
    id: 3,
    todo: "Write the quarterly report for the infrastructure migration and send it to everyone involved",
    completed: false,
    userId: DEMO_USER.id,
  },
  { id: 4, todo: "Someone else's todo", completed: false, userId: 2 },
];

/** A JWT-shaped token with the given payload and an unverifiable signature. */
export function fakeJwt(payload: object, signature = "signature"): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.${signature}`;
}

type Token = { kind: "access" | "refresh"; exp: number };

const DEFAULT_ACCESS_TOKEN_LIFETIME_MINUTES = 60;
const REFRESH_TOKEN_LIFETIME_MINUTES = 30 * 24 * 60;

function serve(routes: Record<string, Route>, pathname: string): Response {
  const route = routes[pathname] ?? {
    status: 404,
    body: { message: "Not found" },
  };
  return Response.json(route.body, { status: route.status });
}

/** DummyJSON also sets its tokens as cookies; a BFF must not forward them. */
function withDummyCookies(body: {
  accessToken: string;
  refreshToken: string;
}): Response {
  const response = Response.json(body);
  response.headers.append("set-cookie", `accessToken=${body.accessToken}`);
  response.headers.append("set-cookie", `refreshToken=${body.refreshToken}`);
  return response;
}

function parseJson(text: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function stringField(
  body: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = body[key];
  return typeof value === "string" ? value : undefined;
}

function minutes(body: Record<string, unknown>): number {
  const value = body.expiresInMins;
  return typeof value === "number"
    ? value
    : DEFAULT_ACCESS_TOKEN_LIFETIME_MINUTES;
}
