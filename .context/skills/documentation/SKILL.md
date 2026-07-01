---
type: skill
name: Documentation
description: Generate and update technical documentation. Use when Documenting new features or APIs, Updating docs for code changes, or Creating README or getting started guides
skillSlug: documentation
phases: [P, C]
generated: 2026-07-01
status: filled
scaffoldVersion: "2.0.0"
---
## Workflow

1. Identify the doc type: ADR, ops runbook, feature spec, domain glossary, release note, or contributor guide
2. Locate the correct directory under `docs/` by type — never create temporal dirs (`docs/wave-N/`, `docs/sprint-N/`)
3. Verify every technical claim against current code before writing — no documenting hypothetical behavior
4. Write the doc in the appropriate format for its type (see examples below)
5. Link to related ADRs, issues, and code files using relative paths
6. Update index files if scope changed (`docs/product/ROADMAP.md`, release notes in `docs/releases/`)
7. Run `npm run ci` if any code files were incidentally touched during the doc update

## Examples

**ADR template (accepted decision):**
```markdown
# ADR-NNN — Title

**Status:** accepted
**Date:** 2026-07-01

## Context

[Why this decision was needed — the observed constraint or problem]

## Decision

[What was decided — specific and actionable]

## Consequences

- [Positive outcome]
- [Negative tradeoff]
- Supersedes: [ADR-XXX if applicable]
```

**Ops runbook entry:**
```markdown
## Procedure: Diagnose Neon 402 (Quota Exhausted)

**Trigger:** DB-backed routes return 500; `/api/health` returns 200

1. Open Neon console → Usage → confirm quota exhausted
2. Wait for monthly reset (1st of month) or upgrade plan
3. Smoke probes auto-recover when quota resets — no code change needed
4. Do NOT add workaround caching to mask the quota error
```

**Domain glossary entry:**
```markdown
### CEAP (Cota para o Exercício da Atividade Parlamentar)

Monthly expense allowance for deputados (~R$30k–50k/month) covering office expenses,
travel, and services. Stored in the `gasto` table with `trust_level = L2`
(direct Câmara CEAP API). Default ingestion window: current year only.
```

## Quality Bar

- Type-based organization: `docs/architecture/ADR/` for decisions, `docs/ops/` for runbooks, `docs/domain/` for glossary, `docs/releases/` for release notes — no wave/sprint subdirs
- Factual only: verify behavior in current code before documenting. "Will" for unimplemented = blocked
- ADRs in `docs/future/adr/` are long-term vision, NOT accepted — never treat them as current
- ADR format requires: title, status, date, context, decision, consequences
- Conventional Commits for the doc commit: `docs(adr): accept ADR-NNN slug (#issue)`
- No multi-paragraph inline comment blocks in code — docs belong in `docs/`, not in code comments
- Relative paths for cross-doc links — never hardcoded absolute URLs to the repo

## Resource Strategy

- No extra files in this skill folder — documentation output goes directly into the appropriate `docs/` subdirectory.
- Reference a specific ADR only if it contains constraints non-obvious from the task description.
