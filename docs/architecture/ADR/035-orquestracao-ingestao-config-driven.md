# ADR-035: Orquestração de ingestão dirigida por configuração

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-15
> Status: accepted

## Contexto

A ingestão de dados públicos roda em GitHub Actions cron (CLAUDE.md, ADR-007).
Cada entidade ingerida (deputados, senadores, proposições, votações, gastos,
tramitação, orientações, backfill) era um **job YAML hand-written**, repartido
em três workflows por cadência (`ingestion.yml`, `ingestion-votacoes.yml`,
`ingestion-weekly.yml`) — 9 jobs no total, cada um repetindo o mesmo corpo
(`checkout → setup → npm ci → npm run <script> → notify-failure`).

Um refactor anterior (composite actions `setup-project` / `run-ingestion`)
eliminou a duplicação de *steps*, mas não a de **definição de job**: adicionar
uma entidade ainda exige um bloco de job novo.

Forças em jogo:

- **Crescimento de fontes está no roadmap, não é hipótese.** O PRODUCT-VISION
  prevê **TSE** (dados eleitorais, prestação de contas) e **Portal da
  Transparência/CGU** (emendas, contratos, gastos) como próximas fontes — cada
  uma com várias entidades × cadências. Escalar com job-por-entidade leva a
  dezenas de blocos YAML quase-iguais: caos de manutenção e divergência.
- **Restrição dura da plataforma.** O GitHub Actions só reconhece arquivos
  `.yml` **diretamente** em `.github/workflows/`. Subdiretórios
  (`.github/workflows/ingestion/daily.yml`) são silenciosamente ignorados —
  organizar por pasta não é opção.
- **Dependências reais entre ingestões.** Há ordem: proposições da Câmara
  dependem de deputados; backfill `votacao→proposicao` e orientações dependem
  das votações da Câmara. A solução precisa preservar esse DAG.
- **ADR-019 (disciplina sem gargalo).** Máquina nova exige gargalo concreto. O
  gargalo é duplo: duplicação **presente** (9 jobs) + crescimento **previsto e
  documentado** de fontes. Não é especulação aberta.
- **Princípios do projeto.** Zod no boundary (princípio 2); lógica pura testável
  separada de IO (convenção dos ops-scripts); validação empírica antes de
  mergear (princípio 13).

## Decisão

Adotar **ingestão dirigida por configuração**: um registro tipado das fontes é a
fonte única da verdade, e os workflows derivam seus jobs dele via `matrix`.

1. **`ingestion/registry.ts`** — array validado por Zod
   (`ingestionSourceSchema`), uma entrada por unidade de ingestão com
   `{ id, script, context, cadence, tier, timeoutMin }`. `cadence` ∈
   `daily | weekly | monthly`. `tier` ordena dependências dentro da
   cadência.

2. **`ingestion/ops/matrix-builder.ts`** (puro) — `buildTierMatrices(sources,
   cadence)` agrupa as fontes da cadência em tiers contíguos.
   **`ingestion/ops/print-matrix.ts`** (entry-point) — lê `CADENCE`, chama o
   builder e escreve `tierN=<json>` no `$GITHUB_OUTPUT`. Split obrigatório
   (vitest não pode acionar `main()` no import).

3. **Workflows `discover → tierN`.** Cada workflow de cadência tem um job
   `discover` que roda `npm run ingest:print-matrix` e expõe os tiers como
   outputs; cada `tierN` consome `fromJSON(needs.discover.outputs.tierN)` numa
   `matrix` e roda as entradas via a composite `run-ingestion`. `tier N+1`
   declara `needs: [discover, tierN]` — modela o DAG como níveis (sobre-
   aproximação segura: o tier inteiro espera o anterior).

**Votações consolidadas no `daily`.** Votações rodavam 4×/dia num workflow
próprio (`ingestion-votacoes.yml`) para frescor quase-real-time. Decidiu-se
trazê-las para a cadência `daily` (1×/dia): a cadência `votacoes` sai do enum e
o workflow é deletado, restando `ingestion-daily.yml` + `ingestion-weekly.yml`.
Trade-off aceito: dados de votação podem ficar até ~24h mais antigos, em troca
de menos runs e um modelo de cadência mais simples. Bônus de correção: o
backfill `votação→proposição` passa a rodar (tier 2) **depois** das proposições
do mesmo run, em vez de depender das proposições de um run anterior.

Invariantes preservados (paridade comportamental com o estado anterior):

- `strategy.fail-fast: false` — uma fonte falhando **não** cancela as irmãs
  (os jobs eram independentes).
- `timeout-minutes: ${{ matrix.timeoutMin }}` — timeout por entrada, idêntico
  aos valores atuais.
- `context` explícito por entrada — preserva o dedupe das issues de incidente
  já abertas (action `notify-failure`).
- Cron, `concurrency` e `permissions` de cada workflow inalterados.

**Adicionar uma fonte = 1 entrada no registry.** Uma cadência nova (ex.
`monthly`, hoje sem entradas) = 1 workflow a partir do template `discover →
tier`. Nenhum workflow `monthly` vazio é criado agora (ADR-019).

## Alternativas Consideradas

### Alternativa A — Subdiretórios `.github/workflows/ingestion/{daily,weekly,monthly}`
- Era a proposta inicial.
- **Inviável**: GitHub Actions ignora subpastas em `.github/workflows/`. Os
  arquivos nunca disparariam. Descartada por restrição de plataforma.

### Alternativa B — Manter job-por-entidade (status quo pós-composites)
- Simples, sem matrix.
- Não escala: cada nova entidade TSE/Portal = bloco YAML novo; divergência
  inevitável entre blocos. Não resolve o gargalo previsto.

### Alternativa C — Manifesto `.github/ingestion.json` lido com `jq`
- Não exige tsx para gerar a matrix.
- **Untyped** (contra o princípio 2 Zod-no-boundary) e fora da suíte vitest —
  um typo em `script` só apareceria em produção. Descartada em favor de TS+Zod.

### Alternativa D — Matrix plana sem tiers, `needs` por entrada
- Mais fiel ao DAG (espera exata, não o tier inteiro).
- GitHub não permite `needs` dinâmico entre instâncias de uma matrix. Exigiria
  jobs hand-written para as deps, reintroduzindo o que queremos eliminar. Os
  tiers são a sobre-aproximação pragmática.

## Consequências

### Positivas
- Adicionar fonte/entidade = 1 entrada tipada; zero job YAML novo.
- Fonte única da verdade: cadência, timeout, dedupe e DAG num só lugar,
  testável (`registry.test.ts` cruza `script` com package.json; tiers contíguos).
- Os workflows (daily + weekly) encolhem para `discover + tiers` e ficam
  estruturalmente idênticos — menos superfície para drift. Nomes por frequência
  (`ingestion-daily.yml` / `ingestion-weekly.yml`) eliminam a inconsistência
  anterior (um por conteúdo, um por frequência, um sem sufixo).

### Negativas
- **Frescor das votações cai de 4×/dia para 1×/dia** (consolidação no `daily`):
  resultados de votação podem ficar até ~24h atrasados. Trade-off consciente —
  menos runs e modelo de cadência mais simples. Reverter = mover as 4 fontes de
  volta a uma cadência própria com cron mais frequente (1 edição no registry +
  1 workflow).
- `tier N+1` espera **todo** o tier N, não só suas dependências exatas. Custo:
  um pouco de latência a mais quando uma dep cruza casas (ex. proposicoes-senado
  espera proposicoes-camara sem precisar). Aceitável: ingestão é cron, não
  caminho crítico de usuário.
- Um job `discover` extra por cadência (npm ci + ~1s). Custo desprezível.
- Indireção: ler "o que roda" exige abrir o registry, não o YAML. Mitigado pelo
  cabeçalho de cada workflow e pela tabela em WORKFLOWS.md.

### Neutras
- Cadência `monthly` é suportada pelo schema mas não tem fonte nem workflow
  hoje; materializa quando a primeira fonte mensal surgir.
- A composite `run-ingestion` (refactor anterior) é reusada pela matrix — o
  investimento se mantém.

## Referências

- [docs/contributing/WORKFLOWS.md](../../contributing/WORKFLOWS.md) — padrão discover→tier
- [ADR-019](019-disciplina-arquitetural-sem-gargalo.md) — disciplina sem gargalo
- [ADR-007](007-monolith-first-strategy.md) — ingestão em GitHub Actions cron
- [PRODUCT-VISION](../../product/PRODUCT-VISION.md) — fontes do roadmap (TSE, CGU)
- [GitHub Actions — workflows devem estar em `.github/workflows/` (sem subpastas)](https://docs.github.com/actions/using-workflows/about-workflows)
