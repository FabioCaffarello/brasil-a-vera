# ADR-025: Lib de chart para a Wave 7 — Recharts com C1 relaxado

> Brasil a Vera · Arquitetura · v0.2
> Última atualização: 2026-05-18
> Status: accepted
>
> **Histórico de mudanças**:
> - v0.1 (2026-05-17): adoção inicial com C1 ≤90 kB gzip
> - v0.2 (2026-05-18): C1 ajustado para ≤105 kB gzip após medição
>   empírica integrada na Sprint 7.4 PR1 (#241). Detalhes em §Decisão.

---

## Sumário

- [Contexto](#contexto)
- [Resultados literais do spike](#resultados-literais-do-spike)
- [Decisão](#decisão)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Plano de saída](#plano-de-saída)
- [Referências](#referências)

---

## Contexto

A Wave 7 (Sprint 7.4) introduz dataviz em `/parlamentares/[id]` para gastos
CEAP — barra horizontal por categoria + curva mensal vs mediana da casa.
CSS-only foi descartado após 3 tentativas honestas (tooltip preciso +
escala proporcional + mediana sobreposta excedem o que `<div>` + `clip-path`
entregam sem complexidade desproporcional).

ADR-023 trava entrada de qualquer lib JS sem critério concorrente provado.
O spike em `docs/architecture/SPIKE-CHART-LIBS.md` definiu 4 candidatos +
5 critérios (bundle ≤35 kB gzip, LCP ≤2.5s, INP ≤200ms, TBT ≤200ms,
a11y axe-zero + VoiceOver). Execução em `spike/chart-lib-benchmark`.

Durante o spike, **2 desvios** se materializaram:

1. **Visx (slot 3 original) → trocado para Nivo**. Visx 3.12.0 declara
   peer `react ^16-18` (não suporta R19). Owner aprovou troca em
   commit `cb2b217`.
2. **C2/C3/C4 (Lighthouse: LCP/INP/TBT) não medidos**. Owner optou em
   `2026-05-17` por rodar apenas C1 (bundle) + C5 (a11y), pulando
   Lighthouse para economizar tempo (decisão registrada na conversa do
   spike). Esta lacuna **não muda o veredito**: 3 das 4 libs já reprovam
   por C1 ou C5; a quarta passa C1 mas reprova C5.

## Resultados literais do spike

### C1 — Bundle gzip (≤35 kB)

Fonte: `spike/results/bundle.md`, chunks identificados em
`.next/static/chunks/` via grep por string do package.

| Lib | Chunk principal | Raw bytes | Gzip bytes | Gzip kB | Passou C1 |
|---|---|---:|---:|---:|:---:|
| Recharts 3.8 | `01pie4ngqsdik.js` | 306 238 | 85 354 | **83.4** | ❌ |
| uPlot 1.6 (vanilla) | `0nt5m2e81a41e.js` | 52 528 | 22 534 | **22.0** | ✅ |
| Nivo 0.99 (@nivo/bar+line+core) | `15otvwpukwxje.js` | 275 909 | 84 806 | **82.8** | ❌ |
| Observable Plot 0.6 | `188d_zz6q9.6y.js` | 192 966 | 66 038 | **64.5** | ❌ |

### C2/C3/C4 — Lighthouse (não medidos)

Pulados por decisão de escopo do owner em `2026-05-17`. Não impacta o
veredito (ver §Decisão). Reabrir esta medição é trivial via
`spike/scripts/lh-bench.sh` se Wave 8 ou refinamento justificar.

### C5 — a11y (axe-core lib-only)

Fonte: `spike/results/axe.md`, viewport 375×667, `@axe-core/playwright`
4.11.3. 4 violations comuns a todas as libs vêm do layout `/dev/*`
(landmark-* + aria-hidden-focus em nav) e foram **descontadas**.

| Lib | Violations da lib | Severity | C5 lib-only |
|---|---|---|:---:|
| Recharts | (nenhuma) | — | ✅ |
| uPlot | (nenhuma via axe; canvas opaco para screen readers) | — | ❌ |
| Nivo | `svg-img-alt` (2 nodes) | serious | ❌ |
| Observable Plot | `aria-prohibited-attr` (7 nodes) | serious | ❌ |

**Caveat uPlot**: axe não detecta canvas porque canvas não tem árvore
acessível. Resultado "0 violations" é falso positivo — VoiceOver (não
rodado) confirmaria que o gráfico é invisível a screen readers. Para
adoção, uPlot exige fallback `<table>` semântico off-screen sincronizado
(custo extra significativo, não implementado no PoC).

### Matriz consolidada

| Lib | C1 (bundle) | C5 (a11y) | C2-C4 | Passa todos os 5? |
|---|:---:|:---:|:---:|:---:|
| Recharts | ❌ (83.4) | ✅ | — | ❌ |
| uPlot | ✅ (22.0) | ❌ canvas opaco | — | ❌ |
| Nivo | ❌ (82.8) | ❌ svg-img-alt | — | ❌ |
| Observable Plot | ❌ (64.5) | ❌ aria-prohibited | — | ❌ |

**Nenhuma lib qualifica em todos os critérios obrigatórios.**

Conforme `SPIKE-CHART-LIBS.md` §"Decisão pós-spike":

> Se nenhuma lib qualifica: escalar a owner. Possíveis caminhos:
> - Relaxar threshold de um critério com justificativa (ADR registra)
> - Implementar fallback `<table>` semântico + lib canvas (custo extra)
> - Reabrir CSS-only com 3 tentativas adicionais

## Decisão

**Caminho A adotado**: Recharts com C1 relaxado para **≤105 kB gzip**
(atualizado de 90 kB → 105 kB em 2026-05-18; ver §"Ajuste do C1 pós-
medição integrada" abaixo). Owner autorizou em `2026-05-17` após
apresentação dos 3 caminhos abaixo. Spike encerrado; Sprint 7.4
destravada.

### Caminho A (adotado) — Recharts com C1 relaxado para ≤105 kB gzip

**Justificativa do relax**: o threshold original (≤35 kB gzip) foi
conservador demais. O spike provou empiricamente que **todas as libs SVG
declarativas** (Recharts 83 kB, Nivo 82 kB, Plot 64 kB) excedem 35 kB
quando se mede chunk real produzido pelo bundler (não advertised size
da lib). Apenas uPlot (canvas) cabe — mas paga preço inaceitável em a11y.

Trade-off:

- **Recharts ~83-101 kB gzip** vive em chunk dynamic-imported isolado, só
  baixado quando usuário visita `/parlamentares/[id]` E rola até a seção
  de gastos. Path anônimo (home, listagem, busca) zero JS preservado.
  (Range: spike isolado mediu 83 kB; integração real do PR1 mediu 101 kB
  — ver §"Ajuste do C1 pós-medição integrada".)
- **A11y honesta** preservada — SVG semântico, axe-clean, VoiceOver
  espera-se OK (verificação manual no Sprint 7.4 antes do merge).
- **Persona primária (Cidadão Consciente, 80% mobile)** ganha dataviz
  acessível; alternativa CSS-only foi descartada por incapacidade de
  cobrir tooltip+escala+mediana.

Novo threshold C1 = **≤105 kB gzip** (atualizado em 2026-05-18 — ver
§"Ajuste do C1 pós-medição integrada"). Reabertura via ADR-X se a
Wave 8 introduzir 2ª lib JS pesada que ultrapasse orçamento agregado
de bundle (a definir).

### Ajuste do C1 pós-medição integrada (2026-05-18)

O spike isolado (`spike/chart-lib-benchmark`) mediu **83.4 kB gzip**
para o chunk do Recharts. A Sprint 7.4 PR1 (#241) — primeiro consumer
real em `gastos-resumo.tsx` via `dynamic({ssr:false})` — mediu o chunk
isolado em **100.7 kB gzip** (`0zyw.c85a1.du.js`, 350 kB raw):

| Métrica | Spike (isolado) | Prod integrado (PR1) | Δ |
|---|---:|---:|---:|
| Chunk Recharts raw | 306 kB | 350 kB | +14% |
| Chunk Recharts gzip | 83.4 kB | 100.7 kB | +17 kB |

Causas prováveis do aumento:

1. **Surface area de imports maior**: o PoC do spike usava só
   `<BarChart>` + `<LineChart>`. O consumer real importa também
   `<CartesianGrid>`, `<ResponsiveContainer>`, `<XAxis>`, `<YAxis>`,
   `<Tooltip>`, `<Bar>` — mais módulos no chunk
2. **Bundling integrado vs route isolada**: o spike rodou em rota de
   benchmark dedicada (`/dev/charts-bench/recharts`) com shared chunks
   diferentes; em prod integrada o tree-shake muda. Esse é um sinal
   meta-importante para spikes futuros: medir em consumer real, não
   só em PoC isolada

**Owner autorizou em 2026-05-18 (#241 mergeado)** ajustar o threshold
para **≤105 kB gzip** — 5 kB de margem sobre 100.7 kB, alinhada à
margem do C1 original. Justificativa: nenhuma lib alternativa do spike
caberia em 90 kB sequer no isolamento; reabrir o spike para 10% de
diferença sem ganho semântico seria churn desproporcional.

### Caminho B (não adotado) — Voltar a CSS-only com escopo reduzido

Adiar mediana sobreposta para Wave 8 (ou descartar). Implementar:

- **Chart A** (barra horizontal por categoria) — `<div>` + `width: %` +
  `bg-chart-1`. Já viável em CSS hoje.
- **Chart B** (linha mensal sem mediana) — descartado ou substituído por
  **bar mensal** (mesmo padrão do Chart A, replicado).

Bundle: 0 kB. Trabalho: ~1 dia. Custo de UX: perda da comparação com
mediana (sinal cívico chave — "este parlamentar gasta acima/abaixo da
casa?"). Recuperação possível na Wave 8 via lib (ADR subsequente).

Owner descartou: a perda do sinal "vs. mediana" enfraquece a tese do
produto.

### Caminho C (não adotado) — uPlot + fallback `<table>` off-screen

Custo de implementação: alto. Sincronização canvas↔table exige
re-renderização de DOM a cada update de dado, hidratação extra, risco
de drift se canvas e table desalinham. Para 2 charts em 1 rota não paga.
Reabrir se Wave 9+ trouxer >5 charts (economia de bundle composta).

Owner descartou: ROI negativo para o escopo atual.

## Alternativas Consideradas

### Recharts (≅ Caminho A acima)

- **Prós**: SVG semântico, ecossistema React-first, API estável, axe-clean
  out-of-box, melhor a11y default das 4
- **Contras**: 83.4 kB gzip (2.4× threshold autoral), API verbose
  (composable via Children — sintaxe React-clássica mais que React-moderna)
- **Veredicto**: **adotado**

### uPlot

- **Prós**: bundle 22 kB gzip (single lib em compliance C1), performance
  top-tier (canvas), API enxuta
- **Contras**: canvas-based → a11y zero (uPlot Bar exige fallback
  `<table>` off-screen, custo extra significativo); bar horizontal
  não-nativo (PoC renderizou como vertical); wrapper React (`react-uplot`
  0.0.9) tem bug em R19 strict (já contornado com inline useEffect+ref)
- **Veredicto**: descartado para Wave 7. Reconsiderar em Wave 8+ se
  bundle composto justificar o custo de fallback table

### Nivo

- **Prós**: API declarativa moderna, peer R19, SVG
- **Contras**: 82.8 kB gzip (~Recharts), `svg-img-alt` violation default
  (exige props `ariaLabel` em cada componente — fix trivial mas
  esquecível); ecossistema menor que Recharts; cada `@nivo/X` arrasta
  `@nivo/core`
- **Veredicto**: descartado. Sem ganho claro sobre Recharts e tem custo
  a11y default pior

### Observable Plot

- **Prós**: API muito declarativa (grammar of graphics), maintained pelo
  time D3, SVG, vanilla (sem peer React)
- **Contras**: 64.5 kB gzip (still over), `aria-prohibited-attr` violation
  por uso de `aria-label` em `<g>` (regra WAI-ARIA viola); fix exige
  patch upstream ou wrapper que reescreve atributos pós-render (alto
  custo); montagem via useRef+useEffect adiciona boilerplate
- **Veredicto**: descartado. Maior custo de fix de a11y que Nivo, sem
  vantagem de bundle clara sobre Recharts

### CSS-only (≅ Caminho B acima)

- **Prós**: 0 kB bundle, máxima a11y (HTML semântico), zero risco
- **Contras**: tooltip preciso + escala proporcional + mediana sobreposta
  inviáveis sem complexidade desproporcional (3 tentativas no design já
  confirmaram). Escopo reduzido (sem mediana) atende mas perde sinal cívico
  central
- **Veredicto**: descartada

## Consequências

### Positivas

- Dataviz acessível, alinhada com Cidadão Consciente (axe-clean,
  SVG semântico)
- Chunk isolado: zero impacto no path anônimo (home, listagem, busca)
- Recharts é estável; manutenção de baixa fricção
- Comparação com mediana entrega o sinal "este parlamentar gasta
  acima/abaixo da casa" — central para a tese do produto

### Negativas

- +100.7 kB gzip no chunk de `/parlamentares/[id]` (somente quando o
  usuário rola até gastos — medição empírica integrada do PR1 da
  Sprint 7.4, #241)
- Threshold C1 oficialmente relaxado para 105 kB — futuro ADR sobre
  nova lib JS precisa contar contra mesmo orçamento
- Bundle budget de Wave 7 pós-spike sobe (acompanhar em PR Sprint 7.4)

## Plano de saída

Independente do caminho escolhido, este ADR define o sinal que dispararia
substituição:

- **Bundle composto** > 200 kB gzip somando todas as libs JS dynamic-imported
  em qualquer rota — reabrir ADR para consolidar charts num bundle único
  (ex.: trocar Recharts por Visx quando Visx ganhar peer R19)
- **Regressão de Lighthouse mobile** (LCP > 2.8s ou INP > 250ms sustentada
  por 7 dias em rotas com chart) — reabrir spike com novo set de candidatos
- **Lib vencedora deixar de receber updates** > 12 meses — checar
  alternativas antes que ecossistema force migração reativa

`spike/chart-lib-benchmark` branch preservada como referência via tag
`spike-chart-lib-v1`. PoCs descartáveis após decisão; apenas Recharts
sobrevive em `feat/sprint-7.4-*` (próximo PR da Sprint 7.4).

## Referências

- [SPIKE-CHART-LIBS.md](../SPIKE-CHART-LIBS.md) — plano + metodologia + critérios
- [spike/results/bundle.md](../../../spike/results/bundle.md) — output literal C1
- [spike/results/axe.md](../../../spike/results/axe.md) — output literal C5
- [ADR-018 — Cache de edge na camada do app](018-cache-edge-app.md) —
  política de TTL e chunk fingerprint
- [ADR-019 — Disciplina arquitetural sem gargalo](019-disciplina-arquitetural-sem-gargalo.md)
  — princípio aplicado: critério antes da escolha; spike antes da decisão
- [ADR-023 — Critérios para introdução de animação](023-criterios-de-animacao-e-revealing.md)
  — modelo de "ADR de critério" replicado para dataviz
- [ADR-024 — Acentos secundários (`--accent` roxo)](024-acentos-secundarios-accent-roxo.md)
  — tokens `--chart-*` já existem em `globals.css`
- [`docs/features/PARLAMENTAR-360.md`](../../features/PARLAMENTAR-360.md) —
  spec da rota de destino
