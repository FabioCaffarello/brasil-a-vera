# .claude/skills/ — skills

Skills são instruções reutilizáveis invocáveis por `/<nome>` no chat
ou referenciadas em natural language. Cada skill mora em
`skills/<nome>/SKILL.md` com frontmatter YAML mínimo (`name`,
`description`, `args` opcional). Ativas desde a Sprint 5.0.

## Skills ativas

| Slash | Função |
|---|---|
| `/design-token-check` | Grep dos padrões legacy (zinc, HEX inline, `bg-primary-\d+` em design-system/) |
| `/visual-qa` | Roteiro interativo de QA visual antes do PR |
| `/new-adr` | Criar ADR seguindo o template + próximo número sequencial |
| `/release-notes` | Gerar release notes a partir de `git log` agrupado por sprint |

> `/add-primitive` e `/plan-sprint` foram removidas. Gap de primitiva vai
> como issue no RDS upstream (ADR-038). Planejamento de sprint usa o
> workflow PREVC do dotcontext (`dotcontext admin workflow init`).

## Skills built-in dotcontext (não duplicar aqui)

`commit-message`, `pr-review`, `code-review`, `test-generation`,
`documentation`, `refactoring`, `bug-investigation`, `feature-breakdown`,
`api-design`, `security-audit` — disponíveis nativamente via dotcontext.

## Quando adicionar skill nova

Quando um fluxo se repetiu 3+ vezes na operação real e a economia de
contexto justificar formalizar. Antes disso, é instrução solta no chat.
