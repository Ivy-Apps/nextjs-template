export const en = {
  metadata: {
    title: "Next.js Template",
    description: "A pragmatic Next.js starter with strong guardrails.",
  },
  home: {
    title: "Next.js Template",
    description:
      "A strict, layered starter: Effect, MVI screens and architecture rules enforced by Deslop.",
  },
  theme: {
    toggle: "Toggle theme",
  },
  login: {
    title: "Log in",
    description: "Sign in to continue.",
    username: "Username",
    password: "Password",
    submit: "Log in",
    submitting: "Logging in...",
    demoAccount: "Demo account: emilys / emilyspass",
    errors: {
      InvalidRequest: "Enter your username and password.",
      InvalidCredentials: "Wrong username or password.",
      BackendUnavailable: "The server is unavailable. Try again later.",
    },
  },
  header: {
    logout: "Log out",
    loggingOut: "Logging out...",
    logoutFailed: "Could not log out. Try again.",
    userFailed: "Could not load your profile.",
  },
};

export type Messages = typeof en;
