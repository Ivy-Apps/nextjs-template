# Run inside the dev shell: `nix develop -c just <recipe>`.

default:
    @just --list

# Install dependencies exactly as locked.
install:
    pnpm install --frozen-lockfile

# Serve the app on http://localhost:3000.
dev: install
    pnpm next dev --port 3000

# Format and apply safe lint fixes.
fmt:
    pnpm biome check --write .

lint:
    pnpm biome check .

typecheck:
    pnpm next typegen
    pnpm tsc --noEmit

# Architecture rules in deslop/rules.
arch:
    pnpm deslop check .

# Draw the module graph to deslop/diagram/index.html.
explore:
    pnpm deslop explore .

# Unit and property tests in happy-dom.
test:
    pnpm vitest run --project unit

# Renders every Storybook story, and runs its play function, in Chromium.
stories:
    pnpm vitest run --project storybook

# Serve Storybook on http://localhost:3006.
storybook: install
    pnpm storybook dev --host 0.0.0.0 --port 3006 --no-open

build:
    pnpm next build

# Runs against the production build; run `just build` first.
e2e:
    pnpm playwright test

# Mutation score of the `.ts` logic, in the terminal and at
# reports/mutation/mutation.html. Advisory and slow, so not part of `check`.
# Incremental; pass `--force` to rerun every mutant.
mutation *args: install
    pnpm stryker run {{args}}

# Everything CI runs, each step once.
check: install lint typecheck arch test stories build e2e
