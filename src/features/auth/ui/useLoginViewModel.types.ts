import type { LoginFailure } from "@/types/Auth";

/** The login form, as typed, and what became of its last submission. */
export type UiState =
  | { readonly _tag: "Idle"; readonly fields: LoginFields }
  | { readonly _tag: "Submitting"; readonly fields: LoginFields }
  | {
      readonly _tag: "Rejected";
      readonly fields: LoginFields;
      readonly reason: LoginFailure["_tag"];
    }
  /** Logged in; the destination page is loading. */
  | { readonly _tag: "LoggedIn"; readonly fields: LoginFields };

export type LoginFields = {
  readonly username: string;
  readonly password: string;
};

export type UiEvent =
  | { readonly _tag: "ChangeUsername"; readonly value: string }
  | { readonly _tag: "ChangePassword"; readonly value: string }
  | { readonly _tag: "Submit" };
