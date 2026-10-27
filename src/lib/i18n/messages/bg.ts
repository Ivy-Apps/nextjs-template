import type { Messages } from "@/lib/i18n/messages/en";

export const bg: Messages = {
  metadata: {
    title: "Next.js шаблон",
    description: "Прагматичен Next.js шаблон със здрави предпазни механизми.",
  },
  todos: {
    title: "Задачи",
    newTodo: "Нова задача",
    placeholder: "Какво трябва да се направи?",
    add: "Добави",
    delete: "Изтрий {title}",
    empty: "Още няма задачи. Добавете първата си задача отгоре.",
    loading: "Задачите се зареждат...",
    loadFailed:
      "Задачите не можаха да се заредят. Презаредете страницата, за да опитате отново.",
    alerts: {
      AddFailed: "Задачата не можа да се добави. Опитайте отново.",
      ToggleFailed: "Задачата не можа да се обнови. Опитайте отново.",
      DeleteFailed: "Задачата не можа да се изтрие. Опитайте отново.",
    },
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
