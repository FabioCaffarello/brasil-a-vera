# .claude/hooks/ — hooks

Hooks são scripts shell determinísticos disparados em eventos do Claude
Code (PreToolUse, PostToolUse, etc.). Não dependem do LLM interpretar
nada — são regras enforçadas pelo runtime. Ativos desde a Sprint 5.0.

## Hooks ativos

| Hook | Evento | Função |
|---|---|---|
| `pre-edit-guardrail.sh` | PreToolUse: Edit/Write/MultiEdit | Bloqueia edição em paths protegidos por role (lê `BAV_CLAUDE_ROLE`; matriz em `../docs/ROLES.md`) |
| `pre-commit-quality.sh` | PreToolUse: Bash `git commit*` | Roda `vitest run --related` em arquivos staged TS/TSX. Husky cobre Biome. |
| `post-edit-tokens.sh` | PostToolUse: Edit/Write/MultiEdit | Lembrete não-bloqueante de rodar `/design-token-check` após editar UI |

A matriz determinística vive em `__tests__/test-hooks.sh` e inclui o
caso de consistência ROLES.md ↔ `lib/path-matchers.sh` — roda no CI
(job `quality` do `ci.yml`) em todo PR, além de manualmente.

## Convenções de hook

- **Idempotente** — o hook pode ser chamado várias vezes na mesma sessão.
- **Saída clara em PT-BR** — quem lê precisa entender por que foi
  bloqueado e como prosseguir.
- **Sem dependência de Node** — `lib/` carrega apenas shell helpers.
- **Bash test no PR** — matriz determinística de paths × roles ×
  resultado esperado, output literal copiado para a descrição.
