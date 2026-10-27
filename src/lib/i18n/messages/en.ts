export const en = {
  metadata: {
    title: "Next.js Template",
    description: "A pragmatic Next.js starter with strong guardrails.",
  },
  todos: {
    title: "Todos",
    newTodo: "New todo",
    placeholder: "What needs doing?",
    add: "Add",
    delete: "Delete {title}",
    empty: "Nothing to do yet. Add your first todo above.",
    loading: "Loading your todos...",
    loadFailed: "Could not load your todos. Reload the page to try again.",
    alerts: {
      AddFailed: "Could not add the todo. Try again.",
      ToggleFailed: "Could not update the todo. Try again.",
      DeleteFailed: "Could not delete the todo. Try again.",
    },
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
