# Probe — bulk download do Portal da Transparência (CGU) vs API

> Brasil a Vera · Auditoria · 2026-07-14
> Método: princípio 13 (validação empírica com output literal).
> Contexto: tradeoff API (`api-de-dados`, exige token) vs bulk
> (`download-de-dados`, público) para as fontes da Wave 14
> ([planejamento](2026-07-wave14-planejamento.md) §4, sprints 14.0/14.2 e
> probe do ADR-067). Motivado pelo blocker do token (HTTP 401 no probe de
> 2026-07-05) e pela [auditoria de produto](2026-07-auditoria-produto.md).
> Status: **Fases A, B e C executadas** (A: rede residencial 2026-07-14;
> B: GitHub Actions run 29304740420, 3/3 verdes; C: fontes das casas
> confirmadas — ver §Fase C).

---

## Resultado em uma linha

**Emendas e CEIS/CNEP aprovados para bulk sem token; a fonte SIAPE do
ADR-064 (comissionados) foi falsificada — o dado não existe nessa base,
nem via API nem via bulk.**

---

## Fase A — validação de fonte (executada 2026-07-14, rede residencial)

### A.1 Mecânica de download

O portal responde `302` para um host dedicado de arquivos (CloudFront na
frente do site; arquivos em `dadosabertos-download.cgu.gov.br`). Sem
token, sem cookie, amigável a `curl`. Output literal:

```
$ curl -sI https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares/UNICO
HTTP/2 302
location: https://dadosabertos-download.cgu.gov.br/PortalDaTransparencia/saida/emendas-parlamentares/EmendasParlamentares.zip

$ curl -sI https://portaldatransparencia.gov.br/download-de-dados/ceis/20260713
HTTP/2 302
location: https://dadosabertos-download.cgu.gov.br/PortalDaTransparencia/saida/ceis/20260713_CEIS.zip
```

### A.2 Arquivos, tamanhos e freshness

| Dataset | Arquivo final | HTTP | Tamanho | `last-modified` |
|---|---|---|---|---|
| Emendas | `EmendasParlamentares.zip` | 200 | 32,0 MB (252 MB desc., 3 CSVs) | 2026-07-12 |
| CEIS | `20260713_CEIS.zip` | 200 | 3,3 MB | 2026-07-13 (diário) |
| CNEP | `20260713_CNEP.zip` | 200 | 192 KB | 2026-07-13 (diário) |
| Servidores SIAPE | `202605_Servidores_SIAPE.zip` | 200 | 81,8 MB (611 MB desc., 4 CSVs) | — |
| Servidores SIAPE (mês corrente-1) | `202606_...zip` | **403** | — | defasagem de publicação ~1–2 meses |

Padrões de URL: emendas usa alias estável `/UNICO`; CEIS/CNEP usam arquivo
**datado** (`YYYYMMDD`) — ingestão deve tentar a data corrente e recuar até
N dias; servidores usa `YYYYMM` com defasagem (202605 era o mais recente em
2026-07-14).

### A.3 Emendas — conteúdo (decide o ADR-066) ✅

`EmendasParlamentares.csv` (47 MB desc.; o zip traz ainda
`_Convenios.csv` 26 MB e `_PorFavorecido.csv` 180 MB, fora de escopo).
Header (Latin-1, `;`):

```
"Código da Emenda";"Ano da Emenda";"Tipo de Emenda";"Código do Autor da
Emenda";"Nome do Autor da Emenda";"Número da emenda";"Localidade de
aplicação do recurso";"Código Município IBGE";"Município";"Código UF
IBGE";"UF";"Região";…;"Valor Empenhado";"Valor Liquidado";"Valor
Pago";"Valor Restos A Pagar Inscritos";"Valor Restos A Pagar
Cancelados";"Valor Restos A Pagar Pagos"
```

- Grep `NIKOLAS FERREIRA` → **30 linhas** (autor nominal presente).
- Município de destino com **código IBGE** → join com o colégio eleitoral
  (ADR-065) exige ponte código TSE↔IBGE (ver ADR-066 §riscos).
- Ressalva: linhas de 2014 aparecem com autor `"Sem informação"` — medir
  taxa de autor informado por ano na implementação.

### A.4 CEIS — conteúdo (decide o probe do ADR-067) ✅

`20260713_CEIS.csv` (33,7 MB desc.). Header inclui:

```
"TIPO DE PESSOA";"CPF OU CNPJ DO SANCIONADO";"NOME DO SANCIONADO";…;
"CATEGORIA DA SANÇÃO";"DATA INÍCIO SANÇÃO";"DATA FINAL SANÇÃO";…;
"ÓRGÃO SANCIONADOR";"UF ÓRGÃO SANCIONADOR";…
```

Tudo que o confronto CEIS × fornecedores CEAP exige: CNPJ para match
determinístico, datas de início/fim de sanção (nunca colapsar com a data
do gasto) e órgão sancionador para a copy neutra.

### A.5 Servidores SIAPE — falsificado para comissionados ❌

`202605_Cadastro.csv` (437 MB, milhões de linhas). Grep por
`CAMARA DOS DEPUTADOS|SENADO FEDERAL` → **93 ocorrências**, todas
servidores do **Executivo** cedidos/em exercício nas casas (amostra
literal classificada por cargo/lotação):

```
4 PROCURADOR FEDERAL | LOT:ADVOCACIA-GERAL DA UNIAO | EXE:Senado Federal | ATIVO EM OUTRO ORGAO
2 ADVOGADO DA UNIAO  | LOT:ADVOCACIA-GERAL DA UNIAO | EXE:Câmara dos Deputados | ATIVO EM OUTRO ORGAO
…
```

**Conclusão:** secretários parlamentares (comissionados de gabinete) não
estão no SIAPE — a folha é das próprias casas legislativas. A premissa de
fonte do ADR-064 está falsificada **para ambos os caminhos** (a API
`/servidores` lê a mesma base). O 401 do token mascarava um problema de
fonte, não de acesso. → [Emenda no ADR-064](../architecture/ADR/064-comissionados-gabinete-portal-transparencia.md).

---

## Fase B — origem GitHub Actions (executada 2026-07-14) ✅

Workflow [`probe-portal-transparencia.yml`](../../.github/workflows/probe-portal-transparencia.yml)
executado pós-merge do PR #720 (run **29304740420**): **3/3 attempts
verdes** (runners/IPs distintos), sem assinatura `UND_ERR_CONNECT_TIMEOUT`.
Output literal (attempt 1; 2 e 3 idênticos em status):

```
CEIS/CNEP: snapshot mais recente = 20260713
emendas: HTTP 206 | 1048576B | 0.055324s | …/saida/emendas-parlamentares/EmendasParlamentares.zip
ceis:    HTTP 206 | 1048576B | 1.552783s | …/saida/ceis/20260713_CEIS.zip
cnep:    HTTP 206 |  192089B | 1.142434s | …/saida/cnep/20260713_CNEP.zip
```

**Critério satisfeito** — fonte CGU aprovada da origem real de ingestão.
Output colado no ADR-066 (gate de aceitação cumprido).

## Fase C — fonte real de comissionados (executada 2026-07-14) ✅

O probe nas folhas das próprias casas **encontrou fonte aberta nas duas**,
com perfis espelhados invertidos:

### C.1 Câmara — `dadosabertos.camara.leg.br/arquivos/funcionarios` ✅

CSV/JSON públicos, sem token (`/arquivos/funcionarios/csv/funcionarios.csv`,
3,4 MB, 15.425 linhas; dataset irmão `servidores` com 15.228). Grupos:
**10.591 "Secretário Parlamentar"**, 2.597 efetivos, 1.705 CNE, 531
parlamentares. Amostra literal:

```
"P_263202";"6";"Secretário Parlamentar";"ABDOU SADDI WARESS";"SP09C";
"GAB. 4/511 - CÉLIO SILVEIRA";"LEI";"2026-02-18";…;
"https://dadosabertos.camara.leg.br/api/v2/deputados/178876"
```

- **Vínculo determinístico**: coluna `uriLotacao` aponta o **ID do
  deputado na API v2** — sem heurística de nome (melhor que o desenho
  original do ADR-064, que dependia de CPF+Siape).
- Nível do cargo presente (`SP09C`, `CNE07`…); **remuneração em R$ não
  está no dataset** — os níveis SP/CNE têm tabela remuneratória oficial
  publicada pela Câmara (valor fixo por nível → custo derivável como L2
  com fórmula pública) ou fase 1 exibe contagem + cargos sem R$.

### C.2 Senado — `adm.senado.gov.br/adm-dadosabertos` (API administrativa aberta) ✅

OpenAPI pública (`/v3/api-docs`), sem token. Endpoints relevantes:

- `/api/v1/servidores/servidores/comissionados` (+ `/csv`) — **14.505
  itens** (inclui histórico/desligados), lotação estruturada:

```json
{"nome":"ABENILIO AIRES CIRQUEIRA","vinculo":"COMISSIONADO","situacao":"DESLIGADO",
 "lotacao":{"sigla":"GSIZALCI","nome":"Gabinete do Senador Izalci Lucas"},
 "categoria":{"codigo":"CARGO EM COMISSÃO"},"ano_admissao":…}
```

- `/api/v1/servidores/remuneracoes/{ano}/{mes}` (+ `/csv`) — 10.853 itens
  em 2026/05, **valores completos** (básica, função comissionada, líquida,
  indenizatórias…), join por `sequencial`; múltiplas folhas por pessoa
  (`tipo_folha` Normal/Suplementar → agregação por competência necessária).
- **Vínculo por lotação**: sigla `GS…` + nome "Gabinete do Senador X" —
  match por nome oficial do senador (fail-closed, padrão ADR-063).

### Consequência

A Sprint 14.0 **desbloqueia** com fontes melhores que o desenho original:
Câmara com vínculo mais forte (ID direto) porém R$ via tabela por nível;
Senado com R$ exato porém vínculo por nome de lotação. Sem token, sem
Portal da Transparência. → [Emenda E2 no ADR-064](../architecture/ADR/064-comissionados-gabinete-portal-transparencia.md).
Pendência da implementação: Fase B análoga para `dadosabertos.camara.leg.br`
e `adm.senado.gov.br` a partir dos runners (o host `adm.senado.gov.br` é
infra `senado.gov.br` — verificar se o firewall do caso #701 o afeta).

---

## Decisões que este probe habilita

1. **[ADR-066](../architecture/ADR/066-emendas-parlamentares-bulk-download.md)** —
   emendas via bulk, sem token (redigido junto com este anexo).
2. **ADR-067** (a redigir) — CEIS/CNEP via bulk diário; probe de fonte já
   verde (A.4), falta Fase B + desenho do confronto.
3. **ADR-064** — emendado: implementação bloqueada até Fase C.
4. **Token `chave-api-dados`** sai do caminho crítico da Wave 14.
