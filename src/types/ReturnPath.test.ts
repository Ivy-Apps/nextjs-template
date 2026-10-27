import { fc, test } from "@fast-check/vitest";
import { Option } from "effect";
import { describe, expect, it } from "vitest";
import { parseReturnPath } from "@/types/ReturnPath";

const origins = fc.constantFrom(
  "https://app.example",
  "http://localhost:3000",
  "https://bg.app.example:8443",
);

// Paths an attacker would try: protocol-relative, backslashes, control
// characters, schemes, userinfo, encoded slashes.
const hostileFragments = fc.constantFrom(
  "/",
  "//",
  "\\",
  "/\\",
  "\t",
  "\n",
  "\r",
  "\u0000",
  "@",
  ":",
  "%2f",
  "%5c",
  "evil.example",
  "javascript:",
  "https:",
  ".",
  "..",
  "?",
  "#",
);
const hostilePaths = fc
  .array(fc.oneof(hostileFragments, fc.string()), { maxLength: 6 })
  .map((parts) => `/${parts.join("")}`);

describe("parseReturnPath", () => {
  test.prop([hostilePaths, origins])(
    "only accepts paths that stay on the site's origin",
    (raw, origin) => {
      fc.pre(Option.isSome(parseReturnPath(raw)));

      expect(new URL(raw, origin).origin).toBe(origin);
    },
  );

  test.prop([
    fc.array(fc.stringMatching(/^[\w-]+$/), { maxLength: 4 }),
    fc.option(fc.stringMatching(/^[\w=&]+$/), { nil: undefined }),
  ])("accepts a site path with its query", (segments, query) => {
    const path = `/${segments.join("/")}${query === undefined ? "" : `?${query}`}`;

    expect(parseReturnPath(path)).toStrictEqual(Option.some(path));
  });

  it.each([
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "\\\\evil.example",
    "https://evil.example",
    "javascript:alert(1)",
    "todos",
    "",
  ])("rejects %j", (raw) => {
    expect(parseReturnPath(raw)).toStrictEqual(Option.none());
  });

  it("rejects a missing param", () => {
    expect(parseReturnPath(null)).toStrictEqual(Option.none());
  });
});
