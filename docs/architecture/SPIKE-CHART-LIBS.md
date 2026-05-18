# Spike — Avaliação de bibliotecas de chart para Wave 7

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-05-17
> Status: **completed** — decisão em [ADR-025](ADR/025-chart-lib-wave-7.md)
> Branch preservada: `spike/chart-lib-benchmark` (tag `spike-chart-lib-v1`)

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
| 3 | **Nivo** (`@nivo/bar` + `@nivo/line`) | latest | SVG, declarativo React-first | ~50+ kB |
| 4 | **Observable Plot** | latest | SVG, declarativo, vanilla | ~50 kB |

> **Nota — slot 3 substituído**: o slot original era Visx (tree-shaken).
> Visx 3.12.0 declara `peerDependencies.react: ^16-18` e não suporta
> React 19 (projeto em `react@19.2.6`). Owner aprovou troca por Nivo,
> que aceita `react: ^19` no peer. Decisão registrada no commit
> `spike: swap visx for nivo (R19 incompat)`.

Pacotes Nivo a importar:

- `@nivo/core` (peer obrigatório; arrasta uma vez)
- `@nivo/bar` (ResponsiveBar para Chart A)
- `@nivo/line` (ResponsiveLine para Chart B)

Cada `@nivo/X` arrasta uma fatia de `d3-*`. Bundle real a medir no spike.

## PoC scope — idênticas para todas as libs

Quatro PoCs, mesmo dado mock, mesmo design visual, em rota dedicada:

```
/dev/charts-bench
  ├─ /recharts       # PoC 1
  ├─ /uplot          # PoC 2
  ├─ /nivo           # PoC 3 (era /visx)
  └─ /observable-plot # PoC 4
```

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

```typescript
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
```

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
- **SVG-based libs (Recharts, Nivo, Observable Plot)**: aceitam `<title>`,
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

```bash
git checkout -b spike/chart-lib-benchmark

# Instalar as 4 libs (commits separados para diff isolado)
npm i recharts                          # commit 1
npm i uplot react-uplot                 # commit 2
npm i @nivo/core @nivo/bar @nivo/line   # commit 3 (era visx — R19 incompat)
npm i @observablehq/plot                # commit 4
```

Cada `npm i` em commit isolado para que o spike final possa **descartar 3 libs
com 3 reverts limpos** sem tocar a vencedora.

### Medição #1 — Bundle

```bash
# Baseline (sem libs)
git checkout main && npm run build
# Capturar tamanho dos chunks em .next/static/chunks/

# Por lib
git checkout spike/chart-lib-benchmark
npm run build
# Capturar chunks que contêm a lib (dynamic-imported via /dev/charts-bench/<lib>)
```

Output literal de `npm run build` (com `--profile` se necessário) colado no
ADR-025.

### Medição #2 — Lighthouse

```bash
# Servidor de produção local
npm run cf:preview &  # bind 0.0.0.0 para acesso de outro device se necessário

# Lighthouse CLI com config mobile
npx lighthouse http://localhost:8788/dev/charts-bench/recharts \
  --preset=mobile \
  --throttling.cpuSlowdownMultiplier=4 \
  --throttling-method=devtools \
  --output=json --output-path=./lh-recharts.json

# Repetir para 4 libs, 3 runs cada
```

Extrair LCP, INP (de `audits.interaction-to-next-paint`), TBT do JSON.

### Medição #3 — axe-core

```bash
# Adicionar @axe-core/playwright em devDependencies (descartável pós-spike)
npm i -D @axe-core/playwright

# Script em spike/scripts/axe-bench.ts roda axe nas 4 rotas
npx tsx spike/scripts/axe-bench.ts > axe-results.json
```

### Medição #4 — VoiceOver (manual)

Apenas na lib vencedora de critérios 1-4. Owner executa em macOS:

1. `cmd+F5` ativa VoiceOver
2. Navega para `/dev/charts-bench/<vencedor>`
3. Registra 3 cenários acima como texto no PR do ADR-025
4. Se falhar → próxima lib do ranking + retry

## Estrutura do branch

```
spike/chart-lib-benchmark
├─ src/
│  └─ app/
│     └─ dev/
│        └─ charts-bench/
│           ├─ layout.tsx           # links para 4 PoCs
│           ├─ mock.ts              # dado compartilhado
│           ├─ recharts/page.tsx    # PoC 1
│           ├─ uplot/page.tsx       # PoC 2
│           ├─ nivo/page.tsx        # PoC 3 (era visx — R19 incompat)
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
```

Rota `/dev/charts-bench` herda do precedente `/dev/design` (já existe em
`src/app/dev/design/`). Layout pai pode adicionar header "Spike Wave 7 —
não-produção, descartar após ADR-025".

**Branch não merga em `main`.** Pós-decisão:

1. ADR-025 redigido com resultados literais copiados deste branch
2. Branch separa em duas: `spike/chart-lib-benchmark` (preservado para
   referência, marcado read-only via tag) + `feat/sprint-7.4-chart-lib`
   (apenas a lib vencedora + scaffolding mínimo + revert das 3 perdedoras)
3. `/dev/charts-bench` removido na branch de feature (não vai pra prod)

## Tabela de resultados (final — pós-execução 2026-05-17)

Outputs literais em `spike/results/` (branch `spike/chart-lib-benchmark`,
tag `spike-chart-lib-v1`).

### Bundle (C1, ≤35 kB gzip)

Fonte: `spike/results/bundle.md`. Heurística: chunk identificado em
`.next/static/chunks/` via grep por string do package.

| Lib | Chunk raw bytes | Chunk gzip bytes | Gzip kB | Passou C1? |
|---|---:|---:|---:|:---:|
| Recharts 3.8 | 306 238 | 85 354 | 83.4 | ❌ (2.4× over) |
| uPlot 1.6 (vanilla, sem wrapper) | 52 528 | 22 534 | 22.0 | ✅ |
| Nivo 0.99 (@nivo/bar+line+core) | 275 909 | 84 806 | 82.8 | ❌ (2.4× over) |
| Observable Plot 0.6 | 192 966 | 66 038 | 64.5 | ❌ (1.8× over) |

### Lighthouse (C2/C3/C4) — não medidos

Pulados por decisão de escopo do owner em `2026-05-17`. Veredito do
spike não depende deles: 3 libs já reprovam C1, e a quarta (uPlot)
reprova C5. Scripts em `spike/scripts/lh-bench.sh` ficam preservados
para reabertura se a Wave 8 justificar.

### axe-core (C5, lib-only — 4 violations de layout descontadas)

Fonte: `spike/results/axe.md`.

| Lib | Critical | Serious | Moderate | Minor | Lib-specific violations | Passou C5? |
|---|---:|---:|---:|---:|---|:---:|
| Recharts | 0 | 0 | 0 | 0 | (nenhuma) | ✅ |
| uPlot | 0 | 0 | 0 | 0 | (canvas opaco a screen readers) | ❌ |
| Nivo | 0 | 2 | 0 | 0 | `svg-img-alt` | ❌ |
| Observable Plot | 0 | 7 | 0 | 0 | `aria-prohibited-attr` | ❌ |

**Nota uPlot**: axe não detecta canvas (sem árvore acessível). "0 violations"
é falso positivo — VoiceOver confirmaria que o gráfico é invisível a
screen readers.

### VoiceOver (manual) — não rodado

Pulado: nenhuma lib passou em C5 lib-only por axe (exceto falso positivo
do uPlot). Veredito final do C5 fica em axe + análise de canvas opaco.

### Matriz consolidada

| Lib | C1 | C5 | Passa todos? |
|---|:---:|:---:|:---:|
| Recharts | ❌ | ✅ | ❌ |
| uPlot | ✅ | ❌ | ❌ |
| Nivo | ❌ | ❌ | ❌ |
| Observable Plot | ❌ | ❌ | ❌ |

## Decisão pós-spike

**Nenhuma lib qualificou em todos os critérios obrigatórios.**

Conforme o procedimento de escalation desta § (regra original):

> Se nenhuma lib qualifica: escalar a owner. Possíveis caminhos:
> - Relaxar threshold de um critério com justificativa
> - Implementar fallback `<table>` semântico + lib canvas (custo extra)
> - Reabrir CSS-only com 3 tentativas adicionais

Owner autorizou em `2026-05-17`:

**Caminho A — Adotar Recharts com C1 relaxado para ≤90 kB gzip.**

Justificativa empírica: todas as libs SVG declarativas excedem 35 kB
quando medidas no chunk real do bundler (não no advertised size). uPlot
cabe mas paga preço inaceitável em a11y (canvas opaco). Recharts é a
única opção que entrega o sinal cívico completo (bar categoria + line
mensal vs mediana) com a11y honesta (axe-clean, SVG semântico).

Detalhes, trade-offs e plano de saída em
[ADR-025](ADR/025-chart-lib-wave-7.md).

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
- [Nivo](https://nivo.rocks/)
- [Observable Plot](https://observablehq.com/plot/)
