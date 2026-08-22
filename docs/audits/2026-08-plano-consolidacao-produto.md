# Plano de Consolidação do Produto — Brasil a Vera como plataforma central de diligência política do cidadão

**Data:** 2026-08-22
**Status:** aprovado pelo owner em 2026-08-22 (decisões D1–D5 da §8 resolvidas conforme recomendação: D1 sim — 15-E antes do núcleo da 15; D2 escopo cheio, corte mínimo como reserva; D3 recusa confirmada; D4 sim; D5 API aberta primeiro, tier depois)
**Método:** benchmark externo (Ranking dos Políticos, De Olho em Você, landscape) × diagnóstico interno (PRODUCT-VISION v0.3, ROADMAP v0.7, PRODUCT-GAPS v1.2, auditorias jul/2026, planejamento Waves 14–16)
**Antecedentes:** [`2026-07-wave14-planejamento.md`](2026-07-wave14-planejamento.md) · [`2026-07-auditoria-produto.md`](2026-07-auditoria-produto.md) · [`2026-07-probe-download-de-dados.md`](2026-07-probe-download-de-dados.md)

---

## 0. Tese em uma frase

O Brasil a Vera não precisa virar outro produto para ser "o sistema centralizado e único de diligência política" — ele já é o mais completo do landscape em dados por parlamentar. O que falta para consolidá-lo é **(a)** fechar o loop de retorno (Wave 15, já aprovada), **(b)** capturar a janela eleitoral de outubro/2026, que é perecível e é o maior evento de demanda por diligência política do ciclo, **(c)** transformar a superfície pedagógica existente em porta de entrada para o cidadão que não sabe por onde começar, e **(d)** provar tudo isso com métricas — que hoje não existem.

---

## 1. Benchmark externo — o que os dois sites de referência fazem bem

### 1.1 Ranking dos Políticos (ranking.org.br)

Operando desde 2011, é o player de maior alcance. Anatomia:

| Componente | Como funciona |
|---|---|
| **Nota única 0–10** | Votações 75% + Gastos 10% + Presença 10% + Privilégios 5%; bônus de produção (0,6) e articulação (0,4); **−0,5 por processo/condenação judicial** |
| **Juízo editorial explícito** | "Conselho de Leis" classifica cada votação como favorável/contrária aos pilares *eficiência pública, ambiente de negócios, combate à corrupção* (consenso de 70%) |
| **Acompanhamento** | "Parlamentar em Foco", "Meu Ranking", comparação — mediante login |
| **Conteúdo editorial** | Artigos, relatórios, newsletter |
| **Transparência de método** | Manual de metodologia público, revisão anual auditada |

**Lição estrutural:** a força deles é a *síntese* — o cidadão sai com um número. O custo dessa força é o viés declarado: a nota embute uma agenda política específica. O BaV decidiu deliberadamente **não competir nesse eixo** (ADR-051, "o espelho não soma") — e essa recusa é o diferencial, não uma fraqueza. O que se adota deles não é a nota, e sim: **(1)** acompanhamento personalizado como produto central, **(2)** metodologia pública como ativo de marketing e credibilidade, **(3)** visão histórica ano a ano, **(4)** camada editorial/pedagógica que dá contexto ao dado.

### 1.2 De Olho em Você (deolhoemvoce.com.br)

Projeto mais recente, forte no eixo fiscal:

| Componente | Como funciona |
|---|---|
| **Emendas (inclusive Pix)** | Execução via Portal da Transparência — eixo que o BaV entregou na Wave 14 (ADR-066) |
| **Recorte municipal ("Cidades")** | O dado federal visto a partir da cidade do cidadão |
| **Painel BI + rankings fiscais** | CEAP, comparações, período configurável |
| **Módulo Eleições** | Conecta o dado de mandato ao momento eleitoral |
| **Guia de Uso** | Onboarding explícito para quem não sabe ler o dado |

**Lição estrutural:** dois movimentos que o BaV ainda não fez — **inverter o eixo de navegação para o território do cidadão** (a cidade dele, não o parlamentar) e **conectar o dado de mandato ao momento eleitoral**. Ambos entram neste plano.

### 1.3 Landscape e o espaço vazio

| Player | Eixo forte | O que não cobre |
|---|---|---|
| Ranking dos Políticos | Nota única + acompanhamento | Neutralidade; patrimônio; emendas; auditabilidade do dado |
| De Olho em Você | Emendas/fiscal + município | Coerência de voto; patrimônio; pedagogia |
| Parlametria (OKBR/UFCG) | Votações por tema (viés temático declarado) | Dinheiro; patrimônio; generalidade |
| Serenata de Amor | Anomalias de CEAP via IA | Tudo além de gastos; produto descontinuado como interface cidadã |
| Excelências (Transparência Brasil) | Processos judiciais + patrimônio | Atualização; UX moderna |
| Politize! | Educação política | Dados; diligência individual |
| Portais oficiais (Câmara/Senado/Portal da Transparência) | Fonte primária | Visão integrada; linguagem acessível |

**Nenhum player junta**: votações + coerência + gastos + gabinete + emendas + patrimônio + base eleitoral + pedagogia + acompanhamento, com trust level auditável e custo ~zero. Esse é o espaço do "sistema centralizado e único" — e o BaV já ocupa a maior parte dele em dados; falta ocupá-lo em *presença* (retenção, descoberta, momento eleitoral, medição).

---

## 2. Diagnóstico interno — síntese

O detalhe está nas auditorias de julho; aqui, o resumo que fundamenta o plano:

1. **O dossiê 360° está entregue e é único no landscape**: 28 seções por parlamentar (mandato → dinheiro → base → patrimônio), 6 rankings L2 com fórmula pública, `/docs/metodologia`, 44 fontes no registry, custo ~$0/mês.
2. **O loop de retorno não fecha**: infra completa desde a Wave 10 (Clerk + follows + Resend + LGPD), zero e-mails jamais disparados. Wave 15 aprovada, não iniciada.
3. **Dado capturado sem chegar a prod**: 8–10 tabelas zeradas (comissões, presença física, blocos, afastamentos…) com features fail-closed invisíveis; backfill de texto pendente em prod.
4. **Diferenciais nº 1 e 2 da visão (coerência completa, grafo) seguem sem produto** — Wave 16, condicionada a evidência de uso (ADR-019).
5. **Nada é medido**: RUM quebrado por CORS (#745), METRICS.md nunca instrumentado. Não dá para consolidar um produto que não se consegue provar que funciona.
6. **Personas dev/pesquisador sem entrega** (API pública, Parquet) e dívida documental (PERSONAS, METRICS, DOMAIN-MODEL desatualizados).

**Fator novo, ausente de todos os docs internos: as eleições gerais de 04/10/2026 estão a ~6 semanas.** Todos os 513 deputados e 2/3 do Senado passam pelas urnas. O registro de candidaturas no TSE fechou em meados de agosto — o dado de "quem está tentando de novo" já existe na fonte que o BaV já ingere (`consulta_cand`, mesma família de arquivos dos bens). É o pico de demanda por diligência política do ciclo de 4 anos, e é perecível: em novembro, vale uma fração.

---

## 3. Posicionamento — o que o BaV é e recusa ser

**É:** o *espelho auditável* — todo fato com `trust_level`, `source_url` e fórmula pública; linguagem de cidadão; neutralidade apartidária estrita; visão 360° que nenhuma fonte oficial ou concorrente oferece integrada.

**Recusa ser** (decisões já tomadas, que este plano reafirma):

- **Nota única / score agregado** (ADR-051): a nota do Ranking dos Políticos exige um juízo editorial ("Conselho de Leis") que contradiz a neutralidade — o principal ativo defensivo do BaV contra acusação de viés. A resposta do BaV à demanda por síntese não é somar, é **multiplicar espelhos**: N rankings unidimensionais com fórmula pública + pares contraditórios factuais. O cidadão soma; o espelho não.
- **Doações de campanha** (decisão do owner, 2026-07-05): fora do escopo; a jornada do jornalista se reconstrói sobre emendas/gastos/gabinete + CEIS/CNEP (ADR-067).
- **Processos judiciais como eixo** (avaliado agora, à luz do benchmark): tanto Ranking (penalidade de −0,5) quanto Excelências cobrem processos. Não há fonte estruturada e estável (exigiria scraping de tribunais); o dado é volátil, juridicamente sensível (presunção de inocência × exibição em perfil) e de altíssimo risco de viés percebido. **Não recomendado** sem probe de fonte L1 limpa; registrado na lista "não é gap".

---

## 4. Invariantes do plano

1. **Neutralidade primeiro**: nenhuma feature nova pode exigir juízo editorial. Confrontos factuais sempre com `/docs/metodologia` atualizada *antes* do deploy da feature.
2. **Custo ~$0** (ADR-017): toda wave declara footprint Neon estimado e respeita janelas de ingestão.
3. **Evidência antes de código** (ADR-019): Wave 16 em diante condicionada a métricas de uso — que a Fase 0 deste plano finalmente instrumenta.
4. **Fail-closed honesto**: seção sem dado não aparece; mas tabela zerada em prod é incidente, não estado aceitável.
5. **Prioridade a fonte bulk sem token** (lição do probe de 14/07).

---

## 5. O programa — dois horizontes

### Horizonte 1 — até 04/10/2026 (janela eleitoral, ~6 semanas)

Ordenado por perecibilidade × impacto. A Wave 15 aprovada **permanece no plano**, mas o sequenciamento proposto intercala o módulo eleitoral porque ele expira; ver decisão D1 na §8.

#### Fase 0 — "Ligar os instrumentos e reabastecer o espelho" (1 semana, pré-condição)

Zero feature nova antes disto (mesmo princípio da Fase 0 da Wave 14):

- **F0.1 — Medição**: resolver o RUM/CORS (#745) ou substituir por Cloudflare Web Analytics; instrumentar as 4–5 métricas mínimas (visitas, rotas mais vistas, retenção 7d, origem de tráfego, shares OG). Atualizar `METRICS.md` para v0.3 com o que é *de fato* medido.
- **F0.2 — Reabastecer prod**: rodada manual dos crons que populam as tabelas zeradas (comissões, presença, blocos, afastamentos), backfill de texto pendente, verificação pós-rodada seção a seção no dossiê. Meta: 28/28 seções com dado real para parlamentares representativos.
- **F0.3 — Pendências do owner registradas na auditoria UX**: rodada `camara-mesa-diretora`, verificação do 500 intermitente em `/gastos`.

**DoD:** dashboard mínimo de métricas ativo; `PRODUCT-GAPS.md` atualizado com contagem real das tabelas; zero seções fail-closed por tabela zerada.

#### Wave 15-E — "Eleições 2026: o dossiê vai à urna" (2–3 semanas, perecível)

O produto já é o dossiê; a wave conecta o dossiê ao momento de voto. Tudo L1, zero juízo:

- **15-E.1 — Ingestão candidaturas 2026** (`consulta_cand` 2026, infra existente do TSE): para cada parlamentar em exercício, *é candidato? a quê? por qual partido/UF?* — inclusive mudanças de partido e de cargo pretendido. Footprint pequeno (uma linha por candidato).
- **15-E.2 — Bens 2026**: 4º pleito na trilha patrimonial existente (Camadas A–D já tratam N pleitos). A variação patrimonial ganha o ponto mais recente exatamente quando mais importa.
- **15-E.3 — Seção "Eleições 2026" no dossiê + banner de contexto**: "Este deputado é candidato à reeleição por SP" com link para o histórico completo. Estado honesto para não-candidatos.
- **15-E.4 — Porta de entrada eleitoral**: evolução de `/quem-me-representa` → "quem te representa **está pedindo seu voto de novo?**" — lista por UF dos que concorrem, cada um linkando ao dossiê. É a landing de campanha do produto.
- **15-E.5 — Share cards eleitorais**: OG cards dos fatos (gasto, alinhamento, patrimônio, coerência) com moldura "antes de votar, veja o histórico" — o mecanismo de distribuição da janela (a jornada canônica do cidadão termina em "compartilha no WhatsApp").
- **15-E.6 — Guarda de neutralidade**: seção em `/docs/metodologia` sobre o recorte eleitoral (fonte TSE, critérios, por que não há recomendação de voto). Publicar *antes* das features.

**Riscos específicos:** dados TSE 2026 com colunas/formatos novos (mitigação: Zod no boundary + probe antes do ADR); período eleitoral atrai leitura de "campanha disfarçada" (mitigação: 15-E.6 + simetria absoluta — todo candidato tratado igual).

#### Wave 15 — "Acompanhamento" (escopo aprovado em 2026-07-05, inalterado)

Job `alertas-dispatch` pós-ingestão (fato novo por follow em <24h), digest semanal opt-in, seguir tema, cards OG de confrontos novos. DoD original mantido (Resend free tier, unsubscribe 1-clique, zero query fora de janela).

**Sinergia com a janela**: cada visitante da janela eleitoral que criar conta e seguir um parlamentar vira retenção pós-eleição — a Wave 15 é o que impede o tráfego de outubro de evaporar em novembro. Por isso ela entra no Horizonte 1, mesmo que parcialmente (dispatch + follow prompt no dossiê no mínimo; digest e temas podem deslizar para novembro sem perda).

### Horizonte 2 — pós-eleição (novembro/2026 em diante)

Condicionado às métricas que a Fase 0 instrumenta (ADR-019 aplicado com dados reais pela primeira vez):

#### Wave 16 — "Profundidade analítica" (escopo aprovado, inalterado)

Ranking `/coerencia` com índice completo (diferencial nº 1 da visão), grafo legislativo (#96), discursos texto integral no R2 (#512). Gatilho: evidência de uso das seções de coerência/pares na janela eleitoral.

#### Wave 17 — "Situar o cidadão" (novo — o terceiro pedido do posicionamento)

O eixo pedagógico que Politize! cobre sozinha e nenhum player integra ao dado:

- **17.1 — Rota `/municipios/[codigo]`** (inversão de eixo, inspiração De Olho em Você): a política federal vista da cidade do cidadão — quais parlamentares têm ali sua base (colégio eleitoral invertido), quais emendas chegaram ali (emendas invertidas). Dados já em prod; é uma query invertida + rota nova.
- **17.2 — Trilha pedagógica**: consolidar `/docs` como centro cívico navegável — "como funciona o Congresso", "o caminho de uma lei", "o que é a cota parlamentar", glossário linkado inline nos dossiês (tooltip → verbete). Parte do conteúdo já existe (5 páginas da Sprint 3.2 + 6 rotas `/docs`); a wave é curadoria + descoberta + linkagem inline, não redação do zero.
- **17.3 — Onboarding cívico**: primeira visita → "me situe": UF → quem te representa → o que fazem → siga um. Costura de rotas existentes num fluxo guiado.
- **17.4 — Camada "explica este número"**: cada KPI do dossiê ganha tooltip pedagógico ("alinhamento de 92% significa que…") derivado da metodologia — o dado com professor do lado.

#### Wave 18 — "Abertura" (personas dev/pesquisador — fecha a promessa da visão)

API pública REST + OpenAPI com rate limiting (#98/G) e datasets Parquet no R2 (#58). Também o candidato natural a primeira fonte de sustentabilidade (tier de API), tema que a visão lista como hipotético.

#### Trilhas transversais (correm em paralelo, sem wave própria)

- **ADR-067** (CEIS/CNEP × fornecedores CEAP): redigir o ADR (probe já verde); jornada do jornalista reconstruída.
- **CEAPS Senado**: única assimetria de gastos restante; wave dedicada quando priorizada.
- **Dívida documental**: PERSONAS v0.2 (jornada do jornalista sem doações; jornada do cidadão com eleições), METRICS v0.3 (Fase 0), PRODUCT-VISION v0.4 (registrar recusas da §3 e o eixo eleitoral), ROADMAP com a fila real (hoje ela vive em docs de auditoria).
- **Sprint 6.6 (perf/Lighthouse)**: reavaliar com dados de RUM reais pós-janela.

---

## 6. Sequenciamento proposto

```
ago S4      Fase 0 (instrumentos + reabastecer prod)
set S1–S2   Wave 15-E (eleições: ingestão + seção + porta de entrada)
set S3–S4   Wave 15 núcleo (alertas-dispatch + follow prompt) ‖ 15-E.5 share cards
out S1      congelamento de risco: só correções; janela de tráfego
out 04      1º turno — pico de uso
out–nov     Wave 15 restante (digest, seguir tema) + leitura de métricas da janela
nov+        Waves 16 → 17 → 18 conforme evidência (ordem revisável pelos dados)
```

---

## 7. Métricas de sucesso (por fase, mensuráveis a partir da Fase 0)

| Fase | Métrica | Baseline | Alvo |
|---|---|---|---|
| Fase 0 | métricas instrumentadas | 0 | ≥5 ativas |
| Fase 0 | tabelas de produto zeradas em prod | 8–10 | 0 |
| 15-E | parlamentares com status eleitoral 2026 no dossiê | 0 | 100% dos em exercício |
| 15-E | shares OG na janela set–out | não medido | >0 e medido |
| 15 | e-mails de alerta entregues/semana | 0 | >0, <24h pós-fato |
| 15 | contas criadas na janela eleitoral | não medido | medido + follows >0 |
| Janela | retorno semanal (retenção 7d) | não medido | instrumentado, baseline registrado |
| Sempre | custo mensal | ~$0 | ~$0 (invariante) |

---

## 8. Decisões que este plano pede ao owner

- **D1 — Sequenciamento**: aceitar a intercalação da Wave 15-E *antes* do núcleo da Wave 15? (Alternativa: manter Wave 15 primeiro e correr o risco de o módulo eleitoral não chegar antes de 04/10.) **Recomendação: sim** — o módulo eleitoral é perecível; alertas são evergreen.
- **D2 — Escopo da 15-E**: itens 15-E.1–15-E.6 como descritos, ou corte adicional? (Corte mínimo viável: 15-E.1 + 15-E.3 + 15-E.6.)
- **D3 — Processos judiciais**: confirmar a recusa da §3 (registrar em PRODUCT-GAPS "não é gap"), ou autorizar um probe de fonte L1?
- **D4 — Wave 17 `/municipios`**: validar que a inversão de eixo municipal entra na fila pós-eleição.
- **D5 — Sustentabilidade**: a Wave 18 deve incluir o desenho do tier de API (primeira hipótese de receita), ou API 100% aberta e receita fica para depois?

---

## 9. Riscos do plano

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| Janela eleitoral perdida (15-E atrasa) | média | alto e irreversível até 2030 | Fase 0 curta e dura; corte mínimo viável da D2 pronto |
| Formato TSE 2026 divergente do esperado | média | médio | probe antes do ADR; Zod no boundary; fail-closed |
| Leitura de "campanha disfarçada" no período eleitoral | média | crítico (reputação) | 15-E.6 antes das features; simetria absoluta; zero recomendação |
| Pico de tráfego × free tiers (Neon/Cloudflare/Resend) | baixa–média | médio | SSG + edge cache já cobrem leitura; alertas com batch e teto; monitorar budget ADR-017 |
| Reincidência do firewall `leg.br` × GitHub Actions | média | alto (tabelas re-zeradas) | auto-retry (#716) + verificação pós-cron da Fase 0 como rotina |
| Métricas revelarem baixo uso das seções profundas | média | médio | é o objetivo — ADR-019 passa a decidir a Wave 16 com dado, não intuição |

---

## Referências externas

- [Ranking dos Políticos](https://ranking.org.br/) · [Critérios e metodologia](https://ranking.org.br/criterios-e-metodologia) · [Parlamentar em Foco](https://ranking.org.br/parlamentar-em-foco)
- [De Olho em Você](https://deolhoemvoce.com.br/) · [Sobre](https://deolhoemvoce.com.br/sobre)
- [Parlametria (OKBR/UFCG)](https://okbr.escoladedados.org/noticia/okbr-e-parceiros-lancam-parlametria-ferramenta-para-acompanhar-debates-do-congresso/)
- [Operação Serenata de Amor](https://en.wikipedia.org/wiki/Operation_Serenata_de_Amor)
- [Politize! — 5 ferramentas para conhecer o histórico dos políticos](https://www.politize.com.br/historico-dos-politicos-ferramentas-online/)
- [Correio Braziliense (jul/2026) — Como checar se um político cumpre o que promete](https://www.correiobraziliense.com.br/aqui/2026/07/31/como-checar-se-um-politico-cumpre-o-que-promete-veja-4-ferramentas/)
