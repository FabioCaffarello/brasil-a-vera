# ADR-046: Confronto de presença física em sessões deliberativas de plenário

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-22
> Status: proposed

> Confronto do Eixo 1, complementar à participação em votações ([ADR-045](045-confronto-presenca-votacoes-plenario.md)).
> Reusa a moldura de copy neutra do [ADR-040](040-alinhamento-orientacao-de-bloco.md) §4,
> o padrão fail-closed e o trust herdado da raiz (princípio 3).

## Contexto

A [ADR-045](045-confronto-presenca-votacoes-plenario.md) entregou **participação
em votações nominais** (votou em roll-calls). Mas a "presença" oficial da Câmara
é outra coisa: a **frequência às sessões deliberativas** — comparecer à sessão,
independente de votar em cada votação nominal.

**Diagnóstico empírico (2026-06-22, princípio 13)** — probes na API da Câmara:

| Achado | Medição |
| --- | --- |
| **Lista de presença existe** | `GET /eventos/{id}/deputados` retorna quem compareceu — 459–501 de 513 em sessões deliberativas encerradas (ex.: eventos 82513, 82555) |
| Mapeamento | campo `id` = deputado (ex. 62881) → `parlamentar.source_id` |
| Tipo de evento | filtrar `descricaoTipo = 'Sessão Deliberativa'` (plenário); eventos cancelados/futuros vêm com lista vazia |
| Volume | ~3 sessões deliberativas por 100 eventos; estimado ~150–300/ano (**[A CONFIRMAR no build]**) |
| Senado | a API de eventos é da Câmara → **Câmara-only** nesta fase |

**A distinção que importa.** Presença FÍSICA (compareceu à sessão) ≠ participação
em VOTAÇÕES (votou em roll-calls, ADR-045). Um parlamentar pode estar presente na
sessão e não votar numa votação específica; a presença física é tipicamente ≥ a
participação em votações. São **duas métricas complementares** e não podem ser
fundidas nem confundidas.

## Decisão

### D1 — Métrica: presença em sessões deliberativas de plenário (Câmara)

- **Universo (denominador):** sessões de `descricaoTipo = 'Sessão Deliberativa'`
  **encerradas** da Câmara, no período, **dentro da janela de mandato** do
  parlamentar (fail-closed: sessões fora do mandato não entram — mesma regra da
  ADR-045).
- **Presente:** o parlamentar consta na lista de `/eventos/{id}/deputados`.
- **Presença física % = sessões presentes / sessões elegíveis.**

Sessões canceladas e eventos não-deliberativos (audiências, seminários, reuniões
técnicas) **ficam fora**. Reuniões deliberativas de **comissão** ficam fora nesta
fase (eligibilidade = membros da comissão, não a casa inteira).

### D2 — Schema: sessão + presença, derivado de fonte nova

- `votacoes.sessao` — sessão deliberativa de plenário (id da fonte, casa, data,
  descrição). Entidade-raiz da fonte de eventos: carrega `trust_level` +
  `source_url` + `ingested_at` (L1).
- `votacoes.presenca_sessao` — `(sessao_id, parlamentar_id)`, tabela-filha que
  **herda trust** da sessão (princípio 3), `unique(sessao_id, parlamentar_id)`.
- **Ingestão (`camara-sessoes`, Câmara-only):** pagina `/eventos` filtrando
  `Sessão Deliberativa` encerrada; faz upsert da sessão; por sessão busca
  `/eventos/{id}/deputados` e substitui a presença em massa (DELETE-by-sessão +
  INSERT, princípio 5). Padrão de scan análogo ao de relatorias.

### D3 — Distinção explícita de "participação em votações" (ADR-045)

As duas métricas convivem no perfil com **rótulos e copy distintos**, nunca
fundidas:

- **"Presença em sessões"** (esta) — frequência física à sessão deliberativa.
- **"Participação em votações nominais"** (ADR-045) — votou em roll-calls.

A UI deve explicar a diferença (presente na sessão não implica votar em toda
votação). Proibido um único número de "presença" que misture as duas.

### D4 — Copy neutra (estende ADR-040 §4)

Termo factual: **"presença em sessões deliberativas"** / "presente em N de M
sessões". **Sem** ranking de "faltões", **sem** cor de juízo, **sem** score
agregado. Nota de cobertura/janela e a distinção da ADR-045 são **obrigatórias**.

## Alternativas Consideradas

> Decisões fechadas pelo owner; registro para memória.

### Alternativa A — tratar presença física e participação em votações como uma só
- **Descartada (D3):** são fenômenos distintos (comparecer × votar); fundi-las
  apagaria o sinal e confundiria o cidadão.

### Alternativa B — incluir reuniões deliberativas de comissão
- **Descartada (D1):** eligibilidade de comissão = membros, não a casa inteira;
  exigiria recorte por composição da comissão na data. Fora desta fase.

### Alternativa C — derivar presença física dos votos (sem nova fonte)
- **Descartada:** o voto cobre só roll-calls; não captura presença em sessão sem
  votação nominal. Subestima a frequência. A fonte de eventos é a correta.

## Consequências

### Positivas
- Métrica de accountability mais próxima da "frequência" oficial, factual e
  determinística, complementar à ADR-045.
- Lista de presença é dado L1 direto da fonte; mapeia 1:1 com `parlamentar`.

### Negativas
- **Ingestão nova e volumosa** (sessão + ~501 presenças/sessão) — scan paginado
  de eventos + busca por sessão. Câmara throttla → serial/pacing como o
  backfill-cpf/relatorias.
- **Câmara-only** — assimetria com o Senado (sem fonte de eventos equivalente
  confirmada). Documentada, como em outros confrontos.
- **Janela de mandato aproximada** (primeira/última atividade) — suplências/posses
  no meio do período podem distorcer; refinável.
- **Duas "presenças"** no produto — risco de confusão; mitigado por D3 (rótulos e
  nota obrigatórios).

### Neutras
- Tabelas novas em `votacoes` (atividade plenária); sem novo bounded context.

## Classificação na Pirâmide de Confiança

| Dado derivado | Nível | Razão |
| --- | --- | --- |
| Presença numa sessão (`presenca_sessao`) | **L1** | Lista bruta da fonte oficial, com link. |
| Sessão deliberativa (`sessao`) | **L1** | Evento bruto da fonte. |
| Presença física % (presentes / elegíveis) | **L2** | Agregação determinística com fórmula pública (reusa `calcularPresenca`). |

Nenhum dado é L3/L4: sem inferência (a presença é registrada, não inferida — ao
contrário da participação em votações da Câmara na ADR-045).

## Não-objetivos (fora de escopo)

- **Reuniões de comissão** (eligibilidade = membros) e eventos não-deliberativos
  (audiências, seminários).
- **Senado** — sem fonte de eventos equivalente confirmada.
- **Fundir** com a participação em votações da ADR-045 (D3).
- **Ranking/score** de presença; vocabulário valorativo (ADR-040 §4).
- **Roster oficial por sessão** — eligibilidade aproximada pela janela de mandato.
- **UI** — este PR entrega ADR + schema + ingestão + camada de dados; a UI no
  perfil é incremento seguinte.
- **Afirmações de número** antes de reconfirmar contra prod (DB local; Neon 402;
  **[A CONFIRMAR]**).

## Referências

- [ADR-045](045-confronto-presenca-votacoes-plenario.md) — participação em
  votações (métrica complementar e distinta).
- [ADR-040](040-alinhamento-orientacao-de-bloco.md) §4 — copy neutra.
- [TRUST-PYRAMID.md](../TRUST-PYRAMID.md) — níveis L1–L4.
- Diagnóstico empírico (2026-06-22): `/eventos/{id}/deputados` 459–501 presentes;
  tipo `Sessão Deliberativa`.
- API Câmara: `GET /eventos`, `GET /eventos/{id}/deputados`.
- Domínio reusado: `src/modules/votacoes/domain/presenca.ts` (`calcularPresenca`).
