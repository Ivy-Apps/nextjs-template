import { fc, test } from "@fast-check/vitest";
import { todo, todoList } from "@test/todoArbitraries";
import { describe, expect } from "vitest";
import {
  insert,
  remove,
  setCompleted,
  type TodoList,
} from "@/features/todos/domain/TodoList";

/** A list, one of its todos and that todo's position. */
const listWithPick = todoList
  .filter((list) => list.length > 0)
  .chain((list) =>
    fc.constantFrom(...list.map((picked, index) => ({ list, picked, index }))),
  );

/** A list and a todo that is not in it. */
const listWithNewcomer = fc
  .tuple(todoList, todo)
  .filter(
    ([list, newcomer]) =>
      !list.some(
        (item) => item._tag === newcomer._tag && item.id === newcomer.id,
      ),
  );

describe("insert", () => {
  test.prop([listWithNewcomer, fc.integer({ min: -5, max: 50 })])(
    "puts the todo at the index, clamped to the list, keeping the others in order",
    ([list, newcomer], index) => {
      const result = insert(list, index, newcomer);

      const at = Math.min(Math.max(index, 0), list.length);
      expect(result[at]).toStrictEqual(newcomer);
      expect(without(result, at)).toStrictEqual(list);
    },
  );
});

describe("remove", () => {
  test.prop([listWithPick])(
    "drops the todo and keeps the others in order",
    ({ list, picked, index }) => {
      expect(remove(list, picked)).toStrictEqual(without(list, index));
    },
  );

  test.prop([listWithNewcomer])(
    "leaves the list as it is for a todo not in it",
    ([list, newcomer]) => {
      expect(remove(list, newcomer)).toStrictEqual(list);
    },
  );

  test.prop([listWithNewcomer, fc.integer({ min: -5, max: 50 })])(
    "undoes inserting the todo",
    ([list, newcomer], index) => {
      expect(remove(insert(list, index, newcomer), newcomer)).toStrictEqual(
        list,
      );
    },
  );
});

describe("setCompleted", () => {
  test.prop([listWithPick, fc.boolean()])(
    "changes only that todo's completion",
    ({ list, picked, index }, completed) => {
      const result = setCompleted(list, picked, completed);

      expect(result[index]).toStrictEqual({ ...picked, completed });
      expect(without(result, index)).toStrictEqual(without(list, index));
    },
  );

  test.prop([listWithPick, fc.boolean()])(
    "is undone by setting the todo's former completion",
    ({ list, picked }, completed) => {
      const changed = setCompleted(list, picked, completed);

      expect(setCompleted(changed, picked, picked.completed)).toStrictEqual(
        list,
      );
    },
  );
});

function without(list: TodoList, index: number): TodoList {
  return list.filter((_, i) => i !== index);
}
