import { DEMO_PASSWORD, DEMO_USERNAME } from "@test/fakeBackend";
import { installFakeBff } from "@test/fakeBff";
import { fakeRouter } from "@test/fakeRouter";
import {
  renderHookWithProviders,
  testQueryClient,
} from "@test/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ACCESS_TOKEN_COOKIE } from "@/data/session/sessionCookies";
import { useLoginViewModel } from "@/features/auth/ui/useLoginViewModel";
import type { UiEvent } from "@/features/auth/ui/useLoginViewModel.types";
import { ReturnPath } from "@/types/ReturnPath";

const bff = installFakeBff();

const DESTINATION = ReturnPath.make("/bg/todos?done=true");

function renderLogin(queryClient = testQueryClient()) {
  const { result } = renderHookWithProviders(
    () => useLoginViewModel(DESTINATION),
    queryClient,
  );
  // One act per event, so each event sees the state the previous one left.
  const send = (...events: ReadonlyArray<UiEvent>) => {
    for (const event of events) act(() => result.current.onEvent(event));
  };
  const submit = (username: string, password: string) =>
    send(
      { _tag: "ChangeUsername", value: username },
      { _tag: "ChangePassword", value: password },
      { _tag: "Submit" },
    );
  return { result, send, submit };
}

describe("useLoginViewModel", () => {
  it("starts with an empty form and no submission", () => {
    const { result } = renderLogin();

    expect(result.current.state).toStrictEqual({
      _tag: "Idle",
      fields: { username: "", password: "" },
    });
  });

  it("keeps what the visitor types", () => {
    const { result, send } = renderLogin();

    send(
      { _tag: "ChangeUsername", value: "emily" },
      { _tag: "ChangePassword", value: "secret" },
    );

    expect(result.current.state.fields).toStrictEqual({
      username: "emily",
      password: "secret",
    });
  });

  it("logs in with valid credentials and goes to the destination", async () => {
    const { result, submit } = renderLogin();

    submit(DEMO_USERNAME, DEMO_PASSWORD);

    await waitFor(() => expect(fakeRouter.path).toBe(DESTINATION));
    expect(result.current.state._tag).toBe("LoggedIn");
    expect(bff.cookies.has(ACCESS_TOKEN_COOKIE)).toBe(true);
  });

  it("drops the last session's cached queries on login", async () => {
    const queryClient = testQueryClient();
    queryClient.setQueryData(["last", "session"], "their data");
    const { submit } = renderLogin(queryClient);

    submit(DEMO_USERNAME, DEMO_PASSWORD);

    await waitFor(() => expect(fakeRouter.path).toBe(DESTINATION));
    expect(queryClient.getQueryData(["last", "session"])).toBeUndefined();
  });

  it("rejects wrong credentials and stays on the page", async () => {
    const { result, submit } = renderLogin();

    submit(DEMO_USERNAME, "wrong-password");

    await waitFor(() =>
      expect(result.current.state).toStrictEqual({
        _tag: "Rejected",
        fields: { username: DEMO_USERNAME, password: "wrong-password" },
        reason: "InvalidCredentials",
      }),
    );
    expect(fakeRouter.path).toBeUndefined();
    expect(bff.cookies.size).toBe(0);
  });

  it("rejects an empty form", async () => {
    const { result, send } = renderLogin();

    send({ _tag: "Submit" });

    await waitFor(() =>
      expect(result.current.state).toStrictEqual({
        _tag: "Rejected",
        fields: { username: "", password: "" },
        reason: "InvalidRequest",
      }),
    );
  });

  it("reports an unreachable backend", async () => {
    bff.takeBackendDown();
    const { result, submit } = renderLogin();

    submit(DEMO_USERNAME, DEMO_PASSWORD);

    await waitFor(() =>
      expect(result.current.state).toStrictEqual({
        _tag: "Rejected",
        fields: { username: DEMO_USERNAME, password: DEMO_PASSWORD },
        reason: "BackendUnavailable",
      }),
    );
    expect(fakeRouter.path).toBeUndefined();
  });
});
