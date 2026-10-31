# reports/mutation/mutation.json -> mutation-diff.json: the Survived and
# NoCoverage mutants of the files a pull request changed. Stryker has no diff
# mode, and its report holds every mutant, so this scopes it. $changed is the
# NUL-separated output of `git diff -z --name-only`.
#
# one_line strips what could close the comment's fence: a bare CR ends a line.
def one_line: gsub("[\u0000-\u0008\u000a-\u001f\u007f\u0085  ]"; " ");
def count($status): map(select(. == $status)) | length;
def entry($file; $lines):
  .location as $l
  | $lines[$l.start.line - 1:$l.end.line] as $original
  | ($original[0][:$l.start.column - 1] + .replacement + $original[-1][$l.end.column - 1:]) as $mutated
  | {
      status,
      file: ($file | one_line),
      line: $l.start.line,
      end_line: $l.end.line,
      mutator: (.mutatorName | one_line),
      replacement: (.replacement | one_line),
      original: ($original | map(one_line)),
      mutated: ($mutated | split("\n") | map(one_line))
    };

($changed | split("\u0000")) as $paths
| [.files | to_entries[] | select(.key | IN($paths[]))] as $files
| [$files[].value.mutants[].status | select(. != "Ignored")] as $statuses
| {
    schema: 1,
    scope: "changed files",
    summary: {
      mutants: ($statuses | length),
      killed: ($statuses | count("Killed")),
      survived: ($statuses | count("Survived")),
      no_coverage: ($statuses | count("NoCoverage")),
      timed_out: ($statuses | count("Timeout"))
    },
    mutants: (
      [$files[]
        | .key as $file
        | (.value.source | split("\n")) as $lines
        | .value.mutants[]
        | select(.status == "Survived" or .status == "NoCoverage")
        | entry($file; $lines)]
      | sort_by({Survived: 0, NoCoverage: 1}[.status], .file, .line)
    )
  }
