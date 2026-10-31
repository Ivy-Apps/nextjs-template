# Architecture

Android-style layers inside isolated features. Deslop enforces the rules in
`deslop/rules/` on every `just check`.

`just explore` draws the module graph to `deslop/diagram/index.html`. CI
publishes it to GitHub Pages (`explore.yml`): `main` at the site root and each
same-repository PR at `pr/<n>/`, linked from the PR as a deployment. It is
informational and never blocks a merge.

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
| `lib`    | Third-party integrations: i18n, TanStack Query, theme; typed env                  |                           |
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
  instrumentation.ts # decodes the server env at start, failing fast
  features/<f>/     # one slice per feature, each with ui/, domain/, data/
  features/shared/  # code several features share
  types/ data/ domain/ ui/   # feature-agnostic layers
  ui/design-system/ # shadcn/ui (Base UI) primitives and the cn() helper
  lib/              # i18n, query client, theme, env
test/               # fakes, fixtures, arbitraries; never imported by src
e2e/                # Playwright specs
```

Features never import each other. Code two features need moves to
`features/shared` or a top-level layer.

## Effects and data

- Repositories return `Effect<A, E, R>` with typed errors and decode responses
  with Effect Schema at the boundary.
- `@/lib/env/serverEnv` decodes the server's environment (`BE_URL`,
  `NODE_ENV`) with Effect Schema and throws a readable error naming every bad
  variable. `@/lib/env/clientEnv` holds the `NEXT_PUBLIC_*` ones, each read
  as a literal `process.env.NEXT_PUBLIC_X` so Next can inline it.
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

The backend only takes Bearer tokens; the browser only holds cookies. The
Next.js server is a backend-for-frontend (BFF) between them, so tokens never
reach client JS.

1. **Login.** `POST /api/auth/login` (`Credentials` -> `User` or a
   `LoginFailure`) logs in on the backend and sets the `access_token` and
   `refresh_token` cookies: httpOnly, Secure (except under `next dev`, so
   localhost works over http), SameSite=Lax. The backend's own
   cookies are not forwarded. The login form then drops the query cache, so
   no data of the last session survives, and replaces the URL with its
   `returnTo` path.
2. **Page guard and renewal.** `src/proxy.ts` runs before every page. It
   redirects a signed-out visitor to the localized login page with a
   `returnTo` path (`@/types/ReturnPath`), sends a signed-in visitor on the
   login page on to that path, and renews a missing, expired or near-expiry
   access token with the refresh token before the page renders. The renewed
   cookies reach both the page's request and the browser. A backend that
   cannot renew answers 502 and keeps the cookies; only a rejected refresh
   token ends the session.
3. **Server prefetch.** A page prefetches through `SessionHttpClient`, which
   sends the access token from the cookies as a Bearer. `PrefetchBoundary`
   dehydrates the query cache into the HTML, so the first paint has the data
   and the client starts from a warm cache.
4. **Pass-through.** In the browser, `ProxyHttpClient` sends every request to
   `/proxy/<path>`, which forwards any method and query to `BE_URL/<path>`,
   swapping the browser's cookies for the Bearer. On a backend 401 it renews
   once and retries; a rejected refresh token answers 401 and clears the
   cookies. Paths that would leave `BE_URL` are rejected. Any query or
   mutation failing with `SessionExpired` sends the browser to the localized
   login page with a `returnTo` path (`QueryProvider`).
5. **Logout.** `POST /api/auth/logout` clears both cookies, and the header
   replaces the URL with the login page.

`@/data/session` holds the logic: `resolveSession` decides, from the cookies
and the token's `exp`, whether to renew; `sessionCookies` reads and writes the
cookies.

### Todos

The signed-in home page prefetches the user's todos on the server.
`useTodosViewModel` adds, toggles and deletes optimistically: the change shows
at once and rolls back, with a localized alert, when the backend refuses it.
DummyJSON acknowledges an added todo but stores nothing, so a todo added in the
browser is a `LocalTodo`: its later toggles and deletes stay in the browser
(`saveTodo`), since the backend would answer 404 for its id.

## Screens (MVI)

Each screen is a Container, a View and a ViewModel in its feature's `ui/`:

```
page.tsx (server, in src/app)       # prefetch, then render the Container
<Screen>Container.tsx (client)      # glue: calls the ViewModel, renders the View
<Screen>View.tsx                    # pure: ({ state, onEvent }) => JSX
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

- The ViewModel runs effects through TanStack Query and keeps local UI state
  in a reducer.
- The Container holds no markup: it calls the ViewModel hook and renders
  `<ScreenView state={state} onEvent={onEvent} />`.
- The View pattern-matches on `state` and wires `onEvent` into pure
  presentational components: props in, callbacks out. It calls no ViewModel,
  query or router hook (`useTranslations` and `useId` are fine), so any
  `UiState` fixture renders it. Views are what Storybook stories render.

## Stories

- Storybook (`@storybook/nextjs-vite`, config in `.storybook/`) renders every
  `*.stories.tsx` colocated with its component under `src/`. Next never
  bundles them: no route imports a story.
- A View gets one story per `UiState` variant, its `onEvent` a `fn()` from
  `storybook/test`; a design-system primitive gets one per variant. Add a
  `play` function to assert an interaction (click, then `expect(onEvent)`).
- Every story renders in `NextIntlClientProvider` and next-themes'
  `ThemeProvider`; the toolbar switches the locale (en, bg) and the theme.
- `just storybook` serves it on port 3006. `just stories` runs the `storybook`
  Vitest project: each story renders, and its `play` runs, in the Chromium
  nixpkgs builds; `just check` includes it.

## Tests

- Vitest + Testing Library + happy-dom, colocated as `*.test.ts(x)`.
- Property tests with `@fast-check/vitest` for domain logic and codecs.
- Fakes for what we do not own (the backend, the clock) live in `test/`.
- Playwright specs in `e2e/` run against the production build. Global setup
  (`e2e/fakeBackendServer.ts`) serves the same in-memory DummyJSON
  (`test/fakeBackend.ts`) over HTTP on port 3078 and the app gets it as
  `BE_URL`, so e2e is deterministic and offline.

## Mutation testing

Stryker changes the code one small edit at a time and runs the `unit` tests
against each edit. A mutant that no test notices is a line the tests do not
pin. It measures the `.ts` logic only: Views are Storybook's and Playwright's,
which Stryker cannot see.

- `just mutation` is incremental: it reruns only the mutants whose code or
  tests changed since `reports/stryker-incremental.json`, in about a minute.
  `just mutation --force` reruns all of them, in about ten.
- It prints a score per file and writes `reports/mutation/mutation.html`.
- It is advisory: outside `just check`, and no score fails anything. CI runs
  it on each pull request, weekly and by hand (`.github/workflows/mutation.yml`)
  and puts the score in the job summary, the report in an artifact.

Reading a survivor (open the HTML report, filter on Survived):

| Survivor                                                                                          | What to do                                       |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| A behavior can change and nothing fails                                                           | A real gap: add a test for the behavior          |
| The code behaves the same (an equivalent mutant, such as a `case "Unchanged":` that only returns) | Ignore it                                        |
| A log or error text changed                                                                       | Usually noise: test it only if a caller reads it |
| NoCoverage                                                                                        | No test reaches the code at all                  |

Apply a doubtful survivor by hand and run `just test`: the two must agree.
`test/stryker.setup.ts` fixes the fast-check seed for this: a random seed
renames each property test, so Stryker would skip it and report false
survivors. Stryker has no type checker here (TypeScript 7), so a few survivors
do not compile.
