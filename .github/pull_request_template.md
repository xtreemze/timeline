## Summary

<!-- What changes, and why? -->

## Architecture impact

- Canonical/domain impact:
- Application command/shared-state impact:
- Projection/layout impact:
- Adapter/UI impact:
- Migration/compatibility impact:

If a layer is unaffected, state `none`.

## Invariants

<!-- Which existing invariant is preserved or which new invariant becomes executable? -->

- [ ] No canonical meaning depends on renderer/framework/provider-private state.
- [ ] UI/event handlers do not introduce direct canonical-array mutation.
- [ ] Canonical IDs remain the cross-view identity.
- [ ] Migration/import behavior is loss-accounted.
- [ ] Mobile/touch and reduced-motion behavior remain complete.

## Validation

<!-- List unit/characterization/Playwright/performance checks. Recurring defects should gain regression coverage. -->

## Related work

Parent/related issues:
