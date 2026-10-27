import { DEMO_USER } from "@test/fakeBackend";
import { installFakeBff } from "@test/fakeBff";
import { fakeRouter } from "@test/fakeRouter";
import {
  prefetchedQueryClient,
  renderHookWithProviders,
} from "@test/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProxyHttpClient } from "@/data/http/ProxyHttpClient";
import { currentUserQuery } from "@/features/auth/ui/currentUserQuery";
import { useHeaderViewModel } from "@/features/auth/ui/useHeaderViewModel";

const bff = installFakeBff();

// The user as the app decodes it: the backend's extra fields are dropped.
const { gender: _, ...SIGNED_IN_USER } = DEMO_USER;

describe("useHeaderViewModel", () => {
  it("shows the signed-in user", async () => {
    bff.signIn();

    const { result } = renderHookWithProviders(useHeaderViewModel);

    await waitFor(() =>
      expect(result.current.state).toStrictEqual({
        _tag: "Loaded",
        user: SIGNED_IN_USER,
        logout: "Idle",
      }),
    );
  });

  it("renders the user prefetched on the server without loading", async () => {
    bff.signIn();
    const browser = await prefetchedQueryClient((queryClient) =>
      queryClient.prefetchQuery(currentUserQuery(ProxyHttpClient)),
    );
    const requestsBefore = bff.backend.requests.length;

    const { result } = renderHookWithProviders(useHeaderViewModel, browser);

    expect(result.current.state).toStrictEqual({
      _tag: "Loaded",
      user: SIGNED_IN_USER,
      logout: "Idle",
    });
    expect(bff.backend.requests.length).toBe(requestsBefore);
  });

  it("fails to load the user without a session", async () => {
    const { result } = renderHookWithProviders(useHeaderViewModel);

    await waitFor(() =>
      expect(result.current.state).toStrictEqual({
        _tag: "Failed",
        logout: "Idle",
      }),
    );
  });

  it("goes to the login page, back to this one after, when the session ends", async () => {
    bff.signIn();
    bff.backend.revokeTokens();

    renderHookWithProviders(useHeaderViewModel);

    await waitFor(() => expect(fakeRouter.path).toBe("/login?returnTo=%2F"));
    expect(bff.cookies.size).toBe(0);
  });

  it("logs out: ends the session and goes to login", async () => {
    bff.signIn();
    const { result } = renderHookWithProviders(useHeaderViewModel);
    await waitFor(() => expect(result.current.state._tag).toBe("Loaded"));

    act(() => result.current.onEvent({ _tag: "LogOut" }));

    await waitFor(() => expect(fakeRouter.path).toBe("/login"));
    expect(bff.cookies.size).toBe(0);
  });

  it("reports a logout that could not reach the server", async () => {
    bff.signIn();
    const { result } = renderHookWithProviders(useHeaderViewModel);
    await waitFor(() => expect(result.current.state._tag).toBe("Loaded"));
    bff.goOffline();

    act(() => result.current.onEvent({ _tag: "LogOut" }));

    await waitFor(() => expect(result.current.state.logout).toBe("Failed"));
    expect(fakeRouter.path).toBeUndefined();
  });
});
