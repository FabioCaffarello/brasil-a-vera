# Product Gaps — Brasil a Vera

> Brasil a Vera · Produto · v1.0
> Última atualização: 2026-07-01
> Status: living document — atualizar ao fechar cada sprint

Inventário honesto do que o produto **ainda não entrega** vs. o que está
documentado na visão ([PRODUCT-VISION.md](PRODUCT-VISION.md)) ou solicitado
em issues abertas. Cada gap tem um de três estados:

- **pendente** — planejado e tecnicamente viável; aguarda sprint
- **bloqueado** — depende de dado externo, infra ou decisão ainda aberta
- **descartado** — conscientemente fora de escopo (ADR-019, sem evidência empírica)

Esforço estimado: **P** = < 1 sprint, **M** = 1–2 sprints, **G** = wave inteira ou mais.

---

## Gaps por Persona

### Cidadão

| Gap | Estado | Referência | Esforço |
|-----|--------|-----------|---------|
| Ver discursos recentes do parlamentar | pendente | [ADR-048](../architecture/ADR/048-feature-discursos-temas-recentes.md) | P |
| Comparar variação patrimonial vs pares (percentil) | pendente | [ADR-047](../architecture/ADR/047-confronto-variacao-patrimonial-mandato.md) | M |
| Busca por tema (saúde, educação, segurança) | pendente | [ADR-050](../architecture/ADR/050-busca-por-tema.md) | M |
| Alertas por e-mail quando parlamentar vota X | pendente — infra Resend existe em `/painel` | [ADR-030](../architecture/ADR/030-sistema-alertas-e-resend.md) | P |
| Ver presença em sessões deliberativas | pendente | [ADR-046](../architecture/ADR/046-confronto-presenca-fisica-sessoes.md) | P |
| Ver fidelidade partidária ao longo do mandato | pendente | [ADR-043](../architecture/ADR/043-fidelidade-partidaria-duas-definicoes.md) | M |
| Gráfico de grafo legislativo interativo | pendente | issue #96 | G |
| Índice de coerência completo com ranking | pendente | [COHERENCE-ENGINE.md](../future/COHERENCE-ENGINE.md) | G |
| Página de metodologia pública (`/metodologia`) | pendente | Sprint 6.5 planejada mas não executada | P |

### Jornalista

| Gap | Estado | Referência | Esforço |
|-----|--------|-----------|---------|
| API pública REST documentada (OpenAPI) | pendente | issue #98 | G |
| Bulk export em Parquet (DuckDB/Pandas-friendly) | pendente | issue #58 | M |
| Doações de campanha (TSE `receitas_candidato`) | pendente | issue #98 | G |
| Confronto financiamento × votos | bloqueado | depende de doações TSE (acima) | — |
| Dados de assembleias legislativas estaduais | descartado | ADR-019 — sem evidência de demanda | — |

### Desenvolvedor

| Gap | Estado | Referência | Esforço |
|-----|--------|-----------|---------|
| API pública REST + OpenAPI + rate limiting | pendente | issue #98 | G |
| Webhooks para terceiros | descartado | ADR-019 | — |
| SDK / client library | descartado | ADR-019 | — |

### Pesquisador

| Gap | Estado | Referência | Esforço |
|-----|--------|-----------|---------|
| Dataset bulk em Parquet via R2 | pendente | issue #58 | M |
| Série histórica completa (todas as legislaturas) | parcial | Eixo 2 tem 3 pleitos; votações cobertura ~2 anos | — |
| Metodologia pública detalhada | pendente | Sprint 6.5 planejada | P |

---

## Gaps de Dados (Cobertura)

| Dado | Cobertura atual | Meta | Bloqueio |
|------|----------------|------|---------|
| Votações nominais — Câmara | ~100% (leg. atual + 56) | 100% | — |
| Votações nominais — Senado | ~80% | 100% | Ingestão instável |
| Orientação de bancada — Câmara | ~95% nominais | 100% | Endpoint instável |
| Orientação de bancada — Senado | 0% | >80% | Endpoint existe; ingestão bloqueada por issue #83 |
| Bens declarados TSE | 100% (2014/2018/2022) | + pleitos históricos | Baixa prioridade |
| Doações de campanha TSE | 0% | 100% (`receitas_candidato`) | Ingestão nova necessária |
| Discursos — texto integral | 0% (metadados ok) | 100% texto em R2 | [ADR-016](../architecture/ADR/016-cobertura-temporal-arquivamento.md) + issue #512 |
| Presença em sessões deliberativas | 0% | >90% | [ADR-046](../architecture/ADR/046-confronto-presenca-fisica-sessoes.md) proposed |
| Presença em comissões | ~80% Câmara | 100% | [ADR-061](../architecture/ADR/061-escopo-presenca-comissoes.md) proposed |
| Relatorias Senado v2 | ~70% | 90% | [ADR-060](../architecture/ADR/060-relatorias-senado-v2-processo.md) accepted |
| Vetos presidenciais | >95% | 100% | [ADR-059](../architecture/ADR/059-vetos-presidenciais.md) accepted |
| Vínculos parlamentar→candidatura — Câmara | 100% | 100% | — |
| Vínculos parlamentar→candidatura — Senado | 88,9% (L3) | 100% | Senado não publica CPF ([ADR-063](../architecture/ADR/063-vinculo-heuristico-parlamentar-candidatura.md)) |

---

## ADRs Proposed sem Implementação

Estes ADRs documentam confrontos/features planejados com diagnóstico empírico,
mas cujas UIs ainda não foram implementadas. São os candidatos naturais para
a próxima wave de produto.

| ADR | Feature | O que falta | Dependência externa |
|-----|---------|-------------|---------------------|
| [043](../architecture/ADR/043-fidelidade-partidaria-duas-definicoes.md) | Fidelidade partidária | UI + query — banco tem `filiacao_historica` | Nenhuma |
| [045](../architecture/ADR/045-confronto-presenca-votacoes-plenario.md) | Presença em votações plenário | UI + query — dado existe `[A CONFIRMAR prod]` | Validação Neon prod |
| [046](../architecture/ADR/046-confronto-presenca-fisica-sessoes.md) | Presença física em sessões | Ingestão de `/presencas` endpoint Câmara | Nenhuma |
| [047](../architecture/ADR/047-confronto-variacao-patrimonial-mandato.md) | Variação patrimonial vs pares | Query percentil + UI — dado existe (Eixo 2 Camada B) | Nenhuma |
| [048](../architecture/ADR/048-feature-discursos-temas-recentes.md) | Discursos/temas recentes | UI — metadados já ingeridos `[A CONFIRMAR prod]` | Validação Neon prod |
| [050](../architecture/ADR/050-busca-por-tema.md) | Busca por tema | Query taxonomia `tema` Câmara + UI | Nenhuma |

> `[A CONFIRMAR prod]` = diagnóstico empírico feito com Neon em 402 (jun/2026).
> Revalidar contra prod após reset de quota (2026-07-01).

---

## Dívida de Documentação

| Doc | Estado | Ação necessária |
|-----|--------|----------------|
| `DOMAIN-MODEL.md` | draft 2026-04-14 — desatualizado | Atualizar com eixos 1–3, bounded contexts reais, remover Go/microserviços |
| `docs/features/PARLAMENTAR-360.md` | snapshot antigo | Atualizar com Eixo 2 (patrimonial) e Eixo 1 (coerência) |
| `docs/features/SEARCH.md` | snapshot antigo | Atualizar com busca por tema (ADR-050) |
| Sprints 6.5 e 6.6 | planejadas, não executadas | Avaliar se metodologia/perf ainda é prioridade vs. Eixos 1–3 |

---

## O que NÃO é gap (escopo conscientemente descartado)

Estes itens aparecem em pedidos ou no backlog histórico mas foram
**conscientemente descartados** por ADR-019 (sem gargalo empírico) ou
por decisão arquitetural definitiva:

| Item | Decisão |
|------|---------|
| Assembleias legislativas estaduais | ADR-019 — sem demanda observada |
| Microserviços Go / NATS JetStream | ADR-020 — descartado definitivamente |
| Mobile nativa | ADR-019 — sem evidência de demanda mobile-first |
| i18n / versão em inglês | ADR-019 — público-alvo é cidadão brasileiro |
| Integração Telegram / WhatsApp | ADR-019 — sem gargalo concreto |
| Graph database dedicado (Neo4j, Apache AGE) | ADR-019 — sem escala que justifique |
| NLP avançado / LLM para classificação de direção | ADR-019 — classificador de verbos atual é suficiente |
| RSS feeds por parlamentar individual (~594 feeds) | ADR-019 — sem evidência de assinatura |
| Webhooks para terceiros | ADR-019 — sem demanda de developer externo confirmada |
