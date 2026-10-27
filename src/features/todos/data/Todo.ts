import { Schema } from "effect";

/** A todo's id on the backend. */
export const TodoId = Schema.Int.pipe(Schema.brand("TodoId"));
export type TodoId = typeof TodoId.Type;

/**
 * The id of a todo created in this browser. The backend acknowledges a new
 * todo with a made-up id that it never stores, so the browser names it.
 */
export const LocalTodoId = Schema.String.pipe(Schema.brand("LocalTodoId"));
export type LocalTodoId = typeof LocalTodoId.Type;

/** What a todo says must be done: never empty. */
export const TodoTitle = Schema.NonEmptyString.pipe(Schema.brand("TodoTitle"));
export type TodoTitle = typeof TodoTitle.Type;

/**
 * A todo the backend stores, in DummyJSON's wire shape
 * `{ id, todo, completed, userId }`; the owner is not kept.
 */
export const SavedTodo = Schema.Struct({
  _tag: Schema.tagDefaultOmit("Saved"),
  id: TodoId,
  title: TodoTitle,
  completed: Schema.Boolean,
}).pipe(Schema.encodeKeys({ title: "todo" }));
export type SavedTodo = typeof SavedTodo.Type;

/**
 * A todo created in this browser. The backend accepted it but does not store
 * it, so it lives only in this browser's cache until the page reloads.
 */
export type LocalTodo = {
  readonly _tag: "Local";
  readonly id: LocalTodoId;
  readonly title: TodoTitle;
  readonly completed: boolean;
};

export type Todo = SavedTodo | LocalTodo;
