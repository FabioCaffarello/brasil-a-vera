# .claude/ — ecossistema Claude Code do Brasil a Vera

> Wave 5 Sprint 5.0 — fundação versionada.
> Estrutura inicial criada no PR 1; conteúdo populado nos PRs 2-11.

Este diretório é **versionado como infraestrutura de time** (decisão Wave 5).
O `.gitignore` permite apenas estado verdadeiramente local fora do repo:

- `settings.local.json` (overrides individuais)
- `transcripts/`, `cache/`, `telemetry/` (estado de sessão)
- `.role-log` (auditoria local de role)

## Subdiretórios

| Caminho | Conteúdo | PR que popula |
|---|---|---|
| `agents/` | Subagents com YAML frontmatter | PR 5 (Sprint 5.0) |
| `skills/` | Skills no formato unificado 2026 | PRs 6 e 7 (Sprint 5.0) |
| `hooks/` | Hooks shell + helpers em `lib/` | PR 4 (Sprint 5.0) |
| `docs/` | ROLES.md + ONBOARDING-* humanos | PRs 3 e 10 (Sprint 5.0) |
| `settings.json` | Permissions + hook bindings | PR 3 (Sprint 5.0) |

## Como navegar (depois que tudo estiver populado)

1. Leia `docs/ONBOARDING-DESIGNER.md` ou `docs/ONBOARDING-ENGINEER.md`
   conforme seu role.
2. Confira `docs/ROLES.md` para entender o que cada role pode tocar.
3. Para invocar uma skill, use `/<nome-da-skill>` no Claude Code.
4. Subagents são chamados via natural language matching ou via skill
   wrapper.

## Para contribuir com novos componentes do ecossistema

Cada PR que adiciona agent/skill/hook deve documentar no corpo:
- problema concreto observado que justifica a adição (ADR-019);
- teste empírico em sessão real, output literal incluído;
- impacto em ambos os roles (designer e engineer).

Skills com mais de 200 linhas em `SKILL.md` viram subagents dedicados
(convenção registrada em `docs/ONBOARDING-ENGINEER.md` no PR 10).

## Referências canônicas

- `CLAUDE.md` (raiz) — princípios do projeto.
- `docs/architecture/ADR/019-disciplina-arquitetural-sem-gargalo.md`
  — gate de evidência para qualquer adição.
- `docs/architecture/ADR/021-design-system-shadcn-curado.md` — 7 passos
  do design system curado (consumido por `agents/design-system-curator.md`).
