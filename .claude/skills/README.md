# .claude/skills/ — skills

> Placeholder do PR 1. Skills entram nos PRs 6 e 7 da Sprint 5.0.

Skills são instruções reutilizáveis invocáveis por `/<nome>` no chat
ou referenciadas em natural language. Cada skill mora em
`skills/<nome>/SKILL.md` com frontmatter YAML mínimo (`name`,
`description`, `args` opcional).

## Skills previstas para a Sprint 5.0

| Slash | Função | PR |
|---|---|---|
| `/add-primitive` | Wrapper sobre `design-system-curator` para adicionar primitiva shadcn | PR 6 |
| `/design-token-check` | Grep dos padrões legacy (zinc, HEX inline, `bg-primary-\d+` em design-system/) | PR 6 |
| `/visual-qa` | Roteiro interativo de QA visual antes do PR | PR 6 |
| `/plan-sprint` | Esqueleto do plano de sprint no formato consolidado das Waves 3-4 | PR 7 |
| `/new-adr` | Criar ADR seguindo o template + próximo número sequencial | PR 7 |
| `/release-notes` | Gerar release notes no padrão `v0.4-final-public.md` a partir de `git log` agrupado por sprint | PR 7 |

## Quando adicionar skill nova

Quando um fluxo se repetiu 3+ vezes na operação real e a economia de
contexto justificar formalizar. Antes disso, é instrução solta no chat.
