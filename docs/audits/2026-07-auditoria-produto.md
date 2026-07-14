# Auditoria de produto — evolução estratégica e centralização de informações

> Brasil a Vera · Auditoria · 2026-07-13
> Método: `/product-gap-analysis` + verificação operacional empírica
> (runs de ingestão, PRs, issues, ADRs, docs de produto em 2026-07-13).
> Sucede a leitura estratégica de [`2026-07-wave14-planejamento.md`](2026-07-wave14-planejamento.md)
> e mede a distância entre aquele plano (aprovado em 2026-07-05) e o estado real.
> Status: **executada** — recomendações da Semana 1 iniciadas na própria sessão
> (PR #716 mergeado em 2026-07-14).

---

## Sumário

- [1. Conclusão executiva](#1-conclusão-executiva)
- [2. Diagnóstico central — três bloqueios](#2-diagnóstico-central--três-bloqueios)
- [3. Mapa de gaps por persona](#3-mapa-de-gaps-por-persona)
- [4. Estado da fila de ADRs](#4-estado-da-fila-de-adrs)
- [5. Dívida documental](#5-dívida-documental)
- [6. Recomendação — ordem de execução](#6-recomendação--ordem-de-execução)
- [7. O que deliberadamente NÃO fazemos (reafirmado)](#7-o-que-deliberadamente-não-fazemos-reafirmado)
- [8. Evidência coletada](#8-evidência-coletada)

---

## 1. Conclusão executiva

**O produto não precisa de estratégia nova — precisa executar a que já tem.**
O planejamento Waves 14–16 já responde à pergunta da centralização de
informações para o cidadão: jornada **Investigar** (dossiê 360° — mandato,
custo, base eleitoral, destino do dinheiro) + jornada **Acompanhar**
(alertas quando algo muda). A auditoria constatou que a execução dessa
visão estava travada por **três desbloqueios operacionais** que valem mais
do que qualquer feature nova:

1. Pipeline de ingestão falhando **todos os dias entre 2026-07-06 e
   2026-07-13**, com a mitigação (PR #716) aberta sem merge.
2. Token do Portal da Transparência não cadastrado — bloqueia 2/3 da
   Wave 14 (sprints 14.0 e 14.2) e os probes dos ADR-066/067.
3. Loop de retorno inexistente — infra de alertas completa desde a Wave 10,
   **zero e-mails jamais disparados** (falta só o produtor de eventos).

O gargalo **não é falta de dado nem falta de plano**: 39 fontes no
registry, ~52 ADRs aceitos, Sprint 14.1 (colégio eleitoral) entregue.
O gargalo é dado capturado que não chega ao cidadão.

## 2. Diagnóstico central — três bloqueios

### 🔴 Bloqueio 1 — pipeline quebrado há 8 dias; correção parada em PR aberto

- `ingestion-daily` falhou em **8 runs consecutivos** (2026-07-06 →
  2026-07-13); `ingestion-weekly` idem (2026-07-05 e 2026-07-12).
- Causa confirmada (#701, visível graças ao fix #700):
  `UND_ERR_CONNECT_TIMEOUT` — o firewall do `leg.br` dropa conexões de
  parte do pool de IPs do GitHub Actions. Falha é **parcial e aleatória
  por IP de runner**: no run de 2026-07-13, 8 jobs passaram e apenas
  `senado-senadores` + `senado-orientacoes` falharam.
- **Efeito colateral estrutural detectado**: o tier gate é global por
  cadência, então a falha dos 2 jobs do Senado **cancelou em cascata
  `camara-orientacoes` e `camara-backfill-votacao-proposicao`** — jobs da
  outra casa, sem dependência real. Se o padrão persistir pós-#716,
  avaliar gate por casa/dependência real.
- **Consequência composta**: as 10 tabelas das Waves 12/13 seguem com
  **0 linhas em prod** (`membro_comissao`, `sessao`, `presenca_sessao`,
  `evento_comissao_presenca`, `votacao_comissao_senado`,
  `voto_nominal_comissao_senado`, `afastamento_senador`,
  `bloco_partidario` + 2 esperadas). Features correspondentes
  (ADR-046/057/058, tooltip de blocos) estão construídas, testadas e
  **invisíveis** em produção (fail-closed). Código entregue sem valor
  entregue.
- Incidentes acumulados: #702–#718 abertos além dos #688–#698 já triados.

> **Ação executada**: PR #716 (`ingestion-retry.yml` — auto-retry-once com
> runner novo = IP novo; `notify-failure skip-first-attempt`) **mergeado em
> 2026-07-14** durante a consolidação desta auditoria. Critério de
> fechamento da #701: 3 dias de crons verdes.

### 🟠 Bloqueio 2 — token do Portal da Transparência (ação do owner, minutos)

Sprints 14.0 (comissionados de gabinete, ADR-064) e 14.2 (emendas,
probe → ADR-066) aguardam o cadastro da `chave-api-dados` + GitHub
Secret. O probe de 2026-07-05 confirmou HTTP 401 sem token em
emendas/ceis/servidores. O mesmo token destrava o probe do ADR-067
(CEIS/CNEP × fornecedores CEAP).

A Sprint 14.1 (colégio eleitoral, ADR-065) foi **entregue**
(PRs #714/#715) — o dossiê está 1/3 pronto.

### 🟡 Bloqueio 3 — o loop de retorno não existe (Wave 15)

A peça mais barata em relação ao impacto: Clerk + follows + Resend +
LGPD existem completos desde a Wave 10, mas **nenhum alerta jamais
disparou** — falta apenas o job `alertas-dispatch` acoplado ao cron
(detectar fato novo por follow desde o último dispatch; digest
idempotente). Esforço P/M. É a única feature que transforma o produto de
"consulta quando lembra" em "volta quando algo acontece" — a métrica da
persona Cidadão (retenção semanal) depende inteiramente disso.

## 3. Mapa de gaps por persona

Estado verificado em 2026-07-13. Esforço: **P** < 1 sprint · **M** 1–2
sprints · **G** wave.

| Persona | Gap | Onde está bloqueado | Esforço | Impacto |
|---|---|---|---|---|
| Cidadão | Dossiê: Gabinete (14.0) + Emendas (14.2) | Token Portal da Transparência (owner) | M | Alto — diferencial sem concorrente |
| Cidadão | Alertas nunca disparam | Produtor de eventos (Wave 15) | P/M | **Altíssimo** — único caminho para retenção |
| Cidadão | Seções fail-closed invisíveis (comissões, presença física, afastamentos, blocos) | Tabelas zeradas em prod ← pipeline quebrado | P (repopular) | Alto — features já pagas, valor zero |
| Cidadão | `/metodologia` pública | Pendente desde Sprint 6.5 | **P** | Alto — pré-requisito dos confrontos compostos; escudo de neutralidade |
| Ativista/ONG | Seguir **tema** (além de parlamentar) | Wave 15 | M | Alto — persona primária sem feature própria até hoje |
| Jornalista | Confronto CEIS/CNEP × fornecedores CEAP | Probe → ADR-067 (mesmo token) | M | Alto — maior densidade investigativa por real gasto |
| Jornalista/Pesquisador | Parquet bulk no R2 (#58) · texto de discursos no R2 (#512) | Wave 16 | M | Médio |
| Todos | **Nenhuma métrica de engajamento é medida** (MAU, retenção) | Nunca instrumentado | P | Alto — impossível validar "melhor experiência" sem medir |

## 4. Estado da fila de ADRs

Os 6 ADRs `proposed` da Wave 12 (043/045/046/047/048/050) foram todos
**aceitos e implementados** entre 2026-07-01 e 2026-07-02. Não há ADR
órfão aguardando decisão. Fila real:

| ADR | Feature | O que falta | Dependência |
|---|---|---|---|
| [064](../architecture/ADR/064-comissionados-gabinete-portal-transparencia.md) (aceito) | Comissionados de gabinete | Ingestão + seção "Gabinete" | Token (owner) |
| [065](../architecture/ADR/065-colegio-eleitoral-municipal-tse.md) (aceito) | Colégio eleitoral | ✅ **Entregue** (PRs #714/#715) | — |
| ADR-066 (a redigir) | Emendas parlamentares | Probe → ADR → ingestão + UI | Token (owner) |
| ADR-067 (a redigir) | CEIS/CNEP × CEAP | Probe → ADR → confronto | Token (owner) |

## 5. Dívida documental

Docs que distorcem leituras futuras se não atualizados:

| Doc | Problema | Ação |
|---|---|---|
| `PERSONAS.md` (2026-04-14) | Jornada do Jornalista ainda cruza **doações** — descartadas por decisão do owner (2026-07-05) | Reescrever jornada sobre dinheiro público (emendas/gastos/gabinete) |
| `METRICS.md` (draft, 2026-04-14) | Menciona Go/VPS/Prometheus (descartados por ADR-020); targets nunca medidos | Revisar para instrumentação privacy-first real |
| `DOMAIN-MODEL.md` | Draft de abril, pré-eixos 1–3 | Já listado no PRODUCT-GAPS |
| `PARLAMENTAR-360.md` / `SEARCH.md` | Snapshots antigos | Já listado no PRODUCT-GAPS |

## 6. Recomendação — ordem de execução

### Semana 1 — desbloqueio (quase zero código novo)

1. ~~**Mergear PR #716**~~ ✅ feito (2026-07-14). Observar 3 dias de crons
   verdes → fechar #701 e as issues de incidente cobertas (#702–#718).
2. **Cadastrar token** do Portal da Transparência + GitHub Secret (owner,
   minutos) → destrava 14.0, 14.2 e probe do 067.
3. **Repopular as 10 tabelas zeradas** (dispatch manual weekly/monthly
   pós-retry estável) → torna visível de graça o que as Waves 12/13 já
   construíram.
4. (Condicional) **Tier gate por casa** — só se a cascata
   Senado→Câmara se repetir pós-#716.

### Semanas 2–4 — completar o dossiê (Wave 14)

Sprints 14.0 e 14.2; depois a **14.3 (costura)** — onde a centralização
se materializa: SectionNav do perfil na narrativa *Mandato → Dinheiro →
Base eleitoral → Patrimônio* e `/metodologia` publicada **antes** dos
confrontos compostos (emendas × colégio eleitoral).

### Depois — fechar o loop (Wave 15)

Job `alertas-dispatch` acoplado ao cron; digest semanal opt-in; seguir
tema; cards OG dos confrontos. **Instrumentar retenção** privacy-first no
painel — sem medir, a Wave 15 não prova que funcionou.

### Wave 16 — condicionada a evidência de uso (ADR-019)

Ranking `/coerencia` (diferencial nº 1 da visão, dado latente existe),
grafo legislativo (#96), Parquet no R2, texto integral de discursos no R2.

## 7. O que deliberadamente NÃO fazemos (reafirmado)

Sem mudança em relação ao PRODUCT-GAPS §"O que NÃO é gap" e ao
planejamento Wave 14 §8: doações de campanha (decisão do owner —
a tese investigativa é dinheiro **público**), score/nota agregada
(ADR-051), NLP/LLM para classificação, assembleias estaduais, mobile
nativa, webhooks, diários oficiais, processos judiciais. Essa disciplina
é ativo estratégico: sustenta a neutralidade que nenhum concorrente do
landscape tem.

## 8. Evidência coletada

- **Runs de ingestão**: `gh run list --workflow=ingestion-daily.yml` —
  conclusion `failure` em 2026-07-06/07/08/09/10/11/12/13;
  weekly `failure` em 2026-07-05 e 2026-07-12.
- **Run de 2026-07-13 (daily)**: 8 success · 2 failure
  (`senado-senadores`, `senado-orientacoes`) · 2 cancelled em cascata
  (`camara-orientacoes`, `camara-backfill-votacao-proposicao`).
- **Assinatura do erro** (log literal):
  `{"event":"ingest_senadores_failed","error":"fetch failed <- Connect
  Timeout Error (attempted address: legis.senado.leg.br:443, timeout:
  10000ms) [UND_ERR_CONNECT_TIMEOUT]"}`.
- **PR #716**: CI 100% verde (`mergeStateStatus: CLEAN`) e aberto desde o
  commit `45977f5`; mergeado durante esta auditoria.
- **Tabelas zeradas**: revalidação de 2026-07-05 contra Neon prod
  (`pg_stat_user_tables`) registrada no PRODUCT-GAPS v1.1; sem cron
  weekly/monthly verde desde então, permanecem zeradas.
- **ADRs**: grep de status em `docs/architecture/ADR/0*.md` — nenhum
  `proposed` remanescente além dos ADR-066/067 ainda não redigidos.
- **Issues abertas** (2026-07-13): ~15 de incidente (#696–#718), #512
  (discursos R2), #96 (grafo), #58 (R2 cache/Parquet), #98 (TSE
  histórico), #100 (Labs L4), #174 (rotas privadas), #486 (federação).
