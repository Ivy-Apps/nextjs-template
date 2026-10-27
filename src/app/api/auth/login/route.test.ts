// @vitest-environment node
import { DEMO_PASSWORD, DEMO_USERNAME, FAKE_BE_URL } from "@test/fakeBackend";
import { installFakeBackend } from "@test/installFakeBackend";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/login/route";

const backend = installFakeBackend();

function postLogin(body: unknown) {
  return POST(
    new NextRequest("https://app.test/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/auth/login", () => {
  it("answers the user and sets the tokens as httpOnly, Secure session cookies", async () => {
    const response = await postLogin({
      username: DEMO_USERNAME,
      password: DEMO_PASSWORD,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({
      id: 1,
      username: DEMO_USERNAME,
      email: "emily.johnson@x.dummyjson.com",
      firstName: "Emily",
      lastName: "Johnson",
      image: "https://dummyjson.com/icon/emilys/128",
    });
    for (const name of ["access_token", "refresh_token"]) {
      expect(response.cookies.get(name)).toMatchObject({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        value: expect.stringMatching(/^[\w-]+\.[\w-]+\.[\w-]+$/),
      });
    }
  });

  it("drops Secure under next dev, so the cookies work on http://localhost", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const response = await postLogin({
      username: DEMO_USERNAME,
      password: DEMO_PASSWORD,
    });

    for (const name of ["access_token", "refresh_token"]) {
      expect(response.cookies.get(name)).toMatchObject({
        httpOnly: true,
        secure: false,
      });
    }
  });

  it("keeps the tokens out of the response body", async () => {
    const response = await postLogin({
      username: DEMO_USERNAME,
      password: DEMO_PASSWORD,
    });

    const body = await response.text();
    expect(body).not.toContain(response.cookies.get("access_token")?.value);
    expect(body).not.toContain(response.cookies.get("refresh_token")?.value);
  });

  it("sends the credentials to the backend's login", async () => {
    await postLogin({ username: DEMO_USERNAME, password: DEMO_PASSWORD });

    const request = backend.current.requests.at(-1);
    expect(request?.url.href).toBe(`${FAKE_BE_URL}/auth/login`);
    expect(JSON.parse(request?.body ?? "")).toMatchObject({
      username: DEMO_USERNAME,
      password: DEMO_PASSWORD,
    });
  });

  it("answers 401 InvalidCredentials and sets no cookie on a wrong password", async () => {
    const response = await postLogin({
      username: DEMO_USERNAME,
      password: "wrong",
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toStrictEqual({ _tag: "InvalidCredentials" });
    expect(response.cookies.getAll()).toStrictEqual([]);
  });

  it.each([
    ["an empty username", { username: "", password: DEMO_PASSWORD }],
    ["a missing password", { username: DEMO_USERNAME }],
    ["a non-object body", "emilys"],
  ])("answers 400 InvalidRequest on %s", async (_, body) => {
    const response = await postLogin(body);

    expect(response.status).toBe(400);
    expect(await response.json()).toStrictEqual({ _tag: "InvalidRequest" });
  });
});
