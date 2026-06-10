<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Brasil a Vera — contrato do projeto

Este repositório tem instruções próprias além das regras Next.js acima.
Agente que lê apenas `AGENTS.md` entra cego num repo com guard-rails por
role; trate `CLAUDE.md` como fonte canônica de instruções:

- [`CLAUDE.md`](CLAUDE.md) — princípios de código, disciplina de custo
  (Neon serverless), comandos e regras de operação. Leia antes de
  qualquer mudança.
- [`.claude/README.md`](.claude/README.md) — ecossistema Claude Code
  (skills, hooks, agents) e modelo de permissões.
- [`.claude/docs/ROLES.md`](.claude/docs/ROLES.md) — matriz role × path
  aplicada automaticamente por hooks (`BAV_CLAUDE_ROLE`).
- [`docs/README.md`](docs/README.md) — índice da documentação completa.
