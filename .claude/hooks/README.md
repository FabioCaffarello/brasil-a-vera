# .claude/hooks/ — hooks

> Placeholder do PR 1. Hooks reais entram no PR 4 da Sprint 5.0.

Hooks são scripts shell determinísticos disparados em eventos do Claude
Code (PreToolUse, PostToolUse, etc.). Não dependem do LLM interpretar
nada — são regras enforçadas pelo runtime.

## Hooks previstos para a Sprint 5.0

| Hook | Evento | Função | PR |
|---|---|---|---|
| `pre-edit-guardrail.sh` | PreToolUse: Edit/Write/MultiEdit | Bloqueia edição em paths protegidos por role (lê `BAV_CLAUDE_ROLE`) | PR 4 |
| `pre-commit-quality.sh` | PreToolUse: Bash `git commit*` | Roda `vitest run --related` em arquivos staged TS/TSX. Husky cobre Biome. | PR 4 |
| `post-edit-tokens.sh` | PostToolUse: Edit/Write/MultiEdit | Lembrete não-bloqueante de rodar `/design-token-check` após editar UI | PR 4 |

## Convenções de hook

- **Idempotente** — o hook pode ser chamado várias vezes na mesma sessão.
- **Saída clara em PT-BR** — quem lê precisa entender por que foi
  bloqueado e como prosseguir.
- **Sem dependência de Node** — `lib/` carrega apenas shell helpers.
- **Bash test no PR** — matriz determinística de paths × roles ×
  resultado esperado, output literal copiado para a descrição.
