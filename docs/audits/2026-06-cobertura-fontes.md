# Auditoria de cobertura de fontes — Câmara e Senado

> Brasil a Vera · Auditoria · 2026-06-20
> Modo: diagnóstico (read-only). Nenhuma alteração de código nesta sessão.
> Invariante: confronto factual, não agregação. Apenas L1/L2; L3/L4 proibidos.

---

## Sumário

- [1. Objetivo e método](#1-objetivo-e-método)
- [2. Achados inesperados (ler primeiro)](#2-achados-inesperados-ler-primeiro)
- [3. Fase 1 — Inventário do ingerido](#3-fase-1--inventário-do-ingerido)
- [4. Dado latente (Zod captura, mapper descarta)](#4-dado-latente-zod-captura-mapper-descarta)
- [5. Fase 2 — Universo disponível das APIs](#5-fase-2--universo-disponível-das-apis)
- [6. Fase 3 — Lacunas priorizadas](#6-fase-3--lacunas-priorizadas)
- [7. Lacunas descartadas (violam o invariante)](#7-lacunas-descartadas-violam-o-invariante)
- [8. Proposta de emenda ao ADR-040](#8-proposta-de-emenda-ao-adr-040)
- [9. Issues abertas](#9-issues-abertas)

---

## 1. Objetivo e método

Avaliar **empiricamente** o que aproveitamos das APIs da Câmara
(`dadosabertos.camara.leg.br/api/v2`) e do Senado
(`legis.senado.leg.br/dadosabertos`) vs. o que está disponível, e identificar
lacunas com potencial de produto que respeitem o invariante "confronto
factual, não agregação".

**Método:**

1. **Fase 1** — leitura dos `*-schema.ts` (Zod, campos extraídos), `*-mapper.ts`
   (campos persistidos vs. descartados) e orquestradores em `ingestion/camara/`
   e `ingestion/senado/`, cruzados com os schemas Drizzle em
   `src/shared/db/schema.ts` e `src/modules/*/domain/schema.ts`.
2. **Volumes** — contados contra o **Postgres local** (`bav-postgres`, Docker),
   não contra produção. O Neon de prod está com cota esgotada (HTTP 402) até
   ~2026-07-01, então os números abaixo são **locais (não-prod)** e servem só
   como sinal de "tabela alimentada vs. vazia".
3. **Fase 2** — documentação oficial: OpenAPI da Câmara (spec `0.4.340`, 78
   paths) e Swagger do Senado, com probes `curl` ao vivo onde a API permitiu.
4. **Fase 3** — cruzamento Fase 1 × Fase 2 com a lente de produto.

**Volumes locais (não-prod), por tabela:**

| Tabela | Linhas (local) | Tabela | Linhas (local) |
|---|---:|---|---:|
| `tse_bem_candidato` | 99.283 | `proposicao` | 8.376 |
| `gasto` | 81.844 | `proposicao_tema` | 2.060 |
| `tramitacao` | 81.533 | `votacao` | 1.496 |
| `tse_candidatura` | 27.186 | `parlamentar` | 726 |
| `voto_nominal` | 21.692 | `orientacao_bancada` | 207 |
| `membro_comissao` | 18.076 | **`filiacao_partidaria`** | **0** |
| `proposicao_autor` | 8.998 | `follows` | 0 |

---

## 2. Achados inesperados (ler primeiro)

### 🔴 Achado nº1 — Premissa do ADR-040 (aceito) empiricamente falsificada

**ADR-040** (`040-alinhamento-orientacao-de-bloco.md`, status *accepted*) afirma:

> "**Câmara-only.** O Senado não expõe orientação de bancada nem de bloco" (§Contexto)

e prescreve renderizar no perfil do senador uma nota dizendo que *"a fonte do
Senado não publica orientação"* (§Decisão, item 5).

**Isso é falso.** Probe ao vivo (2026-06-20):

```
GET /plenario/votacao/orientacaoBancada/20231212   → HTTP 200, 88.697 bytes
  votacoes[16], cada votação com:
    orientacoesLideranca[] : { dataHora, partido, voto }   ← 50 linhas no dia
       ex.: {"partido":"PL","voto":"SIM"}
            {"partido":"Republica","voto":"LIVRE"}
            {"partido":"Banc Fem","voto":"SIM"}
    votosParlamentar[]     : { nomeParlamentar, partido, voto, uf }  ← 907 linhas no dia

GET /plenario/votacao/orientacaoBancada/20250408   → HTTP 200, 12.474 bytes
    orientacoesLideranca: 23 linhas · votosParlamentar: 123 linhas
```

O Senado publica orientação de bancada — partidária (`PL`, `PSDB`...) **e** de
bloco temático (`Banc Fem`) — no **mesmo endpoint** que já traz os votos
nominais. É **L1, determinístico** (igualdade de strings voto×orientação), sem
inferência. **Destrava o Eixo 1 (alinhamento/divergência) para senadores**,
hoje Câmara-only por premissa incorreta.

> Ressalva honesta: nem toda deliberação do Senado é nominal/aberta; votações
> simbólicas ou secretas não trazem orientação nem voto individual. A simetria
> é **na disponibilidade do endpoint**, não necessariamente no volume de
> votações cobertas. A proposta de emenda ao ADR-040 está na [seção 8](#8-proposta-de-emenda-ao-adr-040).

### 🟠 Achado nº2 — `filiacao_partidaria`: tabela construída, indexada, nunca alimentada

A tabela `filiacao_partidaria` existe em
`src/modules/parlamentares/domain/schema.ts:65` (com índice
`filiacao_partidaria_parlamentar_id_idx`) e é referenciada em
`src/lib/queries/stats.ts:65`, **mas nenhum script de ingestão escreve nela** —
`grep` confirma: o identificador `filiacaoPartidaria` só aparece na definição do
schema e na lista de tabelas de `/stats`. Resultado: **0 linhas** (local e,
por dedução, prod).

As fontes L1 para alimentá-la existem nas duas casas:

- Câmara: `GET /deputados/{id}/historico` (mudanças de partido/situação datadas)
- Senado: `GET /senador/{codigo}/filiacoes` (histórico de filiação partidária)

Pipeline latente: o schema foi desenhado para "histórico de filiação do
parlamentar X" (comentário no próprio arquivo), mas o produtor nunca foi
escrito.

---

## 3. Fase 1 — Inventário do ingerido

Trust level de **todos** os aggregate roots ingeridos das duas APIs: **L1**
(hardcoded por mapper/orquestrador). Tabelas filhas não carregam `trust_level`
próprio — herdam da raiz (princípio 3 do CLAUDE.md). Os agregados
`estatistica_*_agregada` são **L2**, mas são populados por `seed:agregados:*`,
não pela ingestão de fonte.

### 3.1 Câmara — endpoints consumidos

| Endpoint | Script | Persistido em | Descartado no mapper |
|---|---|---|---|
| `GET /deputados` | `deputados.ts` | `parlamentar.*` (L1) | — |
| `GET /deputados/{id}` | `backfill-cpf.ts` | `parlamentar.cpf` | **`nomeCivil`** (extraído, nunca gravado) |
| `GET /proposicoes` + `/{id}` | `proposicoes-core.ts` | `proposicao.*` (L1) | texto cru de situação (colapsa em enum) |
| `GET /proposicoes/{id}/temas` | idem | `proposicao_tema.*` | `relevancia` (nem no schema) |
| `GET /proposicoes/{id}/autores` | idem | `proposicao_autor.*` | **`tipo`** (Deputado/Comissão/Senado) |
| `GET /votacoes` | `votacoes.ts` | `votacao.*` (L1) | `data` (usa `dataHoraRegistro`) |
| `GET /votacoes/{id}/votos` | idem | `voto_nominal.voto` + placar | **`dataRegistroVoto`, `deputado_.siglaPartido/siglaUf/nome`** |
| `GET /votacoes/{id}` | `backfill-votacao-proposicao.ts` | `votacao.proposicaoId` | **`proposicoesAfetadas[1..]`** (só liga a 1ª) |
| `GET /votacoes/{id}/orientacoes` | `orientacoes.ts` | `orientacao_bancada.*` | `codPartidoBloco`, `uriPartidoBloco` |
| `GET /deputados/{id}/despesas` | `gastos.ts` | `gasto.*` (L1) | `ano`, `mes`, `tipoDocumento` (string) |
| `GET /deputados/{id}/orgaos` + `/orgaos/{id}` | `comissoes.ts` | `membro_comissao.*` | `codTitulo`, `tipoOrgao` |
| `GET /proposicoes/{id}/tramitacoes` | `tramitacao.ts` | `tramitacao.*` | — (trunca descrição em 200 chars) |

### 3.2 Senado — endpoints consumidos

| Endpoint | Script | Persistido em | Descartado no mapper |
|---|---|---|---|
| `/senador/lista/atual` | `senadores.ts` | `parlamentar.*` (L1) | — (mas `cpf` é gravado **null**) |
| `/processo?dataAtualizacaoInicio=` | `proposicoes.ts` | `proposicao.*`, `proposicao_autor` (nome cru) | `dataApresentacao`, `casaIdentificadora`, `urlDocumento`, etc. |
| `/votacao?datainicio=&datafim=` | `votacoes.ts` | `votacao.*`, `voto_nominal` | **`idProcesso`, `codigoMateria`, `sigla`, `numero`, `ano`** (→ `proposicaoId` sempre null) |
| `/senador/{id}/comissoes` + `/comissao/{cod}` | `comissoes.ts` | `membro_comissao.*` | `SiglaCasaComissao` |
| `/processo?codigoMateria=` + `/processo/{id}` | `tramitacao.ts` | `tramitacao.*` | `situacaoResultante` sempre null |

### 3.3 Assimetria Senado vs. Câmara (o que a Câmara ingere e o Senado não)

| Recurso | Câmara | Senado | Fonte Senado existe? |
|---|---|---|---|
| Orientação de bancada | ✅ `orientacoes.ts` | ❌ | ✅ **sim** (achado nº1) |
| Gastos (cota parlamentar) | ✅ CEAP `gastos.ts` | ❌ | ✅ sim (CEAPS, fonte distinta) |
| CPF do parlamentar | ✅ `backfill-cpf.ts` | ❌ (grava null) | ✅ sim (`/senador/{codigo}`) |
| Vínculo votação→proposição | ✅ backfill | ❌ (`proposicaoId` null) | ✅ **sim** (dado já no payload) |
| Autor com `parlamentar_id` resolvido | ✅ | ❌ (string crua, id null) | parcial (match por nome) |
| Classificação temática | ✅ `/temas` | ❌ | ❌ (`/processo` não entrega) |

---

## 4. Dado latente (Zod captura, mapper descarta)

Campos que **já passam pela validação Zod** (logo, custo de fetch = zero) mas
não são escritos em nenhuma coluna. Persistir = mudança de mapper, sem nova
chamada de API:

| Fonte | Campo latente | Valor de produto |
|---|---|---|
| Senado `/votacao` | `idProcesso`, `codigoMateria`, `sigla`, `numero`, `ano` | **Vincular votação→proposição no Senado** (hoje impossível) |
| Câmara `/votos` | `deputado_.siglaPartido/siglaUf` (no momento do voto) | Filiação no instante do voto (≠ atual) |
| Câmara `/votacoes/{id}` | `proposicoesAfetadas[1..]` | Votação que afeta N proposições só liga à 1ª |
| Câmara/Senado detalhe | `nomeCivil` | Coluna existe, nunca preenchida |

---

## 5. Fase 2 — Universo disponível das APIs

### 5.1 Câmara — endpoints **não** consumidos hoje (com valor factual)

- `GET /deputados/{id}/discursos` — **discursos** (sumário + URL do inteiro
  teor/mídia). Confronto "o que disse × como votou". L1 verbatim, texto longo.
- `GET /deputados/{id}/historico` — mudanças de partido/situação datadas. L1
  série temporal. → alimenta `filiacao_partidaria`.
- `GET /frentes/{id}/membros` (ou `/deputados/{id}/frentes`) — **frentes
  parlamentares** (caucus). PARLAMENTAR-360 já prevê seção "Comissões e
  frentes", mas frentes **não é ingerido**.
- `GET /deputados/{id}/eventos` + `/eventos/{id}/deputados` — presença em
  eventos. **L1/L2 composto** — "frequência %" seria derivada (ver seção 7).
- `GET /deputados/{id}/ocupacoes` / `/profissoes` / `/mandatosExternos` —
  autodeclarado, biográfico (baixo confronto).
- **Paginação/limites (oficial):** default 15 itens, máx **100** por página;
  só `GET`/`HEAD` (outros → 405 `Retry-After: 30`); doc avisa "versão ainda
  incompleta". Texto longo vem como **URL**, não inline (alinha princípio 11).

### 5.2 Senado — endpoints **não** consumidos hoje (com valor factual)

- `GET /plenario/votacao/orientacaoBancada/{data}` — **orientação de bancada**
  (achado nº1). L1. Mesmo payload traz `votosParlamentar` (votos nominais).
- `GET /senador/{codigo}/filiacoes` — histórico de filiação. → `filiacao_partidaria`.
- `GET /senador/{codigo}` — traz **CPF** → destrava Trilha Patrimonial TSE
  (Eixo 2) para senadores (hoje Câmara-only, match é por CPF).
- `GET /senador/{codigo}/discursos` + `/apartes` — discursos/apartes
  (200 OK confirmado ao vivo). L1 verbatim.
- `GET /senador/{codigo}/autorias` / `/relatorias`, `/mandatos`, `/cargos`,
  `/liderancas` — trajetória institucional.
- **Quirks:** default **XML** (JSON via `.json`, `Accept` ou `?v=`); `?v=N`
  muda schema (fixar versão); paginação ≈ janela temporal (votações: máx ~2
  meses/chamada); API instável (503 transitório frequente, vem como JSON →
  tratável como valor). Votações nominais documentadas de ~2003 em diante.

---

## 6. Fase 3 — Lacunas priorizadas

Classificação por: **(a)** nível de confiança · **(b)** habilita confronto
factual sem inferência · **(c)** custo de ingestão vs. teto Neon free-tier ·
**(d)** eixo relacionado.

> Nota sobre eixos: a taxonomia de eixos só está documentada para **Eixo 1**
> (coerência/alinhamento, ADR-040) e **Eixo 2** (patrimônio TSE,
> `docs/product/EIXO-2-PATRIMONIO.md`). **"Eixo 4" e "Eixo 5" não foram
> localizados em `docs/`** — o mapeamento para esses eixos fica pendente de
> confirmação do owner, não inventado aqui.

### Tier 0 — Achado que contraria ADR (máxima prioridade)

| # | Lacuna | (a) | (b) | (c) | (d) |
|---|---|---|---|---|---|
| **G0** | **Ingerir orientação de bancada do Senado** (`/plenario/votacao/orientacaoBancada/{data}`) | L1 | ✅ sim (voto×orientação, string match) | Baixo — 1 endpoint/data, dentro da janela de votações já ingerida | **Eixo 1** |

### Tier 1 — Dado latente, custo ~zero (já buscado)

| # | Lacuna | (a) | (b) | (c) | (d) |
|---|---|---|---|---|---|
| **G1** | **Vincular votação→proposição no Senado** (campos já no payload de `/votacao`, mapper descarta; `proposicaoId` sempre null) | L1 | ✅ sim ("como votou nesta proposição") | ~Zero — mudança de mapper + backfill | Eixo 1 |

### Tier 2 — Tabela vazia / desbloqueio de eixo

| # | Lacuna | (a) | (b) | (c) | (d) |
|---|---|---|---|---|---|
| **G2** | **Alimentar `filiacao_partidaria`** (Câmara `/historico`, Senado `/filiacoes`) — tabela construída, indexada, 0 linhas | L1 | ✅ sim (trocou de partido quando/quantas vezes) | Médio — 1 fetch/parlamentar (~726), cron mensal | Eixo 1 (trajetória) |
| **G3** | **CPF do senador** (`/senador/{codigo}`) → destrava Trilha Patrimonial p/ senadores | L1 | habilitador (não é confronto em si) | Baixo — backfill análogo ao `backfill-cpf` da Câmara | **Eixo 2** |
| **G4** | **Discursos** (Câmara `/discursos`, Senado `/discursos`+`/apartes`) | L1 verbatim | ✅ sim ("o que disse × como votou") | **Alto** — texto longo → armazenar URL + fetch on-demand/R2 (princípio 11, ADR-016), nunca inline | Eixo 1 (discurso×voto) |

### Tier 3-4 — Backlog (listado, sem issue nesta rodada)

- **Frentes parlamentares (Câmara)** — `/frentes/{id}/membros`. L1, custo baixo.
  PARLAMENTAR-360 já prevê a seção; feature parcialmente não cumprida.
- **Gastos do Senado (CEAPS)** — paridade com CEAP. L1, **fonte distinta**
  (Transparência do Senado), esforço alto.
- **Autor resolvido + enriquecimento do Senado** — match de nome →
  `parlamentar_id`; situação refinada via tramitação.
- **Campos latentes da Câmara** (partido/UF no momento do voto,
  `proposicoesAfetadas[1..]`, `nomeCivil`) — agrupar num cleanup de mapper.

---

## 7. Lacunas descartadas (violam o invariante)

| Lacuna | Por que descartada |
|---|---|
| **Presença / frequência %** (`/eventos`) | A API entrega participação bruta (L1/L2), mas "frequência" é **derivada** e a semântica de "ausência" é ambígua (presença em evento ≠ quórum deliberativo). Risco de virar score editorial (L3). |
| **Proposições relacionadas** (`/relacionadas`) | Vínculo **derivado** (L2), sem confronto factual direto. |
| **Ocupações / profissões / mandatos externos** | **Autodeclarado**, biográfico; baixo poder de confronto. Se ingerido um dia, marcar explicitamente como "declaração do parlamentar", não fato verificado. |
| **Resultados agregados do Senado** (`/plenario/resultado`) | Agregação que já derivamos do voto nominal; redundante. |

---

## 8. Proposta de emenda ao ADR-040

> Emendar o ADR é ato do owner; esta seção **prepara a proposta**, não a aplica.

**Trecho a corrigir (§Contexto e §Decisão item 5):** a afirmação "O Senado não
expõe orientação de bancada nem de bloco" e a nota de UI "a fonte do Senado não
publica orientação".

**Evidência (anexar ao ADR):** probe de 2026-06-20 a
`GET /plenario/votacao/orientacaoBancada/{data}` (ver [seção 2](#2-achados-inesperados-ler-primeiro)) —
`orientacoesLideranca[{partido, voto}]` populado (50 linhas em 2023-12-12; 23
em 2025-04-08), incluindo orientação partidária e de bloco temático.

**Consequência:** a "assimetria Câmara×Senado" listada como limitação aceita do
ADR-040 deixa de ser intrínseca à fonte e passa a ser **dívida de ingestão**
(G0). A invariante de copy neutra do ADR-040 (§4 — "alinhamento com a
orientação" / "divergência da orientação", proibido linguajar valorativo)
**permanece** e se aplica integralmente à futura feature de senadores.

---

## 9. Issues abertas

Issues criadas nesta auditoria (Tier 0-2). Backlog Tier 3-4 fica registrado na
[seção 6](#tier-3-4--backlog-listado-sem-issue-nesta-rodada), sem issue.

| Gap | Issue | Eixo / ADR |
|---|---|---|
| G0 — orientação Senado | [#500](https://github.com/FabioCaffarello/brasil-a-vera/issues/500) | Eixo 1 · ADR-040 (emenda) |
| G1 — votação→proposição Senado | [#501](https://github.com/FabioCaffarello/brasil-a-vera/issues/501) | Eixo 1 |
| G2 — filiação partidária | [#502](https://github.com/FabioCaffarello/brasil-a-vera/issues/502) | Eixo 1 |
| G3 — CPF Senado | [#503](https://github.com/FabioCaffarello/brasil-a-vera/issues/503) | Eixo 2 |
| G4 — discursos | [#504](https://github.com/FabioCaffarello/brasil-a-vera/issues/504) | Eixo 1 · ADR-016 |
