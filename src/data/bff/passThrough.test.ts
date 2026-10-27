import { fc, test } from "@fast-check/vitest";
import { Option } from "effect";
import { describe, expect } from "vitest";
import { backendPath } from "@/data/bff/passThrough";

const bases = fc.constantFrom(
  "https://dummyjson.com",
  "https://be.example/api/v1",
  "http://localhost:8080/",
);

// Segments an attacker would try, mixed with arbitrary unicode.
const segments = fc.array(
  fc.oneof(
    fc.constantFrom(".", "..", "", "//evil.example", "@evil.example", "a/../b"),
    fc.constantFrom(
      "\\",
      "%2e%2e",
      "?x=1",
      "#frag",
      "http:",
      "evil.example:80",
    ),
    fc.string({ unit: "grapheme" }),
  ),
  { maxLength: 5 },
);

function resolve(base: string, path: string): URL {
  return new URL(base.replace(/\/$/, "") + path);
}

describe("backendPath", () => {
  test.prop([segments, bases])(
    "only yields paths that stay on BE_URL's origin and under its path",
    (path, base) => {
      fc.pre(Option.isSome(backendPath(path)));
      const target = resolve(base, Option.getOrThrow(backendPath(path)));

      expect(target.origin).toBe(new URL(base).origin);
      expect(
        target.pathname.startsWith(new URL(base).pathname.replace(/\/$/, "")),
      ).toBe(true);
      expect(target.search).toBe("");
      expect(target.hash).toBe("");
    },
  );

  test.prop([segments, bases])(
    "keeps every accepted segment intact, as one backend segment",
    (path, base) => {
      fc.pre(Option.isSome(backendPath(path)));
      const target = resolve(base, Option.getOrThrow(backendPath(path)));

      expect(
        target.pathname.split("/").slice(-path.length).map(decodeURIComponent),
      ).toStrictEqual(path);
    },
  );

  test.prop([
    segments.filter((path) => path.some((s) => s === "." || s === "..")),
  ])("rejects dot segments", (path) => {
    expect(backendPath(path)).toStrictEqual(Option.none());
  });
});
