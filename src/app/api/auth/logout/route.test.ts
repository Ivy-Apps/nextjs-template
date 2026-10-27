// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/auth/logout/route";

describe("POST /api/auth/logout", () => {
  it("clears both session cookies", () => {
    const response = POST();

    const cleared = { value: "", maxAge: 0, path: "/", httpOnly: true };
    expect([
      response.cookies.get("access_token"),
      response.cookies.get("refresh_token"),
    ]).toMatchObject([cleared, cleared]);
  });
});
