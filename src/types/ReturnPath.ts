import { type Option, Schema } from "effect";

/** The login page, relative to the locale prefix. */
export const LOGIN_PATH = "/login";

/** The login page's query param holding the page to return to after login. */
export const RETURN_PATH_PARAM = "returnTo";

/**
 * A path on this site, such as `/bg/todos?done=true`, safe to redirect to: it
 * can never resolve to another origin, so it cannot cause an open redirect.
 */
export const ReturnPath = Schema.String.check(
  Schema.makeFilter((path) => isSameSitePath(path)),
).pipe(Schema.brand("ReturnPath"));
export type ReturnPath = typeof ReturnPath.Type;

/** Reads the return path param, rejecting anything that is not same-site. */
export function parseReturnPath(raw: string | null): Option.Option<ReturnPath> {
  return Schema.decodeUnknownOption(ReturnPath)(raw);
}

const PROBE_ORIGIN = "https://same-site.invalid";

function isSameSitePath(path: string): boolean {
  // Resolve it the way a browser will: the WHATWG URL parser reads `\` as `/`
  // and drops tabs and newlines, so `/\evil.com` and `/\t/evil.com` resolve
  // to another host and fail the origin check. `//[` does not parse at all.
  return (
    path.startsWith("/") &&
    URL.parse(path, PROBE_ORIGIN)?.origin === PROBE_ORIGIN
  );
}
