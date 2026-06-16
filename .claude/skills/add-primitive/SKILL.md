---
name: add-primitive
description: |
  [DEPRECADA pelo ADR-038] Copiar uma primitiva shadcn para o design
  system local. Origem padrão de primitiva genérica agora é o RDS
  (@fabio.caffarello/react-design-system); gap vira issue upstream. Esta
  skill só serve o caso raro de gap RDS ratificado. Argumento: nome do
  componente. Invoca o subagent design-system-curator.
---

## 0. PARE — ADR-038: a origem padrão é o RDS, não o shadcn local

Esta skill foi escrita para o pipeline do [ADR-021](../../../docs/architecture/ADR/021-design-system-shadcn-curado.md)
(copiar shadcn → `src/design-system/primitives/`). O
[ADR-033](../../../docs/architecture/ADR/033-adocao-react-design-system-externo.md)
e o [ADR-038](../../../docs/architecture/ADR/038-consolidacao-primitivas-no-rds.md)
**aposentaram esse caminho**: a camada local está em deprecação ativa e a
origem de primitiva genérica é o `@fabio.caffarello/react-design-system`.

Antes de copiar qualquer coisa:

1. **Existe equivalente no RDS?** Cheque a superfície em
   `node_modules/@fabio.caffarello/react-design-system/dist/**/*.d.ts` (ou a
   lista em [`docs/migration/rds-consolidation-plan.md`](../../../docs/migration/rds-consolidation-plan.md)).
   Se existir → use o RDS direto, **não** copie. Esta skill não se aplica.
2. **Não existe?** Então é gap do RDS → **abra issue no repo do RDS** (regra
   do ADR-033), não primitiva local nova.
3. **Só prossiga com esta skill** se o owner ratificar explicitamente um motivo
   para a primitiva ficar local (gap upstream + razão técnica, ex.: wrapper de
   bundle como `rds-accordion`). Nesse caso, registre a issue upstream no
   cabeçalho do arquivo e adicione contexto ao PR.

Se nenhuma das três condições justificar a cópia, **pare aqui**.

---

Quando o usuário invocar `/add-primitive <componente>` (e o §0 autorizar):

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
