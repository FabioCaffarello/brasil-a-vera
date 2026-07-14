# Product Gaps — Brasil a Vera

> Brasil a Vera · Produto · v1.2
> Última atualização: 2026-07-14 (probe bulk CGU: ADR-066 proposto sem token;
> fonte do ADR-064 falsificada — ver [docs/audits/2026-07-probe-download-de-dados.md](../audits/2026-07-probe-download-de-dados.md);
> auditoria de produto em [docs/audits/2026-07-auditoria-produto.md](../audits/2026-07-auditoria-produto.md))
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
| Custo do gabinete (comissionados) no perfil | pendente — fontes das casas confirmadas por probe (2026-07-14, E2), **sem token**; vínculo Câmara determinístico via `uriLotacao` | [ADR-064](../architecture/ADR/064-comissionados-gabinete-portal-transparencia.md) (emendado ×2) | M |
| Colégio eleitoral municipal no perfil | **entregue** (PRs #714/#715, Sprint 14.1) | [ADR-065](../architecture/ADR/065-colegio-eleitoral-municipal-tse.md) | — |
| Emendas parlamentares (destino do dinheiro) | pendente — ADR-066 proposto; probe Fases A+B verdes (gate de aceite cumprido) | [ADR-066](../architecture/ADR/066-emendas-parlamentares-bulk-download.md) | M |
| Alertas por e-mail quando parlamentar vota X | pendente — infra Resend/follows existe; falta o produtor de eventos | [ADR-030](../architecture/ADR/030-sistema-alertas-e-resend.md) · Wave 15 | P/M |
| Página de metodologia pública (`/metodologia`) | pendente — obrigatória antes dos confrontos compostos | Sprint 6.5 → Wave 14.3 | P |
| Gráfico de grafo legislativo interativo | pendente | issue #96 · Wave 16 | G |
| Índice de coerência completo com ranking | pendente | [COHERENCE-ENGINE.md](../future/COHERENCE-ENGINE.md) · Wave 16 | G |

Entregues desde a v1.0 deste doc (2026-07-01): discursos recentes (ADR-048),
variação patrimonial vs pares (ADR-047), busca por tema (ADR-050, PR #685),
presença em sessões (ADR-046, com ressalva de dado — ver abaixo), fidelidade
partidária (ADR-043), presença em votações (ADR-045).

### Jornalista

| Gap | Estado | Referência | Esforço |
|-----|--------|-----------|---------|
| Confronto CEIS/CNEP × fornecedores CEAP | pendente — probe de fonte verde (bulk diário sem token, 2026-07-14) → ADR-067 a redigir | Wave 14/16 (planejamento) | M |
| API pública REST documentada (OpenAPI) | pendente | issue #98 | G |
| Bulk export em Parquet (DuckDB/Pandas-friendly) | pendente | issue #58 · Wave 16 | M |
| Doações de campanha (TSE `receitas_candidato`) | **descartado — decisão do owner (2026-07-05)** | planejamento Wave 14 §8 | — |
| Confronto financiamento × votos | **descartado** — consequência da decisão acima | — | — |
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
| Dataset bulk em Parquet via R2 | pendente | issue #58 · Wave 16 | M |
| Série histórica completa (todas as legislaturas) | parcial | Eixo 2 tem 3 pleitos; votações cobertura ~2 anos | — |
| Metodologia pública detalhada | pendente | Wave 14.3 | P |

---

## Gaps de Dados (Cobertura)

Contagens **verificadas contra Neon prod em 2026-07-05** (pós-reset de quota;
`pg_stat_user_tables`).

| Dado | Cobertura atual | Meta | Bloqueio |
|------|----------------|------|---------|
| Votações nominais — Câmara/Senado | 3.979 votações, 33.831 votos | crescente | — |
| Orientação de bancada — Senado | **implementada** (G0/#500) — 428 rows ambas as casas | crescente | issue #83 fechada como obsoleta |
| Filiação partidária | **230 rows em prod** (não mais 0) | crescente | — |
| CPF | Câmara 646/646 · Senado 72/81 (88,9%) | 100% Câmara / máximo possível Senado | Senado não publica CPF ([ADR-063](../architecture/ADR/063-vinculo-heuristico-parlamentar-candidatura.md)) |
| Discursos — metadados | 50.831 rows | — | — |
| Discursos — texto integral | 0% | 100% texto em R2 | [ADR-016](../architecture/ADR/016-cobertura-temporal-arquivamento.md) + issue #512 |
| **Membros de comissão** | **0 rows em prod** (local: ~18k) | popular | incidentes de ingestão #688–#698 |
| **Sessões + presença física** | **0 rows em prod** (base do ADR-046) | popular | idem |
| **Votações de comissão Senado** | **0 rows em prod** (ADR-057) | popular | idem |
| **Afastamentos de senadores** | **0 rows em prod** (ADR-058) | popular | idem |
| **Blocos partidários** | **0 rows em prod** (ADR-056) | popular | idem |
| Bens declarados TSE | 99.283 rows (2014/2018/2022) | + pleitos históricos | baixa prioridade |
| Comissionados de gabinete | 0 (fonte nova) | mensal | ADR-064 E2 (fontes das casas confirmadas) aguarda implementação (Wave 14) |
| Votação candidato×município TSE | ingestão entregue (PR #714) | 3 pleitos | popular prod (depende de cron monthly verde) |
| Vetos presidenciais | 184 vetos, 27.556 votos | 100% | — |

> ⚠️ **Achado da revalidação (2026-07-05):** as tabelas em negrito acima têm
> **0 linhas em produção** apesar de os ADRs correspondentes constarem como
> "implementados". As fontes das Waves 12/13 nunca popularam prod: junho foi
> bloqueado pela quota Neon (HTTP 402), julho pelos incidentes de rede
> `fetch failed` em GitHub Actions (#688–#698). Features que dependem delas
> estão fail-closed (seção invisível) em prod. Prioridade da Fase 0 do
> planejamento Wave 14.

---

## ADRs aceitos aguardando implementação

Os 6 ADRs `proposed` da v1.0 deste doc (043/045/046/047/048/050) foram todos
**aceitos e implementados** entre 2026-07-01 e 2026-07-02. A fila atual:

| ADR | Feature | O que falta | Dependência externa |
|-----|---------|-------------|---------------------|
| [064](../architecture/ADR/064-comissionados-gabinete-portal-transparencia.md) (emendado ×2) | Comissionados de gabinete | Ingestão (fontes das casas, E2) + seção "Gabinete"; probe Actions dos hosts das casas antes do PR | **Nenhuma** (fontes abertas sem token) |
| [065](../architecture/ADR/065-colegio-eleitoral-municipal-tse.md) | Colégio eleitoral municipal | ✅ **Entregue** (PRs #714/#715) | — |
| [066](../architecture/ADR/066-emendas-parlamentares-bulk-download.md) (proposed, gate cumprido) | Emendas parlamentares | Aceite do owner → ingestão + UI | **Nenhuma** (bulk sem token) |
| ADR-067 (a redigir) | CEIS/CNEP × fornecedores CEAP | ADR → ingestão + confronto (probe Fases A+B verdes) | **Nenhuma** (bulk sem token) |

---

## Dívida de Documentação

| Doc | Estado | Ação necessária |
|-----|--------|----------------|
| `DOMAIN-MODEL.md` | draft 2026-04-14 — desatualizado | Atualizar com eixos 1–3, bounded contexts reais, remover Go/microserviços |
| `docs/features/PARLAMENTAR-360.md` | snapshot antigo | Atualizar com Eixo 2 (patrimonial), Eixo 1 (coerência) e seções da Wave 14 |
| `docs/features/SEARCH.md` | snapshot antigo | Atualizar com busca por tema (ADR-050, entregue) |
| Sprint 6.6 (perf/Lighthouse) | planejada, não executada | Reavaliar pós-Wave 15 |

---

## O que NÃO é gap (escopo conscientemente descartado)

Estes itens aparecem em pedidos ou no backlog histórico mas foram
**conscientemente descartados** por ADR-019 (sem gargalo empírico), por
decisão arquitetural definitiva ou por decisão de escopo do owner:

| Item | Decisão |
|------|---------|
| **Doações de campanha TSE (`receitas_candidato`)** | **Decisão do owner (2026-07-05)** — a proposta investigativa se apoia em dinheiro público (emendas, gastos, gabinete, patrimônio, colégio eleitoral), não em financiamento privado de campanha |
| Assembleias legislativas estaduais | ADR-019 — sem demanda observada |
| Microserviços Go / NATS JetStream | ADR-020 — descartado definitivamente |
| Mobile nativa | ADR-019 — sem evidência de demanda mobile-first |
| i18n / versão em inglês | ADR-019 — público-alvo é cidadão brasileiro |
| Integração Telegram / WhatsApp | ADR-019 — sem gargalo concreto |
| Graph database dedicado (Neo4j, Apache AGE) | ADR-019 — sem escala que justifique |
| NLP avançado / LLM para classificação de direção | ADR-019 — classificador de verbos atual é suficiente |
| RSS feeds por parlamentar individual (~594 feeds) | ADR-019 — sem evidência de assinatura |
| Webhooks para terceiros | ADR-019 — sem demanda de developer externo confirmada |
| Diários oficiais / processos judiciais / redes sociais | Planejamento Wave 14 §7 — sem trust level defensável ou território de terceiros |
| Score/nota agregada de parlamentar | ADR-051 — cada confronto é fato isolado; o espelho não soma |
