# .claude/ — ecossistema Claude Code do Brasil a Vera

> Wave 5 Sprint 5.0 — versionado como infraestrutura de time.

Este diretório é **fonte de verdade** para a operação Claude Code do
projeto. O `.gitignore` permite apenas estado verdadeiramente local:

- `settings.local.json` (overrides individuais)
- `transcripts/`, `cache/`, `telemetry/` (estado de sessão)
- `.role-log` (auditoria local de role)

## Antes de começar

1. Identifique seu role:
   - **Designer** (default) — UI, design system, copy, docs de design.
   - **Engineer** — adiciona domínio, queries, ingestão, ADRs, infra.

2. Engineer declara explicitamente em `~/.zshrc`:

   ```bash
   export BAV_CLAUDE_ROLE=engineer
   ```

3. Leia o onboarding correspondente:
   - `docs/ONBOARDING-DESIGNER.md`
   - `docs/ONBOARDING-ENGINEER.md`

4. Para entender quem pode tocar o quê, leia `docs/ROLES.md`.

## Subdiretórios

| Caminho | Conteúdo |
|---|---|
| `agents/` | Subagents (`.md` com YAML frontmatter). Hoje: `design-system-curator`. |
| `skills/` | Slash commands. Hoje: 6 (`add-primitive`, `design-token-check`, `visual-qa`, `plan-sprint`, `new-adr`, `release-notes`). |
| `hooks/` | Hooks shell (PreToolUse / PostToolUse). Hoje: 3 hooks + 2 libs + matriz de teste. |
| `docs/` | Onboarding humanos + `ROLES.md`. |
| `settings.json` | Permissions (deny + allow) + bindings dos hooks. |
| `settings.local.json.example` | Template do override local. |

## Como invocar

- **Skill**: digite `/<nome>` no chat. Exemplo: `/add-primitive popover`.
- **Subagent**: invocado automaticamente quando o pedido casar com a
  description do agent (e.g. "adiciona uma primitiva nova" dispara
  `design-system-curator`), ou explicitamente via Agent tool em
  invocação avançada.
- **Hook**: roda automaticamente em eventos relevantes (Edit, Write,
  Bash `git commit`). Não precisa fazer nada — eles aparecem quando
  necessários.

## Como contribuir com novos componentes

Cada PR que adiciona um agent/skill/hook deve:

- Documentar no corpo o **problema concreto observado** que justifica
  a adição (ADR-019: gargalo concreto antes da peça nova).
- Incluir teste empírico em sessão real, output literal copiado.
- Validar impacto em ambos os roles quando aplicável.

Convenções para hooks: `__tests__/test-hooks.sh` precisa cobrir o novo
caso na matriz determinística antes do merge. Skills > 200 linhas em
SKILL.md viram subagent dedicado (regra registrada em
`docs/ONBOARDING-ENGINEER.md`).

## Permissões — modelo

`settings.json` segue **deny aggressive, allow minimal**:

- **Deny**: destrutivos (`sudo`, `rm -rf`, `git push --force`), deploy
  (`cf:deploy`, `wrangler deploy`, `db:push`), edição em paths sensíveis
  (`.env*`, `.github/workflows/**`, `src/shared/db/migrations/**`).
- **Allow**: scripts npm de dev/build/test, git ops em branches feature,
  `gh pr/issue/workflow`, `npx shadcn add`.

Comandos não-listados pedem confirmação interativa do usuário.

## Referências canônicas

- `CLAUDE.md` (raiz) — princípios e regras do projeto.
- `docs/architecture/ADR/019-disciplina-arquitetural-sem-gargalo.md`
  — gate de evidência (vale também dentro do `.claude/`).
- `docs/architecture/ADR/021-design-system-shadcn-curado.md`
  — consumido por `agents/design-system-curator.md`.
- `docs/contributing/BRANCH-PROTECTION.md` — main protection vigente.
- `docs/contributing/CODEOWNERS` — revisão obrigatória por área.
