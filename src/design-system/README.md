# Design System — Brasil a Vera

> Wave 4 (Sprint 4.0+) · Governança em [ADR-021](../../../docs/architecture/ADR/021-design-system-shadcn-curado.md)

Diretório que centraliza o design system do produto: tokens semânticos,
primitivas shadcn-curadas e composições reutilizáveis.

## Estrutura

```
src/design-system/
├── tokens/         # Mapas TS tipados dos tokens (apontam para CSS vars)
│   ├── colors.ts
│   ├── radii.ts
│   ├── shadows.ts
│   ├── motion.ts
│   └── index.ts
├── primitives/     # Componentes shadcn-curados (Sprint 4.0 PR 3+)
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
├── compositions/   # Padrões visuais sem domínio (Sprint 4.1+)
│   ├── stats-grid.tsx
│   ├── filter-bar.tsx
│   └── ...
└── __tests__/
    └── import-boundaries.test.ts
```

## Quando usar cada camada

| Camada | Quando usar | Importa de |
|---|---|---|
| `tokens/` | Você quer um valor de design (cor, raio, sombra) em um componente custom | nada do projeto (só libs externas) |
| `primitives/` | Você precisa de um Button, Card, Badge, Input etc. | `tokens/`, `lib/cn` |
| `compositions/` | Você precisa de um padrão visual repetível sem domínio (Hero, StatsGrid) | `tokens/`, `primitives/`, `lib/cn` |
| `src/components/<contexto>/` | Você precisa de algo que sabe de domínio (`ParlamentarCard`, `VotoBadge`) | `design-system/`, `lib/queries/`, etc. |

## Regra de import boundary

`src/design-system/` é **folha** do grafo interno — não importa de:

- `src/components/<contexto>/*` (componentes de domínio)
- `src/lib/queries/*` (acesso a banco)
- `src/modules/*` (bounded contexts)
- `src/shared/db/*` (DB connection)

A regra é verificada por:

1. **Vitest test** em `src/design-system/__tests__/import-boundaries.test.ts`
   (executado em `npm run test` e CI). Falha o build se um arquivo de
   `design-system/**` importar de paths proibidos.
2. **Biome `noRestrictedImports`** (configurado em `biome.json` se a versão
   suportar regra contextual por path; caso contrário documentada como
   lacuna no `biome.json` e coberta pelo teste Vitest).

## Por que essa separação importa

- **Reusabilidade**: primitivas e composições não conhecem domínio →
  funcionam em qualquer feature futura.
- **Testabilidade**: testar uma primitiva não exige mock de DB.
- **Bundle**: tree-shake confiável (sem grafo cíclico com lib/queries).
- **Substitubilidade**: se um dia trocarmos shadcn por outra base, só
  `design-system/primitives/` muda — `components/<contexto>/` continua
  funcionando.

## Como adicionar uma nova primitiva

Processo curado por componente (ADR-021 §3):

```bash
# 1. Identificar consumer concreto da Wave 4 (sprint X.Y).
#    Sem consumer real, não copia (princípio leve do ADR-019).
# 2. Copiar via CLI:
npx shadcn@latest add <componente>
# 3. Adaptar tokens:
#    - Trocar `bg-primary text-primary-foreground` (default shadcn)
#      por `bg-brand text-brand-foreground` (nossos tokens).
#    - Importar `cn` de `@/lib/cn`, não o do shadcn template.
# 4. Smoke test:
#    - Criar src/design-system/primitives/<componente>.test.tsx
#    - Renderizar variantes-chave + verificar focus ring.
# 5. Bundle delta no PR:
#    - Antes/depois com `npm run build`. Registrar no corpo do PR.
# 6. Commit isolado:
#    git commit -m "feat(ds): add <componente> primitive"
# 7. QA visual em /dev/design (rota interna, PR 7 da Sprint 4.0).
```

## Tokens dispobíveis

Ver `tokens/colors.ts`, `tokens/radii.ts`, `tokens/shadows.ts`, `tokens/motion.ts`.

Valores literais (OKLCH, raios, durações) em `src/app/globals.css`.
Auditoria WCAG em `docs/architecture/WCAG-AUDIT.md`.
Documento canônico de design em `docs/design/DESIGN-TOKENS.md`.
