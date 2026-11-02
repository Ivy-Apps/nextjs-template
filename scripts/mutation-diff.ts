// `just mutation-diff [base]`: the mutants on the lines this checkout adds or
// edits since its merge-base with `base`, for CI's pull request comment and
// for local use alike.
//
// Stryker runs incrementally over whole files, as `just mutation` does, and
// its report is then cut down to the mutants whose span overlaps a changed
// new-side line. Not `--mutate file:L-L`: it skips mutants of an enclosing
// multi-line block, saves a scoped incremental file that drops every other
// result, and fails on bracket paths such as `src/app/proxy/[...path]/route.ts`.
//
// stdout is the markdown report and, on its last line, the JSON's path.
// Stryker's log goes to a file. Exit 0 whatever survives: advisory. Non-zero
// only when the run itself fails.

import { execFileSync, spawnSync } from "node:child_process";
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";

const OUT_DIR = "reports/mutation-diff";
const STRYKER_REPORT = "reports/mutation/mutation.json";
// GitHub refuses a comment over 65536 characters; the rest is its header.
const COMMENT_BUDGET_BYTES = 58_000;
const NOT_ASSESSED =
  "Not assessed: this diff adds or edits no line of the mutated `.ts` logic. Deleted lines, tests, Views and config are not mutated, so this says nothing about the tests.";

/** Inclusive, 1-based new-side lines. */
export interface LineRange {
  readonly first: number;
  readonly last: number;
}

/** Repository-relative path -> the new-side lines the diff adds or edits. */
export type ChangedLines = ReadonlyMap<string, readonly LineRange[]>;

// "Pending" is absent on purpose: a report that holds one is unfinished.
const STRYKER_STATUSES = [
  "Killed",
  "Survived",
  "NoCoverage",
  "Timeout",
  "CompileError",
  "RuntimeError",
  "Ignored",
] as const;

type StrykerStatus = (typeof STRYKER_STATUSES)[number];

interface Position {
  readonly line: number;
  readonly column: number;
}

interface StrykerMutant {
  readonly mutatorName: string;
  readonly replacement: string;
  readonly status: StrykerStatus;
  readonly location: { readonly start: Position; readonly end: Position };
}

export interface StrykerReport {
  readonly tool: string;
  readonly files: ReadonlyMap<
    string,
    { readonly source: string; readonly mutants: readonly StrykerMutant[] }
  >;
}

const LISTED_STATUSES = ["survived", "uncovered", "timedOut"] as const;
type ListedStatus = (typeof LISTED_STATUSES)[number];
type Outcome = "killed" | "skipped" | ListedStatus;

export type Totals = { readonly mutants: number } & Record<Outcome, number>;

export interface ListedMutant {
  readonly file: string;
  readonly line: number;
  readonly status: ListedStatus;
  readonly operator: string;
  readonly original: string;
  readonly replacement: string;
}

/** `mutation-diff.json`, schema 1 of the shared mutation diff contract. */
export interface MutationDiff {
  readonly schema: 1;
  readonly tool: string;
  readonly head: string;
  readonly base: string;
  readonly totals: Totals;
  readonly mutants: readonly ListedMutant[];
  readonly notAssessed: string;
}

function main(args: readonly string[]): void {
  const [base] = args;
  if (base === undefined) {
    throw new Error("usage: node scripts/mutation-diff.ts <base>");
  }
  const head = git(["rev-parse", "HEAD"]);
  const mergeBase = git(["merge-base", base, "HEAD"]);
  const changed = withWholeFiles(
    changedLines(
      git([
        "-c",
        "core.quotePath=false",
        "diff",
        "-U0",
        "--no-color",
        "--no-ext-diff",
        "--find-renames",
        "--src-prefix=a/",
        "--dst-prefix=b/",
        mergeBase,
      ]),
    ),
    git(["ls-files", "--others", "--exclude-standard", "-z"])
      .split("\0")
      .filter((path) => path !== ""),
  );

  mkdirSync(OUT_DIR, { recursive: true });
  const log = `${OUT_DIR}/stryker.log`;
  if (!runStryker(log)) {
    process.stderr.write(
      `${tail(readFileSync(log, "utf8"), 30)}\nStryker failed: see ${log}\n`,
    );
    process.exitCode = 1;
    return;
  }

  const report = parseStrykerReport(
    JSON.parse(readFileSync(STRYKER_REPORT, "utf8")),
  );
  const diff = mutationDiff(report, changed, { head, base: mergeBase });
  const markdown = renderMarkdown(diff, Number.POSITIVE_INFINITY);
  const json = `${OUT_DIR}/mutation-diff.json`;
  writeFileSync(json, `${JSON.stringify(diff, null, 2)}\n`);
  writeFileSync(`${OUT_DIR}/mutation-diff.md`, markdown);
  // CI's pull request comment: the same report, cut to fit.
  writeFileSync(
    `${OUT_DIR}/comment.md`,
    renderMarkdown(diff, COMMENT_BUDGET_BYTES),
  );
  process.stdout.write(`${markdown}\n${json}\n`);
}

/** The new-side lines of `git diff -U0` output that are added or edited. */
export function changedLines(diff: string): ChangedLines {
  const changed = new Map<string, LineRange[]>();
  let file: string | undefined;
  let hunkLinesLeft = 0;
  for (const line of diff.split("\n")) {
    if (hunkLinesLeft > 0) {
      // A body line, or git's "\ No newline at end of file" note.
      if (!line.startsWith("\\")) hunkLinesLeft--;
      continue;
    }
    if (line.startsWith("+++ ")) {
      file = newSidePath(line.slice("+++ ".length));
      continue;
    }
    const hunk = HUNK_HEADER.exec(line);
    if (hunk === null) continue;
    const [, oldCount, newStart, newCount] = hunk;
    const added = count(newCount);
    hunkLinesLeft = count(oldCount) + added;
    if (file !== undefined && added > 0) {
      const first = Number(newStart);
      changed.set(file, [
        ...(changed.get(file) ?? []),
        { first, last: first + added - 1 },
      ]);
    }
  }
  return changed;
}

const HUNK_HEADER = /^@@ -\d+(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

function count(group: string | undefined): number {
  return group === undefined ? 1 : Number(group);
}

// A path git had to quote (a `"` or `\` in it) keeps its quotes and so
// matches no mutated file: such names do not occur in this repository.
function newSidePath(header: string): string | undefined {
  const path = header.replace(/\t$/, "");
  return path === "/dev/null" ? undefined : path.replace(/^b\//, "");
}

/** Every line of an untracked file is new. */
function withWholeFiles(
  changed: ChangedLines,
  untracked: readonly string[],
): ChangedLines {
  const whole: LineRange = { first: 1, last: Number.POSITIVE_INFINITY };
  return new Map([
    ...changed,
    ...untracked.map((path): [string, LineRange[]] => [path, [whole]]),
  ]);
}

/** Parses the parts of Stryker's `mutation.json` this report reads. */
export function parseStrykerReport(json: unknown): StrykerReport {
  const report = record(json, "report");
  const framework = record(report.framework, "framework");
  const files = record(report.files, "files");
  return {
    tool: `${text(framework.name, "framework.name")} ${text(framework.version, "framework.version")}`,
    files: new Map(
      Object.entries(files).map(([path, value]) => {
        const file = record(value, path);
        const mutants = file.mutants;
        if (!Array.isArray(mutants)) throw new Error(`${path}: no mutants`);
        return [
          path,
          {
            source: text(file.source, `${path} source`),
            mutants: mutants.map((m: unknown) => parseMutant(m, path)),
          },
        ];
      }),
    ),
  };
}

function parseMutant(json: unknown, path: string): StrykerMutant {
  const mutant = record(json, `${path} mutant`);
  const location = record(mutant.location, `${path} location`);
  return {
    mutatorName: text(mutant.mutatorName, `${path} mutatorName`),
    replacement: text(mutant.replacement, `${path} replacement`),
    status: strykerStatus(mutant.status),
    location: {
      start: position(location.start, path),
      end: position(location.end, path),
    },
  };
}

function strykerStatus(json: unknown): StrykerStatus {
  const status = STRYKER_STATUSES.find((s) => s === json);
  if (status === undefined) throw new Error(`unknown status ${String(json)}`);
  return status;
}

function position(json: unknown, path: string): Position {
  const p = record(json, `${path} position`);
  const { line, column } = p;
  if (typeof line !== "number" || typeof column !== "number") {
    throw new Error(`${path}: bad position`);
  }
  return { line, column };
}

function record(json: unknown, what: string): Record<string, unknown> {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw new Error(`${what}: not an object`);
  }
  return json as Record<string, unknown>;
}

function text(json: unknown, what: string): string {
  if (typeof json !== "string") throw new Error(`${what}: not a string`);
  return json;
}

/** The mutants whose span overlaps a changed line, counted and listed. */
export function mutationDiff(
  report: StrykerReport,
  changed: ChangedLines,
  revisions: { readonly head: string; readonly base: string },
): MutationDiff {
  const selected = [...report.files].flatMap(([file, { source, mutants }]) => {
    const ranges = changed.get(file) ?? [];
    return mutants
      .filter((m) => ranges.some((range) => overlaps(m.location, range)))
      .map((mutant) => ({ file, source, mutant, outcome: outcome(mutant) }));
  });
  const assessed = [...report.files.keys()].some((file) => changed.has(file));
  return {
    schema: 1,
    tool: report.tool,
    ...revisions,
    totals: {
      mutants: selected.length,
      killed: selected.filter((s) => s.outcome === "killed").length,
      survived: selected.filter((s) => s.outcome === "survived").length,
      timedOut: selected.filter((s) => s.outcome === "timedOut").length,
      uncovered: selected.filter((s) => s.outcome === "uncovered").length,
      skipped: selected.filter((s) => s.outcome === "skipped").length,
    },
    mutants: selected
      .flatMap(({ file, source, mutant, outcome }) =>
        isListed(outcome)
          ? [
              {
                file,
                line: mutant.location.start.line,
                status: outcome,
                operator: mutant.mutatorName,
                original: spanText(source, mutant.location),
                replacement: mutant.replacement,
              },
            ]
          : [],
      )
      .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line),
    notAssessed: assessed ? "" : NOT_ASSESSED,
  };
}

function overlaps(span: StrykerMutant["location"], range: LineRange): boolean {
  return span.start.line <= range.last && range.first <= span.end.line;
}

// Stryker leaves compile and runtime errors out of its score; so does this.
function outcome(mutant: StrykerMutant): Outcome {
  switch (mutant.status) {
    case "Killed":
      return "killed";
    case "Survived":
      return "survived";
    case "NoCoverage":
      return "uncovered";
    case "Timeout":
      return "timedOut";
    case "CompileError":
    case "RuntimeError":
    case "Ignored":
      return "skipped";
  }
}

function isListed(outcome: Outcome): outcome is ListedStatus {
  return LISTED_STATUSES.some((s) => s === outcome);
}

/** Stryker's columns are 1-based and its end column is exclusive. */
function spanText(source: string, span: StrykerMutant["location"]): string {
  const lines = source.split("\n").slice(span.start.line - 1, span.end.line);
  const last = lines.length - 1;
  return lines
    .map((line, i) =>
      line.slice(
        i === 0 ? span.start.column - 1 : 0,
        i === last ? span.end.column - 1 : undefined,
      ),
    )
    .join("\n");
}

/**
 * The compact report. Every PR-derived string sits in one diff fence, each of
 * its lines starting with `@@`, `-` or `+`, so none can close the fence.
 * Whole mutants are cut once the report would pass `budgetBytes`.
 */
export function renderMarkdown(
  diff: MutationDiff,
  budgetBytes: number,
): string {
  const intro = `**Mutation diff** (advisory): the lines changed since \`${diff.base.slice(0, 7)}\`, at \`${diff.head.slice(0, 7)}\`.\n\n`;
  if (diff.notAssessed !== "") return `${intro}${diff.notAssessed}\n`;

  const t = diff.totals;
  const table = `| Mutants | Killed | Survived | Uncovered | Timed out | Skipped |\n| --- | --- | --- | --- | --- | --- |\n| ${t.mutants} | ${t.killed} | ${t.survived} | ${t.uncovered} | ${t.timedOut} | ${t.skipped} |\n`;
  const head = intro + table;
  const fence = { open: "\n```diff\n", close: "```\n" };
  const cutNote = (cut: number) =>
    `\n${cut} more not shown: see \`mutation-diff.json\`.\n`;
  const blocks = diff.mutants.map(mutantBlock);
  let used =
    bytes(head) +
    bytes(fence.open) +
    bytes(fence.close) +
    bytes(cutNote(blocks.length));
  let shown = 0;
  for (const block of blocks) {
    if (used + bytes(block) > budgetBytes) break;
    used += bytes(block);
    shown++;
  }
  const cut = blocks.length - shown;

  return (
    head +
    (shown === 0
      ? ""
      : fence.open + blocks.slice(0, shown).join("") + fence.close) +
    (cut === 0 ? "" : cutNote(cut))
  );
}

const MAX_LINES = 8;
const MAX_LINE_CHARS = 200;

function mutantBlock(mutant: ListedMutant): string {
  return [
    `@@ ${mutant.status} ${oneLine(mutant.file)}:${mutant.line} ${oneLine(mutant.operator)} @@`,
    ...fenced("-", mutant.original),
    ...fenced("+", mutant.replacement),
    "",
  ].join("\n");
}

function fenced(sign: "-" | "+", code: string): string[] {
  const lines = code.split("\n").map((line) => {
    const flat = oneLine(line);
    return `${sign} ${flat.length > MAX_LINE_CHARS ? `${flat.slice(0, MAX_LINE_CHARS)}…` : flat}`;
  });
  return lines.length > MAX_LINES
    ? [...lines.slice(0, MAX_LINES), `${sign} …`]
    : lines;
}

/** Control and line-separator characters, which could end a fenced line. */
function oneLine(s: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping them is the point.
  return s.replace(/[\u0000-\u001f\u007f\u0085\u2028\u2029]/g, " ");
}

function bytes(s: string): number {
  return Buffer.byteLength(s);
}

function runStryker(log: string): boolean {
  const fd = openSync(log, "w");
  // A stale report must never pass for this run's.
  rmSync(STRYKER_REPORT, { force: true });
  const run = spawnSync(
    "pnpm",
    ["stryker", "run", "--allowConsoleColors", "false"],
    { stdio: ["ignore", fd, fd] },
  );
  closeSync(fd);
  return run.status === 0;
}

function tail(s: string, lines: number): string {
  return s.trimEnd().split("\n").slice(-lines).join("\n");
}

function git(args: readonly string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  }).trimEnd();
}

// Last, so every constant above is initialised before main reads it.
if (import.meta.main) {
  main(process.argv.slice(2));
}
