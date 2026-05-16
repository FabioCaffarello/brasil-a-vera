---
name: add-primitive
description: |
  Adicionar uma nova primitiva shadcn ao design system seguindo os 7
  passos do ADR-021. Argumento obrigatório: nome do componente
  (ex: accordion, popover, command). Invoca o subagent
  design-system-curator. Use quando o usuário pedir "adicione X
  primitiva" ou "copia X do shadcn".
---

Quando o usuário invocar `/add-primitive <componente>`:

## 1. Validações iniciais

Use `Glob` para verificar se a primitiva já existe em
`src/design-system/primitives/<componente>.tsx`. Se já existir:

- Pergunte ao usuário se é refactor de primitiva existente ou erro.
- Se for refactor, prossiga com o subagent normalmente.
- Se for erro, pare e mostre o caminho do arquivo existente.

Pergunte ao usuário o **consumer concreto** da primitiva:

> Antes de copiar, qual feature/rota da Wave atual vai consumir essa
> primitiva imediatamente? Sem consumer real identificado, ADR-021 §3.1
> diz não copiamos.

Se a resposta for "ainda não tem consumer, é só para o design system
ficar mais completo", recomende parar e aguardar. Exceção: teste E2E
explícito do próprio subagent (como na Sprint 5.0 PR 5).

## 2. Delegação ao subagent

Use a ferramenta `Agent` com `subagent_type=design-system-curator`,
passando contexto:

```
Adicione a primitiva <componente> ao design system. Consumer concreto:
<o que o usuário disse>. Siga os 7 passos do ADR-021.
```

O subagent vai fazer:
- npx shadcn@latest add <componente>
- Adaptar tokens (bg-popover → bg-surface-elevated, etc.)
- Importar cn de @/lib/cn
- Criar smoke test
- Medir bundle delta
- Commit isolado

## 3. Checklist final manual

Após o subagent terminar, lembre o usuário de:

- [ ] `npm run check` passa local
- [ ] `npm run test` (incluindo a primitiva nova) passa local
- [ ] Anexar bundle delta antes/depois no corpo do PR
- [ ] Abrir o PR com label `area:design-system`
- [ ] Confirmar visualmente em `/dev/design` se a primitiva estiver
      em uso já (`npm run dev`)
- [ ] Screenshot antes/depois no corpo do PR se houver consumer
      renderizando

## 4. Quando NÃO usar `/add-primitive`

- Mudanças em primitiva existente que NÃO envolvem copiar nova versão
  do shadcn: edite diretamente, sem skill.
- Componentes de domínio (`src/components/<contexto>/*`): esses não
  são primitivas — vão para o caminho de domínio, não pelo subagent.
- Composições (`src/design-system/compositions/*`): essas são código
  próprio, não shadcn — não passam pelo curator.
