# ADR-065: Colégio eleitoral por município via TSE (votação candidato×município)

> Brasil a Vera · Arquitetura · v0.2
> Última atualização: 2026-07-05
> Status: accepted (emendado 2026-07-05 — ver [Emenda](#emenda-2026-07-05--premissas-corrigidas-na-implementação))

## Contexto

A pergunta "quem meu deputado representa geograficamente?" não tem resposta no
produto hoje. Sabemos **quem votou para ele** em nível de UF (todos os eleitores
que fizeram cruzinha no número dele), mas não **de onde vieram os votos** em nível
municipal.

O TSE publica o arquivo `votacao_candidato_munzona_{ano}_{uf}.csv` por eleição
e estado, contendo `qt_votos_nominais` por candidato por município+zona eleitoral.
Esse arquivo já faz parte do ecossistema de arquivos TSE que ingerimos (mesma
origem dos arquivos `consulta_cand_*` e `bem_candidato_*`).

**Por que importa para o Cidadão Consciente:**
- "Deputado eleito principalmente por Campinas, Santos e Sorocaba" → o cidadão
  entende de qual base eleitoral o parlamentar depende.
- "X% dos votos vieram dos 5 maiores municípios" → mede concentração vs dispersão
  do colégio eleitoral.
- Contextualiza se o parlamentar "representa" sua cidade de fato.

**Vínculo candidatura↔parlamentar:** ADR-063 define a heurística de linkagem via
CPF — já existe na tabela `candidatura`. Este ADR consome esse vínculo.

**Restrição estrutural:** apenas parlamentares com CPF preenchido **e** com
`candidatura` vinculada têm colégio eleitoral. Senadores com CPF null → seção
oculta (fail-closed, mesmo padrão do Eixo 2).

## Decisão

### D1 — Nova tabela `voto_candidato_municipio`

Schema mínimo:

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID v7 | PK |
| `candidatura_id` | UUID | FK → candidatura.id |
| `municipio_tse_codigo` | text | Código TSE do município |
| `municipio_nome` | text | Nome do município |
| `uf` | char(2) | |
| `qt_votos_nominais` | integer | Votos nominais naquele município |
| `pleito_ano` | smallint | 2014, 2018 ou 2022 |
| `source_url` | text | URL do arquivo CSV no repositório TSE |
| `ingested_at` | timestamptz | |

Chave natural única: `(candidatura_id, municipio_tse_codigo, pleito_ano)`.  
Idempotência: `ON CONFLICT DO UPDATE SET qt_votos_nominais = EXCLUDED.qt_votos_nominais`.

### D2 — Fonte: `votacao_candidato_munzona_{ano}_{uf}.csv`

- Mesmo repositório TSE dos arquivos existentes (infra de download já existe).
- Filtro na ingestão: apenas CPFs presentes em `parlamentar.cpf` (evita processar
  ~600 mil candidatos; filtramos para ~1 000 parlamentares com CPF).
- Agregação: somar `qt_votos_nominais` por município (colapsar zonas eleitorais
  dentro do mesmo município — um parlamentar pode ter votos em múltiplas zonas
  do mesmo município).
- Pleitos cobertos: 2014, 2018, 2022 (alinhado ao escopo do Eixo 2).

### D3 — Ingestão mensal (cadência `monthly`) no registry

Nome no registry: `tse-votacao-municipal`.  
Tier: após `t1` do monthly (depende de `candidatura` e `parlamentar.cpf`).  
Download: arquivo por UF por pleito (~27 UFs × 3 pleitos = ~81 downloads, cada
arquivo ~5-20 MB compactado).

### D4 — Display: seção "Colégio eleitoral" no perfil do parlamentar

- Exibir **top 5 municípios** por `qt_votos_nominais` do último pleito em que
  foi eleito.
- Exibir `%` de votos que vieram dos top 5 (concentração).
- Seletor de pleito (2014/2018/2022) se o parlamentar tiver múltiplos pleitos.
- Copy: "Eleito principalmente em: [cidades]. Os 5 maiores municípios
  representaram X% dos votos."
- Fail-closed: seção oculta se `candidatura` não vinculada ou `qt_votos` = 0.

### D5 — Não materializar percentuais no banco

O `%` de concentração é calculado on-the-fly sobre a soma de todos os municípios
daquele pleito (já no banco). Não materializar uma coluna de `pct` — o denominador
muda conforme a query (top-5 vs total). ADR-019: sem materialização sem gargalo
provado.

## Alternativas Consideradas

### Alternativa A — Usar `qt_votos_nominais` da tabela `candidatura` já existente
- A tabela `candidatura` tem o total de votos nominais do candidato, mas não a
  distribuição por município.
- **Descartada:** responde "quantos votos" mas não "de onde".

### Alternativa B — Agregar no nível de estado (não município)
- Deputados federais são eleitos em lista estadual; a distribuição intra-UF é o
  dado informativo — não faz sentido agregar em nível de UF.
- **Descartada:** granularidade municipal é o objetivo.

### Alternativa C — Download de arquivo único nacional (todos os estados)
- O TSE publica arquivos separados por UF; há arquivo consolidado nacional mas
  muito maior (~1 GB descompactado).
- **Descartada:** arquivos por UF com filtro de CPF são mais eficientes.

## Consequências

### Positivas
- Responde "quem meu deputado representa geograficamente?" — pergunta natural do
  Cidadão Consciente, até agora sem resposta no produto.
- Reusa infraestrutura TSE existente (download, parse CSV, encoding Latin-1).
- Reusa vínculo ADR-063 sem nova heurística.

### Negativas
- 81 downloads por ingestão completa (~27 UFs × 3 pleitos); implementar cache de
  arquivo já baixado (verificar hash do arquivo TSE antes de re-download).
- Senadores sem CPF continuam sem colégio eleitoral (gap residual ADR-055).
- Zonas eleitorais dentro de um mesmo município precisam de agregação explícita
  (não um simples GROUP BY município).

### Neutras
- Dados de pleitos passados são estáticos; re-ingestão mensal é conservadora
  (o arquivo TSE não muda após encerramento da eleição). Pode migrar para ingestão
  única-por-pleito quando houver necessidade.

## Classificação na Pirâmide de Confiança

| Dado | Nível | Razão |
|------|-------|-------|
| `qt_votos_nominais` por município | **L1** | Bruto do TSE, arquivo oficial |
| % de concentração top-5 | **L2** | Cálculo determinístico sobre L1 |
| "Colégio eleitoral" (top 5) | **L2** | Agregação determinística com critério explícito |

## Não-objetivos (fora de escopo)

- Mapa geográfico de calor eleitoral (visualização cartográfica).
- Votos por zona eleitoral (granularidade abaixo do município).
- Candidatos que não foram eleitos (escopo = parlamentares em `parlamentar`).
- Histórico de migração do colégio eleitoral entre pleitos (feature futura).

## Emenda 2026-07-05 — premissas corrigidas na implementação

Probes empíricos contra o CDN real do TSE (princípio 13) durante a Sprint 14.1
falsificaram três premissas do texto original. Correções aplicadas:

### E1 — Fonte é zip nacional único, não arquivos por UF (corrige D2/D3)

Arquivos por UF **não existem** no CDN (`votacao_candidato_munzona_{ano}_{UF}.zip`
→ HTTP 404 verificado). A fonte real é `votacao_candidato_munzona_{ano}.zip`
nacional (~494-592 MB comprimido) contendo CSVs por UF + `BRASIL.csv`
consolidado (4,3 GB, redundante — pulado) + `_BR.csv` (apenas Presidente,
verificado; inócuo sob filtro de cargo). Como SP 2022 descomprimido tem
**1,2 GB** — acima do limite de string do V8 (~512 MB) —, o processamento é
**streaming** (fflate `Unzip` + decode Latin-1 incremental + parser CSV
incremental em `ingestion/tse/csv.ts`), nunca string única.

### E2 — Sem FK física; relação lógica via (ano_eleicao, sq_candidato) (corrige D1)

`tse-bens` repõe `tse_candidatura` com **DELETE+INSERT por ano** a cada run
mensal — os UUIDs regeneram e uma FK `candidatura_id` órfã/cascataria
mensalmente. A tabela usa relação **lógica** `(ano_eleicao, sq_candidato)`,
mesmo padrão e mesma razão documentada de `tse_bem_candidato`. O filtro "CPF
em `parlamentar.cpf`" do texto original é transitivo: o CSV munzona **não tem
coluna de CPF** (verificado nos headers 2014/2022); o conjunto de
`SQ_CANDIDATO` vem de `tse_candidatura WHERE parlamentar_id IS NOT NULL`
(ponte ADR-063). Idempotência por DELETE-by-ano + INSERT (princípio 5),
alinhada ao padrão da casa, em vez do ON CONFLICT do texto original.

### E3 — Top-20 persistido + denominador em tse_candidatura (refina D1/D5)

Persistir a distribuição completa custaria ~400k rows; o produto usa top-5 e
% de concentração. Persistimos o **top-20 por candidatura por pleito**
(constante `TOP_MUNICIPIOS_PERSISTIDOS` exportada) — ~27k rows para as 1.331
candidaturas vinculadas. O denominador do % é o **total integral do pleito**
(soma de todos os municípios, computada antes do corte), gravado em
`tse_candidatura.qt_votos_nominais` — coluna criada pela migration 0034 e
verificada **zerada em prod nos 3 pleitos** (2026-07-05); esta ingestão é o
backfill que a 0034 previa. D5 permanece: nenhum percentual materializado.

Detalhes de normalização: `CD_MUNICIPIO` vem com zero à esquerda em 2014
("01120") e sem em 2022 (1139) — canonizado sem zeros no mapper; zonas do
mesmo município são somadas; apenas `NR_TURNO = 1` (cargos federais não têm
2º turno).

## Referências

- [ADR-063](063-vinculo-heuristico-parlamentar-candidatura.md) — vínculo
  parlamentar↔candidatura via CPF.
- [ADR-055](055-cpf-senador-via-tse-candidatura.md) — CPF senador (restrição).
- [ADR-036](036-correcao-monetaria-patrimonio.md) — padrão de ingestão TSE (CSV
  Latin-1, encoding, estrutura de arquivos por UF).
- Repositório TSE: `cdn.tse.jus.br/dados-abertos/votacoes/`
- Arquivo: `votacao_candidato_munzona_{AAAA}_{UF}.csv`
