# Fontes de dados — cobertura e cadência

> Referência operacional para contributors. Documenta quais APIs alimentam a
> plataforma, a cadência de ingestão e as limitações conhecidas de cada fonte.
> Para ver como navegar na interface, veja `/sobre/metodologia` (página pública).

## Visão geral das cadências

O registry config-driven (`ingestion/registry.ts`) é a fonte única de verdade.
Cada entry tem `cadence` + `tier` — tiers definem ordem de execução dentro
da cadência. O DAG é preservado: tier N+1 só roda após todo tier N.

| Cadência | Workflow | Cron (UTC) | Equivalente BRT |
|---|---|---|---|
| `daily` | `ingestion-daily.yml` | `0 2 * * *` | 23:00 do dia anterior |
| `weekly` | `ingestion-weekly.yml` | `0 3 * * 0` (dom) | domingo 00:00 |
| `monthly` | `ingestion-monthly.yml` | `0 4 1 * *` | 1º do mês 01:00 |

## Câmara dos Deputados

**Base URL:** `https://dadosabertos.camara.leg.br/api/v2`

| Entidade | Script | Cadência | Cobertura | Limitações |
|---|---|---|---|---|
| Deputados | `ingest:camara:deputados` | daily t0 | Legislatura atual (57ª) | Só mandato vigente |
| Proposições | `ingest:camara:proposicoes` | daily t1 | Default: últimos 30 dias. `DATA_INICIO`/`DATA_FIM` para backfill. | API pagina em 100; backfill trimestral recomendado |
| Votações | `ingest:camara:votacoes` | daily t1 | Default: últimos 30 dias. Histórico disponível com datas. | Votações simbólicas não têm `voto_nominal` |
| Orientações | `ingest:camara:orientacoes` | daily t2 | Mesma janela das votações | Algumas sessões chegam sem orientação (API incompleta) |
| Backfill vot→prop | `backfill:camara:votacao-proposicao` | daily t2 | Votações com `proposicao_id IS NULL` | Safeguard de 50 auto-fetches por execução. `--concurrency=N` para bulk histórico |
| Gastos CEAP | `ingest:camara:gastos` | weekly t0 | Ano corrente | Histórico de anos anteriores não ingerido |
| Comissões | `ingest:camara:comissoes` | weekly t0 | Composição atual | Histórico de composições não disponível |
| Tramitação | `ingest:camara:tramitacao` | weekly t0 | Proposições no banco | Só proposições já ingeridas |
| Discursos | `ingest:camara:discursos` | weekly t0 | Legislatura atual, janela móvel | Texto integral não armazenado (#512) |
| Sessões plenárias | `ingest:camara:sessoes` | weekly t0 | Presença em sessões deliberativas | Só plenário, não comissões |
| Presença comissões | `ingest:camara:presenca-comissoes` | weekly t0 | Default: 90 dias. `DATA_INICIO`/`DATA_FIM` para backfill. | Câmara-only |
| Relatorias | `ingest:camara:relatorias` | weekly t0 | Relator vigente por proposição | Não cobre histórico de relatores anteriores |
| Filiacões | `ingest:camara:filiacoes` | monthly t0 | Histórico via `/historico` | Câmara publica histórico; Senado publica estado atual |
| Bio | `backfill:camara:bio` | monthly t0 | Todos deputados no banco | Autodeclarado, não verificado |
| CPF | `backfill:camara:cpf` | monthly t0 | Deputados via detalhe da Câmara | Backfill lento (~0.5s/dep); rodar local em CI throttlado |
| Lideranças | `ingest:camara:liderancas` | monthly t0 | Legislatura atual | Histórico de lideranças não armazenado |
| Blocos | `ingest:camara:blocos` | monthly t0 | Composição atual | `partidos[]` substituído atomicamente |
| Frentes | `ingest:camara:frentes` | monthly t0 | Legislatura atual | Câmara-only (Senado não publica equivalente) |
| Mesa Diretora | `ingest:camara:mesa-diretora` | monthly t1 | Composição atual | Após lideranças (t1): DELETE+INSERT limpa mesa antes |
| Mandatos externos | `ingest:camara:mandatos-externos` | monthly t0 | Carreira pré-mandato por deputado | TSE-verificado, não autodeclarado |

## Senado Federal

**Base URL:** `https://legis.senado.leg.br/dadosabertos`

| Entidade | Script | Cadência | Cobertura | Limitações |
|---|---|---|---|---|
| Senadores | `ingest:senado:senadores` | daily t0 | Legislatura atual (57ª) | Só mandato vigente |
| Proposições | `ingest:senado:proposicoes` | daily t1 | Default: últimos 30 dias | Paginação manual; use `DATA_INICIO`/`DATA_FIM` para backfill |
| Votações plenário | `ingest:senado:votacoes` | daily t1 | **~Último ano** (janela deslizante da API) | **⚠ Limite empírico:** `/votacao` retorna 0 silenciosamente para datas > ~365 dias atrás (confirmado 2026-06-23, #566). Histórico anterior não disponível por este endpoint. |
| Votações comissão | `ingest:senado:votacoes-comissao` | daily t1 | ~Último ano (mesmo endpoint) | Filtra `siglaColegiado != 'SF'` |
| Orientações | `ingest:senado:orientacoes` | daily t2 | Casadas por chave matéria+sessão com votações já ingeridas | Cobertura dependente da cobertura de votações |
| Backfill vot→prop | `backfill:senado:votacao-proposicao` | daily t2 | Votações com `proposicao_id IS NULL` | Lookup local sem HTTP (sem auto-fetch reverso) |
| Tramitação | `ingest:senado:tramitacao` | weekly t0 | Proposições no banco | Só proposições já ingeridas |
| Discursos | `ingest:senado:discursos` | weekly t0 | Janela móvel, legislatura atual | Texto integral não armazenado (#512) |
| Comissões | `ingest:senado:comissoes` | weekly t0 | Composição atual | Só colegiados ativos (CPIs encerradas via fallback de sigla) |
| Relatorias | `ingest:senado:relatorias` | weekly t0 | Por senador, legislatura atual | Endpoint legado; falha suave |
| Filiacões | `ingest:senado:filiacoes` | monthly t0 | Estado atual (sem histórico) | API publica estado atual, não histórico |
| Bio | `backfill:senado:bio` | monthly t0 | Nascimento + naturalidade | Sem escolaridade/profissão (API não expõe) |
| Lideranças | `ingest:senado:liderancas` | monthly t0 | Composição atual | Endpoint único cobrindo todo o Senado |
| Blocos | `ingest:senado:blocos` | monthly t0 | Composição atual | `partidos[]` substituído atomicamente |
| Afastamentos | `ingest:senado:afastamentos` | monthly t1 | Por senador, histórico de licenças | Explica votos AUSENTE |
| Cargos comissão | `ingest:senado:cargos` | monthly t1 | Cargos atuais em comissões | Sem histórico de cargos anteriores |

## TSE

**Fonte:** CSVs públicos do Portal de Dados Abertos (download direto, não API REST)

| Entidade | Script | Cadência | Cobertura | Limitações |
|---|---|---|---|---|
| Bens de candidatos | `ingest:tse:bens` | monthly t1 | Pleitos 2014, 2018, 2022 | 2026 indisponível até ciclo eleitoral; vínculo por CPF |
| CPF senadores | `backfill:senado:cpf` | monthly t2 | Senadores via `tse_candidatura` | Cobertura atual: **88,9% (72/81)**. 9 suplentes sem registro federal TSE 2014–2022 (ver ADR-063). Também linka `tse_candidatura.parlamentar_id` para os senadores resolvidos. |

## Variáveis de ambiente aceitas pelos scripts

Todos os scripts de ingestão respeitam as envs validadas por `readIngestEnv()`:

```bash
DATA_INICIO=YYYY-MM-DD   # início da janela (opcional; scripts têm default)
DATA_FIM=YYYY-MM-DD      # fim da janela (opcional)
ANO=YYYY                 # alternativa a DATA_INICIO/FIM para scripts por ano
```

Scripts que aceitam `--concurrency=N` (flag CLI):
- `backfill:camara:votacao-proposicao` — padrão 1 (seguro para cron); `--concurrency=5` para bulk histórico

## Backfill histórico — guia rápido

Para popular dados históricos após DB cold-start ou reset de quota:

```bash
# Câmara: proposições + votações por trimestre
DATA_INICIO=2023-02-01 DATA_FIM=2023-06-30 npm run ingest:camara:proposicoes
DATA_INICIO=2023-02-01 DATA_FIM=2023-06-30 npm run ingest:camara:votacoes
# ... repetir por trimestre até hoje

# Câmara: backfill FK votação→proposição em bulk
npm run backfill:camara:votacao-proposicao -- --concurrency=5

# Senado: votações — só último ano disponível (limite da API, #566)
DATA_INICIO=2025-06-01 DATA_FIM=2026-06-30 npm run ingest:senado:votacoes
# Aviso automático no log se DATA_INICIO > 365 dias atrás
```
