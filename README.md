# nextjs-template

A pragmatic Next.js template with strong guardrails and good architecture for
the AI era.

- Next.js 16 (App Router, React Compiler), React 19, TypeScript 7, Tailwind 4
- Effect 4 for data and IO, TanStack Query 5 for server state, MVI screens
- shadcn/ui on Base UI, light and dark themes via next-themes
- next-intl with English (default) and Bulgarian
- Architecture enforced by [Deslop](https://deslop.dev), Biome for lint and
  format, Vitest + fast-check, Playwright

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the layers and patterns.

## Getting started

Requires Nix with flakes.

```bash
nix develop -c just dev     # http://localhost:3000
nix develop -c just check   # everything CI runs
```

Other recipes: `just --list`.

Set `BE_URL` to the backend's base URL for server-side data access.
