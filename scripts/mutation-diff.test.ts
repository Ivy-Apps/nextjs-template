import { fc, test } from "@fast-check/vitest";
import { describe, expect, it } from "vitest";
import {
  changedLines,
  type MutationDiff,
  mutationDiff,
  parseStrykerReport,
  renderMarkdown,
} from "./mutation-diff";

const REVISIONS = { head: "a".repeat(40), base: "b".repeat(40) };

const SOURCE = [
  "export function sign(n: number): string {", // 1
  "  if (n > 0) {", // 2
  '    return "plus";', // 3
  "  }", // 4
  '  return "minus";', // 5
  "}", // 6
].join("\n");

interface MutantSpec {
  status: string;
  mutator?: string;
  replacement?: string;
  start: readonly [line: number, column: number];
  end: readonly [line: number, column: number];
}

function aReport(files: Record<string, MutantSpec[]>, source = SOURCE) {
  return parseStrykerReport({
    framework: { name: "StrykerJS", version: "10.1.1" },
    files: Object.fromEntries(
      Object.entries(files).map(([path, mutants]) => [
        path,
        {
          source,
          mutants: mutants.map((m) => ({
            mutatorName: m.mutator ?? "ConditionalExpression",
            replacement: m.replacement ?? "true",
            status: m.status,
            location: {
              start: { line: m.start[0], column: m.start[1] },
              end: { line: m.end[0], column: m.end[1] },
            },
          })),
        },
      ]),
    ),
  });
}

// The condition `n > 0` on line 2.
const condition = { start: [2, 7], end: [2, 12] } as const;
// The function body, lines 1 to 6.
const body = {
  mutator: "BlockStatement",
  replacement: "{}",
  start: [1, 41],
  end: [6, 2],
} as const;

function diffOf(file: string, ...hunks: string[]): string {
  return [
    `diff --git a/${file} b/${file}`,
    "index 1111111..2222222 100644",
    `--- a/${file}`,
    `+++ b/${file}`,
    ...hunks,
  ].join("\n");
}

describe("changedLines", () => {
  it("lists the new-side lines each hunk adds or edits", () => {
    const diff = diffOf(
      "src/a.ts",
      "@@ -2 +2 @@ export function sign",
      "-  if (n >= 0) {",
      "+  if (n > 0) {",
      "@@ -8,0 +9,3 @@",
      "+a",
      "+b",
      "+c",
    );

    expect(changedLines(diff)).toEqual(
      new Map([
        [
          "src/a.ts",
          [
            { first: 2, last: 2 },
            { first: 9, last: 11 },
          ],
        ],
      ]),
    );
  });

  it("keeps a path with brackets and dots", () => {
    const path = "src/app/proxy/[...path]/route.ts";

    const changed = changedLines(diffOf(path, "@@ -3 +3 @@", "-x", "+y"));

    expect(changed.get(path)).toEqual([{ first: 3, last: 3 }]);
  });

  it("selects nothing for a diff that only deletes lines", () => {
    const diff = diffOf("src/a.ts", "@@ -4,2 +3,0 @@", "-x", "-y");

    expect(changedLines(diff)).toEqual(new Map());
  });

  it("selects nothing in a deleted file", () => {
    const diff = [
      "diff --git a/src/a.ts b/src/a.ts",
      "deleted file mode 100644",
      "--- a/src/a.ts",
      "+++ /dev/null",
      "@@ -1,2 +0,0 @@",
      "-x",
      "-y",
    ].join("\n");

    expect(changedLines(diff)).toEqual(new Map());
  });

  it("reads an added line that looks like a file header as code", () => {
    const diff = diffOf(
      "src/a.ts",
      "@@ -1 +1,2 @@",
      "-old",
      "+++ b/src/other.ts",
      "+new",
      "\\ No newline at end of file",
      "@@ -9 +10 @@",
      "-x",
      "+y",
    );

    expect(changedLines(diff)).toEqual(
      new Map([
        [
          "src/a.ts",
          [
            { first: 1, last: 2 },
            { first: 10, last: 10 },
          ],
        ],
      ]),
    );
  });
});

describe("mutationDiff", () => {
  it("lists a survivor on a changed line, and nothing outside the changed lines", () => {
    const report = aReport({
      "src/a.ts": [
        { status: "Survived", ...condition },
        { status: "Survived", start: [5, 10], end: [5, 16] },
      ],
    });

    const diff = mutationDiff(
      report,
      new Map([["src/a.ts", [{ first: 2, last: 2 }]]]),
      REVISIONS,
    );

    expect(diff).toEqual({
      schema: 1,
      tool: "StrykerJS 10.1.1",
      head: REVISIONS.head,
      base: REVISIONS.base,
      totals: {
        mutants: 1,
        killed: 0,
        survived: 1,
        timedOut: 0,
        uncovered: 0,
        skipped: 0,
      },
      mutants: [
        {
          file: "src/a.ts",
          line: 2,
          status: "survived",
          operator: "ConditionalExpression",
          original: "n > 0",
          replacement: "true",
        },
      ],
      notAssessed: "",
    } satisfies MutationDiff);
  });

  it("lists a mutant of a multi-line block when one line inside it changed", () => {
    const report = aReport({ "src/a.ts": [{ status: "Survived", ...body }] });

    const diff = mutationDiff(
      report,
      new Map([["src/a.ts", [{ first: 3, last: 3 }]]]),
      REVISIONS,
    );

    expect(diff.mutants).toEqual([
      expect.objectContaining({
        line: 1,
        operator: "BlockStatement",
        original: SOURCE.slice(SOURCE.indexOf("{")),
      }),
    ]);
  });

  it("counts every outcome and lists only the survived, uncovered and timed out", () => {
    const report = aReport({
      "src/a.ts": ["Killed", "NoCoverage", "Timeout", "Ignored"].map(
        (status) => ({ status, ...condition }),
      ),
    });

    const diff = mutationDiff(
      report,
      new Map([["src/a.ts", [{ first: 2, last: 2 }]]]),
      REVISIONS,
    );

    expect(diff.totals).toEqual({
      mutants: 4,
      killed: 1,
      survived: 0,
      timedOut: 1,
      uncovered: 1,
      skipped: 1,
    });
    expect(diff.mutants.map((m) => m.status)).toEqual([
      "uncovered",
      "timedOut",
    ]);
  });

  it("says a diff that touches no mutated file was not assessed", () => {
    const report = aReport({ "src/a.ts": [{ status: "Survived", ...body }] });

    const diff = mutationDiff(
      report,
      new Map([["src/a.test.ts", [{ first: 1, last: 9 }]]]),
      REVISIONS,
    );

    expect(diff.notAssessed).toMatch(/^Not assessed/);
    expect(diff.totals.mutants).toBe(0);
  });

  it("assesses a changed mutated file even when no mutant sits on its changed lines", () => {
    const report = aReport({
      "src/a.ts": [{ status: "Survived", ...condition }],
    });

    const diff = mutationDiff(
      report,
      new Map([["src/a.ts", [{ first: 5, last: 5 }]]]),
      REVISIONS,
    );

    expect(diff.notAssessed).toBe("");
    expect(diff.totals.mutants).toBe(0);
  });

  test.prop([
    fc.integer({ min: 1, max: 50 }),
    fc.integer({ min: 0, max: 5 }),
    fc.integer({ min: 1, max: 50 }),
    fc.integer({ min: 0, max: 5 }),
  ])(
    "counts a mutant iff its span overlaps a changed line",
    (start, length, first, width) => {
      const report = aReport(
        {
          "src/a.ts": [
            { status: "Survived", start: [start, 1], end: [start + length, 1] },
          ],
        },
        "x\n".repeat(60),
      );
      const changed = new Map([["src/a.ts", [{ first, last: first + width }]]]);
      const touched = Array.from(
        { length: width + 1 },
        (_, i) => first + i,
      ).some((line) => line >= start && line <= start + length);

      const diff = mutationDiff(report, changed, REVISIONS);

      expect(diff.totals.mutants).toBe(touched ? 1 : 0);
    },
  );
});

describe("parseStrykerReport", () => {
  it("rejects an unfinished report", () => {
    expect(() =>
      aReport({ "src/a.ts": [{ status: "Pending", ...condition }] }),
    ).toThrow(/Pending/);
  });
});

describe("renderMarkdown", () => {
  const diffWith = (
    mutants: MutationDiff["mutants"],
    notAssessed = "",
  ): MutationDiff => ({
    schema: 1,
    tool: "StrykerJS 10.1.1",
    ...REVISIONS,
    totals: {
      mutants: mutants.length,
      killed: 0,
      survived: mutants.length,
      timedOut: 0,
      uncovered: 0,
      skipped: 0,
    },
    mutants,
    notAssessed,
  });
  const survivor = (file: string): MutationDiff["mutants"][number] => ({
    file,
    line: 2,
    status: "survived",
    operator: "ConditionalExpression",
    original: "n > 0",
    replacement: "true",
  });

  it("shows each mutant as a diff of its original and replacement", () => {
    const markdown = renderMarkdown(
      diffWith([survivor("src/a.ts")]),
      Number.POSITIVE_INFINITY,
    );

    expect(markdown).toContain(
      "```diff\n@@ survived src/a.ts:2 ConditionalExpression @@\n- n > 0\n+ true\n```\n",
    );
  });

  it("keeps PR-derived text from closing the fence", () => {
    const markdown = renderMarkdown(
      diffWith([survivor("src/a\n```\n# owned\r.ts")]),
      Number.POSITIVE_INFINITY,
    );

    const open = "```diff\n";
    const fenced = markdown.slice(markdown.indexOf(open) + open.length);
    expect(fenced.split("\n").filter((l) => l.startsWith("```"))).toEqual([
      "```",
    ]);
  });

  it("cuts whole mutants to fit the budget and says how many", () => {
    const diff = diffWith(
      Array.from({ length: 50 }, (_, i) => survivor(`src/f${i}.ts`)),
    );

    const markdown = renderMarkdown(diff, 2000);

    expect(Buffer.byteLength(markdown)).toBeLessThanOrEqual(2000);
    const shown = markdown.match(/^@@ /gm)?.length ?? 0;
    expect(shown).toBeGreaterThan(0);
    expect(markdown).toContain(`${50 - shown} more not shown`);
  });

  it("states the sentence instead of numbers when nothing was assessed", () => {
    const markdown = renderMarkdown(
      diffWith([], "Not assessed: tests only."),
      Number.POSITIVE_INFINITY,
    );

    expect(markdown).toContain("Not assessed: tests only.");
    expect(markdown).not.toContain("| Mutants |");
  });
});
