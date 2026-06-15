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

### Rota piloto — `/rds/partidos/[sigla]` — ✅ PROMOVIDA

> **3ª promoção (2026-06-13 — route-readiness §3.21): a 1ª rota RICA
> consolidada.** Os 5 `_components/` traduzidos viraram os
> `src/components/partido/*` de produção (`partido-header` → `header`;
> esses componentes são usados só por esta rota — sobrescrever foi
> seguro), `src/app/partidos/[sigla]/page.tsx` recebeu o corpo RDS
> (Card/Text/Section), e o staging `src/app/rds/partidos/` foi
> removido. Helper `<Section>` segue inline na page (Card do `/server`).
> Dívida desta rota quitada — pares retirados da tabela. Sub-mecanismo
> validado: promoção de rota **com `_components/`** (mover para
> `src/components/`, ajustar imports `./_components/` → `@/components/`,
> deletar staging).

### Piloto-2 — `/rds/parlamentares/[id]` — ✅ PROMOVIDA (2026-06-15)

11ª promoção (1º perfil). Os 7 `_components/` de domínio (perfil-header,
votos-recentes, alinhamento, proposicoes-autor, gastos-resumo, afinidade-voto,
pares-contraditorios) sobrescritos pelas versões RDS verificadas em
`@/components/parlamentar/*` (sem hrefs/imports relativos a des-stagear).
`section-card` já-RDS; **`section-nav` canonicalizado** (overwrite com a versão
`useScrollSpy` do `/hooks` — API idêntica, cross-3-perfis). **`rds-accordion`**
(wrapper client p/ o Accordion do RDS via `/granular`) movido p/
`@/design-system/primitives/rds-accordion`. Página: `KpiStrip`→`Stat`/`StatGroup`
do `/server`. `GastosChart` (recharts) sobe como resíduo BaV (ADR-034 §5). QA
Playwright (0 erros; header/KPIs/section-nav/seções). Staging removido.

### Piloto-3 — `/rds/proposicoes/[tipo]/[numero]/[ano]` — ✅ PROMOVIDA (2026-06-15)

12ª promoção (2º perfil). Os 6 `_components/` de domínio (perfil-header,
autores-list, footer-cross-links, temas-list, tramitacao-timeline,
votacoes-vinculadas) sobrescritos pelas versões RDS verificadas em
`@/components/proposicao/*`. `barra-progresso`/`section-card`/`section-nav`/
`rds-accordion` já-RDS/canônicos (listagem/perfil parlamentar) → cópias
deletadas. Página: `KpiStrip`→`Stat`/`StatGroup` do `/server`. Charts
(`ApoioPartidoChart`, `VotosConsolidadosChart` donut) sobem como resíduo BaV
(ADR-034 §5; donut com o fix #303/#304 da Fase C #408). QA Playwright (perfil
renderiza, 0 erros; dado de votos consolidados esparso → donut não exercitado,
fix guard-verificado). Staging removido.

### Piloto-4 — `/rds/votacoes/[id]` — ✅ PROMOVIDA (2026-06-15)

13ª promoção (3º e último perfil; rota mais data-viz-heavy). Os 7 `_components/`
de domínio (perfil-header, votos-resumo, votos-por-partido, votos-individuais,
rebeldes-list, proposicao-vinculada, footer-relacionadas) sobrescritos pelas
versões RDS verificadas em `@/components/votacao/*`; `section-card`/`section-nav`/
`rds-accordion` já-canônicos (pilotos 2/3) → cópias deletadas. Página:
`KpiStrip`→`Stat`/`StatGroup` do `/server`. Data-viz sobe como resíduo BaV
(ADR-034 §5): hemiciclo SVG (`fill: var(--success)` etc.), `MargemDecisaoBar`
CSS-only e 3 charts recharts (disciplina/por-partido/donut consolidados). QA
Playwright a 1280px: perfil renderiza completo (`docH` 8928px), hemiciclo com
fatias coloridas, 0 erro de console, 0 fill preto. **Surfou o bug de
cascade-layer do bridge** (#416, ADR-034 §6): o QA de desktop revelou
`hidden sm:block` colapsado para `display:none` (miolo do perfil invisível) —
corrigido em PR separado antes desta promoção. Staging removido.

### Piloto-5 — `/rds/privacidade` + `/rds/feed` (pares em nível de página)

Rotas textuais sem componentes de domínio em `src/components/` — os
helpers locais (`Section`, `ContactLink`, `FeedGroup`) vivem DENTRO do
`page.tsx` e foram reconstruídos inline na cópia (precedente piloto-1:
helper local não vira arquivo separado). Sem `_components/`, o
espelhamento é em nível de página — os pares abaixo dão ao guard a
mesma vigilância de drift das checagens 1/2:

| Original | Cópia-rds | Risco | Notas |
|---|---|:---:|---|

> **`/privacidade` e `/feed` PROMOVIDAS** (1ª e 2ª promoções,
> 2026-06-13 — ver route-readiness §3.21): as cópias `/rds/privacidade`
> e `/rds/feed` foram consolidadas em produção (tokens RDS) e os
> stagings removidos. Pares retirados da tabela — a seção piloto-5 está
> totalmente quitada.

### Piloto-6 — `/rds/parlamentares/[id]/gastos` — ✅ PROMOVIDA (2026-06-14)

Promovida ao RDS (4ª promoção; 1ª da fase de promoção das rotas ricas).
A página de produção `src/app/parlamentares/[id]/gastos/page.tsx` recebeu o
corpo RDS (tokens da tabela canônica; `FilterChips`/`Label` do `/server`;
`FilterChip` item local) com des-staging (base href, back-link e form
`action` em `/parlamentares/...`; title sem `(rds-pilot)`). Staging
`src/app/rds/parlamentares/[id]/gastos/` removido — par retirado da tabela.

### Onda HeroSection #1 — `/rds/parlamentares` (listagem) — ✅ PROMOVIDA (2026-06-14)

5ª promoção (1ª listagem rica). `parlamentar-card` e `filtros` canonicalizados
in-place em produção (tokens RDS pela tabela canônica, hrefs de produção;
`FilterChips`/`Label` do `/server`, `FilterChip` item de `@/design-system`,
`bg-accent` residue preservado no AlinhamentoStrip). A página recebeu o corpo RDS
des-staged (`HeroSection` + `Stat`/`StatGroup` do `/server`; imports canônicos;
href "Limpar" em `/parlamentares`; title sem `(rds-pilot)`). As 5 cópias em
`_components/` + a página staging removidas — pares retirados da tabela.
`button`/`empty-state`/`filter-chip` já eram RDS em produção (Fase B); cópias só
deletadas.

### Onda HeroSection #2 — `/rds/proposicoes` (listagem) — ✅ PROMOVIDA (2026-06-14)

6ª promoção (2ª listagem). `proposicao-card` e `barra-progresso-tramitacao`
canonicalizados in-place (tokens RDS; resíduos `bg-success`/`text-success-foreground`
do badge TRANSFORMADA_EM_NORMA + `bg-success/N` preservados; hrefs de produção);
`filtros` adota RDS `FilterChips`/`Label` do `/server`. Página com `HeroSection` +
`StatGroup cols=4` (com `hint`) do `/server`. Cópias `_components/` + staging
removidas — pares retirados. `button`/`empty-state`/`filter-chip` já-RDS (Fase B).

### Onda HeroSection #3 — `/rds/votacoes` (listagem) — ✅ PROMOVIDA (2026-06-14)

7ª promoção (3ª e última listagem; fecha o trio). `votacao-card` canonicalizado
in-place (badges `bg-success/20 text-fg-success` e `bg-error/20 text-fg-error`;
href de produção); `filtros` adota RDS `FilterChips`/`Label` do `/server`. Página
com `HeroSection` + `StatGroup cols=4` do `/server`; `alternates` RSS →
`/feed/votacoes`. Cópias `_components/` + staging removidas — pares retirados.

### Onda HeroSection #4 — `/rds/busca` (busca cruzada) — ✅ PROMOVIDA (2026-06-15)

8ª promoção. Reusa os 3 cards já canonicalizados (listagens). Canonicalizados
neste PR: `input` (primitivo, tokens RDS in-place) e **`section-card`**
(`@/design-system/compositions` — sobrescrito com a versão RDS Card compound;
API idêntica → afeta home/comparar/perfis sem quebrar, convergência antecipada).
`search-form` (`@/components/busca`) só trocou o token do ícone
(`text-foreground-subtle→fg-quaternary`); action/imports já eram de produção.
Página com `HeroSection` do `/server` (3 estados); callout do match exato mantém
`border-success/40 bg-success/10` + `text-fg-success`; cross-link → `/proposicoes/...`.
Staging removido — pares retirados.

### Onda HeroSection #5 — `/rds/comparar` (comparativo lado a lado) — ✅ PROMOVIDA (2026-06-15)

9ª promoção. `concordancia-matrix` (3 limiares de cor success/fg/warning — não é
data-viz, mesmo padrão AlinhamentoBancada) e `parlamentares-grid` canonicalizados
in-place; `section-card` já-RDS (busca #4). Página com `HeroSection` do `/server`;
`ErrorState` helper local inline (`text-fg-warning` + `border-warning/40
bg-warning/10` BaV neutralizado). Staging removido — pares retirados.

### Onda HeroSection #6 — `/rds/home` (home `/`) — ✅ PROMOVIDA (2026-06-15)

10ª promoção (a rota mais visível). `kpi-card` (KpiCard local mantido — opção A:
o Stat do RDS não tem slot p/ o `floatingBadge` do TrustBadge L1; candidato a
issue upstream), `card` (primitivo shadcn — Card compound do RDS não cobre a
API), `card-parlamentares`/`card-votacoes-semana`/`features-grid` canonicalizados
in-place; `section-card`/`button` já-RDS. Página com `HeroSection` do `/server`
(slot `kpis`); `DataBadge`/`TrustBadge` mantidos (resíduo accent / client island).
`dynamic='force-dynamic'` preservado. Staging removido — pares retirados.

### Migração painel — `/rds/painel` — ✅ PROMOVIDA (2026-06-15)

14ª e ÚLTIMA promoção (a maior: área logada inteira — entry + 5 slots de Parallel
Routes + TabsAsLinks, sob `src/app/(authenticated)/painel/`, topologia inalterada).
O **shell** foi promovido: 11 componentes (`painel-header`, `tab-bar`,
`active-slot-picker`, `estado-{maduro,novo,onboarding}`, `lista-acompanhando`,
`lista-da-minha-uf`, `parlamentares/sub-tabs`, `alertas/{lista-recebidos,sub-tabs}`)
+ os 5 slots sobrescritos pelas versões RDS verificadas; `TabBar`/SubTabs →
`TabsAsLinks` do `/server`; `KpiStrip`→`Stat`/`StatGroup`; `Button`/`rds-accordion`
canônicos. `auth()` (Clerk) + queries preservados server-side. Token-parity vs
staging confirmada (0 diff de className fora de comentário). Staging `/rds/painel`
removido.

**Resíduo BaV documentado (follow-up):** os ~12 *client islands* do painel (forms e
modais: `OnboardingWizard`, `FormPerfil`, `FormPoliticas`, `ComunicacaoToggles`,
`TemasChips`, `AcoesLgpd`, `FormUfInline`, `BannerMudancaUf`, `ItemRecebido`,
`ConsentModal`, `MigracaoLocalStorageModal`, `ModalRevisarUfAntiga`) seguem em
tokens BaV — o staging os importava dos ORIGINAIS (nunca traduzidos; sem
ground-truth RDS). Mesma categoria dos charts (ADR-034 §5): os tokens BaV resolvem
via bridge e são sub-perceptuais. Traduzi-los in-place (+ atualizar seus
`.test.tsx`) fica como follow-up — o QA visual logado pelo owner decide a prioridade.

### Wrappers de entry granular (varredura 3.9.0) — ✅ CONSOLIDADO (2026-06-15)

> Os 3 wrappers `rds-accordion.ts` (parlamentares/proposicoes/votacoes) foram
> consolidados no primitivo canônico `src/design-system/primitives/rds-accordion.ts`
> (criado na 11ª promoção, #414) ao promover os perfis; as cópias `/rds/` foram
> deletadas. O wrapper `'use client'` de 1 linha re-exporta o `Accordion` do barrel
> `/granular` cruzando o boundary DENTRO de módulo client (tree-shaking poda ~200
> re-exports; import direto de SC custava +294KB — medição na varredura 3.9.0).

O Accordion Radix local (`src/design-system/primitives/accordion`) segue em uso
por rotas de PRODUÇÃO que ainda não consomem o RDS; os 3 perfis promovidos usam o
Accordion do RDS via o wrapper canônico.

### Pendências upstream / client islands (piloto-2)

- **Accordion mobile**: primitiva Radix LOCAL (`src/design-system/primitives/accordion`)
  mantida na rota staging. Gap reportado em
  [RDS #202](https://github.com/FabioCaffarello/react-design-system/issues/202)
  (clipping `max-h-[1000px]` + typography fixa do trigger + sem className
  por item). Swap quando fechar.
- **useScrollSpy**: pedido entry granular em
  [RDS #203](https://github.com/FabioCaffarello/react-design-system/issues/203)
  com medição literal (+277.593 bytes no chunk da rota, +29% de JS).
- **FilterChips**: wrapper adotado do RDS `/server` na varredura 3.10.0
  ([RDS #162](https://github.com/FabioCaffarello/react-design-system/issues/162) fechada / [RDS #211](https://github.com/FabioCaffarello/react-design-system/pull/211)). O `FilterChip` **item** segue
  local (server-safe/zero-JS) por decisão do owner — o `Chip` do RDS é
  client (+5.759 bytes/rota medidos) e os chips são `<Link>`. Eliminar a
  duplicação do item depende de um chip server-safe upstream (issue
  futura), não de gap aberto.
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
