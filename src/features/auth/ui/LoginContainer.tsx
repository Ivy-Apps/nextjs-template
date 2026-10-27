"use client";

import { useTranslations } from "next-intl";
import { LoginForm } from "@/features/auth/ui/LoginForm";
import { useLoginViewModel } from "@/features/auth/ui/useLoginViewModel";
import type { UiState } from "@/features/auth/ui/useLoginViewModel.types";
import type { ReturnPath } from "@/types/ReturnPath";
import { Alert, AlertDescription } from "@/ui/design-system/components/alert";

export function LoginContainer({ destination }: { destination: ReturnPath }) {
  const t = useTranslations("login.errors");
  const { state, onEvent } = useLoginViewModel(destination);

  return (
    <LoginForm
      fields={state.fields}
      submit={submitState(state)}
      alert={
        state._tag === "Rejected" && (
          <Alert variant="destructive">
            <AlertDescription>{t(state.reason)}</AlertDescription>
          </Alert>
        )
      }
      onUsernameChange={(value) => onEvent({ _tag: "ChangeUsername", value })}
      onPasswordChange={(value) => onEvent({ _tag: "ChangePassword", value })}
      onSubmit={() => onEvent({ _tag: "Submit" })}
    />
  );
}

function submitState(state: UiState): "Ready" | "Busy" {
  switch (state._tag) {
    case "Idle":
    case "Rejected":
      return "Ready";
    case "Submitting":
    case "LoggedIn":
      return "Busy";
  }
}
