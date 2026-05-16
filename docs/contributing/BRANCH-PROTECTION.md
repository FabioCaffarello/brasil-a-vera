# Branch protection — main

> Brasil a Vera · Contribuição · v0.1
> Última atualização: 2026-05-16
> Status: descritivo (estado atual configurado na Sprint 5.0)

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
| Required approving reviews | 1 | Garante ao menos 1 revisor humano (owner via `--admin` pode override em emergência) |
| Require review from Code Owners | ❌ (off) | **CODEOWNERS está versionado mas enforcement ainda OFF**. Será ligado quando o time tiver 2+ handles ativos por área (ver "Plano de evolução"). |
| Dismiss stale approvals on new commits | ❌ | Aprovações persistem para reduzir fricção em PRs longos |
| Required status checks | Strict | Lint & Build / Tests / Integration Tests precisam passar; branch precisa estar up-to-date com base antes do merge |
| Required conversation resolution | ✓ | PR não pode mergeear com conversas pendentes |
| Restrict who can push | — | Sem allowlist específica; basta ter approval + checks |
| Allow force pushes | ❌ | Histórico imutável |
| Allow deletions | ❌ | Branch `main` não pode ser deletada |
| Enforce on admins | ❌ | Owner como admin pode `--admin` override em emergência (escape para projeto solo) |
| Required signed commits | ❌ | Não exigido por enquanto |

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
    "contexts": ["Lint & Build", "Tests", "Integration Tests"]
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
| **Quando workflows `pr-sanity` e `design-tokens` validarem 2 sprints sem falso positivo** | Adicionar esses workflows aos required status checks | Princípio 13: empírico antes de bloquear |
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

- **2026-05-16** — Primeira configuração aplicada (Sprint 5.0 PR 2 abriu, este doc no PR 10).
- Antes desta data: `main` estava **sem** branch protection (`gh api` retornava 404 `Branch not protected`). Toda a Wave 4 foi mergeada via owner solo com convenção de PR-only sem enforcement automatizado.

## Referências

- [GitHub REST API — Branch protection](https://docs.github.com/en/rest/branches/branch-protection)
- `.github/CODEOWNERS` — handles versionados (PR 2 da Sprint 5.0)
- `.github/workflows/ci.yml` — define os 3 required status checks
- Princípio 13 do `CLAUDE.md` — empírico antes de implementação
