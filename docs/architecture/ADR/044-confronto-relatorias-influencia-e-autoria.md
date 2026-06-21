# ADR-044: Confronto de relatorias — influência e relator×autoria (sem relator×voto)

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-21
> Status: proposed

> Próximo confronto do Eixo 1 após a fidelidade partidária ([ADR-043](043-fidelidade-partidaria-duas-definicoes.md)).
> Reusa a **moldura de copy neutra** do [ADR-040](040-alinhamento-orientacao-de-bloco.md) §4
> e o padrão **fail-closed** (dado ausente/ambíguo → exclui, não fabrica). Trust
> herdado da raiz conforme princípio 3 (CLAUDE.md) e [ADR-013](013-schema-por-bounded-context.md).

## Contexto

O relator de uma proposição ocupa uma **posição de poder legislativo** — é quem
redige o parecer que molda (ou enterra) a matéria. Hoje a plataforma não expõe
nada sobre relatorias: quem relata o quê é invisível.

**Diagnóstico empírico (2026-06-21, princípio 13)** — medição contra o Postgres
local (Neon em 402; reconfirmar contra prod, **[A CONFIRMAR]**) e probes na API
da Câmara:

- **Relator existe e é bem coberto.** `GET /proposicoes/{id}` traz
  `statusProposicao.uriUltimoRelator`. Em amostra de proposições da Câmara **com
  votação vinculada**, **13/15 (87%)** tinham relator não-nulo (ex.: PL 221/2019
  → deputado 80815). **Não ingerimos** isso hoje.
- **Relator×voto é um confounder — não um confronto.** O diagnóstico do candidato
  alternativo "autor votou contra a própria proposição" mediu **335** votos NÃO
  de autor numa votação vinculada à própria proposição; ao filtrar votações
  procedurais (requerimento, destaque, "mantido o texto"), sobrou **1 caso em
  335**. O link votação↔proposição é dominado por votos procedurais — votar NÃO
  num requerimento costuma ser *a favor* do projeto. A lição transfere-se
  diretamente: **relator×voto sofreria o mesmo confounder.**

Forças em jogo:

- **Câmara-only nesta fase.** `uriUltimoRelator` é da API da Câmara. Relatorias do
  Senado não foram confirmadas empiricamente (`/senador/{id}/relatorias` retornou
  503 no diagnóstico do ADR-043) — **[A CONFIRMAR]**.
- **"Último relator" é snapshot, não histórico.** `uriUltimoRelator` dá o relator
  **vigente/último** da matéria, não a lista histórica de todos os relatores que
  ela teve. A cobertura é de relatorias atuais, não do total histórico.
- **Atribuição de relatoria é institucional.** Quem designa o relator é o
  presidente da comissão / a Mesa — não é auto-seleção do parlamentar. Qualquer
  leitura precisa respeitar isso (ver Decisão D4).

## Decisão

### D1 — Dois ângulos em escopo, ambos determinísticos

1. **Relatorias como influência.** Contagem factual de proposições em que o
   parlamentar é o relator (vigente/último). Métrica de protagonismo legislativo:
   "relatou N proposições".
2. **Relator × autoria.** Distribuição partidária dos **autores** das proposições
   que o parlamentar relatou — cruzamento de `relatoria` com
   `proposicao_autor.partido`. Mostra se as relatorias de um parlamentar se
   concentram em projetos de determinado partido/bloco. **Factual**, exibido como
   distribuição; **não** se infere intenção nem escolha do relator (D4).

### D2 — Relator × voto fica FORA de escopo (decisão empírica)

O ângulo "relator votou contra/ a favor da matéria que relatou" **não será
construído**. Usa o mesmo link votação↔proposição que o diagnóstico provou
dominado por votos procedurais (1 caso de mérito em 335). Construí-lo fabricaria
divergência a partir de confounder — o erro que o [ADR-043](043-fidelidade-partidaria-duas-definicoes.md)
D3 nos ensinou a recusar.

### D3 — Fail-closed e honestidade de cobertura

- **Relator ausente** (`uriUltimoRelator` null) → proposição **excluída** do
  confronto; não se fabrica relator.
- **"Último relator" não é "histórico completo".** A contagem de influência é de
  relatorias **vigentes/últimas**, e **subestima** relatorias passadas reatribuídas.
  A UI deve dizer isso explicitamente — nunca rotular como "total histórico".
- **Trust herdado da raiz** (princípio 3): a relatoria é dado-filho da proposição;
  herda `trust_level`/`source_url`/`ingested_at` da `proposicao`, não duplica.

### D4 — Moldura de copy neutra (estende ADR-040 §4)

- Termos factuais: **"relatou N proposições"**, **"autores das proposições
  relatadas, por partido"**.
- **Proibido** "aparelhamento", "loteamento", "favorecimento", "toma-lá-dá-cá" ou
  qualquer termo valorativo — na copy **e em identificador novo** (anchors, ids).
- **Sem** score de ranqueamento de parlamentares; **sem** cor de juízo.
- A copy **não pode implicar auto-seleção**: a relatoria é designada
  institucionalmente. Mostra-se a distribuição factual; o cidadão conclui.

## Alternativas Consideradas

> Ângulos descartados — registro para memória, não reabríveis sem novo ADR.

### Alternativa A — relator × voto como métrica primária
- Comparar o voto do relator com o resultado da matéria que relatou.
- **Descartada (D2):** confundida por votos procedurais (evidência empírica
  1/335); fabricaria divergência.

### Alternativa B — ingerir o histórico completo de relatorias
- Varrer `/proposicoes/{id}/tramitacoes` para extrair toda designação de relator.
- **Adiada:** a API de proposições é instável (504/timeout sob carga no diagnóstico);
  `uriUltimoRelator` é o caminho confiável confirmado (87%). Histórico completo é
  extensão futura, não pré-requisito do confronto.

### Alternativa C — incluir Senado já nesta fase
- **Adiada:** endpoint de relatorias do Senado não confirmado empiricamente
  (**[A CONFIRMAR]**). Câmara-first, como o Eixo 2 fez com CPF/bens.

## Consequências

### Positivas
- Nova leitura de **poder legislativo** (relatorias), determinística, sem IA e sem
  fonte nova cara — só um campo já presente em `/proposicoes/{id}`.
- O ângulo relator×autoria revela concentração partidária das relatorias de forma
  factual e auditável.
- A decisão D2 evita repetir um confounder já medido — o diagnóstico pagou-se.

### Negativas
- **Ingestão nova:** scan por proposição da Câmara (padrão do backfill-CPF —
  serial + pacing + throttle), ~87% de hit. Custo de execução, não de modelagem.
- **Subcobertura por design:** só o último relator; relatorias passadas
  reatribuídas não entram. Mitigado por copy honesta (D3), não por dado.
- **Assimetria Câmara×Senado** persiste (como em ADRs anteriores) até confirmar o
  endpoint do Senado.
- **Risco de leitura valorativa** do relator×autoria — mitigado por D4 (copy
  factual, sem implicar escolha).

### Neutras
- Tabela nova de `relatoria` (parlamentar × proposição), filha da `proposicao` —
  herda trust da raiz, não cria nova raiz.

## Classificação na Pirâmide de Confiança

Conforme [TRUST-PYRAMID.md](../TRUST-PYRAMID.md):

| Dado derivado | Nível | Razão |
| --- | --- | --- |
| Relatoria de uma proposição (relator vigente) | **L1** | Campo bruto da fonte oficial (`uriUltimoRelator`), com link; zero interpretação. |
| Contagem de relatorias por parlamentar | **L2** | Agregação determinística de L1, fórmula pública. |
| Distribuição partidária dos autores das proposições relatadas | **L2** | Cruzamento determinístico de L1 (relatoria) com L1 (`proposicao_autor`). |

Nenhum dado deste confronto é L3/L4: sem correlação interpretativa, sem
classificação temática, sem inferência.

## Não-objetivos (fora de escopo)

Este ADR **registra a decisão**; explicitamente **não** faz nem autoriza:

- **Schema, migration, ingestão, query ou UI** (trabalho posterior, sujeito a estas decisões).
- **Relator × voto** (D2).
- **Classificação temática** de proposições ou votações (IA/NLP).
- **Rótulo valorativo** ("aparelhamento", "loteamento", "favorecimento") ou copy
  que implique auto-seleção do relator (D4).
- **Histórico completo de relatorias** — só o relator vigente/último nesta fase.
- **Relatorias do Senado** — até confirmar o endpoint empiricamente.
- **Score ou ranking** de parlamentares por volume de relatorias.
- **Afirmações públicas de cobertura** antes de reconfirmar os números contra prod
  (DB local ≠ prod; Neon em 402; **[A CONFIRMAR]**).

## Referências

- [ADR-043](043-fidelidade-partidaria-duas-definicoes.md) — confronto anterior;
  origem da lição empírica sobre confounder procedural (D2).
- [ADR-040](040-alinhamento-orientacao-de-bloco.md) — moldura de copy neutra (§4),
  estendida aqui (D4).
- [ADR-013](013-schema-por-bounded-context.md) — schema por bounded context.
- [TRUST-PYRAMID.md](../TRUST-PYRAMID.md) — níveis L1–L4.
- Diagnóstico empírico (2026-06-21, DB local + API Câmara): autor×voto **1/335**
  mérito (confounder); `uriUltimoRelator` **13/15** proposições com votação.
- API Câmara: `GET /proposicoes/{id}` → `statusProposicao.uriUltimoRelator`.
- Princípio 3 (CLAUDE.md) — trust herdado em tabelas-filhas.
