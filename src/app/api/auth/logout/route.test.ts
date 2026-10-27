// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/auth/logout/route";

describe("POST /api/auth/logout", () => {
  it("clears both session cookies", () => {
    const response = POST();

    for (const name of ["access_token", "refresh_token"]) {
      expect(response.cookies.get(name)).toMatchObject({
        value: "",
        maxAge: 0,
        path: "/",
        httpOnly: true,
      });
    }
  });
});
