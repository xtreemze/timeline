# Testing and certification

Lūm treats test discovery, execution and merge gating as part of the product contract.

## Authoritative Node suite

`pnpm test` recursively discovers every `tests/**/*.test.mjs` file through
`scripts/run-node-tests.mjs`. Focused `test:*` commands remain developer conveniences; they do
not define the complete suite.

A regression test must not require manual registration in `package.json` or CI. The
`test-infrastructure.test.mjs` contract verifies discovery against the filesystem.

## CI lanes

The `Timeline view` workflow runs for relevant pull-request and `main` changes. Static quality,
the complete Node suite, benchmarks, and browser certifications are kept independently observable so
one early failure does not hide unrelated evidence.

Browser, benchmark, showcase, Lighthouse, coverage, lint, and formatting results are diagnostic
unless a workflow explicitly promotes one to a production gate. GitHub Pages production deployment
uses its own build/runtime/type gates; diagnostic certification failures must not prevent an
otherwise valid build from deploying.

## Flakiness

Chromium browser tests retain retries for diagnostics and traces, but `failOnFlakyTests` is enabled
in CI. A test that fails once and passes on retry is therefore reported as a failed diagnostic lane
rather than being silently treated as clean.

## Browser scope

The current release target is Chromium (Chrome/Edge). The matrix covers desktop, portrait phone,
landscape phone, tablet touch and reduced motion. Historical WebKit/Safari measurements are not
current release certification.

## Test style

Use source/configuration inspection for architecture, build and policy invariants. User-observable
behavior should be proved through executable functions, DOM behavior or Playwright rather than only
by matching implementation text.
