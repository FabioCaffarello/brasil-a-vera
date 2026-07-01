---
name: design-token-check
description: |
  Análise estática (grep) que flagra classes legacy zinc, HEX inline e
  bg-primary-\d+ no design system. Diagnóstico não-bloqueante; aponta
  arquivos por categoria. Use antes de abrir PR com mudanças visuais,
  e quando o usuário perguntar "tem token legacy aqui?".
source_tool: claude
source_path: .claude/skills/design-token-check/SKILL.md
imported_at: 2026-07-01T05:01:16.618Z
ai_context_version: 1.1.1
---

Execute as três checagens abaixo em paralelo usando a ferramenta `Bash`
e produza uma tabela final consolidada.

## Filtro comum: ignorar comentários JSDoc

Todos os greps abaixo filtram linhas que começam com `*`, `//`, `/*`
após `:` (formato `<file>:<line>:<content>` de `grep -rEn`).
Documentação histórica em JSDoc que cita classes legacy NÃO é
violação — só renderização efetiva.

Aplique este filtro em todos os greps via pipe:

```bash
| grep -vE ':\s*(//|\*|/\*)'
```

## Checagem 1 — zinc legacy

Procurar `bg-zinc-\d+`, `text-zinc-\d+`, `border-zinc-\d+` em qualquer
`.tsx` ou `.css` do projeto, **excluindo comentários**:

```bash
grep -rEn 'bg-zinc-[0-9]+|text-zinc-[0-9]+|border-zinc-[0-9]+' \
  --include='*.tsx' --include='*.css' \
  src/ 2>/dev/null \
  | grep -vE ':\s*(//|\*|/\*)' \
  || echo "ZINC: clean"
```

## Checagem 2 — HEX inline no design system / componentes

Procurar `#[0-9a-fA-F]{3,8}` literais em `src/design-system/**` e
`src/components/**` (excluindo `.test.tsx`, comentários JSDoc, **e
references a issues do GitHub** no formato `#NNN` onde NNN é decimal):

```bash
grep -rEn '#[0-9a-fA-F]{3,8}' \
  --include='*.tsx' --include='*.ts' --include='*.css' \
  --exclude='*.test.tsx' --exclude='*.test.ts' \
  src/design-system/ src/components/ 2>/dev/null \
  | grep -vE ':\s*(//|\*|/\*)' \
  | grep -vE '#[0-9]+([^0-9a-fA-F]|$)' \
  || echo "HEX: clean"
```

Cor HEX legítima tem 3, 6 ou 8 chars hex misturando a-f. Issue refs
(`#149`, `#170`) são todas decimais e são removidas pelo segundo
`grep -v`.

## Checagem 3 — bg-primary-XX no design system

`bg-primary-XX` (escala numérica zinc-style) deveria ter virado
`bg-brand` em `src/design-system/**`:

```bash
grep -rEn 'bg-primary-[0-9]+|text-primary-[0-9]+|border-primary-[0-9]+' \
  --include='*.tsx' --include='*.ts' \
  src/design-system/ 2>/dev/null \
  | grep -vE ':\s*(//|\*|/\*)' \
  || echo "PRIMARY-N IN DS: clean"
```

## NÃO flagrar

- `--color-primary` em `.css` é CSS variable legítima do tema. Não
  reportar.
- Cores HEX em arquivos `.test.tsx` / `.test.ts` (fixtures).
- HEX em arquivos `docs/**/*.md` ou JSDoc dentro de `.tsx`
  (documentação histórica).

## Saída esperada

Tabela markdown com 3 colunas:

| Padrão | Arquivos com matches | Total |
|---|---|---|
| `bg/text/border-zinc-\d+` | <lista> | N |
| `#HEX` em DS/components | <lista> | N |
| `bg/text/border-primary-\d+` em DS | <lista> | N |

Se total = 0 em uma categoria, escreva "Clean ✓".

## Veredito

- **Tudo clean** → "Design tokens OK. Pode abrir PR."
- **Algum match** → liste arquivos + linhas + sugestão de token correto
  (com base na tabela do `design-system-curator`).
