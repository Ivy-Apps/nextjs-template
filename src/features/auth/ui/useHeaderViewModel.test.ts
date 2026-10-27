import { dehydrate, hydrate } from "@tanstack/react-query";
import { DEMO_USERNAME } from "@test/fakeBackend";
import { installFakeBff } from "@test/fakeBff";
import { fakeRouter } from "@test/fakeRouter";
import {
  renderHookWithProviders,
  testQueryClient,
} from "@test/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProxyHttpClient } from "@/data/http/ProxyHttpClient";
import { currentUserQuery } from "@/features/auth/ui/currentUserQuery";
import { useHeaderViewModel } from "@/features/auth/ui/useHeaderViewModel";

vi.mock(
  "next/navigation",
  async () => (await import("@test/fakeRouter")).fakeNavigation,
);

const bff = installFakeBff();

const DEMO_USER = {
  id: 1,
  username: DEMO_USERNAME,
  email: "emily.johnson@x.dummyjson.com",
  firstName: "Emily",
  lastName: "Johnson",
  image: "https://dummyjson.com/icon/emilys/128",
};

describe("useHeaderViewModel", () => {
  it("shows the signed-in user", async () => {
    bff.signIn();

    const { result } = renderHookWithProviders(useHeaderViewModel);

    await waitFor(() =>
      expect(result.current.state).toStrictEqual({
        user: { _tag: "Loaded", user: DEMO_USER },
        logout: "Idle",
      }),
    );
  });

  it("renders the user prefetched on the server without loading", async () => {
    bff.signIn();
    const server = testQueryClient();
    await server.prefetchQuery(currentUserQuery(ProxyHttpClient));
    const browser = testQueryClient();
    hydrate(browser, dehydrate(server));
    const requestsBefore = bff.backend.requests.length;

    const { result } = renderHookWithProviders(useHeaderViewModel, browser);

    expect(result.current.state.user).toStrictEqual({
      _tag: "Loaded",
      user: DEMO_USER,
    });
    expect(bff.backend.requests.length).toBe(requestsBefore);
  });

  it("fails to load the user without a session", async () => {
    const { result } = renderHookWithProviders(useHeaderViewModel);

    await waitFor(() =>
      expect(result.current.state.user).toStrictEqual({ _tag: "Failed" }),
    );
  });

  it("logs out: ends the session, drops the cache and goes to login", async () => {
    bff.signIn();
    const queryClient = testQueryClient();
    const { result } = renderHookWithProviders(useHeaderViewModel, queryClient);
    await waitFor(() => expect(result.current.state.user._tag).toBe("Loaded"));

    act(() => result.current.onEvent({ _tag: "LogOut" }));

    await waitFor(() => expect(fakeRouter.path).toBe("/login"));
    expect(bff.cookies.size).toBe(0);
    expect(
      queryClient.getQueryData(currentUserQuery(ProxyHttpClient).queryKey),
    ).toBeUndefined();
  });

  it("reports a logout that could not reach the server", async () => {
    bff.signIn();
    const { result } = renderHookWithProviders(useHeaderViewModel);
    await waitFor(() => expect(result.current.state.user._tag).toBe("Loaded"));
    bff.goOffline();

    act(() => result.current.onEvent({ _tag: "LogOut" }));

    await waitFor(() => expect(result.current.state.logout).toBe("Failed"));
    expect(fakeRouter.path).toBeUndefined();
  });
});
