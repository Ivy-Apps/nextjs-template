# nextjs-template

> [!WARNING]
> This template is experimental and under development. It is not production ready. Use at your own risk.

A pragmatic Next.js template with strong guardrails and good architecture for
the AI era.

- Next.js 16 (App Router, React Compiler), React 19, TypeScript 7, Tailwind 4
- Effect 4 for data and IO, TanStack Query 5 for server state, MVI screens
- shadcn/ui on Base UI, light and dark themes via next-themes
- next-intl with English (default) and Bulgarian
- Architecture enforced by [Deslop](https://deslop.dev), Biome for lint and
  format, Vitest + fast-check, Playwright, Storybook stories run as tests

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the layers and patterns.

## Getting started

Requires Nix with flakes. Every tool (Node, pnpm, just, the Playwright
browsers) comes from the dev shell:

```bash
nix develop                 # enter the dev shell, or prefix each command:
nix develop -c just dev     # http://localhost:3000
nix develop -c just check   # everything CI runs
```

Other recipes: `just --list`.

The sample app is a todo list on [DummyJSON](https://dummyjson.com). Log in
with the demo account `emilys` / `emilyspass`. DummyJSON stores no writes, so
added, toggled and deleted todos last until the next reload.

`BE_URL` is the backend's base URL (default `https://dummyjson.com`). Only the
server reads it, at request time, so it can change without a rebuild. The
Playwright run points it at an in-memory fake DummyJSON, so e2e needs no
network.
