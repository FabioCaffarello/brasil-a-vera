# .claude/hooks/lib/ — helpers shell para hooks

> Placeholder do PR 1. Helpers reais entram no PR 4 da Sprint 5.0.

Helpers reutilizáveis pelos hooks principais. Sem efeito colateral —
apenas detectam estado e exportam valores via stdout/return code.

| Arquivo | Função | PR |
|---|---|---|
| `role-detect.sh` | Lê `BAV_CLAUDE_ROLE` (default `designer`) e imprime banner | PR 4 |
| `path-matchers.sh` | Matchers por path para cada role (allowlist/denylist) | PR 4 |
