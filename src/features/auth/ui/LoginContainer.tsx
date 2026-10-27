"use client";

import { LoginView } from "@/features/auth/ui/LoginView";
import { useLoginViewModel } from "@/features/auth/ui/useLoginViewModel";
import type { ReturnPath } from "@/types/ReturnPath";

export function LoginContainer({ destination }: { destination: ReturnPath }) {
  const { state, onEvent } = useLoginViewModel(destination);

  return <LoginView state={state} onEvent={onEvent} />;
}
