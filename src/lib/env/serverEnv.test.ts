import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeServerEnv, serverEnv } from "@/lib/env/serverEnv";

describe("decodeServerEnv", () => {
  it("defaults BE_URL to DummyJSON", () => {
    const env = decodeServerEnv({ BE_URL: undefined, NODE_ENV: "production" });

    expect(env.BE_URL.href).toBe("https://dummyjson.com/");
  });

  it("decodes BE_URL as a URL and keeps NODE_ENV", () => {
    const env = decodeServerEnv({
      BE_URL: "http://localhost:3078/api",
      NODE_ENV: "development",
    });

    expect(env).toStrictEqual({
      BE_URL: new URL("http://localhost:3078/api"),
      NODE_ENV: "development",
    });
  });

  it("names every invalid variable in the error", () => {
    expect(() =>
      decodeServerEnv({ BE_URL: "not a url", NODE_ENV: "staging" }),
    ).toThrow(
      'Invalid server environment:\nExpected a valid URL string\n  at ["BE_URL"]\nExpected "development" | "production" | "test"\n  at ["NODE_ENV"]',
    );
  });
});

describe("serverEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads the current process environment", () => {
    vi.stubEnv("BE_URL", "https://first.test");
    expect(serverEnv().BE_URL.href).toBe("https://first.test/");

    vi.stubEnv("BE_URL", "https://second.test");
    expect(serverEnv().BE_URL.href).toBe("https://second.test/");
  });

  it("throws when the process environment is invalid", () => {
    vi.stubEnv("BE_URL", "not a url");

    expect(() => serverEnv()).toThrow(
      /^Invalid server environment:\n.*BE_URL/s,
    );
  });
});
