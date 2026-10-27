"use client";

import {
  type MutationStatus,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
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
  UserState,
} from "@/features/auth/ui/useHeaderViewModel.types";
import { useRouter } from "@/lib/i18n/navigation";
import { LOGIN_PATH } from "@/types/ReturnPath";
import type { User } from "@/types/User";

/**
 * The signed-in user and the logout action. Logging out drops every cached
 * query, so the next user never sees this one's data, then goes to login.
 */
export function useHeaderViewModel(): {
  state: UiState;
  onEvent: (event: UiEvent) => void;
} {
  const queryClient = useQueryClient();
  const router = useRouter();
  const user = useQuery(currentUserQuery(ProxyHttpClient));
  const logout = useMutation({
    mutationFn: () =>
      Effect.runPromise(logOut.pipe(Effect.provide(FetchHttpClient.layer))),
    onSuccess: () => {
      queryClient.clear();
      router.replace(LOGIN_PATH);
    },
  });

  const state: UiState = {
    user: userState(user),
    logout: logoutState(logout.status),
  };
  const onEvent = (event: UiEvent) => {
    switch (event._tag) {
      case "LogOut":
        return logout.mutate();
    }
  };
  return { state, onEvent };
}

function userState(query: UseQueryResult<User>): UserState {
  switch (query.status) {
    case "pending":
      return { _tag: "Loading" };
    case "success":
      return { _tag: "Loaded", user: query.data };
    case "error":
      return { _tag: "Failed" };
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
