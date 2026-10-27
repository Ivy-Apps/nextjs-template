import type { Messages } from "@/lib/i18n/messages/en";

export const bg: Messages = {
  metadata: {
    title: "Next.js шаблон",
    description: "Прагматичен Next.js шаблон със здрави предпазни механизми.",
  },
  home: {
    title: "Next.js шаблон",
    description:
      "Строг шаблон на слоеве: Effect, MVI екрани и архитектурни правила, наложени от Deslop.",
  },
  theme: {
    toggle: "Смяна на темата",
  },
  login: {
    title: "Вход",
    description: "Влезте, за да продължите.",
    username: "Потребителско име",
    password: "Парола",
    submit: "Вход",
    submitting: "Влизане...",
    demoAccount: "Демо профил: emilys / emilyspass",
    errors: {
      InvalidRequest: "Въведете потребителско име и парола.",
      InvalidCredentials: "Грешно потребителско име или парола.",
      BackendUnavailable: "Сървърът не е достъпен. Опитайте отново по-късно.",
    },
  },
  header: {
    logout: "Изход",
    loggingOut: "Излизане...",
    logoutFailed: "Неуспешен изход. Опитайте отново.",
    userFailed: "Профилът не можа да се зареди.",
  },
};
