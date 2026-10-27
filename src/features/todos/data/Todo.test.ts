import { fc, test } from "@fast-check/vitest";
import { savedTodo } from "@test/todoArbitraries";
import { Option, Schema } from "effect";
import { describe, expect } from "vitest";
import { SavedTodo } from "@/features/todos/data/Todo";

const decode = Schema.decodeUnknownOption(SavedTodo);
const encode = Schema.encodeSync(SavedTodo);

/** A todo as DummyJSON sends it. */
const wireTodo = fc.record(
  {
    id: fc.integer(),
    todo: fc.string({ minLength: 1 }),
    completed: fc.boolean(),
    userId: fc.nat(),
  },
  { noNullPrototype: true },
);

describe("SavedTodo", () => {
  test.prop([wireTodo])(
    "decodes DummyJSON's todo, its text as the title",
    (wire) => {
      expect(decode(wire)).toStrictEqual(
        Option.some({
          _tag: "Saved",
          id: wire.id,
          title: wire.todo,
          completed: wire.completed,
        }),
      );
    },
  );

  test.prop([savedTodo])(
    "encodes to DummyJSON's shape and decodes back to the same todo",
    (todo) => {
      const encoded = encode(todo);

      expect(encoded).toStrictEqual({
        id: todo.id,
        todo: todo.title,
        completed: todo.completed,
      });
      expect(decode(encoded)).toStrictEqual(Option.some(todo));
    },
  );

  test.prop([
    wireTodo,
    fc.oneof(
      fc.record({ id: fc.double().filter((id) => !Number.isInteger(id)) }),
      fc.record({ todo: fc.constant("") }),
      fc.record({ completed: fc.string() }),
    ),
  ])(
    "rejects a fractional id, an empty title or a non-boolean completion",
    (wire, broken) => {
      expect(decode({ ...wire, ...broken })).toStrictEqual(Option.none());
    },
  );
});
