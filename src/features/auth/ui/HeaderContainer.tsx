"use client";

import { HeaderView } from "@/features/auth/ui/HeaderView";
import { useHeaderViewModel } from "@/features/auth/ui/useHeaderViewModel";

/** Render it inside a `PrefetchBoundary` that prefetched `currentUserQuery`. */
export function HeaderContainer() {
  const { state, onEvent } = useHeaderViewModel();

  return <HeaderView state={state} onEvent={onEvent} />;
}
