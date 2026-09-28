# Lūm contributor and agent execution contract

This file applies to human and automated contributors. The architectural contract remains in `docs/CONTRIBUTOR-ARCHITECTURE.md`; this file defines the required execution method.

## Test-driven development is mandatory

Any behavior change under `src/`, `site/`, or `schemas/` follows RED → GREEN → REFACTOR.

1. **RED:** Before changing production code, add or modify the smallest executable test that states the intended behavior. Run the focused test and observe it fail for the intended reason. A test that fails because of syntax, fixture, import, or environment errors does not satisfy RED.
2. **GREEN:** Make the minimum production change required to satisfy that test. Run the focused test again, then the relevant contract/unit suite.
3. **REFACTOR:** Improve structure only while the relevant tests remain green. Do not change expected behavior during refactoring.

Bug fixes require a regression test that reproduces the bug before the fix. New behavior requires a contract test at the lowest deterministic layer that can express it; add Playwright coverage when browser integration, touch/pointer semantics, responsive composition, accessibility, or renderer behavior is part of the contract.

Do not weaken assertions, broaden tolerances, increase timeouts, regenerate snapshots blindly, disable suites, or rewrite a failing test merely to make an implementation pass. If the intended contract changes, make that contract change explicit in the test and PR rationale.

Documentation-only and non-behavioral metadata changes do not require a new test. Production behavior changes must be accompanied by an executable test change; `pnpm check:tdd` enforces that repository-level accompaniment rule.

## Required validation

Use the narrowest command during RED/GREEN, then run the relevant broader suite. Before considering work complete, run `pnpm check` and any browser certification directly affected by the change.

Prefer small changes that turn one named failing contract green.
