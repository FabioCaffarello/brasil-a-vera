# .claude/hooks/lib/ — helpers shell para hooks

Helpers reutilizáveis pelos hooks principais. Sem efeito colateral —
apenas detectam estado e exportam valores via stdout/return code.

| Arquivo | Função |
|---|---|
| `role-detect.sh` | Lê `BAV_CLAUDE_ROLE` (default `designer`) e imprime banner |
| `path-matchers.sh` | Matchers por path para cada role. Espelha a matriz em `../../docs/ROLES.md` — o caso de consistência em `../__tests__/test-hooks.sh` falha o CI se divergirem. Revisão Wave 10 (2026-05-19): migrations e workflows liberados para engineer. |
