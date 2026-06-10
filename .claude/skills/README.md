# .claude/skills/ — skills

Skills são instruções reutilizáveis invocáveis por `/<nome>` no chat
ou referenciadas em natural language. Cada skill mora em
`skills/<nome>/SKILL.md` com frontmatter YAML mínimo (`name`,
`description`, `args` opcional). Ativas desde a Sprint 5.0.

## Skills ativas

| Slash | Função |
|---|---|
| `/add-primitive` | Wrapper sobre `design-system-curator` para adicionar primitiva curada |
| `/design-token-check` | Grep dos padrões legacy (zinc, HEX inline, `bg-primary-\d+` em design-system/) |
| `/visual-qa` | Roteiro interativo de QA visual antes do PR |
| `/plan-sprint` | Esqueleto do plano de sprint (draft em `docs/design/`) |
| `/new-adr` | Criar ADR seguindo o template + próximo número sequencial |
| `/release-notes` | Gerar release notes a partir de `git log` agrupado por sprint |

## Quando adicionar skill nova

Quando um fluxo se repetiu 3+ vezes na operação real e a economia de
contexto justificar formalizar. Antes disso, é instrução solta no chat.
