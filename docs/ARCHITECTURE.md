# Architecture

Android-style layers inside isolated features. Deslop enforces the rules in
`deslop/rules/` on every `just check`.

## Layers

```
ui -> domain -> data -> types
```

| Layer    | Holds                                                                             | May import                |
| -------- | --------------------------------------------------------------------------------- | ------------------------- |
| `types`  | Shared domain models and Effect Schemas                                           | only `types`              |
| `data`   | IO: data sources and repositories returning `Effect<A, E, R>`, provided by Layers | `types`                   |
| `domain` | Use-cases combining repositories (optional)                                       | `data`, `types`           |
| `ui`     | Screens and components                                                            | `domain`, `data`, `types` |
| `lib`    | Third-party integrations: i18n, TanStack Query, theme                             |                           |
- `domain` is optional: `ui` may call a `data` repository directly.
- `domain` and `data` never import `ui`, `app` or React.
- `data` never imports `domain`.
- No relative imports: use `@/*` (`src/*`) and `@test/*` (`test/*`).

## Where things go

```
src/
  app/              # Next.js routes only: pages, layouts, BFF route handlers
    [locale]/       # localized pages
  proxy.ts          # Next 16 proxy: i18n routing, page guards, session renew
  features/<f>/     # one slice per feature, each with ui/, domain/, data/
  features/shared/  # code several features share
  types/ data/ domain/ ui/   # feature-agnostic layers
  ui/design-system/ # shadcn/ui (Base UI) primitives and the cn() helper
  lib/              # i18n, query client, theme
test/               # fakes, fixtures, arbitraries; never imported by src
e2e/                # Playwright specs
```

Features never import each other. Code two features need moves to
`features/shared` or a top-level layer.

## Effects and data

- Repositories return `Effect<A, E, R>` with typed errors and decode responses
  with Effect Schema at the boundary.
- `@/data/http/BackendHttpClient` is the server-side `HttpClient` Layer: it
  resolves paths against `BE_URL` and fails on non-2xx responses.
- `@/data/http/SessionHttpClient` is the same client carrying the visitor's
  access token as a Bearer, for server components. `@/data/http/ProxyHttpClient`
  is the browser's client: it sends every request through `/proxy`. A
  repository written against `HttpClient` runs on either.
- `runQuery(effect)` from `@/lib/query/runQuery` turns an Effect (with its
  requirements provided) into a TanStack Query `queryFn`.
- `PrefetchBoundary` from `@/lib/query/PrefetchBoundary` prefetches on the
  server and hydrates the client cache, so the first paint needs no loading
  state.

## BFF and session

The backend only takes Bearer tokens; the browser only holds cookies.

- `POST /api/auth/login` (`Credentials` -> `User` or a `LoginFailure`) sets
  the `access_token` and `refresh_token` cookies: httpOnly, Secure,
  SameSite=Lax. `POST /api/auth/logout` clears them. Tokens never reach client
  JS.
- `/proxy/<path>` forwards any method to `BE_URL/<path>`, swapping the
  browser's cookies for the Bearer. On a backend 401 it renews once and
  retries; a rejected refresh token answers 401 and clears the cookies.
- `src/proxy.ts` redirects signed-out visitors to the localized login page
  with a `returnTo` path (`@/types/ReturnPath`) and renews a missing, expired
  or near-expiry access token before the page renders.
- `@/data/session` holds the logic: `resolveSession` decides, from the cookies
  and the token's `exp`, whether to renew.

## Screens (MVI)

Each screen is three pieces in its feature's `ui/`:

```
page.tsx (server, in src/app)       # prefetch, then render the Container
<Screen>Container.tsx (client)      # calls the ViewModel, renders pure components
use<Screen>ViewModel.ts             # returns { state, onEvent }
use<Screen>ViewModel.types.ts       # UiState sum type, UiEvent union
```

```ts
// useTodosViewModel.types.ts
export type UiState =
  | { _tag: "Loading" }
  | { _tag: "Loaded"; todos: ReadonlyArray<Todo> }
  | { _tag: "Failed"; message: string };

export type UiEvent =
  | { _tag: "AddTodo"; title: string }
  | { _tag: "ToggleTodo"; id: TodoId };
```

The ViewModel runs effects through TanStack Query and keeps local UI state in
a reducer. The Container pattern-matches on `state` and wires `onEvent` into
pure presentational components: props in, callbacks out.

## Tests

- Vitest + Testing Library + happy-dom, colocated as `*.test.ts(x)`.
- Property tests with `@fast-check/vitest` for domain logic and codecs.
- Fakes for what we do not own (the backend, the clock) live in `test/`.
- Playwright specs in `e2e/` run against the production build.
