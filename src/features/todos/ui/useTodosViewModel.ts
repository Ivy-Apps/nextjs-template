"use client";

import {
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Effect, Option, Schema } from "effect";
import type { HttpClient } from "effect/http";
import { useReducer } from "react";
import { ProxyHttpClient } from "@/data/http/ProxyHttpClient";
import {
  type LocalTodo,
  LocalTodoId,
  type Todo,
  TodoTitle,
} from "@/features/todos/data/Todo";
import { addTodo } from "@/features/todos/data/TodoRepository";
import { saveCompleted, saveDeletion } from "@/features/todos/domain/saveTodo";
import {
  indexOf,
  insert,
  remove,
  setCompleted,
  type TodoList,
} from "@/features/todos/domain/TodoList";
import { todosQuery } from "@/features/todos/ui/todosQuery";
import type {
  TodoAlert,
  UiEvent,
  UiState,
} from "@/features/todos/ui/useTodosViewModel.types";

/**
 * The signed-in user's todos. Adding, toggling and deleting update the list at
 * once and roll back with an alert when the backend refuses. A rollback undoes
 * only its own change, so concurrent changes survive it.
 *
 * The backend does not store a new todo, so a todo added here stays a local
 * todo for the rest of the session (see `saveTodo`).
 */
export function useTodosViewModel(): {
  state: UiState;
  onEvent: (event: UiEvent) => void;
} {
  const queryClient = useQueryClient();
  const query = todosQuery(ProxyHttpClient);
  const todos = useQuery(query);
  const [form, dispatch] = useReducer(reduceForm, EMPTY_FORM);

  const updateList = async (update: (list: TodoList) => TodoList) => {
    await queryClient.cancelQueries({ queryKey: query.queryKey });
    queryClient.setQueryData(query.queryKey, (list) => list && update(list));
  };
  const failed = (alert: TodoAlert) => dispatch({ _tag: "Failed", alert });

  const add = useMutation({
    mutationFn: (todo: LocalTodo) => run(addTodo(todo.title)),
    onMutate: (todo) => updateList((list) => insert(list, 0, todo)),
    onError: (_error, todo) => {
      failed("AddFailed");
      return updateList((list) => remove(list, todo));
    },
  });
  const toggle = useMutation({
    mutationFn: (todo: Todo) => run(saveCompleted(todo, !todo.completed)),
    onMutate: (todo) =>
      updateList((list) => setCompleted(list, todo, !todo.completed)),
    onError: (_error, todo) => {
      failed("ToggleFailed");
      return updateList((list) => setCompleted(list, todo, todo.completed));
    },
  });
  const del = useMutation({
    mutationFn: (todo: Todo) => run(saveDeletion(todo)),
    onMutate: async (todo) => {
      const index = indexOf(
        queryClient.getQueryData(query.queryKey) ?? [],
        todo,
      );
      await updateList((list) => remove(list, todo));
      return { index };
    },
    onError: (_error, todo, context) => {
      failed("DeleteFailed");
      return updateList((list) => insert(list, context?.index ?? 0, todo));
    },
  });

  const state = uiState(todos, form);
  const onEvent = (event: UiEvent) => {
    switch (event._tag) {
      case "ChangeDraft":
        return dispatch(event);
      case "AddTodo":
        return Option.match(draftTitle(form.draft), {
          onNone: () => undefined,
          onSome: (title) => {
            dispatch({ _tag: "Submitted" });
            add.mutate(localTodo(title));
          },
        });
      case "ToggleTodo":
        dispatch({ _tag: "Started" });
        return toggle.mutate(event.todo);
      case "DeleteTodo":
        dispatch({ _tag: "Started" });
        return del.mutate(event.todo);
    }
  };
  return { state, onEvent };
}

type Form = { readonly draft: string; readonly alert: TodoAlert };

type FormEvent =
  | { readonly _tag: "ChangeDraft"; readonly value: string }
  | { readonly _tag: "Submitted" }
  | { readonly _tag: "Started" }
  | { readonly _tag: "Failed"; readonly alert: TodoAlert };

const EMPTY_FORM: Form = { draft: "", alert: "None" };

/** A new change clears the alert about the last one. */
function reduceForm(form: Form, event: FormEvent): Form {
  switch (event._tag) {
    case "ChangeDraft":
      return { ...form, draft: event.value };
    case "Submitted":
      return EMPTY_FORM;
    case "Started":
      return { ...form, alert: "None" };
    case "Failed":
      return { ...form, alert: event.alert };
  }
}

function uiState(query: UseQueryResult<TodoList>, form: Form): UiState {
  switch (query.status) {
    case "pending":
      return { _tag: "Loading" };
    case "success":
      return { _tag: "Loaded", todos: query.data, ...form };
    case "error":
      return { _tag: "Failed" };
  }
}

/** The typed text without surrounding blanks, unless nothing is left. */
function draftTitle(draft: string): Option.Option<TodoTitle> {
  return Schema.decodeUnknownOption(TodoTitle)(draft.trim());
}

function localTodo(title: TodoTitle): LocalTodo {
  return {
    _tag: "Local",
    id: LocalTodoId.make(crypto.randomUUID()),
    title,
    completed: false,
  };
}

function run<A, E>(
  effect: Effect.Effect<A, E, HttpClient.HttpClient>,
): Promise<A> {
  return Effect.runPromise(effect.pipe(Effect.provide(ProxyHttpClient)));
}
