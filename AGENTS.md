<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project

Read `docs/ARCHITECTURE.md` before writing code: it defines the layers, the
MVI screen pattern and where each file goes. A screen is a Container (calls
the ViewModel, renders the View), a pure View (`({ state, onEvent })`, what
Storybook stories render) and a ViewModel (`{ state, onEvent }`). Deslop (`just arch`) enforces the
layering.

Work inside the Nix dev shell: `nix develop -c just <recipe>`. `just check`
runs everything CI runs (Biome, tsc, Deslop, Vitest, Storybook stories,
`next build`, Playwright). Give each new View a `*.stories.tsx` with one story
per `UiState` variant (see "Stories" in `docs/ARCHITECTURE.md`); `just
storybook` serves them on port 3006 and `just stories` tests them.

`just mutation` measures how well the tests pin the `.ts` logic with Stryker.
It is advisory and outside `just check`; see "Mutation testing" in
`docs/ARCHITECTURE.md` for how to read survivors.
