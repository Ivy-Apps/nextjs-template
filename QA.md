# QA

## Run the app

```bash
NODE_OPTIONS=--max-old-space-size=2048 nix develop -c just dev
```

- Installs the locked dependencies, then serves http://localhost:3000.
- Ready when the log prints `Ready in`. The first request to each page then
  compiles it, which can take 30s.
- `BE_URL` is the backend's base URL, default `https://dummyjson.com`. Nothing
  else is needed, but the real DummyJSON needs network.

## Run a UI change off localhost too

A UI change is not done until it has run off localhost. nextjs#1 crashed at
runtime for the user after 6 minutes, past 2 review passes and all tests.
`crypto.randomUUID` exists only in secure contexts, so adding a todo over plain
http threw a `TypeError`. localhost is a secure context, and `just check` and
the e2e run only there, so they cannot see this class of bug.

`next dev` serves only `localhost` and the name it was started with. Any other
origin gets the page, but it never hydrates: the log prints `Blocked
cross-origin request`. So start it under the name the browser will use:

```bash
nix develop -c just install
NODE_OPTIONS=--max-old-space-size=2048 nix develop -c \
  pnpm next dev --port 3000 --hostname <address>
```

`<address>` is the one the device opens, on a port it can reach.

Headless on one machine, with no other device, this works where `/etc/hosts`
maps the machine's name to `127.0.0.2`:

```bash
NODE_OPTIONS="--max-old-space-size=2048 --dns-result-order=ipv4first" \
  nix develop -c pnpm next dev --port 3000 --hostname "$(hostname)"
```

- Launch Chromium from a `qa-node` script with
  `--host-resolver-rules=MAP <hostname> 127.0.0.2`, and open
  `http://<hostname>:3000`. `qa-session` takes no browser flags.
- Before trusting the run, assert `window.isSecureContext === false`.

Use `next dev` for this, not `next start`. Outside `next dev` the session
cookies are `Secure`, so over plain http the browser drops them: login returns
to the login page with no error and no cookie.

## Accounts and login

- Log in at `/login` with the demo account in `README.md`.
- Tokens live in two httpOnly cookies, `access_token` and `refresh_token`.
- Signed out, `/` redirects to `/login?returnTo=%2F`.

## Test data

DummyJSON stores no writes. Added, toggled and deleted todos last until the next
reload, so there is nothing to reset.

## Key flows

Roles and names as `e2e/` uses them.

1. Log in: textboxes `Username` and `Password`, button `Log in`, then the
   heading `Todos`.
2. A wrong password shows `Wrong username or password.`
3. Add a todo: textbox `New todo`, button `Add`. Toggle it, then delete it.
4. `/bg` renders the Bulgarian app.
5. `Log out` returns to the login page.

## Quirks

- Wait for hydration before submitting the login form. Before it, the browser
  submits natively: the credentials land in the URL and the login silently
  does nothing.
- `ERR_ABORTED` on `?_rsc=` and `/proxy/auth/me` during login or a reload is
  navigation cancelling requests, not a failure.

## Out of scope

Storybook: `just storybook` shows components, not the app as a user reaches it.
