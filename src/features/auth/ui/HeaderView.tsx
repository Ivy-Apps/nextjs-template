import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AppHeader } from "@/features/auth/ui/AppHeader";
import { LogoutButton } from "@/features/auth/ui/LogoutButton";
import { UserSummary } from "@/features/auth/ui/UserSummary";
import type {
  UiEvent,
  UiState,
} from "@/features/auth/ui/useHeaderViewModel.types";
import { ThemeToggle } from "@/ui/ThemeToggle";

type HeaderViewProps = {
  state: UiState;
  onEvent: (event: UiEvent) => void;
};

export function HeaderView({ state, onEvent }: HeaderViewProps) {
  const t = useTranslations("header");

  return (
    <AppHeader
      user={userSlot(state, t("userFailed"))}
      actions={
        <>
          <ThemeToggle />
          <LogoutButton
            status={state.logout}
            onLogOut={() => onEvent({ _tag: "LogOut" })}
          />
        </>
      }
    />
  );
}

function userSlot(state: UiState, failedMessage: string): ReactNode {
  switch (state._tag) {
    case "Loading":
      return null;
    case "Loaded":
      return <UserSummary user={state.user} />;
    case "Failed":
      return <p className="text-sm text-muted-foreground">{failedMessage}</p>;
  }
}
