import type { User } from "@/types/User";

/** The signed-in user as far as it has loaded, and the logout's progress. */
export type UiState =
  | { readonly _tag: "Loading"; readonly logout: LogoutState }
  | {
      readonly _tag: "Loaded";
      readonly user: User;
      readonly logout: LogoutState;
    }
  | { readonly _tag: "Failed"; readonly logout: LogoutState };

export type LogoutState = "Idle" | "Pending" | "Failed";

export type UiEvent = { readonly _tag: "LogOut" };
