# Planejamento Waves 14–16 — Plataforma de investigação e acompanhamento

> Brasil a Vera · Planejamento · 2026-07-05
> Método: `/product-gap-analysis` + leitura da auditoria de fontes
> (`2026-06-cobertura-fontes.md`), do planejamento Wave 12
> (`2026-06-wave12-planejamento.md`), do registry de ingestão (39 fontes),
> dos ADRs 040–065 e das issues abertas em 2026-07-05.
> Sucede e atualiza `2026-06-wave12-planejamento.md`.
> Status: **proposto** — decisão de escopo é ato do owner.

---

## Sumário

- [1. Norte estratégico](#1-norte-estratégico)
- [2. Estado atual — evidência](#2-estado-atual--evidência)
- [3. Fase 0 — Estabilidade operacional (pré-condição)](#3-fase-0--estabilidade-operacional-pré-condição)
- [4. Wave 14 — Dossiê: investigação centrada no parlamentar](#4-wave-14--dossiê-investigação-centrada-no-parlamentar)
- [5. Wave 15 — Acompanhamento: retenção do cidadão](#5-wave-15--acompanhamento-retenção-do-cidadão)
- [6. Wave 16 — Profundidade analítica](#6-wave-16--profundidade-analítica)
- [7. Fontes estratégicas novas — avaliação](#7-fontes-estratégicas-novas--avaliação)
- [8. O que deliberadamente NÃO fazemos](#8-o-que-deliberadamente-não-fazemos)
- [9. Riscos e governança](#9-riscos-e-governança)
- [10. Métricas de sucesso](#10-métricas-de-sucesso)

---

## 1. Norte estratégico

A pergunta do produto evolui:

> Wave 1–13: **"O que meu parlamentar faz?"** (consulta)
> Waves 14+: **"O que meu parlamentar faz, quanto isso custa, quem o elegeu
> e para onde ele manda o dinheiro — e me avise quando algo mudar."**
> (investigação + acompanhamento)

Duas jornadas orientam tudo abaixo:

| Jornada | Persona dominante | Loop |
|---------|-------------------|------|
| **Investigar** | Cidadão Consciente, Jornalista | Chega por um nome → dossiê 360° com confrontos factuais → compartilha/exporta |
| **Acompanhar** | Cidadão Consciente, Ativista/ONG | Segue parlamentar/tema → recebe alerta quando há fato novo → retorna à plataforma |

O diagnóstico da Wave 12 permanece válido e se agrava positivamente: **o
gargalo não é ausência de dado — é dado capturado sem superfície de produto
e ausência do loop de retorno**. A ingestão cobre 39 fontes; a jornada
"Acompanhar" está construída pela metade (follows + painel existem; alertas
não disparam); a jornada "Investigar" tem os blocos mas não a costura.

**Invariantes que não mudam:** confronto factual, não juízo (ADR-051);
copy neutra (ADR-040 §4); trust level L1/L2 com fail-closed; custo ~$0
(free tiers); ADR-019 (nada especulativo — toda fonte nova exige ADR +
probe empírico, princípio 13). **Doações de campanha estão fora por decisão
do owner (2026-07-05)** — ver seção 8.

---

## 2. Estado atual — evidência

### 2.1 O que o PRODUCT-GAPS.md (2026-07-01) já não reflete

Verificação de 2026-07-05 contra os próprios ADRs:

| Item listado como gap | Estado real |
|----|----|
| ADR-043 fidelidade partidária | **accepted + implementado** (`FidelidadePartidaria` em prod) |
| ADR-045 presença em votações | **accepted + implementado** (`/rankings/presenca` em prod) |
| ADR-046 presença física | **accepted + implementado** (Câmara ok, Senado parcial) |
| ADR-048 discursos/temas | **accepted + implementado** (ingestão ativa) |
| ADR-050 busca por tema | **accepted + implementado** (filtro em /proposicoes + navbar, PR #685) |
| ADR-047 variação patrimonial | **accepted** (emenda em working tree — confirmar estado da UI) |
| Orientação Senado (issue #83 "bloqueado") | **implementado** — `senado-orientacoes` no registry (G0/#500); #83 é obsoleta, fechar |

→ Ação da Fase 0: atualizar `PRODUCT-GAPS.md` e fechar #83.

### 2.2 Inventário de ingestão (registry, 2026-07-05)

39 fontes ativas: parlamentares, proposições, votações (plenário + comissão
Senado), orientações (ambas as casas), gastos CEAP, comissões + presença,
tramitação, discursos (metadados), relatorias, sessões, filiações, bio, CPF
(ambas as casas), TSE bens (3 pleitos), lideranças, blocos, frentes, mesa
diretora, afastamentos, vetos, mandatos externos, cargos Senado.

Assimetrias remanescentes reais: **gastos do Senado (CEAPS — fonte distinta)**,
temas de proposição no Senado (API não entrega), presença física no Senado
(API não expõe).

### 2.3 Capacidade instalada sem consumo pleno

| Ativo | Estado | Superfície faltante |
|-------|--------|---------------------|
| Follows + painel + Resend (ADR-030) | infra em prod desde Wave 10 | **Alertas nunca disparam** — não há job que detecte fato novo e envie e-mail |
| Discursos (metadados + URL) | ingerido | Texto integral no R2 (#512) — destrava busca "o que disse × como votou" |
| ADR-064 comissionados de gabinete | **aceito, não implementado** | Ingestão + seção "Gabinete" no perfil |
| ADR-065 colégio eleitoral municipal | **aceito, não implementado** | Ingestão + seção "Colégio eleitoral" no perfil |
| Motor de coerência (pares contraditórios) | dado + cards em prod | Ranking `/coerencia` + índice completo (future/COHERENCE-ENGINE.md) |
| Grafo societário (ADR-037) + grafo legislativo | dados em prod / especificado | Grafo interativo (#96) |
| Página de metodologia | pendente desde Sprint 6.5 | `/metodologia` (esforço P; escudo de neutralidade) |

### 2.4 Fogo operacional

**11 issues de incidente abertas (#688–#698)**: falhas diárias de ingestão
entre 2026-07-02 e 2026-07-05, cobrindo jobs das três cadências
(proposições, votações, senadores, deputados, orientações, relatorias,
sessões, presença-comissões) — **posteriores** ao fix de breaking changes do
PR #687. Sem pipeline estável, toda a superfície acima degrada
silenciosamente. Isso é pré-condição, não backlog (seção 3).

---

## 3. Fase 0 — Estabilidade operacional (pré-condição)

**Zero feature nova antes disto.** Duração alvo: dias, não sprint.

> **Adendo — execução iniciada em 2026-07-05.** A revalidação contra Neon
> prod (pós-reset de quota) confirmou: `filiacao_partidaria` = 230 rows,
> CPF Câmara 646/646 e Senado 72/81 (88,9%), discursos = 50.831,
> orientação de bancada = 428 (ambas as casas → #83 fechada). **Achado
> grave:** 10 tabelas com **0 linhas em prod** — `membro_comissao`,
> `sessao`, `presenca_sessao`, `evento_comissao_presenca`,
> `votacao_comissao_senado`, `voto_nominal_comissao_senado`,
> `afastamento_senador`, `bloco_partidario` (+ `alert_delivery`/
> `data_request`, esperadas). As fontes das Waves 12/13 nunca popularam
> prod: junho bloqueado por quota (402), julho pelos `fetch failed`.
> Features dependentes (ADR-046/057/058, tooltip de blocos) estão
> fail-closed em produção. Triage dos incidentes: assinatura única
> `fetch failed` (falha de rede pós-retry, sem HTTP status) nas duas APIs
> a partir de 2026-07-02, só no caminho GitHub Actions → leg.br (APIs
> respondem 200 de rede residencial); re-runs disparados como probe.

| Item | Detalhe |
|------|---------|
| Triage dos incidentes #688–#698 | Ler logs dos runs; classificar transitório (API instável → re-trigger + fechar) vs persistente (breaking change → PR fix). A concentração em 4 dias consecutivos e nas três cadências sugere causa comum (ex.: quota Neon recém-resetada, mudança de infra ou breaking change de API compartilhado) — investigar antes de tratar caso a caso |
| Revalidar dados em prod pós-reset Neon | Quota resetou 2026-07-01. Rodar os `SELECT count(*)` pendentes (filiacao_partidaria, cpf senadores, discursos) e limpar os marcadores `[A CONFIRMAR prod]` dos ADRs 045/048 e do PRODUCT-GAPS |
| Atualizar `PRODUCT-GAPS.md` | Refletir seção 2.1; registrar doações como **descartado por decisão do owner** (não mais "pendente") |
| Fechar #83 (obsoleta) | Orientação Senado implementada via #500/G0 |
| Commitar ADR-064/065 + emenda ADR-047 | Estão em working tree; formalizar via PR |

---

## 4. Wave 14 — Dossiê: investigação centrada no parlamentar

> **Pergunta a validar:** "O cidadão consegue montar, em uma sessão, o dossiê
> completo de um parlamentar — mandato, custo, base eleitoral e destino do
> dinheiro — só com fatos L1/L2?"

### Sprint 14.0 — Custo do mandato (ADR-064, decidido)

- Ingestão `camara-comissionados` + `senado-comissionados` (Portal da
  Transparência, API Siape, cadência monthly, token via GitHub Secret).
- Seção "Gabinete" no perfil: nº de comissionados, custo bruto mensal, lista
  nome/cargo/remuneração. Fail-closed sem CPF.
- Narrativa que nenhum concorrente tem: **CEAP (despesas) + gabinete
  (pessoal) = custo total visível do mandato**.

### Sprint 14.1 — Base eleitoral (ADR-065, decidido)

- Ingestão `tse-votacao-municipal` (votacao_candidato_munzona, 3 pleitos,
  filtro por CPF de parlamentar).
- Seção "Colégio eleitoral": top 5 municípios + % de concentração + seletor
  de pleito.

### Sprint 14.2 — Destino do dinheiro: emendas parlamentares (fonte nova, requer ADR)

- **Probe empírico primeiro** (princípio 13): validar
  `api.portaldatransparencia.gov.br/api-de-dados/emendas` — filtros por
  autor, ano, município/UF de destino, valores empenhado/pago. Registrar
  output literal no ADR.
- ADR-066 proposto: tabela `emenda_parlamentar` (autor→parlamentar via nome
  do autor da emenda; valores por fase da despesa; município destino), L1,
  cadência monthly.
- Seção "Emendas" no perfil: total por ano, top municípios de destino.
- **Confronto composto com ADR-065** (o motivo estratégico da dupla): "X% do
  valor de emendas destinou-se a municípios do colégio eleitoral" — cálculo
  determinístico L2, copy neutra (é contexto factual, não acusação; a
  legislação permite e até espera direcionamento à base).

### Sprint 14.3 — Costura do dossiê + metodologia

- Revisão de IA do perfil 360°: as seções novas (Gabinete, Colégio eleitoral,
  Emendas) entram na SectionNav; ordenar narrativa "Mandato → Dinheiro →
  Base eleitoral → Patrimônio" (aproveita camada compositiva RDS, ADR-053).
- `/metodologia` (pendência Sprint 6.5, esforço P) — obrigatória **antes**
  de publicar os confrontos compostos: é o escudo de neutralidade.
- Export CSV das seções novas com `trust_level` + `source_url` (princípio
  export = autenticação mantido).

**Critérios de Done da Wave 14**

- [ ] Perfil de deputado com CPF exibe Gabinete + Colégio eleitoral + Emendas com dados reais de prod
- [ ] Confronto emendas×colégio publicado com fórmula documentada em `/metodologia`
- [ ] Probes de smoke para as 3 seções novas (fail-closed verificado: senador sem CPF não quebra)
- [ ] Footprint Neon estimado ANTES de cada migration (EXPLAIN + projeção de linhas no PR) — comissionados ~40k linhas/ano; votação municipal ~300–500k linhas (3 pleitos × ~1000 parlamentares × ~centenas de municípios); emendas ~10k/ano
- [ ] Budget Neon permanece em zona verde/amarela controlada (ADR-017)

---

## 5. Wave 15 — Acompanhamento: retenção do cidadão

> **Pergunta a validar:** "O cidadão que seguiu um parlamentar volta quando
> algo acontece?"

A infra existe desde a Wave 10 (Clerk + follows + Resend + LGPD). O que
falta é o **produtor de eventos** — esforço P/M, impacto direto na métrica
de retenção (PERSONAS: métrica do Cidadão é retenção semanal).

| Item | Esforço | Detalhe |
|------|---------|---------|
| Job `alertas-dispatch` pós-ingestão | M | Ao final do cron diário: para cada follow, detectar fato novo (voto nominal registrado, presença, discurso, nova emenda) desde o último dispatch; enviar digest por e-mail via Resend. Idempotente (tabela `alerta_enviado` ou watermark por follow) |
| Digest semanal opt-in | P | Resumo dos seguidos: votos da semana + gastos novos. Reusa template Resend |
| Seguir tema (além de parlamentar) | M | Estende follows para temas da taxonomia ADR-050; alerta em nova votação/proposição no tema — atende Ativista/ONG (persona primária até hoje sem feature própria) |
| Cards OG dos confrontos novos | P | Compartilhamento é o canal de aquisição de custo zero |

**Critérios de Done**

- [ ] Usuário logado que segue parlamentar recebe e-mail em < 24h após voto nominal novo
- [ ] Unsubscribe de 1 clique (LGPD, reusa base ADR-030)
- [ ] Envio dentro do free tier Resend (medir volume projetado antes: follows atuais × frequência de fatos)
- [ ] Zero query fora dos windows de ingestão (princípio 12 — dispatch acoplado ao cron existente)

---

## 6. Wave 16 — Profundidade analítica

Somente após 14–15 entregues e com evidência de uso (ADR-019):

| Item | Referência | Nota |
|------|-----------|------|
| Ranking `/coerencia` + índice completo | future/COHERENCE-ENGINE.md | O dado latente existe; feature é o diferencial nº 1 da visão e segue não entregue |
| Grafo legislativo interativo | #96 | reactflow; batch Louvain em Actions, materializado |
| Texto integral de discursos no R2 | #512, ADR-016 | Destrava "o que disse × como votou"; decisão R2 já apontada como caminho |
| Bulk Parquet no R2 | #58 (parte), pesquisador | Baixo custo, alto valor para Pesquisador/Jornalista |
| TSE pleitos históricos (< 2014) | #98 (subset sem doações) | Só se houver demanda medida |

---

## 7. Fontes estratégicas novas — avaliação

Critérios (herdados da auditoria de junho): **(a)** trust level alcançável ·
**(b)** habilita confronto factual sem inferência · **(c)** custo vs. teto
Neon/R2 free tier · **(d)** jornada atendida. Toda fonte aprovada exige ADR
próprio + probe empírico com output literal (princípio 13).

### Recomendadas (em ordem)

| Fonte | O que dá | (a) | (b) | (c) | Jornada | Status |
|-------|----------|-----|-----|-----|---------|--------|
| Portal da Transparência — servidores/Siape | Custo do gabinete | L1 | ✅ custo total do mandato | Baixo (monthly, ~600 gabinetes) | Investigar | **ADR-064 aceito** |
| TSE — votação candidato×município | Colégio eleitoral | L1/L2 | ✅ concentração da base | Médio (81 CSVs, one-shot por pleito) | Investigar | **ADR-065 aceito** |
| Portal da Transparência — emendas | Destino do dinheiro por autor | L1 | ✅ emendas × colégio eleitoral (L2) | Baixo–médio | Investigar | probe → ADR-066 |
| Portal da Transparência — CEIS/CNEP | Empresas sancionadas | L1 | ✅ CNPJ fornecedor CEAP ∈ lista de sancionadas (match determinístico) | Baixo (lista nacional, monthly) | Investigar | probe → ADR-067 |
| Senado — CEAPS (Portal Transparência do Senado) | Paridade de gastos | L1 | ✅ simetria bicameral | **Alto** (fonte distinta, CSV próprio) | Investigar | wave dedicada; decisão pendente da Wave 12 §8.5 |

Notas:

- **CEIS/CNEP × CEAP** é o confronto de maior densidade investigativa por
  real gasto: já temos CNPJ de todo fornecedor CEAP (`extrairCnpj` do #467
  reusável). Copy neutra obrigatória: "fornecedor consta no CEIS desde
  [data] ([órgão sancionador])" — fato público, sem adjetivo. Exige cuidado
  com janela temporal (sanção pode ser posterior ao gasto — exibir datas de
  ambos, nunca colapsar).
- **CEAPS** é a única fonte que fecha a assimetria estrutural de gastos
  Câmara×Senado. Custo alto já diagnosticado (404 no dadosabertos;
  CSV do Portal de Transparência do Senado). Recomendação: probe de
  estabilidade do CSV primeiro; se estável, wave própria (16+).

### Avaliadas e não recomendadas agora

| Fonte | Razão |
|-------|-------|
| TSE — doações de campanha (`receitas_candidato`) | **Excluída por decisão do owner (2026-07-05)**. Registrar no PRODUCT-GAPS como descartado; o confronto financiamento×voto sai do backlog |
| Diários oficiais | Território do Querido Diário (OKBR); sem confronto L1/L2 centrado no parlamentar federal |
| Processos judiciais (CNJ/tribunais) | Dado sensível, sem API estável, alto risco de erro de homonímia — violaria fail-closed e neutralidade |
| Redes sociais dos parlamentares | Não-oficial, sem trust level defensável |
| Assembleias estaduais | Já descartado (ADR-019, sem demanda) |
| Frequência/score de presença em eventos | Derivada com semântica ambígua — já descartada na auditoria de junho §7 |

---

## 8. O que deliberadamente NÃO fazemos

Além da lista permanente do PRODUCT-GAPS (§"O que NÃO é gap"):

1. **Camada de doação política** — decisão do owner nesta sessão de
   planejamento. Consequência honesta: o cruzamento "financiamento × voto"
   da persona Jornalista fica sem caminho; a proposta de valor de
   investigação se apoia em **emendas + gastos + gabinete + patrimônio +
   colégio eleitoral**, que juntos cobrem "dinheiro público" (verificável,
   L1) em vez de "dinheiro privado de campanha".
2. **Score/nota de parlamentar** — mesmo com o dossiê completo, não somamos
   confrontos num índice editorial. Cada confronto é um fato isolado
   (ADR-051 — veredito do espelho).
3. **NLP/LLM para classificar discursos** — metadados e texto integral (R2)
   entregues verbatim; classificação além da taxonomia oficial fica fora
   até gargalo medido (ADR-019).

---

## 9. Riscos e governança

| Risco | Urgência | Mitigação |
|-------|----------|-----------|
| Incidentes de ingestão em série (#688–#698) corroem a base de tudo | 🔴 imediato | Fase 0 antes de qualquer feature; se causa comum, fix único |
| Re-esgotamento da quota Neon (como jun/2026) com 3 tabelas novas | 🟠 alta | Estimar footprint no PR de cada migration; votação municipal é a maior (avaliar filtro top-N municípios por candidatura se projeção > 100 MB); R2 para texto longo (princípio 11) |
| API do Portal da Transparência: token + rate limit | 🟠 alta | Secret `PORTAL_TRANSPARENCIA_API_KEY`; sleep entre calls; retry padrão `fetchWithRetry` |
| Vínculo autor da emenda → parlamentar por nome | 🟡 média | Match por nome é L3 se ambíguo — usar nome parlamentar oficial + casa + fail-closed em ambiguidade; documentar taxa de match no ADR-066 (mesmo padrão do ADR-063) |
| Acusação de viés com confrontos mais fortes (emendas×base, CEIS×CEAP) | 🟡 média | `/metodologia` publicada ANTES dos confrontos; copy neutra auditada; datas explícitas em todo confronto temporal |
| Volume de e-mail (Resend free tier) | 🟡 média | Digest agregado (1 e-mail/dia máx por usuário); medir antes de abrir |

Governança de execução (inalterada): PR por item com CI verde; plan mode
para mudanças > 3 arquivos; toda query nova com edge cache (ADR-018);
índice novo só com EXPLAIN ANALYZE (princípio 10); merge é ato do owner.

---

## 10. Métricas de sucesso

| Métrica | Baseline | Alvo pós-Wave 15 |
|---------|----------|------------------|
| Incidentes de ingestão abertos | 11 | ≤ 2 (só transitórios em triage) |
| Seções do dossiê com dado real (deputado mediano) | ~10 | 13 (+ Gabinete, Colégio, Emendas) |
| Fontes distintas no registry | 39 (2 órgãos + TSE + Receita) | 42–44 (+ Portal da Transparência federal) |
| Alertas: e-mails entregues/semana | 0 | > 0 com open rate medido (primeiro sinal real de retenção) |
| Retorno semanal de usuários logados | não medido | instrumentar no painel (contagem simples, sem tracker externo) |
| Custo operacional | ~$0/mês | ~$0/mês (invariante) |

---

## Anexo — mapa de decisão para o owner

1. **Aprovar Fase 0 imediata** (triage de incidentes + revalidação prod + docs) — sem custo de decisão, só execução.
2. **Wave 14 como proposta acima?** ADR-064/065 já aceitos; a decisão real é a Sprint 14.2 (emendas → ADR-066 após probe).
3. **CEIS/CNEP entra na 14 ou 16?** Recomendação: probe junto com o de emendas (mesma API, mesmo token); implementação na 14 só se a 14.2 fechar folgada.
4. **CEAPS Senado**: manter pendente até probe de estabilidade do CSV; se aprovado, wave dedicada.
5. **Registrar doações como fora de escopo** no PRODUCT-GAPS (estado: descartado por decisão, não "pendente").
