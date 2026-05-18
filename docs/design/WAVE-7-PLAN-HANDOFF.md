# Wave 7 — Plano de redesign /parlamentares · Handoff para próxima sessão

> Brasil a Vera · Design · v0.1
> Última atualização: 2026-05-17
> Status: handoff (sessão designer → próxima sessão engineer)
> Role esperado para retomada: **engineer** (paths ADR + docs/architecture)

---

## Sumário

- [Como ler este handoff](#como-ler-este-handoff)
- [Contexto da conversa anterior](#contexto-da-conversa-anterior)
- [Decisões cravadas](#decisões-cravadas)
- [Princípios norteadores (Wave 7)](#princípios-norteadores-wave-7)
- [Sequenciamento final (5 sprints + pré-Wave)](#sequenciamento-final-5-sprints--pré-wave)
- [Contrato de fallback — ParlamentarCard v2](#contrato-de-fallback--parlamentarcard-v2)
- [Decisões pendentes — nenhuma](#decisões-pendentes--nenhuma)
- [Ordem de execução pós-switch](#ordem-de-execução-pós-switch)
- [Anexo A — ADR-026 (draft completo, pronto para Write)](#anexo-a--adr-026-draft-completo-pronto-para-write)
- [Anexo B — SPIKE-CHART-LIBS.md (draft completo, pronto para Write)](#anexo-b--spike-chart-libsmd-draft-completo-pronto-para-write)
- [O que NÃO está neste handoff](#o-que-não-está-neste-handoff)

---

## Como ler este handoff

Este documento é **auto-suficiente**. A engineer Claude que retoma a sessão
não precisa reler as 3 rodadas de conversa anteriores — tudo que ficou
acordado está cristalizado aqui.

Ordem sugerida de leitura:

1. **Contexto** → entender a tese da Wave 7
2. **Decisões cravadas** → conhecer o que NÃO é mais negociável
3. **Sequenciamento** → ver o mapa dos 5 sprints
4. **Ordem de execução** → saber o primeiro PR a abrir
5. **Anexos A e B** → conteúdo a commitar via Write nos paths canônicos

Pular os Anexos na primeira leitura é OK; eles são carga-útil para o disco,
não material de decisão.

---

## Contexto da conversa anterior

Sessão de design (role `designer`) entre owner e Claude, iniciada em
2026-05-17, com 3 rodadas críticas:

1. **Rodada 1** — Owner pediu plano robusto de redesign para `/parlamentares`.
   Claude propôs Wave 7 com 5 sprints + 1 sprint extra (7.5 mobile/share/comparar).
2. **Rodada 2** — Owner criticou sequenciamento (mobile/share em 7.5 = trai a
   tese), KpiStrip sem F7 = teatro, Recharts por inércia, busca SSR sem
   debounce, fallback do card indefinido, F12 fora, Top5/Pares cedo, baseline
   antes do PR1. Claude absorveu 8/8 travas.
3. **Rodada 3** — Owner cravou: Recharts é inércia (rodar spike comparativo
   com uPlot/Visx/Observable Plot), ADR-026 para paginação cursor, seed
   idempotente para remover trava temporal de cron, analytics fora da Wave 7
   (vira Wave 9 pós-tráfego). Claude absorveu 5/5.
4. **Rodada 4 (esta)** — Owner adicionou 3 travas finais: critério 5 do
   spike é a11y (axe-core + VoiceOver), ADR-026 ganha versionamento de
   token `{v:1, ...}` com redirect 308 para versões desconhecidas, seed em
   ≤30s precisa de EXPLAIN ANALYZE no PR (com flag `--parlamentar-id=` de
   fallback). Resolveu binárias: spike em sessão dedicada agora, footer
   cross-links mantido em 7.2 PR5. Autorizou redação final.

**Status**: tudo absorvido, autorizado. Bloqueio atual = role designer não
pode escrever em `docs/architecture/`. Engineer Claude da próxima sessão
deve continuar de onde paramos.

---

## Decisões cravadas

Esta lista é **imutável** sem nova conversa com owner. Cada item já passou
por 1+ rodada crítica.

### Escopo Wave 7

- **Wave 7 = redesign completo das rotas `/parlamentares` e `/parlamentares/[id]`**
  (Parlamentar 360°), alinhando implementação à spec `docs/features/PARLAMENTAR-360.md`
  e à jornada do **Cidadão Consciente** (persona primária, mobile 80%)
- **Wave 7 NÃO inclui**: comparação inter-parlamentar (F12 → Wave 8),
  analytics/Plausible (→ Wave 9 pós-tráfego), seções Comissões/Frentes
  (dados não ingeridos), filtros TSE (gênero/raça), light mode
- **F12 confirmado fora** → botão "Comparar com…" sai do PerfilHeader v2.
  PerfilHeader termina com apenas `[Compartilhar resumo]`

### Constraints técnicas

- **Animação**: ADR-023 aplicado. CSS-only (`@starting-style`, View
  Transitions, `animation-timeline: view()`). Sem `framer-motion`
- **`--accent` (roxo)**: ADR-024 aplicado. Apenas inflexão narrativa
  (kicker hero, chip narrativo, gradient overlay). NÃO em CTAs primários,
  NÃO em estados semânticos, NÃO em listas densas
- **Cache**: ADR-018 aplicado. Queries server-side com cache de edge
- **Banco scale-to-zero**: CLAUDE.md §12. Crons concentrados, sem queries
  fora de janelas planejadas
- **Render**: SSG com `revalidate` em perfil (CLAUDE.md §9). Dynamic
  rendering apenas em listagem/busca

### Decisões de arquitetura ainda a formalizar via ADR

- **ADR-025** — Lib de chart escolhida. **Redigir APÓS execução do spike**
  (Anexo B). Não cravar antes
- **ADR-026** — Paginação por cursor opaco versionado em listas SSR.
  Redigir AGORA pela engineer Claude. Conteúdo no Anexo A
- **Materialized view rejeitada** em favor de tabela agregada
  `estatistica_parlamentar_agregada` com `INSERT … ON CONFLICT … DO UPDATE`
  (CLAUDE.md §5)
- **pg_trgm rejeitado** para Wave 7 — 513 parlamentares cabem em `ILIKE`
  B-tree sub-50ms. Reabrir se cardinalidade subir
- **Analytics rejeitado** para Wave 7 (Pré-PR 0 cancelado). Validação
  qualitativa via revisão heurística em viewport 375×667 no Sprint 7.1 PR5

### Decisões de UX cravadas

- **Mobile accordion + Compartilhar promovidos para Sprint 7.2** (não 7.5)
  — são fundacionais da jornada Cidadão Consciente
- **Top 5 afinidade + Pares contraditórios promovidos para Tier 1** —
  fecham a jornada cívica, validam tese antes de investir em dataviz
- **Footer cross-links mantido em 7.2 PR5** — custo zero, fecha cul-de-sac
- **Busca por nome = `<form method="get">` + Enter** — sem debounce, sem
  onChange, sem JS. SSR puro alinhado com `Filtros` em
  `src/components/parlamentar/filtros.tsx:78`
- **Recharts NÃO é escolha cravada** — spike formal vai decidir
- **Comparações de KPI usam tabela agregada**, não materialized view
- **Spike chart-libs roda em sessão dedicada antes do Sprint 7.0**
  (paralelismo é falsa eficiência segundo owner)

---

## Princípios norteadores (Wave 7)

Reproduzo aqui para a engineer Claude não precisar caçar:

| # | Princípio | Origem |
|---|---|---|
| P1 | **Densidade > floreio.** Cada elemento ganha espaço por sinal cívico, não estético | CLAUDE.md + comentário em `src/components/parlamentar/parlamentar-card.tsx:25` |
| P2 | **Honestidade do dado preserva trust_level.** Toda agregação ganha L-badge + nota de cobertura/amostra | TRUST-PYRAMID + padrão de `src/components/parlamentar/alinhamento.tsx` |
| P3 | **Mobile primeiro, desktop refina.** Persona primária = 80% mobile. Validar em 375×667 antes de qualquer outro viewport | `docs/product/PERSONAS.md` |
| P4 | **`--accent` é inflexão, não CTA.** Roxo em kicker hero, chip narrativo, gradient overlay. CTA primário continua `--brand` | ADR-024 §Fronteiras |
| P5 | **Animação em CSS.** `@starting-style`, `view-transition-name`, `animation-timeline: view()`. Nada de `framer-motion` | ADR-023 |
| P6 | **Dados → cache de edge ou SSG com revalidate.** Nada de dynamic em perfil | ADR-018 + CLAUDE.md §9 |

---

## Sequenciamento final (5 sprints + pré-Wave)

```
[Pré-Wave 7 — gates técnicos]

  Spike chart libs (sessão dedicada AGORA)
    → executa em branch spike/chart-lib-benchmark
    → 4 PoCs idênticos em /dev/charts-bench/{recharts,uplot,visx,observable-plot}
    → 5 critérios: bundle ≤35kB, LCP ≤2.5s, INP ≤200ms, TBT ≤200ms,
      a11y (axe-core 0 violations + VoiceOver passa)
    → produz ADR-025 com tabela literal de resultados
    → bloqueia Sprint 7.4 apenas; não bloqueia 7.0/7.1/7.2/7.3

  ADR-026 redigido AGORA pela engineer Claude
    → docs/architecture/ADR/026-paginacao-cursor-ssr.md
    → conteúdo completo no Anexo A
    → bloqueia Sprint 7.3

  Contrato fallback ParlamentarCard v2
    → documentado neste handoff (§ "Contrato de fallback")
    → obrigatório no PR description do Sprint 7.1 PR4

──────────────────────────────────────────────────────────────────

[Sprint 7.0 — Fundamentos de dado]

  PR 1: migration estatistica_parlamentar_agregada + indexes
        Schema:
          parlamentar_id uuid PRIMARY KEY REFERENCES parlamentar(id)
          pct_alinhamento numeric(5,2) NULL
          votacoes_analisadas integer NOT NULL DEFAULT 0
          proposicoes_count integer NOT NULL DEFAULT 0
          gasto_total_ano numeric(14,2) NULL
          gasto_mediana_casa numeric(14,2) NULL
          percentil_gasto_casa numeric(5,2) NULL
          trust_level text NOT NULL DEFAULT 'L2'
          computed_at timestamptz NOT NULL DEFAULT now()
        Indexes:
          idx_estat_parlamentar_alinhamento ON (pct_alinhamento DESC NULLS LAST)
          idx_estat_parlamentar_gasto ON (gasto_total_ano DESC NULLS LAST)
        Migration: src/shared/db/migrations/0007_*.sql (SQL puro)

  PR 2: script seed:agregados:parlamentar
        Path: scripts/seed-agregados-parlamentar.ts (ou ingestion/, ver
        precedente). Driver via tsx.
        Idempotente: INSERT ... ON CONFLICT (parlamentar_id) DO UPDATE
        Executável em: dev/preview/prod
        REQUIREMENTS NO PR DESCRIPTION:
          - EXPLAIN ANALYZE da query mais pesada (join com voto_nominal)
          - Se tempo total ≥ 2min em prod-snapshot:
            adicionar flag --parlamentar-id=<uuid> para batch opcional
            (evita contenção com outros crons)
          - Output de 3 runs idempotência (rodar 3× = mesmo estado)
        Step novo em .github/workflows/ingestion-weekly.yml
        ⚠ ATENÇÃO: workflows são bloqueados mesmo para engineer Claude
          (ROLES.md linha 51). Step entra via PR humano manual deliberado.
          Engineer Claude PREPARA o YAML como diff comentado no PR description;
          owner aplica via edit manual fora do Claude.

  PR 3: Primitiva command (shadcn)
        Via /add-primitive command (skill existe, dispara design-system-curator)
        Adicionar ao package.json: shadcn install nas dependencies do projeto
        Arquivo final: src/design-system/primitives/command.tsx
        Test: src/design-system/primitives/command.test.tsx (paridade com
        outras primitivas)

  PR 4: Query helpers
        Adicionar em src/lib/queries/parlamentares.ts (ou novo arquivo):
          - getAlinhamentoMensal(parlamentarId, meses=12)
            → Array<{mes: string, percentual: number, total: number}>
          - getGastosMensalMedianaCasa(parlamentarId, ano)
            → Array<{mes: string, valor: number, medianaCasa: number}>
          - getGastosTopFornecedores(parlamentarId, ano, limit=5)
            → Array<{cnpj: string, nome: string, total: number, registros: number}>
        Cada query: cache de edge (ADR-018) + tipos Zod no boundary
        Tests: src/lib/queries/__tests__/parlamentares-novos.test.ts

[Sprint 7.1 — Listagem + Top5/Pares promovidos]

  PR 1: HeroSection gradient + StatsGrid agregado
        src/app/parlamentares/page.tsx:52 — trocar variant="plain" por
        variant="gradient" (consome bg-hero + grid-bg)
        Adicionar <StatsGrid> com items:
          513 parlamentares · 35 partidos · 27 UFs
        Source de contagem: SELECT COUNT em parlamentares ativos (mesma
        query que já roda via getPartidosDistintos/getUfsDistintos)

  PR 2: Busca por nome + ordenação SSR
        src/components/parlamentar/filtros.tsx — adicionar <input name="q">
        no form GET existente. Sem onChange, sem debounce. Enter submete.
        src/lib/queries/parlamentares.ts:listParlamentares — adicionar
        params: q?: string, ordem?: 'nome'|'alinhamento'|'gasto'|'proposicoes'
        Index B-tree em parlamentar.nome para ILIKE (sem pg_trgm)
        Default ordem: 'nome' ASC

  PR 3: Combobox Partido/UF + chips filtros ativos
        Consome primitiva command (Sprint 7.0 PR3)
        Substitui <select> nativo em filtros.tsx por <Combobox>
        Chips de filtro ativo abaixo dos filtros, com × para remover
        (reusa buildHref em filtros.tsx:31)

  PR 4: ParlamentarCard v2 consumindo agregados
        ⛔ MERGE GATE: seed:agregados:parlamentar rodado local OU preview
          com tabela populada (não exige cron de prod)
        src/components/parlamentar/parlamentar-card.tsx — adicionar:
          - Barra horizontal de alinhamento (CSS, 6px height, --accent/30%)
          - Linha texto compacto "X% alinhado · N votações"
        CONTRATO DE FALLBACK OBRIGATÓRIO no PR description (matriz neste
        handoff § "Contrato de fallback")

  PR 5: Promoção Top 5 + Pares para Tier 1 (sem rewrite)
        src/app/parlamentares/[id]/page.tsx:231 — remover border-t + header
        "Análises comparativas"
        Mover blocos Top5Afinidade + ParesContraditorios para dentro de
        <div className="mt-6 space-y-5"> (Tier 1)
        Atualizar SectionNav items: ordem Votos → Alinh → Propos → Gastos
        → Top 5 → Pares (sem agrupamento visual)
        ⛔ CHECKPOINT: revisão heurística 375×667 (DevTools mobile emul)
          5 perguntas registradas no PR description:
            1. Scroll do Top 5 confortável ou exige snap?
            2. Pares aparece dentro do primeiro stretch de scroll após KpiStrip?
            3. Compartilhar depois de ver um par faz sentido na jornada?
            4. Footer cross-links aparece sem precisar scrollar 5+ viewports?
            5. Algum bloco força horizontal-scroll inesperado em 375px?
          Aceite: 4 de 5 SIM. SIM forçado vira task no próximo sprint.

[Sprint 7.2 — Detalhe reskin + mobile fundacional + share]

  PR 1: KpiStrip v2 com comparações
        ⛔ MERGE GATE: agregados populados (mesmo do 7.1 PR4)
        src/app/parlamentares/[id]/page.tsx:101 — KpiStrip items.hint passa
        a consumir comparações de estatistica_parlamentar_agregada:
          - Alinhamento: hint = "mediana PT/casa em 68%"
          - Gastos: hint = "p3 da casa" (percentil)
          - Proposições: hint = "p1 do partido"
        Sem rewrite do componente KpiStrip — só preenche prop existente

  PR 2: PerfilHeader v2 — breadcrumb + Compartilhar
        src/components/parlamentar/perfil-header.tsx — adicionar:
          - Breadcrumb sutil "← Parlamentares" acima do header
          - Botão [Compartilhar resumo] no fim do header (variant="outline")
          - SEM botão "Comparar" (F12 fora da Wave 7)

  PR 3: Dialog Compartilhar resumo
        Reusa src/design-system/primitives/dialog.tsx
        Conteúdo:
          - URL canônica do perfil
          - Texto pré-formatado WhatsApp (com emojis nativos do produto)
          - Texto pré-formatado X/Twitter (≤280 chars)
          - Botão "Copiar link" (Clipboard API + toast via sonner)
        Sem instrumentação de eventos (aceita "sem dado de uso até Wave 9")

  PR 4: Accordion mobile via Radix
        Adicionar primitiva accordion (shadcn) via /add-primitive accordion
        Em /parlamentares/[id]/page.tsx — wrap das SectionCards num
        <Accordion type="multiple"> com defaultValue=["votos","alinhamento"]
        APENAS abaixo de sm: via CSS query (display:none/contents switch)
        Header + Votações + Alinhamento expandidos default no mobile
        (spec PARLAMENTAR-360.md §Mobile exige)

  PR 5: Scroll-spy SectionNav + footer cross-links
        Client component <1kB em src/components/section-nav-spy.tsx:
          IntersectionObserver observando section[id] e atualizando
          data-active no anchor correspondente
        Footer em /parlamentares/[id]/page.tsx no fim:
          Links "Ver outros do {partido}" e "Ver outros de {UF}"
          → /parlamentares?partido=X / ?uf=Y

[Sprint 7.3 — Filtros + paginação por seção]

  ⛔ NÃO INICIA sem ADR-026 aceito

  PR 1: Filtros mini Votos + cursor pagination
        src/lib/queries/parlamentares.ts:getVotosRecentes — params novos:
          periodo, tema, tipo, alinhamento, cursor (CursorV1)
        Helper compartilhado:
          src/lib/cursor.ts — encodeCursor<T>/decodeCursor<T> + redirect 308
          src/lib/queries/cursor-schemas.ts — Zod schemas por lista
        UI: filtros em <details> ou row de chips no header da SectionCard
        Link "Mostrar mais" como <a href="?votos_after=...#votos">

  PR 2: Distribuição voto CSS-only
        No header da SectionCard "Votos recentes":
          ▰▰▰▰▰▰▰ 78% SIM ▰▰ 18% NÃO ▰ 4% Abst
        Implementação: divs com width % + bg-success/30, bg-warning/30,
        bg-destructive/30. Sem JS.

  PR 3: Filtros mini Proposições + cursor pagination
        Mesmo padrão do PR1, params tipo/situação/tema
        Schema cursor: {v:1, a:ano, n:numero, id:uuid}

  PR 4: Sparkline alinhamento 12m
        SVG inline (zero bundle) consumindo getAlinhamentoMensal
        12 pontos, 1 path, scale linear, tooltip CSS via :hover do <g>
        Renderiza dentro de AlinhamentoBancada

[Sprint 7.4 — Gastos profundo]

  ⛔ NÃO INICIA sem ADR-025 aceito (lib vencedora do spike + bundle budget)

  PR 1: Lib vencedora dynamic-imported em gastos-resumo
        const Chart = dynamic(() => import('./gastos-chart'))
        gastos-chart.tsx isolado, importa apenas a lib vencedora
        Bundle delta antes/depois copiado no PR description (literal)

  PR 2: Gráfico barras categoria + mensal trend vs mediana casa
        Consome getGastosTopCategorias (já existe) + getGastosMensalMedianaCasa
        Barras horizontais ordenadas DESC por valor
        Linha mensal: parlamentar (sólida --chart-1) + mediana (tracejada --chart-3)

  PR 3: Top 5 fornecedores + drill-down
        Lista compacta de fornecedores no fim de GastosResumoBlock
        Link "Ver detalhe completo →" para /parlamentares/[id]/gastos
        (rota nova, mas escopo mínimo: tabela paginada com cursor)

  PR 4: Filtros mini Gastos (período, categoria) + cursor pagination
        Mesmo padrão de Votos/Proposições
        Schema cursor: {v:1, d:data_emissao_ms, id:uuid}
```

---

## Contrato de fallback — ParlamentarCard v2

A barra de alinhamento no card de listagem (Sprint 7.1 PR4) **só renderiza
quando o dado é honesto**. P2 (honestidade do dado) é não-negociável.

| Estado | Trigger | Render |
|---|---|---|
| `com_amostra` | `votacoes_analisadas ≥ 5` AND `pct_alinhamento IS NOT NULL` | Barra `▰▰▰▰▰▰▰▱▱` + linha texto `"73% alinhado · 12 votações"` |
| `amostra_insuficiente` | `0 < votacoes_analisadas < 5` | Linha texto subtle (foreground-muted): `"Amostra insuficiente · 3 votações no período"` — SEM barra |
| `sem_dado` | `votacoes_analisadas = 0` (recém-empossado, suplente, situação atípica) | Linha texto subtle: `"Sem votações nominais registradas"` — SEM barra |
| `casa_senado_legacy` | `casa = 'SENADO'` AND parlamentar pré-data de ingestão de orientação | Mesma de `sem_dado` + tooltip via `<title>`: `"Senado: cobertura parcial de orientação partidária"` |

**Regra**: sem essa matriz codada, nem ParlamentarCard v2 nem KpiStrip v2
podem ir a PR. Trust honesty é P2 — barra cheia em parlamentar sem dado
quebra a tese do produto inteiro.

**Threshold de 5 votações** alinha com `alinhamento.tsx` (que já flagra
"amostra insuficiente" quando `total < 5` em
`src/lib/queries/alinhamento.ts`). Engineer Claude deve confirmar o
threshold exato lendo essa query antes de codar o card.

---

## Decisões pendentes — nenhuma

Owner autorizou todas as decisões abertas até este ponto. Engineer Claude
da próxima sessão **inicia execução direta**, sem precisar perguntar.

Se uma decisão nova surgir durante execução (ex: choice entre 2 abordagens
de implementação não cobertas neste handoff), engineer Claude **deve
pausar e perguntar** — não escolher por conta própria.

---

## Ordem de execução pós-switch

Engineer Claude da próxima sessão executa nesta ordem:

### Passo 1 — Validar contexto (5 min)

```bash
echo "BAV_CLAUDE_ROLE=$BAV_CLAUDE_ROLE"
# Esperado: engineer
```

Se vazio: avisar owner, parar.

### Passo 2 — Escrever ADR-026 (sem dependência)

```bash
# Conteúdo: Anexo A deste handoff, copy-paste literal
# Target: docs/architecture/ADR/026-paginacao-cursor-ssr.md
```

Write direto. Hook `pre-edit-guardrail.sh` deve aprovar (engineer + path
permitido).

### Passo 3 — Escrever SPIKE-CHART-LIBS.md (sem dependência)

```bash
# Conteúdo: Anexo B deste handoff, copy-paste literal
# Target: docs/architecture/SPIKE-CHART-LIBS.md
```

Write direto. Mesma validação.

### Passo 4 — Criar branch do spike e scaffolding

```bash
git checkout -b spike/chart-lib-benchmark
```

Scaffolding mínimo (não instala libs ainda — owner deve aprovar
package.json delta explicitamente):

- `src/app/dev/charts-bench/layout.tsx` (links para 4 PoCs + header
  "Spike Wave 7 — não-produção")
- `src/app/dev/charts-bench/mock.ts` (dado compartilhado: 8 categorias
  + 12 pontos mensais)
- `src/app/dev/charts-bench/recharts/page.tsx` (stub com `<p>PoC pendente</p>`)
- `src/app/dev/charts-bench/uplot/page.tsx` (stub idem)
- `src/app/dev/charts-bench/visx/page.tsx` (stub idem)
- `src/app/dev/charts-bench/observable-plot/page.tsx` (stub idem)
- `spike/scripts/bundle-diff.sh` (script bash, executable)
- `spike/scripts/lh-bench.sh` (idem)
- `spike/scripts/axe-bench.ts` (tsx)
- `spike/results/.gitkeep`

Commit: `chore(spike): scaffolding chart-lib-benchmark (sem libs)`.

### Passo 5 — Pausar e perguntar a owner

```
Scaffolding pronto em `spike/chart-lib-benchmark`. Próximos passos exigem
mudança de `package.json` (instalar 4 libs em commits separados). Custo
de bundle e dependências é decisão de owner — aguardando confirmação.

Comandos preparados:
  git checkout spike/chart-lib-benchmark
  npm i recharts
  git commit -am "spike: add recharts"
  npm i uplot react-uplot
  git commit -am "spike: add uplot + react wrapper"
  npm i @visx/shape @visx/scale @visx/axis @visx/tooltip @visx/responsive
  git commit -am "spike: add visx (tree-shaken)"
  npm i @observablehq/plot
  git commit -am "spike: add observable-plot"
  npm i -D @axe-core/playwright
  git commit -am "spike: add axe-core dev dep"

Aprovo a instalação para prosseguir com PoCs?
```

### Passo 6 — Após aprovação, implementar 4 PoCs idênticos

Para cada lib, PoC tem 2 charts (bar categoria + line mensal) consumindo
o mesmo `mock.ts`. Detalhes em SPIKE-CHART-LIBS.md §"PoC scope".

### Passo 7 — Rodar benchmarks

Executar scripts em `spike/scripts/`. Capturar outputs literais em
`spike/results/*.md`. Detalhes em SPIKE-CHART-LIBS.md §Metodologia.

### Passo 8 — Redigir ADR-025 com resultados

Após benchmarks executados:

```bash
# Conteúdo: usar formato dos ADRs 023/024 (Sumário + Contexto + Decisão +
# Alternativas + Consequências + Referências)
# Tabela de resultados copiada literal de spike/results/*.md
# Lib vencedora aplicando critérios de aceite + tiebreak
# Target: docs/architecture/ADR/025-chart-lib-wave-7.md
```

### Passo 9 — Reportar a owner

Resumo: ADR-026 commitado, SPIKE-CHART-LIBS.md commitado, branch do spike
com scaffolding pronto, aguardando aprovação package.json (ou já com
benchmarks rodados + ADR-025 pronto, dependendo de onde parou).

---

## Anexo A — ADR-026 (draft completo, pronto para Write)

**Path target**: `docs/architecture/ADR/026-paginacao-cursor-ssr.md`

```markdown
# ADR-026: Paginação por cursor opaco e versionado em listas SSR

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-05-17
> Status: proposed

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
  - [1. Cursor opaco em query param único `?after=<token>`](#1-cursor-opaco-em-query-param-único-aftertoken)
  - [2. Versionamento do payload do token](#2-versionamento-do-payload-do-token)
  - [3. Page-size fixo: 20](#3-page-size-fixo-20)
  - [4. "Mostrar mais" como `<a>` puro com scroll-restoration nativa](#4-mostrar-mais-como-a-puro-com-scroll-restoration-nativa)
  - [5. Versão desconhecida → redirect permanente para página 1](#5-versão-desconhecida--redirect-permanente-para-página-1)
- [Listas em escopo (Wave 7)](#listas-em-escopo-wave-7)
- [Listas fora de escopo](#listas-fora-de-escopo)
- [Implicações de edge cache (ADR-018)](#implicações-de-edge-cache-adr-018)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Referências](#referências)

---

## Contexto

A Wave 7 (`docs/product/PROMPT-MESTRE-WAVE-7.md` a redigir) introduz
paginação real em 3 listas do produto:

- **Votos recentes** em `/parlamentares/[id]` (hoje hard-coded em `limit=10` em
  `src/lib/queries/parlamentares.ts` via `getVotosRecentes`)
- **Proposições de autoria** em `/parlamentares/[id]` (hoje `limit=5` em
  `getProposicoesAutoradas`)
- **Detalhe de gastos CEAP** em `/parlamentares/[id]` (Sprint 7.4 PR4 — feature
  nova que substitui o resumo agregado por uma drill-down navegável)

Hoje, todas usam limite hard-coded e ocultam a cardinalidade real do conjunto.
Para o **Cidadão Consciente** (persona primária) isso inflaciona a percepção
de completude — ele lê "10 votos" e assume que são os únicos relevantes. Para
o **Jornalista** (P2) é fricção direta: precisa de acesso à lista completa
para investigação.

Duas opções clássicas existem para paginar listas SSR:

1. **Offset-based** (`?page=N`) — clássico, intuitivo
2. **Cursor-based** (`?after=token`) — escala melhor, idempotente para edge cache

A escolha aqui não é trivial: o produto serve URLs que serão **indexadas pelo
Google** (`brasilavera.org/parlamentares/178957?votos=20`) e compartilhadas em
WhatsApp (jornada Cidadão Consciente termina em compartilhamento — ver
[`PARLAMENTAR-360.md` §Compartilhamento Social](../../features/PARLAMENTAR-360.md)).
Mudança de schema interno (`ORDER BY`, tipo de cursor) não pode quebrar
URLs em estado-estável fora do nosso controle.

Este ADR cristaliza o contrato: cursor opaco, **versionado**, com mecânica
de evolução que protege URLs externas contra mudanças futuras de implementação.

## Decisão

### 1. Cursor opaco em query param único `?after=<token>`

Paginação consome **um único query param**: `?after=<base64url-encoded-token>`.
Não exposição de campos internos de ordenação no URL.

\`\`\`
/parlamentares/123?votos=open&votos_after=eyJ2IjoxLCJkIjoxNzE1NDA0...
\`\`\`

O token é **opaco para o consumidor** (browser, crawler, usuário copiando o
link). Apenas o server-side decodifica via Zod schema validado.

Múltiplas listas independentes na mesma rota usam prefixos distintos:
`?votos_after=...`, `?propos_after=...`, `?gastos_after=...`. Cada uma
pagina sem interferência.

### 2. Versionamento do payload do token

O payload **dentro** do token tem versionamento de schema:

\`\`\`typescript
// Schema v1 (atual)
const CursorV1 = z.object({
  v: z.literal(1),
  d: z.number().int().positive(),  // timestamp epoch ms, ORDER BY field 1
  id: z.string().uuid(),            // tiebreaker, ORDER BY field 2 (uuid v7 → monotonic)
})

type CursorV1Payload = z.infer<typeof CursorV1>
\`\`\`

**Por que versionar 1 byte de overhead**: o token vive em URLs indexadas pelo
Google e compartilhadas. Se em 6 meses precisamos mudar `ORDER BY` (ex.: adicionar
`prioridade` antes de `data_hora`), o cursor v1 não decodifica mais para o
schema novo. Sem versionamento, opções ruins:

- Quebra silenciosa (cursor decodifica errado → resultados off-by-N)
- Re-deploy com path inteiro novo (URLs indexadas morrem)

Com versionamento, o decoder reconhece `{v: 1}` como deprecated e aplica a
estratégia da §5. Custo: 1 byte adicional por token; ganho: liberdade de
evolução perpétua.

### 3. Page-size fixo: 20

Não exposto via URL. Não configurável por consumidor.

- **20 itens** × 4-6 viewports mobile (375×667) ≈ scroll honesto sem chunk over
- Mudança = ADR subsequente (não opt-in pelo URL)
- Padrão alinhado com listas densas do produto (P1 — "densidade > floreio")

Listas curtas naturalmente (afinidade Top 5, top 3 fornecedores) **não usam**
este ADR — são listas com cardinalidade fixa, não páginas.

### 4. "Mostrar mais" como `<a>` puro com scroll-restoration nativa

\`\`\`html
<a href="/parlamentares/123?votos_after=eyJ...#votos">Mostrar mais</a>
\`\`\`

- **`<a>`, não `<button>`** — sem JS, sem `onClick`, sem hydration cost
- **Anchor `#secao`** — mantém scroll na seção atual após navegação
- **Scroll-restoration** — Next App Router preserva position nativa
- **Edge cache** — cada cursor URL tem fingerprint determinístico,
  cacheável independentemente (ADR-018)

Layout: `<a>` aparece **no final da lista da seção**, full-width, com label
`Mostrar mais (N restantes)` quando `N` é conhecido baixo custo via `COUNT(*)`.
Quando `N` é desconhecido ou caro: `Mostrar mais`.

### 5. Versão desconhecida → redirect permanente para página 1

Decoder lê `{v: <unknown>, ...}` ou falha de Zod schema → retorna **redirect
permanente** para a mesma URL sem o param `after`:

\`\`\`typescript
// Em src/app/parlamentares/[id]/page.tsx
function decodeCursor(token: string | undefined): CursorV1Payload | undefined {
  if (!token) return undefined
  try {
    const decoded = JSON.parse(atobUrlSafe(token))
    return CursorV1.parse(decoded)  // throws se v !== 1 ou shape diferente
  } catch {
    return null  // sentinel: trigger redirect
  }
}

// No page component:
const cursor = decodeCursor(searchParams.votos_after)
if (cursor === null) {
  permanentRedirect(`/parlamentares/${id}${stripVotosAfter(searchParams)}`)
  // 308 no App Router; equivalente a 301 para crawlers (RFC 7538)
}
\`\`\`

**Por que redirect e não 404**: a URL externa (Google, WhatsApp) é válida em
forma — o que quebrou foi o contrato interno do token. 404 punindo o usuário
seria desonesto. Redirect para página 1 entrega conteúdo útil + sinaliza ao
crawler que a URL profunda foi consolidada.

**308 vs 301**: `permanentRedirect()` do `next/navigation` retorna 308 (RFC
7538), que crawlers tratam como equivalente a 301 para fins de re-indexação.
Caso futuro exija 301 literal, middleware Edge resolve sem mudança de contrato.

## Listas em escopo (Wave 7)

| Lista | Rota | ORDER BY (v1) | Payload do cursor |
|---|---|---|---|
| Votos recentes | `/parlamentares/[id]?votos_after=` | `data_hora DESC, voto_nominal_id DESC` | `{v:1, d:timestamp_ms, id:uuid}` |
| Proposições autor | `/parlamentares/[id]?propos_after=` | `ano DESC, numero DESC, proposicao_id DESC` | `{v:1, a:int, n:int, id:uuid}` |
| Gastos detalhe | `/parlamentares/[id]?gastos_after=` | `data_emissao DESC, gasto_id DESC` | `{v:1, d:timestamp_ms, id:uuid}` |

Schema Zod por lista vive em `src/lib/queries/cursor-schemas.ts` (novo
arquivo). Helper compartilhado `encodeCursor()/decodeCursor<T>()` em
`src/lib/cursor.ts` (novo arquivo).

## Listas fora de escopo

ADR-026 **não se aplica** a:

- **Listagem `/parlamentares`** — usa ordenação SSR + filtros; cardinalidade
  total (~513) cabe em página única com lazy-loading de imagens. Paginação
  só entra se cardinalidade subir (TSE, históricos pré-2023)
- **Home `/`** — peças sem multiplicidade
- **Header perfil** — peça sem multiplicidade
- **Afinidade Top 5** — cardinalidade fixa (5)
- **Top 3 categorias gastos / Top 5 fornecedores** — cardinalidade fixa
- **API `/api/export/parlamentares`** — CSV completo, sem paginação (consumo
  jornalista/pesquisador)

Esta lista é exaustiva. Adição requer extensão deste ADR ou ADR subsequente.

## Implicações de edge cache (ADR-018)

| Cenário | Cache hit ratio esperado | Justificativa |
|---|---|---|
| Página 1 (sem `?_after`) | ~95% | Quase 100% do tráfego entra por aqui |
| Página 2 | ~30% | Cauda longa; algum tráfego de jornalista/ativista |
| Páginas 3+ | < 10% | Tráfego marginal; aceitar cache miss |

Política de TTL herda do ADR-018 (mesma rota = mesmo `s-maxage`). Versionamento
do cursor não muda fingerprint da URL — o `after=` é tratado como qualquer
outro query param pelo Cloudflare Workers Cache.

**Custo Neon do redirect** (§5): redirect responde 308 sem query no banco —
cache miss não toca DB. Conformidade com CLAUDE.md §12 (banco scale-to-zero
é regra).

## Alternativas Consideradas

### A. Offset-based (`?page=N`)

- **Prós**: intuitivo, URL legível, paginação direta para N específico
- **Contras**:
  - **Drift em listas mutáveis**: inserts/deletes mid-session alteram o que
    "página 2" significa. Votos novos durante a sessão criam duplicação ou
    skip
  - **Cache key não-determinístico para mesma posição lógica**: ADR-018
    espera URL→conteúdo estável
  - **`OFFSET` no Postgres**: escala linearmente em `O(N)` — aceitável até
    20-30 páginas, mas listas pré-2023 podem ter milhares
- **Veredicto**: descartado pelos dois primeiros pontos. Performance é
  contraponto secundário

### B. Cursor exposto (`?after=2026-05-01T15:30:00Z`)

- **Prós**: URL human-readable, debug fácil
- **Contras**:
  - **Acopla URL ao schema interno**: mudança de `ORDER BY` quebra todas
    as URLs indexadas
  - **Sem tiebreaker visível**: empate em `data_hora` exige cursor
    composto, que explode a verbosidade
  - **Sem versionamento natural**: impossível evoluir
- **Veredicto**: descartado pelo acoplamento. Conveniência de debug não
  paga o lock-in

### C. Infinite scroll JS

- **Prós**: UX moderna em mobile, sem reload
- **Contras**:
  - **Requer `'use client'`** — quebra zero-JS no path anônimo (CLAUDE.md
    §princípios + ADR-018)
  - **Quebra scroll-restoration nativa**
  - **Crawlers Google indexam apenas a primeira tela** — URLs profundas
    deixam de existir como conteúdo indexável
  - **Quebra do botão "voltar" em mobile** — fricção crítica para persona P1
- **Veredicto**: descartado. UX moderna mascarando perda de SEO + a11y é
  custo desproporcional

### D. Cursor opaco **sem** versionamento

- **Prós**: 1 byte a menos por token
- **Contras**:
  - **Lock-in no schema atual**: mudança futura de `ORDER BY` quebra URLs
    indexadas silenciosamente (retornando dados off-by-N) ou força
    re-deploy com path novo (URLs morrem)
  - **Sem mecânica de upgrade** para v2 do cursor
- **Veredicto**: descartado. 1 byte de overhead compra liberdade de
  evolução perpétua. Trade-off trivialmente positivo

### E. Cursor opaco versionado (decisão atual)

- **Prós**: cobre todos os trade-offs acima sem perda significativa
- **Contras**:
  - URL menos legível (mas é opaca por design — feature, não bug)
  - Decoder + redirect adicionam ~30 linhas de código compartilhado em
    `src/lib/cursor.ts`
- **Veredicto**: **adotado**

## Consequências

### Positivas

- **URLs indexadas no Google sobrevivem mudanças internas** — versionamento
  + redirect 308 protege SEO contra refatoração futura de `ORDER BY`
- **Edge cache hit ratio alto na página 1** (~95%) — alinhamento ADR-018
  preservado
- **Zero JS no path de paginação** — `<a>` puro mantém zero-JS anônimo
- **Cardinalidade real visível** ao Cidadão Consciente — encerra a inflação
  silenciosa de completude da implementação atual
- **Jornalista ganha drill-down completo** sem precisar baixar CSV inteiro
  para uma investigação rápida

### Negativas

- **URLs menos legíveis** em logs, debugger, share copy — token opaco é mais
  difícil de inspecionar manualmente. Mitigação: helper `npm run cursor:decode
  <token>` em `scripts/` para devs
- **Sem "ir para página N"** — cursor não permite pular. Para 95% dos casos
  (Cidadão Consciente quer ver mais 20 votos) é irrelevante; para Jornalista
  com investigação profunda, o CSV via `/api/export` cobre
- **Manutenção adicional** se v2 for necessária — schema novo, decoder
  rotativo, plano de deprecação. Custo só pago quando o caso aparecer

### Neutras

- **Performance Postgres**: cursor `WHERE (data_hora, id) < (?, ?)` exige
  index composto. Para `voto_nominal` já existe `idx_voto_nominal_parlamentar_data`
  cobre — verificar EXPLAIN ANALYZE no Sprint 7.3 PR1
- **Light dormente** (ADR-024): irrelevante para esta decisão
- **Trust pyramid**: irrelevante; paginação é mecânica, não semântica de dado

## Referências

- [ADR-018 — Cache de edge na camada do app](018-cache-edge-app.md) — política
  de TTL e fingerprint de URL
- [ADR-019 — Disciplina arquitetural sem gargalo](019-disciplina-arquitetural-sem-gargalo.md)
  — princípio aplicado: cursor over offset por evidência (drift + cache)
- [`docs/features/PARLAMENTAR-360.md`](../../features/PARLAMENTAR-360.md) —
  spec de votações com filtros + paginação
- [RFC 7538 — HTTP 308 Permanent Redirect](https://datatracker.ietf.org/doc/html/rfc7538)
- [Next.js `permanentRedirect`](https://nextjs.org/docs/app/api-reference/functions/redirect#permanentredirect)
- [PostgreSQL — Range comparison for keyset pagination](https://www.postgresql.org/docs/current/queries-limit.html)
```

---

## Anexo B — SPIKE-CHART-LIBS.md (draft completo, pronto para Write)

**Path target**: `docs/architecture/SPIKE-CHART-LIBS.md`

```markdown
# Spike — Avaliação de bibliotecas de chart para Wave 7

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-05-17
> Status: planned (execução em branch `spike/chart-lib-benchmark`)
> Bloqueia: ADR-025, Sprint 7.4

---

## Sumário

- [Contexto](#contexto)
- [Objetivo](#objetivo)
- [Libs avaliadas](#libs-avaliadas)
- [PoC scope — idênticas para todas as libs](#poc-scope--idênticas-para-todas-as-libs)
- [Critérios de aceitação](#critérios-de-aceitação)
- [Metodologia](#metodologia)
- [Estrutura do branch](#estrutura-do-branch)
- [Tabela de resultados (template)](#tabela-de-resultados-template)
- [Decisão pós-spike](#decisão-pós-spike)
- [Referências](#referências)

---

## Contexto

A Wave 7 (Sprint 7.4) introduz dataviz em `/parlamentares/[id]` para gastos
CEAP — barra horizontal por categoria + curva mensal vs mediana da casa.
Implementação em CSS-only foi descartada após 3 tentativas honestas
(documentadas na §3 do ADR-025 a redigir): tooltip preciso + escala
proporcional + mediana sobreposta excedem o que `<div>` + `clip-path`
entregam sem complexidade desproporcional.

ADR-023 trava a entrada de qualquer lib JS (animação ou dataviz) sem
critério concorrente provado. Recharts foi o candidato sugerido inicialmente
por familiaridade — mas familiaridade não é critério no ADR-019. Este spike
gera o critério.

## Objetivo

Decidir, com **evidência empírica em viewport 375×667 sob Slow 3G**, qual
biblioteca de chart consumir para a Wave 7. Saída: ADR-025 com tabela de
medição literal copiada + lib vencedora + plano de saída.

**Não-objetivo**: decidir sobre dataviz em rotas futuras (TSE, doações,
grafo legislativo). Esta decisão escopa apenas a Wave 7 dentro de
`/parlamentares/[id]`. Reabertura via ADR subsequente se outras rotas
consumirem chart.

## Libs avaliadas

| # | Lib | Versão | Modelo | A-priori bundle gzip |
|---|---|---|---|---|
| 1 | **Recharts** | latest | SVG, composable React | ~35 kB |
| 2 | **uPlot** + react wrapper | latest | Canvas, vanilla + `react-uplot` (~3 kB) | ~13 + 3 kB |
| 3 | **Visx** (tree-shaken) | latest | SVG, primitivas D3 expostas, React-native | ~20-28 kB |
| 4 | **Observable Plot** | latest | SVG, declarativo, vanilla | ~50 kB |

Pacotes Visx exatos a importar (tree-shake provado):

- `@visx/shape` (bar + line primitives)
- `@visx/scale` (escalas linear/band)
- `@visx/axis` (eixos com tickFormat BRL)
- `@visx/tooltip` (tooltip portal + estado)
- `@visx/responsive` (ParentSize wrapper para responsividade)
- `@visx/text` (label rotation se necessário)

Não importar `@visx/visx` (meta-pacote arrasta tudo).

## PoC scope — idênticas para todas as libs

Quatro PoCs, mesmo dado mock, mesmo design visual, em rota dedicada:

\`\`\`
/dev/charts-bench
  ├─ /recharts       # PoC 1
  ├─ /uplot          # PoC 2
  ├─ /visx           # PoC 3
  └─ /observable-plot # PoC 4
\`\`\`

Cada rota renderiza **dois charts** consecutivos:

### Chart A — Barra horizontal por categoria de gasto

- 8 categorias (Combustível, Divulgação, Locação, Passagens, Telefonia,
  Material, Consultoria, Outros)
- Valor BRL formatado com `Intl.NumberFormat('pt-BR')`
- Tooltip on hover/focus: categoria + valor exato + % do total
- Ordenação descendente por valor
- Cor única `--chart-1` (sem semântica adicional)

### Chart B — Linha mensal vs mediana da casa

- 12 pontos mensais (`mai/2025` a `abr/2026`)
- 2 séries: parlamentar (linha sólida `--chart-1`) + mediana casa (linha
  tracejada `--chart-3`)
- Tooltip on hover/focus: mês + 2 valores BRL + delta absoluto
- Eixo Y formatado em BRL abreviado (`R$ 12k`, `R$ 1,2M`)
- Eixo X formatado mês curto pt-BR (`mai`, `jun`, ...)

### Dado mock comum

\`\`\`typescript
// src/dev/charts-bench/mock.ts (compartilhado entre 4 PoCs)
export const CATEGORIAS = [
  { categoria: 'Combustível', valor: 22_450 },
  { categoria: 'Divulgação', valor: 14_120 },
  // ... 8 itens
] as const

export const MENSAL = [
  { mes: '2025-05', parlamentar: 8_200, medianaCasa: 7_900 },
  // ... 12 pontos
] as const
\`\`\`

Dado idêntico = comparação justa. Cor idêntica via tokens `--chart-*` (já
existem em `globals.css` — ADR-024).

## Critérios de aceitação

Cinco critérios, todos obrigatórios. Tiebreak na ordem listada.

| # | Critério | Threshold | Como medir |
|---|---|---|---|
| 1 | **Bundle delta** | ≤ 35 kB gzip (chunk dinâmico isolado) | `npm run build` antes/depois, capturar chunk com mais bytes da lib |
| 2 | **LCP** | ≤ 2.5s mobile | Lighthouse CI, viewport 375×667, Slow 3G throttling, 3 runs mediana |
| 3 | **INP** | ≤ 200ms (hover/tap no chart) | Chrome DevTools Performance → Interactions, captura em 3 cenários: load, hover bar, hover line point |
| 4 | **TBT** | ≤ 200ms | Lighthouse mesma run que #2 |
| 5 | **Acessibilidade** | axe-core 0 violations + VoiceOver navega gráfico | axe-core CI run + manual VoiceOver na lib vencedora dos 4 anteriores |

### Critério 5 — Acessibilidade (não-negociável)

Produto cívico → WCAG não-negociável. Specifics:

- **Canvas-based libs (uPlot)**: zero a11y nativa. Requer fallback `<table>`
  semântico sincronizado em DOM, posicionado off-screen para leitores de
  tela. Trabalho extra a contabilizar
- **SVG-based libs (Recharts, Visx, Observable Plot)**: aceitam `<title>`,
  `<desc>`, `aria-label` em elementos. Validar que a implementação default
  da lib os inclui — algumas exigem prop explícita
- **axe-core**: rodar via `@axe-core/playwright` em CI nas 4 rotas. Zero
  violations é threshold
- **VoiceOver manual**: 1 sessão na lib vencedora dos critérios 1-4, com
  registro de 3 cenários:
  1. Anuncia o título do gráfico ao entrar
  2. Navega pelos pontos de dado (rotor → "elementos gráficos")
  3. Anuncia o valor exato em cada ponto

VoiceOver manual é a única medição não automatizável — owner executa em
sessão dedicada, registra observações no ADR-025.

### Tiebreak

Ordem: passou em todos os 5 → vencedor.

Múltiplas passaram em todos: **menor INP** (responsividade ao toque é o
sinal mais valioso para Cidadão Consciente em mobile).

Empate em INP: **menor bundle**.

## Metodologia

### Setup

\`\`\`bash
git checkout -b spike/chart-lib-benchmark

# Instalar as 4 libs (commits separados para diff isolado)
npm i recharts             # commit 1
npm i uplot react-uplot    # commit 2
npm i @visx/shape @visx/scale @visx/axis @visx/tooltip @visx/responsive  # commit 3
npm i @observablehq/plot   # commit 4
\`\`\`

Cada `npm i` em commit isolado para que o spike final possa **descartar 3 libs
com 3 reverts limpos** sem tocar a vencedora.

### Medição #1 — Bundle

\`\`\`bash
# Baseline (sem libs)
git checkout main && npm run build
# Capturar tamanho dos chunks em .next/static/chunks/

# Por lib
git checkout spike/chart-lib-benchmark
npm run build
# Capturar chunks que contêm a lib (dynamic-imported via /dev/charts-bench/<lib>)
\`\`\`

Output literal de `npm run build` (com `--profile` se necessário) colado no
ADR-025.

### Medição #2 — Lighthouse

\`\`\`bash
# Servidor de produção local
npm run cf:preview &  # bind 0.0.0.0 para acesso de outro device se necessário

# Lighthouse CLI com config mobile
npx lighthouse http://localhost:8788/dev/charts-bench/recharts \\
  --preset=mobile \\
  --throttling.cpuSlowdownMultiplier=4 \\
  --throttling-method=devtools \\
  --output=json --output-path=./lh-recharts.json

# Repetir para 4 libs, 3 runs cada
\`\`\`

Extrair LCP, INP (de `audits.interaction-to-next-paint`), TBT do JSON.

### Medição #3 — axe-core

\`\`\`bash
# Adicionar @axe-core/playwright em devDependencies (descartável pós-spike)
npm i -D @axe-core/playwright

# Script em spike/scripts/axe-bench.ts roda axe nas 4 rotas
npx tsx spike/scripts/axe-bench.ts > axe-results.json
\`\`\`

### Medição #4 — VoiceOver (manual)

Apenas na lib vencedora de critérios 1-4. Owner executa em macOS:

1. `cmd+F5` ativa VoiceOver
2. Navega para `/dev/charts-bench/<vencedor>`
3. Registra 3 cenários acima como texto no PR do ADR-025
4. Se falhar → próxima lib do ranking + retry

## Estrutura do branch

\`\`\`
spike/chart-lib-benchmark
├─ src/
│  └─ app/
│     └─ dev/
│        └─ charts-bench/
│           ├─ layout.tsx           # links para 4 PoCs
│           ├─ mock.ts              # dado compartilhado
│           ├─ recharts/page.tsx    # PoC 1
│           ├─ uplot/page.tsx       # PoC 2
│           ├─ visx/page.tsx        # PoC 3
│           └─ observable-plot/page.tsx  # PoC 4
├─ spike/
│  ├─ scripts/
│  │  ├─ bundle-diff.sh    # diff de chunks .next/static/chunks/
│  │  ├─ lh-bench.sh       # lighthouse 3 runs x 4 libs
│  │  └─ axe-bench.ts      # axe-core nas 4 rotas
│  └─ results/
│     ├─ bundle.md         # output literal npm run build
│     ├─ lighthouse.md     # output literal lighthouse runs
│     └─ axe.md            # output literal axe
└─ docs/architecture/SPIKE-CHART-LIBS.md  # este doc, atualizado pós-spike
\`\`\`

Rota `/dev/charts-bench` herda do precedente `/dev/design` (já existe em
`src/app/dev/design/`). Layout pai pode adicionar header "Spike Wave 7 —
não-produção, descartar após ADR-025".

**Branch não merga em `main`.** Pós-decisão:

1. ADR-025 redigido com resultados literais copiados deste branch
2. Branch separa em duas: `spike/chart-lib-benchmark` (preservado para
   referência, marcado read-only via tag) + `feat/sprint-7.4-chart-lib`
   (apenas a lib vencedora + scaffolding mínimo + revert das 3 perdedoras)
3. `/dev/charts-bench` removido na branch de feature (não vai pra prod)

## Tabela de resultados (template — preencher pós-execução)

### Bundle delta

| Lib | Chunk size raw | Chunk size gzip | Vs baseline | Passou C1? |
|---|---|---|---|---|
| Recharts | TBD | TBD | TBD | TBD |
| uPlot + react-uplot | TBD | TBD | TBD | TBD |
| Visx (tree-shaken) | TBD | TBD | TBD | TBD |
| Observable Plot | TBD | TBD | TBD | TBD |

### Lighthouse (mediana de 3 runs, mobile Slow 3G)

| Lib | LCP | INP load | INP hover bar | INP hover line | TBT | Passou C2-C4? |
|---|---|---|---|---|---|---|
| Recharts | TBD | TBD | TBD | TBD | TBD | TBD |
| uPlot | TBD | TBD | TBD | TBD | TBD | TBD |
| Visx | TBD | TBD | TBD | TBD | TBD | TBD |
| Observable Plot | TBD | TBD | TBD | TBD | TBD | TBD |

### axe-core violations

| Lib | Critical | Serious | Moderate | Minor | Passou C5 (axe)? |
|---|---|---|---|---|---|
| Recharts | TBD | TBD | TBD | TBD | TBD |
| uPlot | TBD | TBD | TBD | TBD | TBD |
| Visx | TBD | TBD | TBD | TBD | TBD |
| Observable Plot | TBD | TBD | TBD | TBD | TBD |

### VoiceOver (manual, somente vencedor de C1-C4)

| Cenário | Resultado |
|---|---|
| Anuncia título do gráfico ao entrar | TBD |
| Navega entre pontos de dado | TBD |
| Anuncia valor exato em cada ponto | TBD |
| Veredicto C5 (VoiceOver) | TBD |

## Decisão pós-spike

Após preenchimento da tabela acima:

1. Identificar lib que passa em todos os 5 critérios
2. Aplicar tiebreak (menor INP → menor bundle) se >1 lib qualificada
3. Se **nenhuma** lib qualifica: escalar a owner. Possíveis caminhos:
   - Relaxar threshold de um critério com justificativa (ADR registra)
   - Implementar fallback `<table>` semântico + lib canvas (custo extra)
   - Reabrir CSS-only com 3 tentativas adicionais
4. Redigir ADR-025 com:
   - Tabela final
   - Lib escolhida
   - Bundle budget exato (≤ vencedor + 5 kB de margem)
   - Plano de saída (qual sinal dispararia substituição em Wave futura)

## Referências

- [ADR-019 — Disciplina arquitetural sem gargalo](ADR/019-disciplina-arquitetural-sem-gargalo.md)
- [ADR-023 — Critérios para animação e revealing](ADR/023-criterios-de-animacao-e-revealing.md)
  — modelo de "ADR de critério" aplicado aqui
- [ADR-024 — Acentos secundários (`--accent` roxo)](ADR/024-acentos-secundarios-accent-roxo.md)
  — tokens `--chart-*` já existem em `globals.css`
- [`docs/architecture/LIGHTHOUSE-PLAN.md`](LIGHTHOUSE-PLAN.md) — precedente
  de plano de benchmark + resultados separados
- [`docs/architecture/WCAG-AUDIT.md`](WCAG-AUDIT.md) — padrão de auditoria
  WCAG do projeto
- [axe-core](https://github.com/dequelabs/axe-core)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [uPlot](https://github.com/leeoniya/uPlot)
- [Visx](https://airbnb.io/visx/)
- [Observable Plot](https://observablehq.com/plot/)
```

---

## O que NÃO está neste handoff

Para evitar dúvida sobre escopo do que foi acordado:

- **Wireframes ASCII detalhados** das telas — não foram finalizados na sessão
  designer; ficam para o início de cada sprint (engineer Claude desenha em
  conjunto com owner no PR description do PR 1 de cada sprint)
- **Schema SQL completo** da `estatistica_parlamentar_agregada` — escrito em
  alto nível na §Sprint 7.0 PR1; detalhes finais (constraints, comentários
  de coluna) ficam para o PR do engineer
- **Conteúdo do ADR-025** — depende de execução do spike; só pode ser
  redigido pós-resultados
- **Conteúdo de PROMPT-MESTRE-WAVE-7.md** — owner pode querer redigir
  separadamente ou pular esse artefato; não foi acordado na sessão designer
- **Plano de release v0.7.0** — fora do escopo Wave 7 enquanto execução não
  começa
- **Mudanças em CODEOWNERS** — paths novos da Wave 7 podem precisar de
  novos owners, mas isso entra no PR final da wave, não no início

Tudo o que **está** no handoff foi explicitamente acordado. Tudo o que
**não está** mas surgir durante execução: pausar e perguntar ao owner.
