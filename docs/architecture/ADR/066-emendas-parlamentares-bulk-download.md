# ADR-066: Emendas parlamentares via bulk download do Portal da Transparência

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-07-14
> Status: proposed

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Classificação na Pirâmide de Confiança](#classificação-na-pirâmide-de-confiança)
- [Riscos e pontos abertos](#riscos-e-pontos-abertos)
- [Não-objetivos (fora de escopo)](#não-objetivos-fora-de-escopo)
- [Referências](#referências)

---

## Contexto

O dossiê da Wave 14 ([planejamento](../../audits/2026-07-wave14-planejamento.md)
§4, Sprint 14.2) precisa responder **"para onde o parlamentar manda o
dinheiro?"** — emendas parlamentares são a ponta mais visível: valor
empenhado/pago por autor, com município de destino. Combinado com o
colégio eleitoral (ADR-065, entregue), habilita o confronto composto
"X% do valor de emendas destinou-se a municípios do colégio eleitoral"
— contexto factual, copy neutra (a legislação permite e espera
direcionamento à base).

O plano original previa a **API** `api.portaldatransparencia.gov.br/api-de-dados/emendas`,
que exige token `chave-api-dados` (cadastro gov.br). O probe de
2026-07-05 retornou **HTTP 401 sem token** e o cadastro seguia pendente
(ação do owner) — bloqueando a sprint. O probe de 2026-07-14
([anexo com output literal](../../audits/2026-07-probe-download-de-dados.md))
validou o caminho alternativo: o **bulk download**
(`portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares/UNICO`)
é público, sem token, redireciona para host dedicado de arquivos
(`dadosabertos-download.cgu.gov.br`, CloudFront) e entrega
`EmendasParlamentares.zip` (32 MB; CSV principal de 47 MB descomprimido)
atualizado com freshness de dias, contendo: nome do autor, ano, tipo de
emenda, município/UF de destino com código IBGE e valores por fase da
despesa (empenhado/liquidado/pago/restos a pagar).

Forças em jogo: eliminar o token do caminho crítico; rate limit da API
(~90 req/min, páginas pequenas) vs 1 GET; capacidade de streaming de CSV
zipado Latin-1 já instalada (padrão TSE, ADR-065 §E1); lição da #701
(validar acesso a partir dos runners do Actions antes de aprovar fonte).

## Decisão

### D1 — Fonte: bulk download, sem token

`GET /download-de-dados/emendas-parlamentares/UNICO` (seguir o 302) →
`EmendasParlamentares.zip`, processando **apenas**
`EmendasParlamentares.csv`. Os CSVs `_Convenios` e `_PorFavorecido`
(180 MB) ficam fora de escopo (ver Não-objetivos). Parse em streaming
(fflate + Latin-1 incremental), reusando `ingestion/tse/csv.ts`.

### D2 — Nova tabela `emenda_parlamentar` (agregada por emenda × município)

Granularidade do CSV: linha por emenda × classificação orçamentária ×
localidade. Persistimos o agregado por **(código da emenda, município de
destino)**, somando os valores das classificações — o produto consome
totais e top-municípios, não o detalhe de plano orçamentário.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID v7 | PK |
| `parlamentar_id` | UUID | FK → parlamentar.id (só emendas vinculadas — D3) |
| `codigo_emenda` | text | Código da Emenda (fonte) |
| `ano` | smallint | Ano da Emenda |
| `tipo_emenda` | text | ex.: "Emenda Individual - Transferências…" |
| `autor_codigo` | text | Código do Autor da Emenda (fonte) |
| `autor_nome` | text | Nome do Autor da Emenda (verbatim) |
| `municipio_ibge_codigo` | text nullable | null quando destino é UF/Nacional |
| `municipio_nome` | text nullable | |
| `uf` | char(2) nullable | |
| `valor_empenhado` | numeric(14,2) | Σ das linhas da emenda×município |
| `valor_liquidado` | numeric(14,2) | idem |
| `valor_pago` | numeric(14,2) | idem |
| `valor_rap_inscritos` | numeric(14,2) | restos a pagar inscritos |
| `valor_rap_pagos` | numeric(14,2) | restos a pagar pagos |
| `source_url` | text | URL do zip no host CGU |
| `ingested_at` | timestamptz | |

Trust level em aggregate root (princípio 3): `trust_level` + `source_url`
+ `ingested_at` na tabela.

### D3 — Vínculo autor → parlamentar: match determinístico por nome, fail-closed

O CSV identifica o autor por **nome** (caixa alta) + código orçamentário,
sem CPF. Vínculo:

- Normalizar (uppercase, sem acento) e casar contra `parlamentar`
  (nome eleitoral **e** nome civil).
- **Match único** → vincula. Homônimo/ambíguo → **não vincula**
  (fail-closed, mesmo padrão do ADR-063).
- Apenas emendas **individuais** entram no vínculo; emendas de bancada
  e de comissão ficam fora (autor não é um parlamentar).
- Só linhas com autor vinculado são persistidas (mesmo padrão de filtro
  do ADR-065 §E2 — não carregamos o universo).
- Taxa de match por ano medida na implementação e registrada no PR
  (linhas de 2014 têm autor "Sem informação" — cobertura por ano deve
  ser explícita na UI e no `/metodologia`).

### D4 — Idempotência: DELETE-by-ano + INSERT em transação; cadência `monthly`

O arquivo é snapshot completo e **valores de anos antigos mudam** (restos
a pagar são pagos/cancelados ao longo do tempo). Cada run mensal refaz
todos os anos presentes no arquivo: `DELETE` por ano + `INSERT` em
transação (princípio 5, camada de ingestão node-postgres). Registry:
entrada `cgu-emendas`, cadência `monthly`, tier após `t0` (depende só de
`parlamentar`).

### D5 — Exibição: seção "Emendas" no perfil + confronto composto

- Total por ano (empenhado e pago), com seletor de ano.
- Top 5 municípios de destino por valor pago (fallback empenhado quando
  pago = 0 no ano corrente).
- Fail-closed: seção oculta sem emendas vinculadas.
- **Confronto composto com ADR-065** (entrega separada, após
  `/metodologia`): "% do valor destinado a municípios do colégio
  eleitoral" — cálculo determinístico L2; exige ponte de código de
  município TSE↔IBGE (ver Riscos).
- Copy neutra (ADR-040 §4): sem "muito/pouco", sem juízo sobre
  direcionamento à base.

### D6 — Footprint estimado antes da migration (gate da Wave 14)

Estimativa a validar no PR com contagem real do CSV: ~10–20k emendas
individuais/ano × poucos municípios de destino ≈ **50–150k rows**
agregadas para o conjunto de autores vinculados (2014→corrente). Se a
projeção medida passar de ~300k rows, cortar por top-N municípios por
emenda ou por janela de anos — decisão no PR com números literais
(princípio 10/11 e critério de Done da Wave 14).

## Alternativas Consideradas

### A. API `api-de-dados/emendas` (plano original)

- **Prós**: JSON documentado (Swagger); filtro server-side por autor/ano;
  payload mínimo por request.
- **Contras**: exige token gov.br (blocker externo confirmado — 401 em
  2026-07-05, cadastro pendente); rate limit ~90 req/min com páginas
  pequenas → varredura completa exige centenas/milhares de requests
  paginados por run; secret + rotação no CI; mais um modo de falha de
  rede no caminho do cron.
- **Veredicto**: rejeitada. Mesma base de dados por baixo; o bulk entrega
  o dataset inteiro em 1 GET de 32 MB sem dependência externa.

### B. SIGA Brasil / Painel do Orçamento (SIOP)

- **Prós**: fonte primária orçamentária, granularidade máxima.
- **Contras**: sem download público estável e scriptável equivalente
  (painéis interativos); formato não alinhado ao restante do stack CGU;
  esforço de engenharia desproporcional (ADR-019).
- **Veredicto**: rejeitada.

### C. Bulk incluindo `_PorFavorecido.csv` (favorecido por emenda)

- **Prós**: abriria confronto futuro "quem recebeu" (CNPJ favorecido).
- **Contras**: 180 MB descomprimido, multiplicaria o footprint sem
  superfície de produto definida — especulativo hoje (ADR-019).
- **Veredicto**: adiada. Reavaliar quando houver confronto desenhado que
  a exija; a decisão D1 não impede a extensão.

## Consequências

### Positivas

- Sprint 14.2 **deixa de depender do token** — sai do caminho crítico da
  Wave 14; zero secrets novos no CI.
- 1 GET mensal de 32 MB substitui centenas de requests paginados sob
  rate limit.
- Reusa integralmente o padrão de ingestão TSE (streaming zip + Latin-1 +
  DELETE+INSERT por chave em transação).
- Snapshot é artefato citável e auditável (`source_url` aponta para o
  arquivo do host CGU).

### Negativas

- Layout do CSV não é contrato versionado (o Swagger da API é): mudança
  de coluna quebra o parser — mitigado por schema Zod por linha + teste
  de fixture; quebra é ruidosa (fail-fast), não silenciosa.
- Filtro é client-side: baixamos o país inteiro para ficar com ~600
  autores — custo de runner aceito (arquivo pequeno; precedente TSE é
  15–18× maior).
- Vínculo por nome é mais frágil que CPF: homônimos ficam de fora
  (fail-closed) e a taxa de match precisa ser monitorada por ano.
- Emendas de bancada/comissão ficam invisíveis no perfil (consequência
  honesta do recorte D3 — documentar no `/metodologia`).

### Neutras

- O token gov.br continua útil para consultas pontuais futuras (não é
  descartado, só sai do caminho crítico).
- Freshness do bulk (dias) ≥ necessidade (cadência monthly).
- Fase B do probe (origem GitHub Actions, 3 runners) é pré-requisito do
  PR de ingestão — workflow
  [`probe-portal-transparencia.yml`](../../../.github/workflows/probe-portal-transparencia.yml);
  output literal deve ser colado neste ADR ao aceitar.

## Classificação na Pirâmide de Confiança

| Dado | Nível | Razão |
|------|-------|-------|
| Valores por emenda×município | **L1** | Bruto do Portal da Transparência (CGU) |
| Vínculo autor → parlamentar | **L3** | Heurística por nome normalizado, fail-closed (padrão ADR-063) |
| Total por ano / top 5 municípios | **L2** | Agregação determinística sobre L1, condicionada ao vínculo L3 |
| Confronto emendas × colégio eleitoral | **L2** | Cálculo determinístico com fórmula pública em `/metodologia` |

## Riscos e pontos abertos

1. **Ponte município TSE↔IBGE**: `voto_candidato_municipio` (ADR-065)
   guarda código **TSE**; o CSV de emendas traz código **IBGE**. Os
   códigos não coincidem. O confronto composto exige de-para —
   preferência por match determinístico `nome normalizado + UF` com
   fail-closed e taxa medida; decisão final no PR do confronto (não
   bloqueia a ingestão nem a seção "Emendas").
2. **Autor "Sem informação"** em anos antigos (2014 verificado): cobertura
   por ano deve ser exibida com honestidade (empty state por ano, não
   silêncio).
3. **Fase B pendente**: acesso a partir dos runners do Actions ainda não
   provado (lição #701). Gate de aceitação deste ADR.

## Não-objetivos (fora de escopo)

- Favorecidos por emenda (`_PorFavorecido.csv`) e convênios
  (`_Convenios.csv`) — sem superfície de produto definida (alternativa C).
- Emendas de bancada estadual e de comissão no perfil individual.
- Execução orçamentária além das fases publicadas no CSV.
- Série anterior a 2014 (arquivo não cobre).

## Referências

- [Probe 2026-07-14 — output literal](../../audits/2026-07-probe-download-de-dados.md) (Fase A §A.3)
- [Planejamento Waves 14–16](../../audits/2026-07-wave14-planejamento.md) §4 (Sprint 14.2) e §7
- [ADR-065](065-colegio-eleitoral-municipal-tse.md) — colégio eleitoral (confronto composto; padrão streaming §E1)
- [ADR-063](063-vinculo-heuristico-parlamentar-candidatura.md) — precedente de vínculo heurístico L3 fail-closed
- [ADR-051](051-veredito-do-espelho-fatos-fixos.md) — confronto é fato isolado, sem juízo
- [ADR-040](040-alinhamento-orientacao-de-bloco.md) §4 — copy neutra
- [ADR-019](019-disciplina-arquitetural-sem-gargalo.md) — disciplina empírica
- Fonte: `portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares/UNICO`
