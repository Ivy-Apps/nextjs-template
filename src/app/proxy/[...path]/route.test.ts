// @vitest-environment node
import { FAKE_BE_URL, fakeJwt } from "@test/fakeBackend";
import { installFakeBackend } from "@test/installFakeBackend";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/proxy/[...path]/route";

const backend = installFakeBackend({
  routes: {
    "/todos": { status: 200, body: { todos: [] } },
    "/todos/add": { status: 201, body: { id: 151 } },
  },
});

const NOW = new Date("2026-10-27T12:00:00Z");
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

const MINUTE = 60_000;

function proxyRequest(
  path: string,
  options: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  } = {},
) {
  const url = new URL(path, "https://app.test");
  const request = new NextRequest(url, options);
  const segments = url.pathname.split("/").slice(2).map(decodeURIComponent);
  return { request, context: { params: Promise.resolve({ path: segments }) } };
}

async function send(
  handler: typeof GET,
  path: string,
  options?: Parameters<typeof proxyRequest>[1],
) {
  const { request, context } = proxyRequest(path, options);
  return handler(request, context);
}

function sessionCookie(tokens: { accessToken: string; refreshToken: string }) {
  return `access_token=${tokens.accessToken}; refresh_token=${tokens.refreshToken}; theme=dark`;
}

describe("/proxy/[...path]", () => {
  it("forwards to BE_URL with the path, query and a Bearer, without the browser's cookies", async () => {
    const tokens = backend.current.login();

    const response = await send(GET, "/proxy/auth/todos?limit=5&skip=10", {
      headers: { cookie: sessionCookie(tokens), accept: "application/json" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ todos: [] });
    const received = backend.current.requests.at(-1);
    expect(received?.url.href).toBe(
      `${FAKE_BE_URL}/auth/todos?limit=5&skip=10`,
    );
    expect(received?.headers.get("authorization")).toBe(
      `Bearer ${tokens.accessToken}`,
    );
    expect(received?.headers.get("cookie")).toBeNull();
    expect(received?.headers.get("accept")).toBe("application/json");
  });

  it("forwards the method and body", async () => {
    const tokens = backend.current.login();
    const body = JSON.stringify({ todo: "Write tests", userId: 1 });

    const response = await send(POST, "/proxy/todos/add", {
      method: "POST",
      body,
      headers: {
        cookie: sessionCookie(tokens),
        "content-type": "application/json",
      },
    });

    expect(response.status).toBe(201);
    const received = backend.current.requests.at(-1);
    expect(received?.method).toBe("POST");
    expect(received?.body).toBe(body);
    expect(received?.headers.get("content-type")).toBe("application/json");
  });

  it("passes the backend's error status and body through", async () => {
    const tokens = backend.current.login();

    const response = await send(GET, "/proxy/missing", {
      headers: { cookie: sessionCookie(tokens) },
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toStrictEqual({ message: "Not found" });
  });

  it("never forwards the backend's own cookies to the browser", async () => {
    const tokens = backend.current.login();

    const response = await send(POST, "/proxy/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      headers: { cookie: sessionCookie(tokens) },
    });

    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()).toStrictEqual([]);
  });

  it("renews an expired access token, retries and sets the new cookies", async () => {
    const tokens = backend.current.login();
    vi.setSystemTime(NOW.getTime() + 61 * MINUTE);

    const response = await send(GET, "/proxy/auth/me", {
      headers: { cookie: sessionCookie(tokens) },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ username: "emilys" });
    const renewed = response.cookies.get("access_token")?.value;
    expect(renewed).toBeDefined();
    expect(renewed).not.toBe(tokens.accessToken);
    expect(backend.current.requests.at(-1)?.headers.get("authorization")).toBe(
      `Bearer ${renewed}`,
    );
  });

  it("renews once and retries when the backend rejects a token that looks fresh", async () => {
    const tokens = backend.current.login();
    const forged = fakeJwt({ exp: NOW.getTime() / 1000 + 3600 });

    const response = await send(GET, "/proxy/auth/me", {
      headers: {
        cookie: sessionCookie({ ...tokens, accessToken: forged }),
      },
    });

    expect(response.status).toBe(200);
    expect(response.cookies.get("access_token")?.value).not.toBe(forged);
    expect(backend.current.requests.map((r) => r.url.pathname)).toStrictEqual([
      "/auth/me",
      "/auth/refresh",
      "/auth/me",
    ]);
  });

  it("answers 401 and clears the cookies when the refresh token is rejected", async () => {
    const forged = fakeJwt({ exp: NOW.getTime() / 1000 - 60 });

    const response = await send(GET, "/proxy/auth/me", {
      headers: {
        cookie: sessionCookie({ accessToken: forged, refreshToken: "revoked" }),
      },
    });

    expect(response.status).toBe(401);
    expect(response.cookies.get("access_token")).toMatchObject({
      value: "",
      maxAge: 0,
    });
    expect(response.cookies.get("refresh_token")).toMatchObject({
      value: "",
      maxAge: 0,
    });
  });

  it("forwards without a Bearer when there is no session", async () => {
    const response = await send(GET, "/proxy/auth/me");

    expect(response.status).toBe(401);
    expect(
      backend.current.requests.at(-1)?.headers.get("authorization"),
    ).toBeNull();
    expect(response.cookies.getAll()).toStrictEqual([]);
  });

  it.each([
    ["a parent segment", [".."]],
    ["a parent segment after a path", ["todos", "..", "..", "admin"]],
    ["a current segment", ["."]],
  ])("answers 400 without reaching the backend on %s", async (_, path) => {
    const request = new NextRequest("https://app.test/proxy/x");

    const response = await GET(request, { params: Promise.resolve({ path }) });

    expect(response.status).toBe(400);
    expect(backend.current.requests).toStrictEqual([]);
  });

  it("keeps an encoded slash or authority inside one backend path segment", async () => {
    await GET(new NextRequest("https://app.test/proxy/x"), {
      params: Promise.resolve({ path: ["@evil.example", "a/b?c#d"] }),
    });

    expect(backend.current.requests.at(-1)?.url.href).toBe(
      `${FAKE_BE_URL}/%40evil.example/a%2Fb%3Fc%23d`,
    );
  });
});
