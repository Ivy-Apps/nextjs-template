import type { User } from "@/types/User";

export type UiState = {
  readonly user: UserState;
  readonly logout: LogoutState;
};

export type UserState =
  | { readonly _tag: "Loading" }
  | { readonly _tag: "Loaded"; readonly user: User }
  | { readonly _tag: "Failed" };

export type LogoutState = "Idle" | "Pending" | "Failed";

export type UiEvent = { readonly _tag: "LogOut" };
