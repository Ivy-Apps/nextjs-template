"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AppHeader } from "@/features/auth/ui/AppHeader";
import { LogoutButton } from "@/features/auth/ui/LogoutButton";
import { UserSummary } from "@/features/auth/ui/UserSummary";
import { useHeaderViewModel } from "@/features/auth/ui/useHeaderViewModel";
import type { UserState } from "@/features/auth/ui/useHeaderViewModel.types";
import { ThemeToggle } from "@/ui/ThemeToggle";

/** Render it inside a `PrefetchBoundary` that prefetched `currentUserQuery`. */
export function HeaderContainer() {
  const t = useTranslations("header");
  const { state, onEvent } = useHeaderViewModel();

  return (
    <AppHeader
      user={userSlot(state.user, t("userFailed"))}
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

function userSlot(user: UserState, failedMessage: string): ReactNode {
  switch (user._tag) {
    case "Loading":
      return null;
    case "Loaded":
      return <UserSummary user={user.user} />;
    case "Failed":
      return <p className="text-sm text-muted-foreground">{failedMessage}</p>;
  }
}
