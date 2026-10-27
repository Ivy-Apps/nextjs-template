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

test:
    pnpm vitest run

build:
    pnpm next build

# Runs against the production build; run `just build` first.
e2e:
    pnpm playwright test

# Everything CI runs, each step once.
check: install lint typecheck arch test build e2e
