# Probe — bulk download do Portal da Transparência (CGU) vs API

> Brasil a Vera · Auditoria · 2026-07-14
> Método: princípio 13 (validação empírica com output literal).
> Contexto: tradeoff API (`api-de-dados`, exige token) vs bulk
> (`download-de-dados`, público) para as fontes da Wave 14
> ([planejamento](2026-07-wave14-planejamento.md) §4, sprints 14.0/14.2 e
> probe do ADR-067). Motivado pelo blocker do token (HTTP 401 no probe de
> 2026-07-05) e pela [auditoria de produto](2026-07-auditoria-produto.md).
> Status: **Fase A executada** (rede residencial) · Fase B a executar
> (GitHub Actions) · Fase C a executar (fonte de comissionados).

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

## Fase B — origem GitHub Actions (a executar)

Lição da #701: o firewall de uma fonte pode bloquear parte do pool de IPs
dos runners (caso `leg.br`). A infra CGU é distinta (Serpro/CloudFront),
mas a aprovação final da fonte exige probe da origem real.

- **Como:** workflow [`probe-portal-transparencia.yml`](../../.github/workflows/probe-portal-transparencia.yml)
  (`workflow_dispatch`, matrix de 3 attempts = 3 runners/IPs distintos;
  resolve o 302 e baixa o primeiro 1 MB de emendas/CEIS/CNEP com timing).
- **Critério:** 3/3 attempts com HTTP 200/206 e sem assinatura
  `UND_ERR_CONNECT_TIMEOUT` → fonte aprovada. Falha parcial → mesma
  classe de problema da #701; mitigação já existente (auto-retry #716).
- **Registro:** colar output literal dos 3 jobs no ADR-066 (e no futuro
  ADR-067) antes do PR de ingestão.
- Lembrete operacional: workflow novo só é dispatchável **após merge na
  main** (limitação do GitHub, registrada no harness).

## Fase C — fonte real de comissionados (a executar, pré-requisito da Sprint 14.0)

O probe muda de alvo para as folhas das próprias casas:

| Alvo | O que verificar |
|---|---|
| Dados Abertos da Câmara (pessoal/secretários parlamentares) | Existe arquivo/endpoint com vínculo gabinete→deputado + remuneração? URL estável? Cadência? |
| Transparência do Senado (RH) | Idem para gabinetes de senadores |

Mesma mecânica da Fase A: URL, header literal, presença do vínculo e da
remuneração, tamanho, freshness. Só depois o ADR-064 é revisado com a
fonte real; **sem probe verde, a Sprint 14.0 não entra**.

---

## Decisões que este probe habilita

1. **[ADR-066](../architecture/ADR/066-emendas-parlamentares-bulk-download.md)** —
   emendas via bulk, sem token (redigido junto com este anexo).
2. **ADR-067** (a redigir) — CEIS/CNEP via bulk diário; probe de fonte já
   verde (A.4), falta Fase B + desenho do confronto.
3. **ADR-064** — emendado: implementação bloqueada até Fase C.
4. **Token `chave-api-dados`** sai do caminho crítico da Wave 14.
