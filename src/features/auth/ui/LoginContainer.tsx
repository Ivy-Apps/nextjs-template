"use client";

import { useTranslations } from "next-intl";
import { LoginForm } from "@/features/auth/ui/LoginForm";
import { useLoginViewModel } from "@/features/auth/ui/useLoginViewModel";
import type { Submission } from "@/features/auth/ui/useLoginViewModel.types";
import type { ReturnPath } from "@/types/ReturnPath";

export function LoginContainer({ destination }: { destination: ReturnPath }) {
  const t = useTranslations("login.errors");
  const { state, onEvent } = useLoginViewModel(destination);

  return (
    <LoginForm
      fields={state.form}
      submit={submitState(state.submission)}
      alert={
        state.submission._tag === "Rejected" && (
          <p role="alert" className="text-sm text-destructive">
            {t(state.submission.reason)}
          </p>
        )
      }
      onUsernameChange={(value) => onEvent({ _tag: "ChangeUsername", value })}
      onPasswordChange={(value) => onEvent({ _tag: "ChangePassword", value })}
      onSubmit={() => onEvent({ _tag: "Submit" })}
    />
  );
}

function submitState(submission: Submission): "Ready" | "Busy" {
  switch (submission._tag) {
    case "Idle":
    case "Rejected":
      return "Ready";
    case "Submitting":
    case "LoggedIn":
      return "Busy";
  }
}
