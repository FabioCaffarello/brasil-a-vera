---
name: commit-message
description: Generate commit messages that follow conventional commits and repository scope conventions. Use when Creating git commits after code changes, Writing commit messages for staged changes, or Following conventional commit format for the project
---

## Workflow

1. Run `git diff --staged` to review exactly what is staged
2. Identify the change type: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`
3. Identify the scope: the module, area, or bounded context affected (see scope list below)
4. Write the subject line: `type(scope): verb phrase in imperative mood` — max 72 chars
5. Add a body only when the WHY is non-obvious (a constraint, workaround, or incident-driven fix)
6. Reference GitHub issues with `(#NNN)` at the end of the subject line

## Examples

**Feature commit (new ingestion script):**
```
feat(senado): ingest comissão membros via orientacaoBancada API (#503)
```

**Bug fix with non-obvious context:**
```
fix(eixo2): link tse_candidatura.parlamentar_id after CPF backfill (#427)

Backfill ran but FK update step was missing from the migration sequence.
join on cpf was producing nulls for senadores without camara_id fallback.
```

**Chore (lockfile fix — needs body because the WHY is surprising):**
```
chore(deps): replace localhost:4880 resolved URLs in lockfile

npm install through local proxy wrote localhost:4880 as resolved URL.
CI fails with ECONNREFUSED. Fix: sed replace to registry.npmjs.org.
integrity hashes unaffected.
```

**Refactor (no body needed — behavior unchanged is self-evident):**
```
refactor(ingestion): extract shared retry logic to ingestion/shared/http.ts
```

**Common scopes for this project:**
- Domain: `parlamentares`, `proposicoes`, `votacoes`, `gastos`, `orientacoes`
- Source: `camara`, `senado`, `tse`
- Features: `eixo2`, `eixo3`, `painel`, `rankings`, `busca`
- System: `rds`, `ci`, `deps`, `db`, `auth`, `lgpd`, `cache`

## Quality Bar

- Imperative mood: "add X", "fix Y", "remove Z" — never "added", "fixing"
- Subject line under 72 characters — no exceptions
- No period at end of subject line
- Scope names the concrete area, not a generic word like "app" or "core"
- Issue reference `(#NNN)` in subject line, not in body
- Body explains WHY — not WHAT (the diff shows what)
- One logical change per commit — never bundle unrelated fixes

## Resource Strategy

- No extra resources needed — this skill covers the complete format.
