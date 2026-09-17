# Domain Docs

How engineering skills consume this repository's domain documentation.

## Before exploring

- Read `CONTEXT.md` at the repository root when it exists.
- Read applicable ADRs under `docs/adr/`.

If these files do not exist, proceed silently. Do not require them upfront. The domain-modeling workflows create them lazily when terminology or decisions are resolved.

## Layout

VouchIt is a single-context repository:

```text
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

## Vocabulary

Use terminology defined in `CONTEXT.md` in issue titles, proposals, hypotheses, and tests. If a needed concept is absent, reconsider whether new terminology is necessary or note the gap for domain modeling.

## ADR conflicts

If proposed work conflicts with an ADR, surface the conflict explicitly rather than silently overriding it:

> Contradicts ADR-0007, but worth reopening because…
