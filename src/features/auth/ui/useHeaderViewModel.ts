"use client";

import {
  type MutationStatus,
  type UseQueryResult,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { Effect } from "effect";
import { FetchHttpClient } from "effect/http";
import { ProxyHttpClient } from "@/data/http/ProxyHttpClient";
import { logOut } from "@/features/auth/data/SessionRepository";
import { currentUserQuery } from "@/features/auth/ui/currentUserQuery";
import type {
  LogoutState,
  UiEvent,
  UiState,
} from "@/features/auth/ui/useHeaderViewModel.types";
import { useRouter } from "@/lib/i18n/navigation";
import { LOGIN_PATH } from "@/types/ReturnPath";
import type { User } from "@/types/User";

/**
 * The signed-in user and the logout action, which ends the session and goes
 * to login. The login drops this user's cached queries.
 */
export function useHeaderViewModel(): {
  state: UiState;
  onEvent: (event: UiEvent) => void;
} {
  const router = useRouter();
  const user = useQuery(currentUserQuery(ProxyHttpClient));
  const logout = useMutation({
    mutationFn: () =>
      Effect.runPromise(logOut.pipe(Effect.provide(FetchHttpClient.layer))),
    onSuccess: () => router.replace(LOGIN_PATH),
  });

  const state = uiState(user, logoutState(logout.status));
  const onEvent = (event: UiEvent) => {
    switch (event._tag) {
      case "LogOut":
        return logout.mutate();
    }
  };
  return { state, onEvent };
}

function uiState(query: UseQueryResult<User>, logout: LogoutState): UiState {
  switch (query.status) {
    case "pending":
      return { _tag: "Loading", logout };
    case "success":
      return { _tag: "Loaded", user: query.data, logout };
    case "error":
      return { _tag: "Failed", logout };
  }
}

/** A logout that succeeded stays pending while the login page loads. */
function logoutState(status: MutationStatus): LogoutState {
  switch (status) {
    case "idle":
      return "Idle";
    case "pending":
    case "success":
      return "Pending";
    case "error":
      return "Failed";
  }
}
