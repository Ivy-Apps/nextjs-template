import type { QueryClient } from "@tanstack/react-query";
import { DEMO_TODOS, DEMO_USER, type FakeTodo } from "@test/fakeBackend";
import { installFakeBff } from "@test/fakeBff";
import { fakeRouter } from "@test/fakeRouter";
import {
  prefetchedQueryClient,
  renderHookWithProviders,
  testQueryClient,
} from "@test/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProxyHttpClient } from "@/data/http/ProxyHttpClient";
import { type Todo, TodoId, TodoTitle } from "@/features/todos/data/Todo";
import { todosQuery } from "@/features/todos/ui/todosQuery";
import { useTodosViewModel } from "@/features/todos/ui/useTodosViewModel";
import type { UiState } from "@/features/todos/ui/useTodosViewModel.types";

const bff = installFakeBff();

const MY_TODOS: ReadonlyArray<Todo> = DEMO_TODOS.filter(
  (todo) => todo.userId === DEMO_USER.id,
).map(saved);
const [MILK, PLANTS, REPORT] = MY_TODOS as [Todo, Todo, Todo];

describe("useTodosViewModel", () => {
  it("shows the signed-in user's todos", async () => {
    bff.signIn();

    const { result } = renderHookWithProviders(useTodosViewModel);

    await waitFor(() =>
      expect(result.current.state).toStrictEqual(loaded(MY_TODOS)),
    );
  });

  it("renders the todos prefetched on the server without loading", async () => {
    bff.signIn();
    const browser = await prefetchedQueryClient((queryClient) =>
      queryClient.prefetchQuery(todosQuery(ProxyHttpClient)),
    );
    const requestsBefore = bff.backend.requests.length;

    const { result } = renderHookWithProviders(useTodosViewModel, browser);

    expect(result.current.state).toStrictEqual(loaded(MY_TODOS));
    expect(bff.backend.requests.length).toBe(requestsBefore);
  });

  it("fails to load the todos without a session", async () => {
    const { result } = renderHookWithProviders(useTodosViewModel);

    await waitFor(() =>
      expect(result.current.state).toStrictEqual({ _tag: "Failed" }),
    );
  });

  it("adds a todo on top, without the blanks around it", async () => {
    const { result, queryClient } = await signedInWithTodos();

    act(() =>
      result.current.onEvent({ _tag: "ChangeDraft", value: "  Call mom " }),
    );
    act(() => result.current.onEvent({ _tag: "AddTodo" }));
    await settled(queryClient);

    const [added, ...rest] = todosOf(result.current.state);
    expect(added).toMatchObject({
      _tag: "Local",
      title: "Call mom",
      completed: false,
    });
    expect(rest).toStrictEqual(MY_TODOS);
    expect(result.current.state).toMatchObject({ draft: "", alert: "None" });
  });

  it("adds a todo over plain http, where crypto has no randomUUID", async () => {
    const { result, queryClient } = await signedInWithTodos();
    const secureCrypto = globalThis.crypto;
    vi.stubGlobal("crypto", {
      getRandomValues: secureCrypto.getRandomValues.bind(secureCrypto),
      subtle: secureCrypto.subtle,
    });

    act(() =>
      result.current.onEvent({ _tag: "ChangeDraft", value: "Call mom" }),
    );
    act(() => result.current.onEvent({ _tag: "AddTodo" }));
    await settled(queryClient);

    expect(todosOf(result.current.state)[0]).toMatchObject({
      _tag: "Local",
      title: "Call mom",
    });
  });

  it("gives every added todo its own id", async () => {
    const { result, queryClient } = await signedInWithTodos();

    for (const value of ["Call mom", "Call dad"]) {
      act(() => result.current.onEvent({ _tag: "ChangeDraft", value }));
      act(() => result.current.onEvent({ _tag: "AddTodo" }));
    }
    await settled(queryClient);

    const [second, first] = todosOf(result.current.state);
    expect(second?.id).not.toBe(first?.id);
  });

  it("ignores a blank todo", async () => {
    const { result, queryClient } = await signedInWithTodos();

    act(() => result.current.onEvent({ _tag: "ChangeDraft", value: "   " }));
    act(() => result.current.onEvent({ _tag: "AddTodo" }));
    await settled(queryClient);

    expect(result.current.state).toStrictEqual({
      ...loaded(MY_TODOS),
      draft: "   ",
    });
  });

  it("removes a todo the backend did not add and says so", async () => {
    const { result, queryClient } = await signedInWithTodos();
    bff.takeBackendDown();

    act(() =>
      result.current.onEvent({ _tag: "ChangeDraft", value: "Call mom" }),
    );
    act(() => result.current.onEvent({ _tag: "AddTodo" }));
    await settled(queryClient);

    expect(result.current.state).toStrictEqual({
      ...loaded(MY_TODOS),
      alert: "AddFailed",
    });
  });

  it("toggles a todo", async () => {
    const { result, queryClient } = await signedInWithTodos();

    act(() => result.current.onEvent({ _tag: "ToggleTodo", todo: MILK }));
    act(() => result.current.onEvent({ _tag: "ToggleTodo", todo: PLANTS }));
    await settled(queryClient);

    expect(result.current.state).toStrictEqual(
      loaded([
        { ...MILK, completed: true },
        { ...PLANTS, completed: false },
        REPORT,
      ]),
    );
  });

  it("saves the toggled completion to the backend", async () => {
    const { result, queryClient } = await signedInWithTodos();

    act(() => result.current.onEvent({ _tag: "ToggleTodo", todo: MILK }));
    await settled(queryClient);

    const save = bff.backend.requests.find(({ method }) => method === "PUT");
    expect(save?.body).toBe(JSON.stringify({ completed: !MILK.completed }));
  });

  it("toggles the todo back when the backend refuses, and says so", async () => {
    const { result, queryClient } = await signedInWithTodos();
    bff.takeBackendDown();

    act(() => result.current.onEvent({ _tag: "ToggleTodo", todo: MILK }));
    await settled(queryClient);

    expect(result.current.state).toStrictEqual({
      ...loaded(MY_TODOS),
      alert: "ToggleFailed",
    });
  });

  it("deletes a todo", async () => {
    const { result, queryClient } = await signedInWithTodos();

    act(() => result.current.onEvent({ _tag: "DeleteTodo", todo: PLANTS }));
    await settled(queryClient);

    expect(result.current.state).toStrictEqual(loaded([MILK, REPORT]));
  });

  it("puts a todo the backend did not delete back in its place, and says so", async () => {
    const { result, queryClient } = await signedInWithTodos();
    bff.takeBackendDown();

    act(() => result.current.onEvent({ _tag: "DeleteTodo", todo: PLANTS }));
    await settled(queryClient);

    expect(result.current.state).toStrictEqual({
      ...loaded(MY_TODOS),
      alert: "DeleteFailed",
    });
  });

  it("puts a todo the backend did not delete back in its place when a todo above it was deleted meanwhile", async () => {
    const { result, queryClient } = await signedInWithTodos();
    act(() =>
      result.current.onEvent({ _tag: "ChangeDraft", value: "Call mom" }),
    );
    act(() => result.current.onEvent({ _tag: "AddTodo" }));
    await settled(queryClient);
    const [added] = todosOf(result.current.state) as [Todo];
    bff.takeBackendDown();

    // The added todo is local, so its deletion succeeds without the backend.
    act(() => {
      result.current.onEvent({ _tag: "DeleteTodo", todo: added });
      result.current.onEvent({ _tag: "DeleteTodo", todo: MILK });
    });
    await settled(queryClient);

    expect(result.current.state).toStrictEqual({
      ...loaded(MY_TODOS),
      alert: "DeleteFailed",
    });
  });

  it("puts todos the backend did not delete back in their places, deleted bottom up", async () => {
    const { result, queryClient } = await signedInWithTodos();
    bff.takeBackendDown();

    act(() => result.current.onEvent({ _tag: "DeleteTodo", todo: PLANTS }));
    act(() => result.current.onEvent({ _tag: "DeleteTodo", todo: MILK }));
    await settled(queryClient);

    expect(result.current.state).toStrictEqual({
      ...loaded(MY_TODOS),
      alert: "DeleteFailed",
    });
  });

  it("toggles and deletes an added todo, which the backend does not store", async () => {
    const { result, queryClient } = await signedInWithTodos();
    act(() =>
      result.current.onEvent({ _tag: "ChangeDraft", value: "Call mom" }),
    );
    act(() => result.current.onEvent({ _tag: "AddTodo" }));
    await settled(queryClient);
    const [added] = todosOf(result.current.state) as [Todo];

    act(() => result.current.onEvent({ _tag: "ToggleTodo", todo: added }));
    await settled(queryClient);
    expect(todosOf(result.current.state)[0]).toStrictEqual({
      ...added,
      completed: true,
    });

    act(() =>
      result.current.onEvent({
        _tag: "DeleteTodo",
        todo: { ...added, completed: true },
      }),
    );
    await settled(queryClient);
    expect(result.current.state).toStrictEqual(loaded(MY_TODOS));
  });

  it("goes to the login page when the session ends during a change", async () => {
    const { result, queryClient } = await signedInWithTodos();
    bff.backend.revokeTokens();

    act(() => result.current.onEvent({ _tag: "DeleteTodo", todo: MILK }));
    await settled(queryClient);

    expect(fakeRouter.path).toBe("/login?returnTo=%2F");
  });

  it("stays on the page and says so when the backend fails during a change", async () => {
    const { result, queryClient } = await signedInWithTodos();
    const path = fakeRouter.path;
    bff.backend.breakDown();

    act(() => result.current.onEvent({ _tag: "DeleteTodo", todo: MILK }));
    await settled(queryClient);

    expect(result.current.state).toMatchObject({ alert: "DeleteFailed" });
    expect(fakeRouter.path).toBe(path);
  });

  it("clears the alert on the next change", async () => {
    const { result, queryClient } = await signedInWithTodos();
    bff.takeBackendDown();
    act(() => result.current.onEvent({ _tag: "ToggleTodo", todo: MILK }));
    await settled(queryClient);

    act(() => result.current.onEvent({ _tag: "DeleteTodo", todo: PLANTS }));

    await waitFor(() =>
      expect(result.current.state).toMatchObject({ alert: "None" }),
    );
  });
});

async function signedInWithTodos() {
  bff.signIn();
  const queryClient = testQueryClient();
  const rendered = renderHookWithProviders(useTodosViewModel, queryClient);
  await waitFor(() =>
    expect(rendered.result.current.state._tag).toBe("Loaded"),
  );
  return { ...rendered, queryClient };
}

/** Waits until every change has been saved or rolled back. */
function settled(queryClient: QueryClient): Promise<void> {
  return waitFor(() => expect(queryClient.isMutating()).toBe(0));
}

function loaded(todos: ReadonlyArray<Todo>): UiState {
  return { _tag: "Loaded", todos, draft: "", alert: "None" };
}

function todosOf(state: UiState): ReadonlyArray<Todo> {
  if (state._tag !== "Loaded")
    throw new Error(`Expected Loaded, got ${state._tag}`);
  return state.todos;
}

function saved(todo: FakeTodo): Todo {
  return {
    _tag: "Saved",
    id: TodoId.make(todo.id),
    title: TodoTitle.make(todo.todo),
    completed: todo.completed,
  };
}
