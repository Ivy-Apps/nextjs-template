import type { LoginFailure } from "@/types/Auth";

export type UiState = {
  readonly form: LoginFields;
  readonly submission: Submission;
};

export type LoginFields = {
  readonly username: string;
  readonly password: string;
};

export type Submission =
  | { readonly _tag: "Idle" }
  | { readonly _tag: "Submitting" }
  | { readonly _tag: "Rejected"; readonly reason: LoginFailure["_tag"] }
  /** Logged in; the destination page is loading. */
  | { readonly _tag: "LoggedIn" };

export type UiEvent =
  | { readonly _tag: "ChangeUsername"; readonly value: string }
  | { readonly _tag: "ChangePassword"; readonly value: string }
  | { readonly _tag: "Submit" };
