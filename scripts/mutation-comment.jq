# mutation-diff.json -> the pull request comment's numbers and mutants. Every
# PR-derived string sits in one fence, and every line in it starts with @, - or
# +, so no line can close the fence. mutation-diff.jq already stripped control
# characters, which a bare CR would otherwise use to escape it.
def budget_bytes: 58000; # GitHub refuses a comment over 65536 characters.
def block: "@@ \(.status) \(.file):\(.line) \(.mutator) @@\n"
  + ((.original[:12] | map("- " + .[:200])) + (.mutated[:12] | map("+ " + .[:200])) | join("\n")) + "\n";

.summary as $s
| reduce (.mutants[] | block) as $b ({text: "", shown: 0};
    if (.text + $b | utf8bytelength) > budget_bytes then . else .text += $b | .shown += 1 end) as $r
| ((.mutants | length) - $r.shown) as $cut
| (if $s.mutants == 0 then
     "No mutants in the files this pull request changed, so nothing was assessed. Stryker mutates `.ts` logic only: changes to tests alone, Views or config are not assessed, and this does not mean the tests were checked.\n"
   else
     "Scope: the `.ts` files this pull request changed, whole files, not only the changed lines. Other files are not listed, even when a changed test reaches them. Results reused from the incremental cache are included.\n\n| Mutants | Killed | Survived | No coverage | Timed out |\n|---|---|---|---|---|\n| \($s.mutants) | \($s.killed) | \($s.survived) | \($s.no_coverage) | \($s.timed_out) |\n"
   end)
  + (if $r.shown == 0 then "" else "\n```diff\n" + $r.text + "```\n" end)
  + (if $cut > 0 then "\n\($cut) more not shown: they are in `mutation-diff.json`, below.\n" else "" end)
