import { Effect, Option } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import { hasLocale, type Locale } from "next-intl";
import createMiddleware from "next-intl/middleware";
import { BackendHttpClient } from "@/data/http/BackendHttpClient";
import {
  type ResolvedSession,
  resolveSession,
} from "@/data/session/resolveSession";
import {
  forwardSessionUpdate,
  readSessionCookies,
  writeSessionUpdate,
} from "@/data/session/sessionCookies";
import { routing } from "@/lib/i18n/routing";
import {
  LOGIN_PATH,
  parseReturnPath,
  RETURN_PATH_PARAM,
} from "@/types/ReturnPath";

const handleI18nRouting = createMiddleware(routing);

/**
 * Guards every page but the login page and renews the session before i18n
 * routing. A signed-out visitor is sent to the login page with a return path;
 * a signed-in visitor on the login page is sent on to it (or home).
 */
export async function proxy(request: NextRequest) {
  const session = await Effect.runPromise(
    resolveSession(readSessionCookies(request.cookies)).pipe(
      Effect.catchTag("BackendFailure", () =>
        Effect.succeed<ResolvedSession>({
          _tag: "SignedOut",
          update: { _tag: "Ended" },
        }),
      ),
      Effect.provide(BackendHttpClient),
    ),
  );
  forwardSessionUpdate(request.cookies, session.update);
  const response = route(request, session);
  writeSessionUpdate(response.cookies, session.update);
  return response;
}

function route(request: NextRequest, session: ResolvedSession): NextResponse {
  const { pathname, search, searchParams } = request.nextUrl;
  const { locale, path } = splitLocale(pathname);
  const onLoginPage = path === LOGIN_PATH;
  switch (session._tag) {
    case "SignedIn":
      return onLoginPage
        ? redirect(
            request,
            parseReturnPath(searchParams.get(RETURN_PATH_PARAM)).pipe(
              Option.getOrElse(() => localizedPath(locale, "/")),
            ),
          )
        : handleI18nRouting(request);
    case "SignedOut":
      return onLoginPage
        ? handleI18nRouting(request)
        : redirect(
            request,
            `${localizedPath(locale, LOGIN_PATH)}?${new URLSearchParams({
              [RETURN_PATH_PARAM]: pathname + search,
            })}`,
          );
  }
}

function redirect(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url));
}

/** Splits `/bg/todos` into `bg` and `/todos`; an unprefixed path is the default locale's. */
function splitLocale(pathname: string): { locale: Locale; path: string } {
  const [, first, ...rest] = pathname.split("/");
  return hasLocale(routing.locales, first)
    ? { locale: first, path: `/${rest.join("/")}` }
    : { locale: routing.defaultLocale, path: pathname };
}

/** The path as the browser sees it under `localePrefix: "as-needed"`. */
function localizedPath(locale: Locale, path: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return prefix !== "" && path === "/" ? prefix : prefix + path;
}

export const config = {
  // Pages only: skip the BFF routes (/api, /proxy), Next internals and files.
  matcher: "/((?!api|proxy|_next|_vercel|.*\\..*).*)",
};
