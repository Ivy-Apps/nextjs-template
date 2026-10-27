"use client";

import {
  type UseMutationResult,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Effect } from "effect";
import { FetchHttpClient } from "effect/http";
import { useRouter } from "next/navigation";
import { useReducer } from "react";
import { logIn } from "@/features/auth/data/SessionRepository";
import type {
  LoginFields,
  UiEvent,
  UiState,
} from "@/features/auth/ui/useLoginViewModel.types";
import type { Credentials, LoginFailure } from "@/types/Auth";
import type { ReturnPath } from "@/types/ReturnPath";
import type { User } from "@/types/User";

/**
 * Logs in with the typed credentials, then drops every cached query, so this
 * user never sees the last one's data, and goes to `destination`. The path
 * already carries its locale, so it bypasses the localized router.
 */
export function useLoginViewModel(destination: ReturnPath): {
  state: UiState;
  onEvent: (event: UiEvent) => void;
} {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [form, dispatch] = useReducer(reduceForm, EMPTY_FORM);
  const login = useMutation<User, LoginFailure, Credentials>({
    mutationFn: (credentials) =>
      Effect.runPromise(
        logIn(credentials).pipe(Effect.provide(FetchHttpClient.layer)),
      ),
    onSuccess: () => {
      queryClient.clear();
      router.replace(destination);
    },
  });

  const state = uiState(login, form);
  const onEvent = (event: UiEvent) => {
    switch (event._tag) {
      case "ChangeUsername":
      case "ChangePassword":
        return dispatch(event);
      case "Submit":
        return login.mutate(form);
    }
  };
  return { state, onEvent };
}

type FormEvent = Exclude<UiEvent, { _tag: "Submit" }>;

const EMPTY_FORM: LoginFields = { username: "", password: "" };

function reduceForm(form: LoginFields, event: FormEvent): LoginFields {
  switch (event._tag) {
    case "ChangeUsername":
      return { ...form, username: event.value };
    case "ChangePassword":
      return { ...form, password: event.value };
  }
}

function uiState(
  login: UseMutationResult<User, LoginFailure, Credentials>,
  fields: LoginFields,
): UiState {
  switch (login.status) {
    case "idle":
      return { _tag: "Idle", fields };
    case "pending":
      return { _tag: "Submitting", fields };
    case "error":
      return { _tag: "Rejected", fields, reason: login.error._tag };
    case "success":
      return { _tag: "LoggedIn", fields };
  }
}
