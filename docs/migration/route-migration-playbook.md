# Playbook de migração rota-a-rota — brasil-a-vera × RDS

> Destilado da rota piloto `/rds/partidos/[sigla]`. Versionado para que
> migrações subsequentes reusem o mesmo processo, sem redescobrir.

## Princípios

1. **Strangler fig por rota.** A rota migrada vive sob `/rds/<caminho>/`
   em paralelo com a original. A promoção (substituir a rota original) é
   decisão futura, depois de confiança visual + comportamental.
2. **Originais intocados na piloto.** Componentes de produção compartilhados
   são DUPLICADOS sob `_components/` da rota piloto. Política de
   espelhamento + consolidação em `docs/migration/consolidation-debt.md`.
3. **Fonte única de cor: a tabela canônica.** `docs/migration/token-map.md`
   é a fonte única de tradução. Nenhuma cor sai da prop `colorRole/colorShade`
   do `<Text>` do RDS — sempre via classe Tailwind traduzida.
4. **`<Text>` é typography, não cor.** Usar `<Text variant="X">` só quando
   o variant cobre TODA a typography sem override pesado (regra dura: 0–1
   override → `<Text>`; 2+ → HTML cru com classes traduzidas).
5. **Zero-JS para rotas anônimas (ADR-022).** Importar apresentacionais
   APENAS de `@fabio.caffarello/react-design-system/server`. Interativos
   vão sob client boundary explícito quando necessário.

## Passo a passo da migração

### Passo 0 — Decidir o caminho e o escopo

- Estrutura proposta: `src/app/rds/<caminho>/page.tsx` com
  `_components/` co-localizado (convenção de pasta privada — `_` evita
  roteamento). Espelha 1:1 a rota original para comparação lado a lado.
- Defense-in-depth `noindex` já cobre tudo sob `/rds/*`:
  - `metadata.robots` no `src/app/rds/layout.tsx`.
  - `X-Robots-Tag` em `next.config.ts` (matcher `/rds/:path*`).
  - `/rds/` em `PRIVATE_PATHS` de `src/app/robots.ts`.
- Listar os componentes que a rota usa, classificar pela matriz
  (`docs/migration/migration-matrix.md`) e mapear o que duplica (cat. 4)
  vs o que consome direto do RDS (cat. 1, 2 com gap pequeno).

### Passo 1 — Tabela canônica de tokens (consultar, não recriar)

- Use `docs/migration/token-map.md`. Não traduza ad-hoc.
- Se aparecer um token não previsto na tabela, PARE, adicione com prova
  de valor (HEX de ambos os lados), e só então continue.

### Passo 2 — Duplicar e traduzir cada componente

Para cada componente domain-coupled (cat. 4):

1. Copiar `src/components/<área>/<nome>.tsx` para
   `src/app/rds/<caminho>/_components/<nome>.tsx`.
2. Original NÃO mexer.
3. Traduzir classnames SOMENTE pela tabela canônica.
4. Substituir HTML cru por `<Text>` quando a regra dura permitir (≤1
   override de typography).
5. `<Card>` do `/server` quando o componente é wrapper de conteúdo
   (border + bg + padding) — esperar pequena diferença de padding
   (`p-4` vs `p-5`); registrar se acumular.
6. Para Server Components puros sem hooks (o caso comum na piloto), NÃO
   adicionar `'use client'`. Manter zero-JS.

### Passo 3 — Reconstruir o `page.tsx`

- Lógica de queries, params, `generateMetadata`, `dynamic` preservados.
- Helpers locais (`<Section>` na piloto) reconstruídos com primitivas RDS
  (`<Card>` + `<Text>` + HTML cru onde a regra exige).
- **Chrome (Navbar/Footer/Toaster) vem do root layout** por composição
  nested — NÃO importar no `page.tsx`. A rota `/rds/<X>` herda o
  `RootLayout` automaticamente; o `RdsStagingLayout` só adiciona wrapper
  + noindex.

### Passo 4 — Validar

- `npm run build` — TS + build de produção limpos.
- `npm run check` — Biome limpo.
- `npm run dev` + curl da rota migrada e da original lado a lado.
- **Chunk client do RDS AUSENTE** no HTML da rota migrada (`grep -oE
  'src="[^"]+\.js"' rota.html | grep fabio` → vazio). Se aparecer,
  algum import veio do entry `.` sem necessidade — revisar.
- Comparar markup: `<h1>`, helper `<Section>`, classes principais.

### Passo 5 — Registrar dívida + abrir PR

- Adicionar pares cópia-rds em `docs/migration/consolidation-debt.md`.
- Notas de correção à matriz (omissões descobertas) idem.
- PR convencional: `feat(rds): migrar /<rota> sob /rds/ (piloto-N)`.
- Não promover a rota — convive em paralelo.

## Regra-resumo das traduções (cheat-sheet)

Da tabela canônica + regra de aplicação:

```
text-foreground         →  text-fg-primary
text-foreground-muted   →  text-fg-tertiary    (não fg-secondary)
text-foreground-subtle  →  text-fg-quaternary
text-success            →  text-fg-success
text-warning            →  text-fg-warning

bg-background           →  bg-surface-canvas
bg-surface              →  bg-surface-base
bg-surface-elevated     →  bg-surface-raised

border-border           →  border-line-default
border-border-strong    →  border-line-emphasis (não line-strong)
ring-ring               →  ring-line-focus      (focus mais sombrio — aceito até issue do resíduo --primary)
```

E a regra de uso do `<Text>`:

```
0–1 override de typography → <Text variant="X" className="text-fg-Y">
2+ overrides                → HTML cru <p|h1|h2|span> className="..."

Variant ↔ size+weight do RDS:
- caption    → text-xs leading-normal font-normal
- bodySmall  → text-sm leading-relaxed font-normal
- body       → text-base leading-relaxed font-normal
- bodyLarge  → text-lg leading-relaxed font-normal
- label      → text-sm leading-normal font-medium
- heading    → text-3xl leading-tight font-bold (renderiza <h2> por default)
```

## Observações operacionais da piloto

- **Chrome herdado do root layout** elimina a necessidade de importar
  Navbar/Footer no page.tsx. Descoberta na piloto (a hipótese inicial era
  "importar no page.tsx" — foi resolvido pela composição nested).
- **`p-4` (Card RDS) vs `p-5` (original)** — pequena diferença de padding;
  sub-perceptual. Acompanhar em migrações futuras.
- **`ring-line-focus` é mais sombrio que `ring-ring`** — bloqueado pela
  issue do resíduo `--primary` no consumidor
  ([#358](https://github.com/FabioCaffarello/brasil-a-vera/issues/358)). Não bloqueia migrações; só uma marca em
  todo focus ring até o resíduo ser corrigido.

## Próximas rotas (`docs/migration/route-readiness.md`)

- `/parlamentares/[id]/gastos` (1 bloqueador N2 — `FilterChips` wrapper).
- `/feed` e `/privacidade` (0 bloqueadores — rotas textuais; pouco
  aprendizado para o esforço).
- `/sign-in`, `/sign-up` (sem componente RDS — só chrome).
- Listagens (`/parlamentares`, `/proposicoes`, `/votacoes`) — esperar
  N3 (`HeroSection`) e N7 (`StatsGrid`) fecharem upstream.
- Perfis (`/parlamentares/[id]`, etc.) — esperar N1+N4+N6.
