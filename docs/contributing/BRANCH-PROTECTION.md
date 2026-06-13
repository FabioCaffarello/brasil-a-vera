# Branch protection — main

> Brasil a Vera · Contribuição · v0.2
> Última atualização: 2026-06-10
> Status: descritivo (Sprint 5.0; revisado na auditoria do harness)

---

## Sumário

- [Estado atual](#estado-atual)
- [Configuração via API](#configuração-via-api)
- [Plano de evolução](#plano-de-evolução)
- [Como reproduzir em outro repo](#como-reproduzir-em-outro-repo)

---

## Estado atual

A branch `main` está protegida conforme abaixo (configurado em
2026-05-16, junto com a Sprint 5.0 PR 2):

| Regra | Valor | Por quê |
|---|---|---|
| Require PR before merging | ✓ | Direct push em `main` proibido |
| Required approving reviews | ❌ (removido 2026-06-13) | Era 1; **removido** ao reabilitar o auto-merge do Claude Code (projeto solo: Claude não se auto-aprova e não há outro revisor, então a review era incumprível sem `--admin`). O gate de servidor passou a ser puramente os required checks. Ver "Auto-merge" abaixo. |
| Require review from Code Owners | ❌ (off) | **CODEOWNERS está versionado mas enforcement ainda OFF**. Será ligado quando o time tiver 2+ handles ativos por área (ver "Plano de evolução"). |
| Dismiss stale approvals on new commits | ❌ | Aprovações persistem para reduzir fricção em PRs longos |
| Required status checks | Strict | Lint & Build / Tests / Integration Tests / zinc-HEX-primary-N legacy (promovido 2026-06-10, decisão F8 — 50+ runs sem falso positivo) precisam passar; branch precisa estar up-to-date com base antes do merge |
| Required conversation resolution | ✓ | PR não pode mergeear com conversas pendentes |
| Restrict who can push | — | Sem allowlist específica; basta ter approval + checks |
| Allow force pushes | ❌ | Histórico imutável |
| Allow deletions | ❌ | Branch `main` não pode ser deletada |
| Enforce on admins | ❌ | Owner como admin pode `--admin` override em emergência (escape para projeto solo). **Ver "Limitação conhecida" abaixo.** |
| Required signed commits | ❌ | Não exigido por enquanto |

## Limitação conhecida: `enforce_admins=false` não vincula admin via API

Comprovado empiricamente em 2026-06-10 (incidente do PR #373, durante o
teste da decisão F8): com `enforce_admins=false`, um `PUT
/repos/.../pulls/N/merge` com token de admin **mergeia ignorando required
checks E required review** — sem `--admin`, sem prompt. A recusa do
`gh pr merge` sem `--admin` é checagem *client-side* do CLI, não do
servidor.

Decisão consciente: **manter `enforce_admins=false`** — o owner é o
único admin, o risco real não é ele burlar a própria protection, e
ligar quebraria o fluxo de merge vigente. Compensações:

- A protection vincula integralmente qualquer caminho não-admin
  (contribuidores futuros, tokens de app/automação).
- Registro narrativo no [HISTORY.md](../HISTORY.md) §incidentes.

## Auto-merge do Claude Code (desde 2026-06-13)

Decisão do owner durante a leva de adoção do RDS 3.12.0: Claude Code
auto-mergeia PRs próprios **conforme o CI fica verde**. Duas camadas
foram ajustadas, **uma de cada vez e por escrito**:

1. **Harness** (`.claude/settings.json`): removido o deny de
   `Bash(gh pr merge:*)`. **Mantidos** os denies de `Bash(gh api -X
   PUT:*)` e `--method PUT` — a porta de mutação arbitrária via API
   REST (vetor real do #373) **segue fechada**.
2. **Branch protection** (este doc): removida a `required_pull_request_reviews`,
   **mantidos os 4 required status checks**. Sem a review incumprível, o
   `gh pr merge --auto` deixa o GitHub mergear sozinho quando os checks
   passam — **sem `--admin`** (nenhum override que ignore os checks).

O gate de servidor é agora puramente o CI. `enforce_admins` segue
`false` (limitação acima inalterada), mas o fluxo de auto-merge **não
depende de `--admin`** — usa `--auto`, que respeita os required checks.
Reversível: re-adicionar a required review (`gh api -X PUT` é do owner;
o Claude não o tem) e restaurar o deny no settings.

## Configuração via API

A configuração foi aplicada via REST API GitHub. Reproduzir:

```bash
cat <<'JSON' | gh api -X PUT \
  repos/<owner>/<repo>/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  --input -
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Lint & Build", "Tests", "Integration Tests", "zinc / HEX / primary-N legacy"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "require_code_owner_reviews": false,
    "dismiss_stale_reviews": false
  },
  "restrictions": null,
  "required_conversation_resolution": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

Verificar estado atual:

```bash
gh api repos/<owner>/<repo>/branches/main/protection | jq
```

Remover proteção (caso necessário):

```bash
gh api -X DELETE repos/<owner>/<repo>/branches/main/protection
```

## Plano de evolução

| Quando | O que mudar | Por quê |
|---|---|---|
| **Sprint 5.1+ — primeiro contribuidor externo** | Ligar `require_code_owner_reviews: true` | CODEOWNERS faz sentido quando há 2+ handles. Hoje (owner solo) seria decorativo. |
| ~~Quando `design-tokens` validar 2 sprints sem falso positivo~~ | **Feito 2026-06-10** (decisão F8): job legacy promovido após 50+ runs limpos e remoção do path filter (required + path filter = check "expected" eterno) | Princípio 13 cumprido |
| **Quando `pr-sanity` e `RDS leak advisory` validarem 2 sprints sem falso positivo** | Adicionar aos required status checks (cada um com relógio próprio) | Princípio 13: empírico antes de bloquear |
| **Se aparecerem 3+ admins ativos** | Considerar `enforce_admins: true` | Coletivo precisa do mesmo rigor que contribuidores externos |

Cada uma dessas mudanças vira PR específico tocando este documento +
chamada `gh api -X PUT` no PR description.

## Como reproduzir em outro repo

Se o projeto for movido para outro repo (fork, organização nova),
roda o bloco JSON da seção "Configuração via API" com `<owner>/<repo>`
ajustados.

Antes disso, garanta que os jobs `Lint & Build`, `Tests` e
`Integration Tests` existem no `.github/workflows/ci.yml` do destino —
os nomes precisam ser exatos.

## Histórico

- **2026-06-10** — `zinc / HEX / primary-N legacy` promovido a required
  (decisão F8); limitação `enforce_admins=false` comprovada e documentada
  (incidente #373); denies de merge adicionados ao `.claude/settings.json`.
- **2026-05-16** — Primeira configuração aplicada (Sprint 5.0 PR 2 abriu, este doc no PR 10).
- Antes desta data: `main` estava **sem** branch protection (`gh api` retornava 404 `Branch not protected`). Toda a Wave 4 foi mergeada via owner solo com convenção de PR-only sem enforcement automatizado.

## Referências

- [GitHub REST API — Branch protection](https://docs.github.com/en/rest/branches/branch-protection)
- `.github/CODEOWNERS` — handles versionados (PR 2 da Sprint 5.0)
- `.github/workflows/ci.yml` — define os 3 required status checks
- Princípio 13 do `CLAUDE.md` — empírico antes de implementação
