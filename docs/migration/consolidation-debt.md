# Dívida de consolidação — cópias-rds vs originais de produção

> Branch `feat/migrate-partidos-rds-pilot` · Read-only
>
> Esta página registra os componentes duplicados sob `/rds/` durante as
> migrações rota-a-rota. Cada par é uma cópia-rds que precisará ser
> consolidada quando a rota correspondente for promovida (cópia-rds vira a
> versão única; original deletado). Enquanto isso não acontece, **mudança
> num lado precisa ser espelhada no outro** — risco de drift.

## Como ler a tabela

- **Original** vive em `src/components/...`. **Intocada** pela migração.
- **Cópia-rds** vive sob `src/app/rds/<rota>/_components/...`. É uma
  tradução do original com tokens RDS + uso seletivo do `<Text>` (regra
  em `docs/migration/token-map.md` §"Como aplicar").
- **Risco de drift**:
  - **baixo** — componente estável que não muda há sprints; pouca
    chance de divergência.
  - **médio** — lógica não-trivial ou estilo que costuma evoluir;
    qualquer PR que toque o original precisa lembrar de espelhar.
  - **alto** — lógica complexa, partilhada com outras rotas, ou
    mudança recente. **Evitar duplicar** se não for absolutamente
    necessário.

## Pares ativos

### Rota piloto — `/rds/partidos/[sigla]`

| Original | Cópia-rds | Risco | Notas |
|---|---|:---:|---|
| `src/components/partido/header.tsx` | `src/app/rds/partidos/[sigla]/_components/partido-header.tsx` | baixo | header simples (eyebrow + h1 + 2 subtítulos); typography custom no h1, demais via `<Text>` |
| `src/components/partido/bancada-list.tsx` | `src/app/rds/partidos/[sigla]/_components/bancada-list.tsx` | médio | layout de card-link com hover/focus; `<img>` cru preservado para zero-JS |
| `src/components/partido/fidelidade-media.tsx` | `src/app/rds/partidos/[sigla]/_components/fidelidade-media.tsx` | médio | **lógica de limiares de cor preservada exata** (≥80 success / ≥50 foreground / <50 warning); padrão "3 limiares" replicado em outras 3 rotas (registro na matriz) |
| `src/components/partido/top-temas.tsx` | `src/app/rds/partidos/[sigla]/_components/top-temas.tsx` | baixo | `<ol>` simples com tema + contagem |
| `src/components/partido/gasto-bancada.tsx` | `src/app/rds/partidos/[sigla]/_components/gasto-bancada.tsx` | médio | formatBRL importado; lógica de estado-vazio preservada |

Helper local `<Section>` do `page.tsx` original NÃO virou arquivo separado
nem no original nem na cópia. Na cópia-rds, foi reconstruído usando `<Card>`
do `/server` + `<Text>` para hint + `<h2>` cru para título.

### Piloto-2 — `/rds/parlamentares/[id]`

| Original | Cópia-rds | Risco | Notas |
|---|---|:---:|---|
| `src/components/parlamentar/perfil-header.tsx` | `src/app/rds/parlamentares/[id]/_components/perfil-header.tsx` | médio | estrutura semântica (header/dl) preservada; consome DataBadge/PartyBadge/TrustBadge/CompartilharButton dos ORIGINAIS (ver §"client islands") |
| `src/components/parlamentar/votos-recentes.tsx` | `src/app/rds/parlamentares/[id]/_components/votos-recentes.tsx` | médio | filtros + cursor pagination; `DistribuicaoBar` CSS-only preservada; `getTipoVotoStyle` da lib (classes BaV não traduzidas) |
| `src/components/parlamentar/alinhamento.tsx` | `src/app/rds/parlamentares/[id]/_components/alinhamento.tsx` | médio | limiares de cor exatos (≥80/≥50/<50); `Sparkline12m` SVG preservada — `text-accent`/`fill-accent` MANTIDOS (resíduo, sem equivalente RDS) |
| `src/components/parlamentar/proposicoes-autor.tsx` | `src/app/rds/parlamentares/[id]/_components/proposicoes-autor.tsx` | baixo | filtros + cursor pagination, espelho do padrão votos-recentes |
| `src/components/parlamentar/gastos-resumo.tsx` | `src/app/rds/parlamentares/[id]/_components/gastos-resumo.tsx` | médio | `GastosChart` (recharts, dynamic ssr:false) importado do original; link drill-down `text-accent` mantido (resíduo) |
| `src/components/parlamentar/afinidade-voto.tsx` | `src/app/rds/parlamentares/[id]/_components/afinidade-voto.tsx` | baixo | lista ranqueada simples |
| `src/components/parlamentar/pares-contraditorios.tsx` | `src/app/rds/parlamentares/[id]/_components/pares-contraditorios.tsx` | médio | acento warning subtle preservado; badges direção: `destructive→error` (tradução estendida piloto-2) |
| `src/design-system/compositions/section-card.tsx` | `src/app/rds/parlamentares/[id]/_components/section-card.tsx` | baixo | **reconstruída sobre Card compound do RDS 3.5.0** (asSection + Card.Title icon/badge); API local preservada |
| `src/design-system/compositions/section-nav.tsx` | `src/app/rds/parlamentares/[id]/_components/section-nav.tsx` | médio | `useScrollSpy` via entry `./hooks` (RDS 3.8.0, #205 fecha #203; +396 bytes medidos na varredura 2026-06-11) — IntersectionObserver local aposentado |

Composições substituídas por upstream SEM cópia: `KpiStrip` → `StatGroup`+`Stat`
do `/server` direto no `page.tsx` (borda externa via className; tone map
`default/muted→neutral`, `destructive→error`).

### Piloto-3 — `/rds/proposicoes/[tipo]/[numero]/[ano]`

| Original | Cópia-rds | Risco | Notas |
|---|---|:---:|---|
| `src/components/proposicao/perfil-header.tsx` | `src/app/rds/proposicoes/[tipo]/[numero]/[ano]/_components/perfil-header.tsx` | médio | badge sólido TRANSFORMADA_EM_NORMA mantém `bg-success text-success-foreground` (resíduo on-color, extensão piloto-3 do token-map) |
| `src/components/proposicao/autores-list.tsx` | `src/app/rds/proposicoes/[tipo]/[numero]/[ano]/_components/autores-list.tsx` | baixo | PartyBadge local mantido |
| `src/components/proposicao/barra-progresso-tramitacao.tsx` | `src/app/rds/proposicoes/[tipo]/[numero]/[ano]/_components/barra-progresso-tramitacao.tsx` | médio | `brand→fg-brand` (byte-idêntico pós-#358); usada também pelo ProposicaoCard da listagem — original intocado |
| `src/components/proposicao/footer-cross-links.tsx` | `src/app/rds/proposicoes/[tipo]/[numero]/[ano]/_components/footer-cross-links.tsx` | baixo | contratos de fallback exatos |
| `src/components/proposicao/temas-list.tsx` | `src/app/rds/proposicoes/[tipo]/[numero]/[ano]/_components/temas-list.tsx` | baixo | zero deps |
| `src/components/proposicao/tramitacao-timeline.tsx` | `src/app/rds/proposicoes/[tipo]/[numero]/[ano]/_components/tramitacao-timeline.tsx` | médio | filtros + cursor pagination; FilterChips local (#162) |
| `src/components/proposicao/votacoes-vinculadas.tsx` | `src/app/rds/proposicoes/[tipo]/[numero]/[ano]/_components/votacoes-vinculadas.tsx` | médio | filtros mini exatos; FilterChips local (#162) |
| `src/design-system/compositions/section-card.tsx` | `src/app/rds/proposicoes/[tipo]/[numero]/[ano]/_components/section-card.tsx` | baixo | reuso VERBATIM da cópia da piloto-2 (Card compound) |
| `src/design-system/compositions/section-nav.tsx` | `src/app/rds/proposicoes/[tipo]/[numero]/[ano]/_components/section-nav.tsx` | médio | reuso VERBATIM da cópia da piloto-2 (`useScrollSpy` via `./hooks` desde a varredura 2026-06-11) |

Client islands importados dos originais (sem cópia, precedente
piloto-2): `ApoioPartidoChart`/`VotosConsolidadosChart` (recharts,
dynamic ssr:false), `CompartilharProposicaoButton`, `TrustBadge`.
`KpiStrip` → `StatGroup`+`Stat` do `/server` direto no `page.tsx`
(tone map `STAT_TONE` no próprio arquivo).

### Piloto-4 — `/rds/votacoes/[id]`

| Original | Cópia-rds | Risco | Notas |
|---|---|:---:|---|
| `src/components/votacao/perfil-header.tsx` | `src/app/rds/votacoes/[id]/_components/perfil-header.tsx` | médio | consome DataBadge/TrustBadge/CompartilharVotacaoButton dos ORIGINAIS (precedente piloto-2); breadcrumb → `/votacoes` produção |
| `src/components/votacao/votos-resumo.tsx` | `src/app/rds/votacoes/[id]/_components/votos-resumo.tsx` | baixo | `<dl>` simples; tradução 1:1 pela tabela |
| `src/components/votacao/votos-por-partido.tsx` | `src/app/rds/votacoes/[id]/_components/votos-por-partido.tsx` | baixo | tabela; `text-brand→text-fg-brand` (extensão piloto-2, byte-idêntico) |
| `src/components/votacao/votos-individuais.tsx` | `src/app/rds/votacoes/[id]/_components/votos-individuais.tsx` | médio | client island duplicado (hrefs de filtro contidos em `/rds/`); pill ativo `bg-foreground/text-background → bg-fg-primary/text-surface-canvas` (extensão piloto-4, CP3 aprovado); `getTipoVotoStyle` da lib (classes BaV não traduzidas) |
| `src/components/votacao/rebeldes-list.tsx` | `src/app/rds/votacoes/[id]/_components/rebeldes-list.tsx` | médio | `getTipoVotoStyle` da lib; `text-foreground-subtle→fg-quaternary` |
| `src/components/votacao/proposicao-vinculada.tsx` | `src/app/rds/votacoes/[id]/_components/proposicao-vinculada.tsx` | baixo | link-card; href → `/proposicoes/...` produção |
| `src/components/votacao/footer-relacionadas.tsx` | `src/app/rds/votacoes/[id]/_components/footer-relacionadas.tsx` | médio | `bg-brand/15 → bg-fg-brand/15` (generalização `bg-brand/N` da extensão piloto-4, CP4 aprovado); links → `/votacoes/[id]` produção |
| `src/design-system/compositions/section-card.tsx` | `src/app/rds/votacoes/[id]/_components/section-card.tsx` | baixo | reuso VERBATIM da cópia das pilotos 2/3 (Card compound) |
| `src/design-system/compositions/section-nav.tsx` | `src/app/rds/votacoes/[id]/_components/section-nav.tsx` | médio | reuso VERBATIM da cópia das pilotos 2/3 (`useScrollSpy` via `./hooks` desde a varredura 2026-06-11) |

Client islands importados dos originais (sem cópia, precedente
piloto-2/3): `DisciplinaPartidariaChart`/`VotacaoPorPartidoChart`/
`VotacaoVotosConsolidadosChart` (recharts, dynamic ssr:false),
`ExportCsvLink`, `CompartilharVotacaoButton`, `TrustBadge`, `DataBadge`.
`KpiStrip` → `StatGroup`+`Stat` do `/server` direto no `page.tsx`
(tones inline: success/error/neutral).

**Checkpoints resolvidos (decisão do owner, PR piloto-4):**
`VotacaoHemicicloChart` (`src/components/votacao/charts/hemiciclo.tsx`,
SVG inline com `fill: var(--success)` etc.) e `MargemDecisaoBar`
(`src/components/votacao/margem-decisao.tsx`, barra CSS-only
`bg-success`/`bg-destructive`) permanecem **imports dos ORIGINAIS**, sem
cópia e sem tradução — mesma classe da pendência piloto-3 (cor via var
em prop/atributo). Razão: consistência cross-chart na seção Resumo
(mesmos verdes/vermelhos do donut recharts ao lado). Calibram na
promoção, junto com os charts recharts e `getTipoVotoStyle`.

### Wrappers de entry granular (varredura 3.9.0 — sem original)

| Original | Cópia-rds | Risco | Notas |
|---|---|:---:|---|
| `(novo — sem original; re-export do RDS)` | `src/app/rds/parlamentares/[id]/_components/rds-accordion.ts` | baixo | wrapper 'use client' de 1 linha: faz o import do barrel `/granular` cruzar o boundary DENTRO de módulo client (tree-shaking poda ~200 re-exports; import direto de SC custava +294KB — medição na varredura 3.9.0) |
| `(novo — sem original; re-export do RDS)` | `src/app/rds/proposicoes/[tipo]/[numero]/[ano]/_components/rds-accordion.ts` | baixo | idem (cópia verbatim) |
| `(novo — sem original; re-export do RDS)` | `src/app/rds/votacoes/[id]/_components/rds-accordion.ts` | baixo | idem (cópia verbatim) |

O Accordion Radix local (`src/design-system/primitives/accordion`)
segue em uso pelas rotas de PRODUÇÃO; as rotas `/rds/` não o consomem
mais (Accordion do RDS via wrapper desde a varredura 3.9.0).

### Pendências upstream / client islands (piloto-2)

- **Accordion mobile**: primitiva Radix LOCAL (`src/design-system/primitives/accordion`)
  mantida na rota staging. Gap reportado em
  [RDS #202](https://github.com/FabioCaffarello/react-design-system/issues/202)
  (clipping `max-h-[1000px]` + typography fixa do trigger + sem className
  por item). Swap quando fechar.
- **useScrollSpy**: pedido entry granular em
  [RDS #203](https://github.com/FabioCaffarello/react-design-system/issues/203)
  com medição literal (+277.593 bytes no chunk da rota, +29% de JS).
- **FilterChips**: composição local consumida pelas cópias (votos +
  proposições). Upstream [RDS #162](https://github.com/FabioCaffarello/react-design-system/issues/162) aberta.
- **Client islands compartilhados, importados dos originais (sem tradução
  neste PR)**: `TrustBadge`, `CompartilharButton`, `GastosChart`
  (recharts). Tokens BaV internos; traduzir na promoção ou quando o RDS
  cobrir os respectivos padrões.
- **`getTipoVotoStyle`** (`src/lib/format.ts`): retorna classes BaV
  (`bg-success/20 text-success` etc.) consumidas pelas cópias. Lógica de
  domínio única — NÃO duplicada; classes traduzem na promoção.

## Política de espelhamento (enquanto a dívida existir)

1. **Modificar o original** (`src/components/partido/*.tsx`) sem espelhar:
   o original muda em produção, a cópia-rds não. Aceitável a curto prazo
   (a rota /rds/ é staging, não produção).
2. **Modificar a cópia-rds** sem espelhar: deformação na rota staging que
   não reflete a real. Evitar — qualquer ajuste descoberto na piloto
   deveria virar PR de consolidação ou ser portado pro original.
3. **Mudança estrutural** (rename, prop change): PARAR a migração e
   reavaliar — pode ser sinal de que a estratégia de duplicação esgotou
   sua utilidade para essa peça.

## Consolidação (quando uma rota é promovida)

Promoção = rota `/rds/X` substitui a rota `/X` em produção. No momento da
promoção:

1. Mover o conteúdo do `_components/` da rota piloto para o local de
   produção (`src/components/<área>/`).
2. Deletar o original.
3. Atualizar os imports nos demais consumidores (se houver — o usual é
   que cópias-rds só sirvam à rota piloto).
4. Rodar build + dev para confirmar.
5. Remover a entrada desta tabela.

## Observações da rota piloto

- **`BancadaList` não estava catalogada na matriz** (omissão herdada do
  inventário em `docs/migration/component-inventory.md`). Registrar como
  nota de correção na matriz (ver §"correções pendentes").
- **`p-5` vs `p-4` no Card**: o original usa `p-5` (20px); o `<Card>` do
  RDS com `padding="medium"` (default) renderiza `p-4` (16px). Diferença
  de 4px — sub-perceptual. Aceito. Se acumular nas migrações futuras,
  considerar passar `padding="large"` (renderiza `p-6` = 24px, ligeiramente
  maior) ou trocar `<Card>` por `<div>` cru com classes traduzidas.

## Correções pendentes à matriz

- **`BancadaList`** (`src/components/partido/bancada-list.tsx`): cat. 4
  (domain-coupled — `PartidoMembro` no contrato). Usos: 1 arquivo / 1 site
  (`/partidos/[sigla]`). Estilo: Tailwind com tokens semânticos do BaV
  (`bg-surface`, `border-border{,-strong}`, `text-foreground{,-muted}`,
  `ring-ring`).

Adicionar na próxima atualização de `docs/migration/migration-matrix.md`.
