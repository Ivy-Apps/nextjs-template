import { useTranslations } from "next-intl";
import { LoginForm } from "@/features/auth/ui/LoginForm";
import type {
  UiEvent,
  UiState,
} from "@/features/auth/ui/useLoginViewModel.types";
import { Alert, AlertDescription } from "@/ui/design-system/components/alert";

type LoginViewProps = {
  state: UiState;
  onEvent: (event: UiEvent) => void;
};

export function LoginView({ state, onEvent }: LoginViewProps) {
  const t = useTranslations("login.errors");

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
