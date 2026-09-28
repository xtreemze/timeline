# Testing and certification

Lūm treats test discovery, execution and merge gating as part of the product contract.

## Authoritative Node suite

`pnpm test` recursively discovers every `tests/**/*.test.mjs` file through
`scripts/run-node-tests.mjs`. Focused `test:*` commands remain developer conveniences; they do
not define the complete suite.

A regression test must not require manual registration in `package.json` or CI. The
`test-infrastructure.test.mjs` contract verifies discovery against the filesystem.

## CI lanes

The `Timeline view` workflow runs for every pull request and every push to `main`. Static
quality, the complete Node suite, benchmarks and browser certifications run independently so one
early failure cannot hide unrelated failures.

The final `certification` job fails unless every required lane succeeds. Repository branch
protection or a repository ruleset should require that check before merge. Workflow code can define
the aggregate check, but repository administration must make it merge-required.

## Flakiness

Chromium browser tests retain retries for diagnostics and traces, but `failOnFlakyTests` is enabled
in CI. A test that fails once and passes on retry is still a failed certification result.

## Browser scope

The current release target is Chromium (Chrome/Edge). The matrix covers desktop, portrait phone,
landscape phone, tablet touch and reduced motion. Historical WebKit/Safari measurements are not
current release certification.

## Test style

Use source/configuration inspection for architecture, build and policy invariants. User-observable
behavior should be proved through executable functions, DOM behavior or Playwright rather than only
by matching implementation text.
