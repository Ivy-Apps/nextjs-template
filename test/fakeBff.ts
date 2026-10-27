import {
  FAKE_BE_URL,
  type FakeBackend,
  type FakeBackendOptions,
  unreachable,
} from "@test/fakeBackend";
import { installFakeBackend } from "@test/installFakeBackend";
import { NextRequest, type NextResponse } from "next/server";
import { beforeEach, vi } from "vitest";
import { POST as logIn } from "@/app/api/auth/login/route";
import { POST as logOut } from "@/app/api/auth/logout/route";
import * as proxy from "@/app/proxy/[...path]/route";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/data/session/sessionCookies";

/**
 * The browser's view of this app: `fetch` to the page's own origin reaches the
 * real BFF route handlers (`/api/auth/*`, `/proxy/*`) through a cookie jar,
 * and the handlers reach a fake backend at `BE_URL`. Any other origin is
 * unreachable. Install it at the top of a test file, like `installFakeBackend`.
 */
export function installFakeBff(options: FakeBackendOptions = {}) {
  const backend = installFakeBackend(options);
  const jar = new Map<string, string>();
  let network: Network = "Online";
  const delegate: typeof fetch = (input, init) => {
    const request = new Request(input, init);
    switch (new URL(request.url).origin) {
      case FAKE_BE_URL:
        return backend.current.fetch(request);
      case location.origin:
        return network === "Offline" ? unreachable() : handle(request, jar);
      default:
        return unreachable();
    }
  };
  beforeEach(() => {
    jar.clear();
    network = "Online";
    // Replaces the backend's fetch, which this one delegates to.
    vi.stubGlobal("fetch", delegate);
  });
  return {
    get backend(): FakeBackend {
      return backend.current;
    },
    /** The session cookies the browser holds, by name. */
    cookies: jar as ReadonlyMap<string, string>,
    /** Starts a session for the demo user, as a login would. */
    signIn: () => {
      const tokens = backend.current.login();
      jar.set(ACCESS_TOKEN_COOKIE, tokens.accessToken);
      jar.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken);
    },
    /** Every request from the BFF to the backend fails from now on. */
    takeBackendDown: () => backend.current.takeDown(),
    /** Every request from the browser fails from now on. */
    goOffline: () => {
      network = "Offline";
    },
  };
}

type Network = "Online" | "Offline";

async function handle(
  request: Request,
  jar: Map<string, string>,
): Promise<Response> {
  const url = new URL(request.url);
  const nextRequest = new NextRequest(url, {
    method: request.method,
    headers: request.headers,
    ...(request.body === null ? {} : { body: await request.text() }),
  });
  // Set through the cookie API: happy-dom's Headers drops a `cookie` header,
  // as browsers do for scripts.
  for (const [name, value] of jar) nextRequest.cookies.set(name, value);
  const response = await route(url.pathname, nextRequest);
  for (const { name, value } of response.cookies.getAll()) {
    if (value === "") jar.delete(name);
    else jar.set(name, value);
  }
  return response;
}

function route(pathname: string, request: NextRequest): Promise<NextResponse> {
  if (pathname === "/api/auth/login") return logIn(request);
  if (pathname === "/api/auth/logout") return Promise.resolve(logOut());
  if (pathname.startsWith("/proxy/")) {
    const path = pathname.split("/").slice(2).map(decodeURIComponent);
    const handler = proxy[request.method as keyof typeof proxy];
    return handler(request, { params: Promise.resolve({ path }) });
  }
  throw new Error(`The fake BFF has no route for ${pathname}`);
}
