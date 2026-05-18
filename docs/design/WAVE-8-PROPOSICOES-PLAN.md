# Wave 8 — Plano de redesign /proposicoes · Handoff para próxima sessão

> Brasil a Vera · Design · v1.0
> Última atualização: 2026-05-18
> Status: **handoff (sessão designer → próxima sessão engineer)** — owner autorizou rodada final em 2026-05-18
> Role esperado para retomada: **engineer** (execução direta, sem novas decisões)

---

## Sumário

- [Como ler este handoff](#como-ler-este-handoff)
- [Contexto](#contexto)
- [Diagnóstico — estado atual de /proposicoes](#diagnóstico--estado-atual-de-proposicoes)
- [Princípios norteadores (Wave 8)](#princípios-norteadores-wave-8)
- [Decisões cravadas](#decisões-cravadas)
- [Decisões resolvidas na rodada 2](#decisões-resolvidas-na-rodada-2)
- [Sequenciamento final (Sprint 8.0 pré-trabalho + 4 sprints + cleanup oportunístico)](#sequenciamento-final-sprint-80-pré-trabalho--4-sprints--cleanup-oportunístico)
- [Contratos de fallback](#contratos-de-fallback)
- [Métricas de sucesso](#métricas-de-sucesso)
- [Fora de escopo](#fora-de-escopo)
- [Ordem de execução pós-aprovação](#ordem-de-execução-pós-aprovação)
- [O que NÃO está neste handoff](#o-que-não-está-neste-handoff)

---

## Como ler este handoff

Este documento é **auto-suficiente**. A engineer Claude que retoma a
sessão não precisa reler as 2 rodadas críticas anteriores — tudo que
ficou acordado está cristalizado aqui.

Histórico de rodadas (referência, não material de decisão):

- **Rodada 1** (2026-05-18) — designer propôs Wave 8 com 5 sprints, 7
  decisões em aberto. Owner respondeu cravando 1 decisão arquitetural
  transversal (HeroSection plain universal — reverte Wave 7 Sprint 7.1
  PR1) e pediu rigor designer/PM nas 7
- **Rodada 2** (2026-05-18) — designer resolveu as 7 decisões com
  justificativa explícita por persona, adicionou Sprint 8.0 PR0, cortou
  Sprint 8.5 dedicado, cortou chart de atividade tramitação. Owner
  autorizou rodada final

Ordem sugerida de leitura:

1. **Contexto** → entender a tese da Wave 8
2. **Decisões cravadas + Decisões resolvidas** → o que NÃO é mais
   negociável
3. **Sequenciamento** → mapa dos PRs
4. **Ordem de execução** → primeiro PR a abrir
5. **Contratos de fallback** → guarda-corpos durante execução

Engineer Claude da próxima sessão **inicia execução direta**, sem
precisar perguntar. Se uma decisão nova surgir durante execução (ex:
choice entre 2 abordagens de implementação não cobertas neste handoff),
engineer Claude **deve pausar e perguntar** — não escolher por conta
própria.

---

## Contexto

A **Wave 7** consolidou um padrão arquitetural em `/parlamentares` (perfil
360° com KpiStrip comparativo, scroll-spy SectionNav, Accordion mobile,
cursor pagination, dataviz Recharts dynamic-imported). A jornada do
**Cidadão Consciente** ficou validada no eixo "pessoa pública".

A `/proposicoes` ficou estagnada no padrão da **Wave 6** (Sprints 6.2 e
6.3): tem o esqueleto certo (HeroSection, SectionNav, SectionCard), mas os
componentes secundários são JSX cru, falta narrativa de KPIs, falta share,
falta breadcrumb, falta cursor, falta dataviz, e a listagem tem `limit=50`
hard-coded sem busca textual nem ordenação.

A Wave 8 fecha esse gap e estende o **mesmo padrão arquitetural** ao eixo
"artefato jurídico". A tese: o cidadão que entendeu seu parlamentar via
Wave 7 agora consegue entender **as proposições daquele parlamentar** com
a mesma profundidade e ergonomia.

### Persona primária

- **P1 — Cidadão consciente** (80% mobile, 375×667): chega via busca ou
  share, quer entender em <20s "essa lei aprova o quê, quem está apoiando,
  está parada ou andando". Mesma persona da Wave 7
- **P2 — Jornalista**: abre 5-10 proposições por sessão, precisa de
  tramitação completa, autores agregados por partido, votações vinculadas
  com resultado. Precisa de cursor pagination
- **P3 — Eleitor que veio do perfil do parlamentar** (novo nesta wave):
  jornada já validada na Wave 7 com Top 5 / Pares, agora estende: "vi que
  meu deputado é autor desta lei — o que ela faz, e como ele votou em
  votações relacionadas?"

### Por que agora

- `/parlamentares` virou a porta de entrada de mais alto tráfego do
  produto (assunção a validar com Plausible quando a Wave 9 ligar
  analytics)
- O footer cross-link de proposições no perfil (Sprint 8.2 PR5) só
  faz sentido se a página de destino ofereça densidade equivalente
- Componentes JSX cru em `src/components/proposicao/**` viraram dívida que
  contamina futuro

---

## Diagnóstico — estado atual de /proposicoes

Inventário levantado em sessão de auditoria (paths citados literalmente).

### Rotas existentes

- `src/app/proposicoes/page.tsx` — Listagem com filtros (limit=50, sem busca)
- `src/app/proposicoes/[tipo]/[numero]/[ano]/page.tsx` — Detalhe
- `src/app/proposicoes/opengraph-image.tsx` + variante no detalhe — OG images
- **Ausentes**: `layout.tsx`, `error.tsx`, `not-found.tsx`, `loading.tsx`
- **Ausentes**: sub-rotas dedicadas (`/tramitacao`, `/autores`, `/votos`)

### Componentes específicos

Em `src/components/proposicao/`:

| Arquivo | Função | Composição DS? |
|---|---|---|
| `filtros.tsx` | FilterChips tipo+situação + select ano | Sim (FilterChips) |
| `proposicao-card.tsx` | Card ref+ementa+badge | **Não** (JSX cru) |
| `perfil-header.tsx` | Header h1+ementa+trust+source | **Não** (JSX cru) |
| `autores-list.tsx` | Lista parlamentares/comissões | **Não** |
| `temas-list.tsx` | Tags de tema | **Não** |
| `tramitacao-timeline.tsx` | Timeline border-l | **Não** |
| `votacoes-vinculadas.tsx` | Cards votações | **Não** |

### Queries

Em `src/lib/queries/proposicoes.ts` (203 linhas):

`listProposicoes`, `getProposicaoByChave`, `getTemasByProposicao`,
`getAutoresByProposicao`, `getVotacoesByProposicao`,
`getTramitacaoByProposicao` (cached TTL), `countProposicoes`,
`getAnosDistintos`

**Ausentes para Wave 8**: agregados estatísticos por proposição
(`dias_em_tramitacao`, `ultima_movimentacao`, `n_autores`), agregados
globais por ano/tipo, queries de "proposições relacionadas" (mesmo autor /
mesmo tema), busca por ementa/número.

### Gaps vs /parlamentares Wave 7

| Camada | /parlamentares hoje | /proposicoes hoje | Gap a fechar Wave 8 |
|---|---|---|---|
| HeroSection | Variant gradient + StatsGrid | Variant plain, sem StatsGrid | Reverter parlamentares para plain (PR0) + adicionar StatsGrid em proposições |
| Busca | `<input name="q">` SSR + ordem | Sem busca, sem ordenação | Adicionar ambos |
| Filtros avançados | Combobox Partido/UF + chips ativos | Apenas chips de tipo/situação | Adicionar Combobox tema + chips ativos |
| Card listagem | v2 com agregados | Card cru | ProposicaoCard v2 |
| Paginação | Cursor versionado v1 (ADR-026) | `limit=50` fixo | Aplicar ADR-026 |
| Detalhe header | Breadcrumb + Compartilhar | Apenas h1 + ementa | Adicionar ambos |
| Detalhe KPIs | KpiStrip 4 KPIs comparativos | Sem KpiStrip | Adicionar (estrutura narrativa, ver §Decisões resolvidas #1) |
| Mobile detalhe | Accordion type=multiple | Stack linear | Adicionar Accordion (tramitação + autores abertos, §Decisões resolvidas #3) |
| Filtros nas seções | Mini-filtros + cursor | Sem | Adicionar em tramitação + votações |
| Dataviz | Recharts + Sparkline + barra CSS | Nenhum | Adicionar (sem chart de atividade, §Decisões resolvidas #7) |
| Cross-links footer | Mesma casa/partido/UF | Sem | Adicionar mesma autoria + mesmo tema (§Decisões resolvidas #4) |
| Trust honestidade | Matriz fallback ParlamentarCard | Implícita | Cravar matriz proposição (§Contratos) |

---

## Princípios norteadores (Wave 8)

Seis heranças da Wave 7. P7 e P8 são novos.

| # | Princípio | Origem |
|---|---|---|
| P1 | **Densidade > floreio.** Espaço por sinal cívico, não estético | CLAUDE.md |
| P2 | **Honestidade do dado preserva trust_level.** Toda agregação ganha L-badge | TRUST-PYRAMID |
| P3 | **Mobile primeiro, 375×667 antes de qualquer outro viewport** | PERSONAS.md |
| P4 | **`--accent` é inflexão narrativa, não CTA** | ADR-024 |
| P5 | **Animação em CSS** (`@starting-style`, View Transitions, scroll-timeline) | ADR-023 |
| P6 | **Dados → cache de edge ou SSG com revalidate** | ADR-018 + CLAUDE.md §9 |
| P7 | **Proposição = artefato jurídico com ciclo de vida**, não pessoa com histórico contínuo. Idade + última movimentação + situação atual contam uma narrativa curta | novo Wave 8 |
| **P8** | **Uniformidade visual entre eixos.** HeroSection plain em todas as rotas. Identidade do produto é discrição editorial, não afirmação decorativa. Diferenciação narrativa vem do conteúdo (StatsGrid, KpiStrip, DataBadges), nunca do fundo | novo Wave 8 |

P7 consequência prática: o KpiStrip da proposição **não** copia a estrutura
de quatro métricas quantitativas do parlamentar. Estrutura cravada na
rodada 2: ver §Decisões resolvidas #1.

P8 consequência prática: Sprint 8.0 PR0 reverte gradient em
`/parlamentares`. Daqui em diante, qualquer rota nova nasce plain. Variant
gradient/gradient-glow permanece **disponível** no DS para uso futuro
condicional, mas **vedada** em rotas de produto sem novo ADR.

---

## Decisões cravadas

### Escopo Wave 8

- **Wave 8 = redesign completo de `/proposicoes` e
  `/proposicoes/[tipo]/[numero]/[ano]`** alinhando à mesma vara de
  qualidade da Wave 7
- **Wave 8 inclui PR0 transversal** — reversão de HeroSection gradient →
  plain em `/parlamentares` (uniformização visual P8)
- **Wave 8 NÃO inclui**:
  - Comparação inter-proposição (lado a lado) — deferido Wave 9+
  - Watchlist / "seguir proposição" — depende de auth
  - Diff entre versões de texto — depende de ingestão de texto integral
    (ADR-016 prefere URL+fetch on-demand, então é Wave 10+)
  - Notificações de tramitação — depende de auth
  - Sub-rotas dedicadas (`/tramitacao`, `/autores`, `/votos`) — sem
    evidência de demanda; manter dentro da mesma página com âncoras
  - Analytics/Plausible — sai com Wave 9 pós-tráfego
  - Light mode
  - Sprint 8.5 dedicado para cleanup DS — cleanup vira oportunístico
    dentro de 8.1-8.4 (§Decisões resolvidas #5)

### Constraints técnicas (herdadas)

- ADR-023 (animação CSS-only, sem framer-motion)
- ADR-024 (`--accent` apenas inflexão narrativa)
- ADR-018 (cache de edge / SSG com revalidate)
- ADR-025 (Recharts é a lib vencedora — não rodar spike de novo)
- ADR-026 (cursor opaco versionado v1 — reusar helpers `src/lib/cursor.ts`
  + `src/lib/queries/cursor-schemas.ts`)
- CLAUDE.md §12 (banco scale-to-zero é regra)

### Constraints de design (cravadas rodada 2)

- **HeroSection `variant="plain"` em todas as rotas, sem exceção** (P8)
- **Materialized view rejeitada** em favor de tabela agregada com
  `INSERT … ON CONFLICT … DO UPDATE` (consistência com Wave 7)
- **pg_trgm rejeitado** para busca de ementa em Wave 8 — começar com
  `ILIKE` + B-tree em `numero` e `ementa`. Reabrir se cardinalidade subir
  significativamente

### Decisões de UX cravadas

- **Breadcrumb + Compartilhar promovidos para Sprint 8.2** —
  fundacionais da jornada Cidadão Consciente, mesmo padrão Wave 7
- **KpiStrip com estrutura narrativa de 4 slots** (Situação · Idade ·
  Apoio · Votações), conforme §Decisões resolvidas #1
- **Cross-links footer mantidos em 8.2 PR5**
- **Busca por ementa/número = `<form method="get">` + Enter** — sem
  debounce, sem onChange, sem JS
- **Sub-rotas dedicadas não entram**
- **Accordion mobile default-expanded em "tramitação" + "autores"**
  conforme §Decisões resolvidas #3
- **Bundle delta alvo ≤+5 kB gzip** (margem honesta), validado empírico
  no Sprint 8.4 PR1

---

## Decisões resolvidas na rodada 2

Cada uma foi argumentada como designer/PM expert. Razão explícita para
honrar P1 (densidade) e P2 (honestidade do dado).

### #1 — Estrutura do KpiStrip

**Decisão**: 4 slots fixos com hint condicional no slot Idade.

| Slot | Label | Value | Hint |
|---|---|---|---|
| 1 | **Situação** | `"Tramitando"` / `"Aprovada"` / `"Arquivada"` / `"Vetada"` (chip tone-aware) | `"Última movimentação há {N} dias em {órgão}"` ou `"Sem movimentação registrada"` |
| 2 | **Idade** | `"{N} dias em tramitação"` | **condicional**: `"vs mediana {mediana} dias para {tipo}"` se amostra ≥ 50 proposições do mesmo tipo no banco; caso contrário, hint vazio |
| 3 | **Apoio** | `"{N} autores"` | `"{P} partidos · {U} UFs"` (sempre disponível) |
| 4 | **Votações** | `"{N} votações"` ou `"Nenhuma ainda"` | `"{X} aprovadas · {Y} rejeitadas"` ou hint vazio se N=0 |

**Why**: o slot "Situação" não é número, mas é o sinal cívico #1 da
proposição ("isso está vivo?"). Sacrificar a pureza de "KpiStrip = grid
de números" pela coerência narrativa é a chamada certa em P7. Slot 2
ganha hint condicional porque honestidade (P2) não permite comparar com
mediana de amostra pequena — para MPV ou PRC pode haver <10 ocorrências
no banco, e "vs mediana de 3" é desonesto.

**Implementação**: campo novo no agregado:
`mediana_dias_tipo_referencia integer NULL` (preenchido só se
`COUNT(*) WHERE tipo=X >= 50`). Decoder na UI checa NULL → suprime hint.

### #2 — Spec do "Apoio por partido" (Sprint 8.4 PR2)

**Decisão**: 4 escolhas explícitas.

| Pergunta | Resposta | Por quê |
|---|---|---|
| Conta autoria principal ou todas? | **Apenas `tipoAutoria = 'AUTOR'`** (não coautor, não apoiador) | Coautores e apoiadores entram em massa por gesto político público. Autoria principal é a estatística mais robusta da quem-realmente-fez |
| Sigla ou nome completo do partido? | **Sigla** (PT, PL, UNIÃO...) | Espaço mobile é crítico; sigla é canônica em DC brasiliense; tooltip mostra nome completo |
| Quantos partidos antes de agregar em "Outros"? | **Top 6 + "Outros"** | 6 barras horizontais é o máximo que cabe em 375×667 sem scroll vertical excessivo. Coleta o resto em uma barra cinza neutra "Outros" |
| O que mostra o tooltip? | Sigla + count + lista compacta de até 5 nomes; se >5: `"...e N outros"` | P2/jornalista precisa dos nomes; P1/cidadão pode ignorar tooltip. Ambos servidos sem inflar UI principal |

**Why**: cada escolha resiste à pergunta "isso é honesto e útil?". Top 6
não é arbitrário — é o limite empírico do viewport mobile primário.

### #3 — Accordion mobile default-expanded

**Decisão**: **"tramitação" + "autores"** abertos por default. Outras
seções (votações vinculadas, temas) fechadas com chevron visível.

**Why** (hierarquia das perguntas cívicas em mobile share):

1. *"Essa lei está viva ou morta?"* → **tramitação** responde (última
   movimentação + órgão atual + barra de progresso CSS no header da
   seção, ver Sprint 8.3 PR4). Pergunta #1 do P1.
2. *"Quem está por trás disso?"* → **autores** responde (lista com
   PartyBadge). Pergunta de confiança #2. Se reconhece autor → tem
   contexto para julgar.
3. *"Como o sistema reagiu?"* → **votações** responde, mas é
   pergunta de aprofundamento (P2/jornalista mais que P1). Fica
   fechada por default, chevron visível.
4. *"Sobre o quê é?"* → **temas** é categorização (cabeça pra catálogo,
   não pra entendimento de um caso). Fechada por default.

Alternativa A descartada: "tramitação + votações" — privilegiaria P2/
jornalista sobre P1/cidadão (persona primária). Errado pela hierarquia
de personas.

Alternativa B descartada: "ementa-expandida + tramitação" — ementa já
está visível no PerfilProposicaoHeader acima do Accordion. Duplicar
seria desperdício de viewport.

### #4 — Critério de "tema relacionado" (footer cross-links)

**Decisão**: **tema com maior cardinalidade global** entre os temas
catalogados desta proposição. Em caso de empate: ordem alfabética da
descrição do tema.

**Why**: a hipótese inicial "tema dominante = primeiro catalogado" tem
um problema crítico — a ordem dos temas no payload da API da Câmara não
é estável nem semântica; é simplesmente ordem de inserção. Não há
ranking de relevância no dado de origem.

Solução melhor: para cada tema catalogado nesta proposição (`SELECT
codigo_tema FROM proposicao_tema WHERE proposicao_id = ?`), conta quantas
**outras proposições** no banco têm o mesmo tema. Escolhe o de maior
cardinalidade. Esse é o tema "canônico" — o que tem mais conteúdo para
drill-down útil.

Exemplo: uma PL classificada como "Educação · Aperfeiçoamento da gestão
escolar municipal de Sergipe". O cidadão que clica em "Outras de
{tema}" prefere ver +400 proposições de Educação a ver 3 de "Gestão
escolar SE". O tema dominante semanticamente = o tema com escala de
acervo.

**Custo Neon**: query envolve `SELECT codigo_tema, COUNT(*) FROM
proposicao_tema GROUP BY codigo_tema` filtrado pelos códigos da
proposição. Para evitar custo recorrente: pré-computar no agregado
`estatistica_proposicao_agregada.tema_canonico_codigo text NULL` durante
o seed/refresh. Footer só lê coluna pronta — 1 SELECT WHERE.

### #5 — Sprint 8.5 (cleanup DS) — dentro ou fora?

**Decisão**: **eliminar Sprint 8.5 dedicado**. Cleanup é
**oportunístico inline** dentro dos sprints 8.1-8.4, sempre que o PR
toca o componente alvo.

**Why** (3 razões):

1. **Sprint dedicado a cleanup é dívida pública** — atrasa release
   v0.8.0 sem benefício observável para usuário final. PR dedicado de
   refactor compete com features e perde priorização sempre
2. **Cleanup inline é mais barato** — quando você está editando
   `proposicao-card.tsx` para adicionar mini-barra de progresso (Sprint
   8.1 PR4), encapsular em composição custa pouco a mais. Fazer isso
   depois em PR separado custa releitura completa do componente
3. **DS evolution natural** — encapsulação responde a uso real, não a
   ambição teórica. Se TramitacaoTimeline ficar usada só em 1 lugar
   após Wave 8, nem precisa virar composição genérica do DS

**Como aplicar**:
- Sprint 8.1 PR4 (ProposicaoCard v2) — se reescrita do card é grande,
  encapsular em `src/design-system/compositions/list-card.tsx` (genérico
  reutilizável para `/votacoes` também). Engineer decide no PR
- Sprint 8.2 PR2 (PerfilProposicaoHeader v2) — usar PartyBadge em
  AutoresList se autoria principal for parlamentar. Trivial
- Sprint 8.3 PR4 (barra de progresso CSS) — se passar de 30 linhas, vai
  para composição própria. Caso contrário, fica componente local
- Sprint 8.4 PR2/PR3 — charts naturalmente isolados em
  `proposicao-charts*.tsx`; nenhum vira composição genérica do DS

Engineer Claude tem autonomia para fazer essas escolhas no momento do
PR — pausa só se a decisão exceder "componente local vs composição DS"
(ex: nova primitiva, mudança em tokens).

### #6 — Bundle delta — orçamento da Wave 8

**Decisão**: **alvo ≤ +5 kB gzip total**. Validado empírico no Sprint
8.4 PR1 com `npm run build` antes/depois, output literal copiado no PR
description.

**Why**: a hipótese da rodada 1 ("0 kB porque Recharts já carregado")
era teoricamente plausível mas empiricamente otimista. Razões para
esperar pequeno delta real:

1. **Chunk-merging do Webpack não é garantia** — `/parlamentares/[id]/gastos`
   e `/proposicoes/[…]` são rotas diferentes; cada dynamic import
   produz chunk próprio a menos que Next/Webpack detecte
   tree-shareable common chunk (depende da config atual)
2. **Wrapper específico de proposição custa bytes** — `proposicao-charts.tsx`
   precisa de adaptador de dados (autores → barras por partido,
   votações → donut). Isso é código novo, não reuso direto do wrapper
   de gastos
3. **Honestidade arquitetural** — cravar "0 kB" antes do benchmark e
   depois ter que ajustar é o anti-padrão que CLAUDE.md §13 critica
   explicitamente. Sprint 8.4 PR1 obriga benchmark antes de aceitar

5 kB é margem suficiente para wrapper + dados adaptados sem deixar
elasticidade pra ineficiência. Se benchmark mostrar +20 kB: PR é
rejeitado e refatorado para isolamento melhor.

### #7 — Chart "Atividade de tramitação" — útil ou ruído?

**Decisão**: **cortar da Wave 8**. Sprint 8.4 fica com 3 PRs (setup +
apoio por partido + donut de votos), sem o chart de atividade temporal.
Reabrir em Wave 9+ condicionado a evidência empírica de demanda.

**Why** (análise por persona):

- **P1 (cidadão)**: pergunta é "está andando ou parou?". Barra de
  progresso CSS (Sprint 8.3 PR4) + hint da Situação no KpiStrip
  ("Última movimentação há N dias em X órgão") respondem **com clareza
  superior** ao chart. Chart pediria interpretação visual; barra
  responde verbalmente
- **P2 (jornalista)**: pergunta seria "houve aceleração suspeita?".
  Chart serviria — mas P2 hoje resolve isso indo direto na tramitação
  completa (cursor pagination + lista) e contando manualmente. Não é
  fricção crítica
- **P3 (eleitor via parlamentar)**: pergunta é "meu deputado é autor —
  isso virou lei?". Mesma de P1, barra + KpiStrip respondem

Custo do chart (mesmo dynamic-imported): ~3-5 kB extras + complexidade
de adaptação de dados (eventos→buckets mensais→mediana do tipo) que
exige nova query agregada. Ganho marginal apenas para P2 que tem
workaround.

**Princípio aplicado**: ADR-019 — adições só com gargalo concreto
observado. Sem analytics nem evidência de uso, adicionar chart
especulativo viola disciplina. Reabrir quando Wave 9 trouxer dados de
uso que justifiquem.

---

## Sequenciamento final (Sprint 8.0 pré-trabalho + 4 sprints + cleanup oportunístico)

> Cada PR abaixo entra em commit isolado. Cada sprint fecha com PR
> "Sprint X.Y fecha sprint" e tag local antes do próximo.

```
[Pré-Wave 8 — Sprint 8.0]

  PR 0: HeroSection plain universal (uniformização P8)
        Reverter src/app/parlamentares/page.tsx: variant="gradient" → "plain"
        Auditar TODAS as ocorrências de HeroSection no projeto:
          grep -rn "variant=" src/app | grep -i hero
        Garantir que zero rotas usam gradient ou gradient-glow
        Smoke test visual via /dev/design + checagem manual em mobile 375
        Sem mudança no design system (variants seguem disponíveis)
        ⛔ Bloqueia início de todos os PRs subsequentes da Wave 8

  PR 1: migration estatistica_proposicao_agregada
        Schema cravado rodada 2:
          proposicao_id uuid PRIMARY KEY REFERENCES proposicao(id)
          dias_em_tramitacao integer NOT NULL DEFAULT 0
          dias_desde_ultima_tramitacao integer NULL
          n_autores integer NOT NULL DEFAULT 0
          n_partidos_autores integer NOT NULL DEFAULT 0
          n_ufs_autores integer NOT NULL DEFAULT 0
          n_votacoes integer NOT NULL DEFAULT 0
          n_votacoes_aprovadas integer NOT NULL DEFAULT 0
          n_votacoes_rejeitadas integer NOT NULL DEFAULT 0
          n_eventos_tramitacao integer NOT NULL DEFAULT 0
          ultimo_orgao text NULL
          aprovada_em_alguma_casa boolean NOT NULL DEFAULT false
          mediana_dias_tipo_referencia integer NULL  -- NULL se amostra <50
          tema_canonico_codigo text NULL              -- decisão resolvida #4
          trust_level text NOT NULL DEFAULT 'L2'
          computed_at timestamptz NOT NULL DEFAULT now()
        Indexes:
          idx_estat_proposicao_dias ON (dias_em_tramitacao DESC)
          idx_estat_proposicao_movimentacao ON (dias_desde_ultima_tramitacao ASC NULLS LAST)
          idx_estat_proposicao_tema_canonico ON (tema_canonico_codigo) WHERE tema_canonico_codigo IS NOT NULL
        Migration: src/shared/db/migrations/0009_*.sql (SQL puro)
        REQUIREMENTS NO PR DESCRIPTION:
          - EXPLAIN ANALYZE da query mais pesada (join com tramitacao + agregação tema)
          - Output literal de seed em dev (3 runs idempotência)

  PR 2: agregados globais por ano/tipo + mediana por tipo
        Função: getEstatisticasGlobaisProposicoes()
          → { total, tramitando, aprovadas_12m, rejeitadas_arquivadas_12m }
        Função: computeMedianaDiasPorTipo()
          → Map<TipoProposicao, {mediana: number, amostra: number} | null>
          (retorna null se amostra < 50; usado pelo seed do PR1)
        Cache: edge (ADR-018), revalidate 6h
        Path: src/lib/queries/proposicoes-stats.ts (novo arquivo)

  PR 3: queries de relacionadas (footer cross-links)
        - getProposicoesMesmoAutor(autorId, exceptId, limit=5)
        - getProposicoesMesmoTema(temaCodigo, exceptId, limit=5)
        Tema = tema_canonico_codigo da proposição (pré-computado PR1)
        Cache: edge, revalidate 1h
        Path: src/lib/queries/proposicoes-relacionadas.ts (novo arquivo)

  PR 4: cursor schemas para proposições
        Adicionar em src/lib/queries/cursor-schemas.ts:
          - proposicaoListaCursor = z.object({v:z.literal(1), a:z.number().int(), n:z.number().int(), id:z.string().uuid()})
          - tramitacaoCursor = z.object({v:z.literal(1), d:z.number().int().positive(), id:z.string().uuid()})
        Tests: src/lib/queries/__tests__/cursor-proposicoes.test.ts
        Sem mudança em src/lib/cursor.ts (helpers v1 já cobrem)

[Sprint 8.1 — Listagem reskin /proposicoes]

  PR 1: HeroSection plain + StatsGrid (sem mudança de variant)
        src/app/proposicoes/page.tsx — manter variant="plain"
        Adicionar <StatsGrid> com 4 items:
          Total · Tramitando · Aprovadas (12m) · Rejeitadas/Arquivadas (12m)
        Consome getEstatisticasGlobaisProposicoes (Sprint 8.0 PR2)
        Hint em cada stat: tom narrativo curto (ex: "no Congresso", "neste momento", "últimos 12 meses")

  PR 2: Busca por ementa/número + ordenação SSR
        src/components/proposicao/filtros.tsx — adicionar <input name="q">
        Form GET existente. Sem onChange. Enter submete.
        src/lib/queries/proposicoes.ts:listProposicoes — params novos:
          q?: string, ordem?: 'recente'|'antiga'|'movimentada'|'parada'
        Index B-tree em proposicao.numero + ementa (sem pg_trgm)
        Default ordem: 'recente' (ano DESC, numero DESC)

  PR 3: Combobox Tema + chips de filtro ativo
        Consome primitiva command (já existe, Sprint 7.0 PR3)
        <Combobox name="tema"> alimentado por SELECT DISTINCT codigo_tema
        Chips de filtro ativo abaixo dos inputs, com × para remover
        Padrão buildHref em filtros.tsx (reuso do helper Wave 7)

  PR 4: ProposicaoCard v2 consumindo agregados
        ⛔ MERGE GATE: estatistica_proposicao_agregada populada em dev/preview
        src/components/proposicao/proposicao-card.tsx — adicionar:
          - Mini-barra de progresso de tramitação (CSS, 4px, 5 marcos)
          - Footer compacto: "N autores · M votações · X dias"
        CONTRATO DE FALLBACK no PR description (§Contratos de fallback)
        DECISÃO INLINE (engineer): se rewrite passa de 100 linhas, considerar
          encapsular em src/design-system/compositions/list-card.tsx
          (reutilizável /votacoes futuramente)

  PR 5: Cursor pagination + checkpoint mobile 375×667
        Aplicar ADR-026 v1 para listagem
        Schema: proposicaoListaCursor (Sprint 8.0 PR4)
        Substituir limit=50 hard-coded
        Link "Mostrar mais" como <a href="?after=...#mostrar-mais">
        ⛔ CHECKPOINT: revisão heurística 375×667 (DevTools mobile emul)
          5 perguntas registradas no PR description:
            1. StatsGrid carrega antes do primeiro card visível?
            2. Card v2 não força horizontal scroll em 375?
            3. Combobox Tema abre sem cobrir o input de busca?
            4. Chips ativos cabem em 1-2 linhas sem cortar?
            5. "Mostrar mais" leva ao topo da nova página com scroll suave?
          Aceite: 4 de 5 SIM.

[Sprint 8.2 — Detalhe reskin + mobile + share]

  PR 1: KpiStrip v2 (4 KPIs narrativos)
        ⛔ MERGE GATE: agregados populados (mesmo do 8.1 PR4)
        src/app/proposicoes/[tipo]/[numero]/[ano]/page.tsx — adicionar KpiStrip
        Estrutura fixa (decisão resolvida #1):
          Slot 1 — Situação (chip + sub-line última movimentação)
          Slot 2 — Idade (hint condicional vs mediana se !NULL)
          Slot 3 — Apoio (N autores, hint P partidos · U UFs)
          Slot 4 — Votações (N + hint X aprovadas · Y rejeitadas, ou empty subtle)
        Sem rewrite do componente KpiStrip — só preenche prop existente

  PR 2: PerfilProposicaoHeader v2 — breadcrumb + Compartilhar
        src/components/proposicao/perfil-header.tsx — adicionar:
          - Breadcrumb sutil "← Proposições" acima do header
          - Botão [Compartilhar] no fim do header (variant="outline")
        SEM remoção do trust badge + source url existentes (preservar P2)
        DECISÃO INLINE (engineer): se AutoresList for tocada, usar PartyBadge
          para autores parlamentares (decisão resolvida #5)

  PR 3: Dialog Compartilhar resumo proposição
        Reusa src/design-system/primitives/dialog.tsx
        Reusa CompartilharButton client component (criado Wave 7 Sprint 7.2 PR3)
        Conteúdo:
          - URL canônica do detalhe (path /proposicoes/[tipo]/[numero]/[ano])
          - Texto pré-formatado WhatsApp:
            "📜 {ref} — {ementa truncada 120ch}
            Tramitando há {dias} dias. {n autores} autores.
            Ver: {url}"
          - Texto pré-formatado X (≤280 chars)
          - Botão "Copiar link" (Clipboard API + toast via sonner)

  PR 4: Accordion mobile via Radix
        Primitiva accordion já existe (Wave 7 Sprint 7.2 PR4)
        Em [tipo]/[numero]/[ano]/page.tsx — wrap das SectionCards num
        <Accordion type="multiple"> com defaultValue=['tramitacao', 'autores']
        (decisão resolvida #3)
        APENAS abaixo de sm: via CSS (hidden sm:block para SectionNav;
        sm:hidden para Accordion)

  PR 5: Footer cross-links
        No fim de [tipo]/[numero]/[ano]/page.tsx:
          - "Outras proposições deste autor: ..." (top 5 do autor principal)
          - "Outras proposições neste tema: ..." (top 5 do tema canônico)
          - "Voltar para listagem →"
        Consome queries do Sprint 8.0 PR3 (tema_canonico_codigo)
        ⛔ CHECKPOINT: revisão heurística 375×667
          5 perguntas no PR description:
            1. KpiStrip 4 slots cabem em 2 colunas no mobile?
            2. Breadcrumb funciona via tap/swipe nativo do iOS Safari?
            3. Compartilhar abre sem cobrir o título da proposição?
            4. Accordion default-expanded (tramitação + autores) aparece sem scroll inicial?
            5. Footer cross-links visível antes de 8 viewports de scroll?
          Aceite: 4 de 5 SIM.

[Sprint 8.3 — Filtros mini + cursor nas seções do detalhe]

  PR 1: Tramitação com cursor pagination
        src/lib/queries/proposicoes.ts:getTramitacaoByProposicao — params:
          cursor?: TramitacaoCursorPayload
        UI: link "Mostrar mais (N restantes)" como <a href="?tram_after=...#tramitacao">
        Page size: 20 (padrão ADR-026)

  PR 2: Filtros mini em Tramitação
        FilterChips: "Marcos importantes" (apresentação, aprovação em comissão,
        aprovação em plenário, sanção/veto) vs "Tudo"
        Reset cursor ao trocar filtro
        Critério "marco": lista canônica de descricaoResumida (ex: ["Apresentação",
        "Aprovação em Comissão", "Aprovação em Plenário", "Sanção", "Veto",
        "Publicação"]) em src/lib/queries/proposicoes.ts:MARCOS_TRAMITACAO

  PR 3: Filtros mini em Votações vinculadas
        FilterChips: resultado (todas / aprovadas / rejeitadas) + casa
        (todas / Câmara / Senado)
        Sem cursor (cardinalidade naturalmente baixa, raramente >20)
        Se >20: aplicar cursor padrão (decisão no PR, com count em dev)

  PR 4: Barra de progresso de tramitação CSS-only
        No header da SectionCard "Tramitação":
          Apresentação ────── Comissões ─●──── Plenário ────── Senado ────── Sanção
                                          (atual)
        Marca atual highlighted (--brand; --accent reservado para inflexão narrativa P4)
        Sem JS. Acessível via title + aria-label
        Mesmo widget reusado no header do ProposicaoCard v2 (Sprint 8.1 PR4)
        em escala reduzida

[Sprint 8.4 — Dataviz e narrativa]

  ⛔ Reusa ADR-025 (Recharts). Sem spike. Bundle delta alvo ≤+5 kB gzip.

  PR 1: Setup compartilhado de chart proposição + benchmark
        src/components/proposicao/proposicao-charts.tsx — wrapper isolado
        const Charts = dynamic(() => import('./proposicao-charts-client'))
        REQUIREMENTS NO PR DESCRIPTION:
          - Output literal `npm run build` antes
          - Output literal `npm run build` depois
          - Diff de chunks (script spike/scripts/bundle-diff.sh do Wave 7)
          - Veredicto: delta total ≤ +5 kB gzip?
        SE delta > +5 kB:
          - PR é rejeitado
          - Refatorar para isolamento melhor (avaliar reaproveitar
            wrapper de gastos via shared module)

  PR 2: Chart "Apoio por partido"
        BarChart horizontal (Recharts) consumindo proposicao_autor:
          - WHERE tipoAutoria = 'AUTOR' (decisão resolvida #2)
          - GROUP BY partido
          - ORDER BY count DESC
          - LIMIT 6 + agregado "Outros"
        Tooltip pt-BR:
          - Sigla + nome completo do partido
          - count de parlamentares
          - lista compacta de até 5 nomes; se >5: "...e N outros"
        Cor única --chart-1 + variação por tom (P4: não usar hue distintos)
        Fallback empty state: "Autoria parlamentar não disponível" (autoria por
          comissão/órgão não entra no chart)

  PR 3: Donut/Stacked bar de votos consolidados
        Aplicável se proposição tem ≥1 votação vinculada
        Sim / Não / Abstenção / Obstrução agregados de todas as votações
        Última votação destacada separadamente (P2 — honestidade)
        Fallback empty state: "Nenhuma votação registrada ainda"
        ⛔ CHECKPOINT: revisão heurística 375×667
          5 perguntas no PR description:
            1. Charts dynamic-imported aparecem em <1s após scroll para a seção?
            2. Bundle delta total ≤ +5 kB gzip vs main?
            3. Tooltip do "Apoio por partido" não corta no viewport 375?
            4. Donut de votos é legível em 375 sem zoom?
            5. Fallback empty state em proposição sem votação não quebra layout?
          Aceite: 4 de 5 SIM. Bundle delta é hard requirement (não conta no aceite, é gate).

[Cleanup oportunístico — não é sprint dedicado]

  Conforme decisão resolvida #5:
  - Cada PR de 8.1-8.4 que tocar componente JSX cru avalia se faz sentido
    encapsular em composição do DS
  - Engineer tem autonomia para fazer a chamada no momento do PR
  - Pausar e perguntar se a decisão exceder "componente local vs DS"
    (ex: nova primitiva, mudança em tokens)
```

---

## Contratos de fallback

### ProposicaoCard v2 (Sprint 8.1 PR4)

A mini-barra de progresso de tramitação **só renderiza quando o dado é
honesto**. P2 (honestidade) é não-negociável.

| Estado | Trigger | Render |
|---|---|---|
| `com_marcos` | `n_eventos_tramitacao ≥ 3` AND `ultimo_orgao IS NOT NULL` | Barra 5 marcos + label "Em {ultimo_orgao}" |
| `sem_marcos_relevantes` | `n_eventos_tramitacao > 0` AND `n_eventos_tramitacao < 3` | Apenas chip de situação + "Apresentada há {N} dias" — sem barra |
| `sem_tramitacao_registrada` | `n_eventos_tramitacao = 0` | Apenas chip de situação + "Sem tramitação registrada" — sem barra (subtle) |
| `dados_obsoletos` | `dias_desde_ultima_tramitacao > 365` | Mesma de `com_marcos` + tooltip `<title>`: "Sem movimentação há mais de 1 ano" |

### KpiStrip detalhe (Sprint 8.2 PR1)

Cada slot tem regra de fallback narrativo:

| Slot | Trigger fallback | Render fallback |
|---|---|---|
| Situação | Sempre tem (campo obrigatório no schema) | N/A — slot sempre preenchido |
| Idade | `created_at IS NULL` (legado pré-ingestão) | Value: "Idade não calculável" subtle; hint suprimido |
| Idade hint | `mediana_dias_tipo_referencia IS NULL` (amostra <50 do tipo) | Hint suprimido — só value visível |
| Apoio | `n_autores = 0` (defensivo, improvável) | Value: "Autoria não cadastrada" subtle; hint suprimido |
| Apoio hint | `n_partidos_autores = 0` (autoria só por comissão/órgão) | Hint: "Autoria por órgão" subtle (sem números) |
| Votações | `n_votacoes = 0` | Value: "Nenhuma ainda" subtle; hint suprimido |

### Cross-links footer (Sprint 8.2 PR5)

| Estado | Trigger | Render |
|---|---|---|
| `com_autor_parlamentar` | autor principal é `parlamentarId NOT NULL` AND ≥1 outra proposição daquele autor | "Outras proposições de {nome}: ..." |
| `autoria_orgao_only` | autor principal é órgão/comissão (sem parlamentar associado) | Suprimir bloco de mesmo-autor (mantém só mesmo-tema) |
| `tema_canonico_orphan` | proposição é única no tema | Suprimir bloco de mesmo-tema (mantém só mesmo-autor) |
| `nem_um_nem_outro` | ambos os acima | Footer mostra apenas "Voltar para listagem →" |

---

## Métricas de sucesso

A medir antes do PR 1 do Sprint 8.1 (baseline) e após Sprint 8.4 fechar
(release v0.8.0).

| Métrica | Baseline | Alvo Wave 8 |
|---|---|---|
| Lighthouse perf (mobile) `/proposicoes` | a medir | ≥90 |
| Lighthouse perf (mobile) `/proposicoes/[…]` | a medir | ≥90 |
| Bundle gzip delta vs main | 0 | ≤+5 kB (hard gate Sprint 8.4 PR1) |
| LCP mobile Slow 3G | a medir | ≤2.5s |
| INP mobile (KpiStrip + Accordion) | a medir | ≤200ms |
| TBT mobile | a medir | ≤200ms |
| axe-core violations | a medir | 0 |
| Profundidade média de scroll detalhe | a medir | +30% qualitativo (heurística sem Plausible) |

Métricas qualitativas (sem analytics até Wave 9): cada PR fechando sprint
exige revisão heurística 375×667 com 5 perguntas registradas no PR
description (padrão Wave 7).

---

## Fora de escopo

Para evitar dúvida sobre o que **não** entra na Wave 8:

- **Comparação inter-proposição** — Wave 9 com comparador genérico
- **Watchlist / "seguir esta proposição"** — depende de auth
- **Diff entre versões de texto da proposição** — depende de ingestão de
  texto integral (ADR-016 prefere URL+fetch on-demand)
- **Notificações de tramitação** — depende de auth
- **Sub-rotas dedicadas** — só justificar com evidência de demanda
- **Light mode** — fora de escopo de toda a v0.x
- **Chart "Atividade de tramitação"** (decisão resolvida #7) — reabrir
  Wave 9+ com evidência empírica
- **Sprint 8.5 dedicado** (decisão resolvida #5) — cleanup é inline
- **Ingestão histórica pré-2023** — escopo de ingestão, não desta wave;
  ProposicaoCard v2 deve degradar graciosamente

---

## Ordem de execução pós-aprovação

Owner autorizou em 2026-05-18 (rodada final). Engineer da próxima sessão
executa direto:

### Passo 1 — Validar contexto (5 min)

```bash
echo "BAV_CLAUDE_ROLE=$BAV_CLAUDE_ROLE"
# Esperado: engineer
```

Se vazio: avisar owner, parar.

### Passo 2 — Sprint 8.0 PR0 (HeroSection plain universal)

⛔ **Primeiro PR da Wave 8, bloqueia todos os outros**.

```bash
# Auditar uso atual
grep -rn "HeroSection" src/app | grep -i "variant"
grep -rn "variant=\"gradient" src/app
```

Esperado encontrar pelo menos `src/app/parlamentares/page.tsx`. Trocar
todos para `variant="plain"`. Smoke test em `/dev/design` + manual em
mobile 375.

Commit: `chore(design): HeroSection plain universal (Wave 8 PR0 — reverte gradient Wave 7)`

### Passo 3 — Sprint 8.0 PR1 (migration agregada)

Conteúdo conforme §Sprint 8.0 PR1 + EXPLAIN ANALYZE no PR description.

### Passo 4 — Sprint 8.0 PR2-4 em paralelo se quiser

Helpers de query, cursor schemas — independentes entre si.

### Passo 5 — Sprint 8.1 em diante, sequencial

Cada PR fecha com revisão heurística mobile + commit conventional.

### Passo 6 — Release v0.8.0

Após Sprint 8.4 fechar. Usar skill `/release-notes` com tag
`v0.8.0-proposicao-360`.

---

## O que NÃO está neste handoff

Para evitar dúvida sobre escopo:

- **Wireframes ASCII detalhados** das telas — designer faz inline no PR 1
  de cada sprint se necessário
- **ADR-027 redigido** — não é necessário; agregado de proposição reusa
  exato padrão do Wave 7 (estatistica_parlamentar_agregada). Schema fica
  documentado inline no Sprint 8.0 PR1
- **Conteúdo de PROMPT-MESTRE-WAVE-8.md** — owner decide se redige
- **Plano de release v0.8.0** — fora do escopo enquanto execução não começa
- **Mudanças em CODEOWNERS** — entra no PR final da wave

Tudo o que **está** neste handoff foi cravado nas rodadas 1 e 2 com owner.
Tudo o que **não está** mas surgir durante execução: pausar e perguntar
ao owner.
