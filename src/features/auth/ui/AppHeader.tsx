import type { ReactNode } from "react";

type AppHeaderProps = {
  user: ReactNode;
  actions: ReactNode;
};

/** The signed-in pages' top bar: who is signed in, then the actions. */
export function AppHeader({ user, actions }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-background px-4 py-2">
      <div className="min-w-0">{user}</div>
      <div className="flex shrink-0 items-center gap-2">{actions}</div>
    </header>
  );
}
