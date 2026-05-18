# Product Vision

> Brasil a Vera · Produto · v0.2
> Última atualização: 2026-05-13 (aprendizados Waves 1 e 2 incorporados)
> Status: accepted

---

## Sumário

- [O Problema](#o-problema)
- [A Solução](#a-solução)
- [Proposta de Valor](#proposta-de-valor)
- [Diferencial Competitivo](#diferencial-competitivo)
- [Landscape Competitivo](#landscape-competitivo)
- [Princípios de Produto](#princípios-de-produto)
- [Escopo Federativo](#escopo-federativo)
- [Sustentabilidade](#sustentabilidade)
- [Riscos e Mitigações](#riscos-e-mitigações)
- [Aprendizados das Waves 1 e 2](#aprendizados-das-waves-1-e-2)

---

## O Problema

O Brasil possui um dos ecossistemas de dados legislativos abertos mais robustos da América Latina. A Câmara dos Deputados disponibiliza uma API REST v2 com dados de deputados, votações, proposições e gastos. O Senado Federal oferece APIs em JSON/XML. O TSE disponibiliza dados eleitorais e de prestação de contas de campanha. O Portal da Transparência da CGU oferece API REST para consulta de emendas, contratos e gastos.

Apesar desta riqueza de dados, o cidadão brasileiro enfrenta três barreiras fundamentais:

1. **Fragmentação** — dados distribuídos em 5-6 portais com formatos e UX diferentes
2. **Complexidade** — linguagem legislativa críptica e inacessível (PEC, PLP, tramitação conclusiva, quórum qualificado)
3. **Ausência de visão integrada** — nenhuma plataforma unifica votações, proposições, gastos e perfil eleitoral numa visão 360° do parlamentar

## A Solução

O Brasil a Vera é uma **plataforma de transparência legislativa centrada no parlamentar** que unifica dados públicos de múltiplas fontes oficiais para responder à pergunta mais importante do cidadão:

> **"Você escolheu quem te representa. Agora veja o que ele faz."**

## Proposta de Valor

| Persona | Valor entregue |
|---------|---------------|
| **Cidadão** | Visão simples e acessível do que seu parlamentar vota, gasta e propõe |
| **Jornalista** | Cruzamento de dados multi-fonte (votações × doações × gastos) numa interface unificada |
| **Sociedade civil** | Monitoramento temático contínuo com alertas e rankings factuais |
| **Desenvolvedor** | API pública unificada e bem documentada que abstrai a complexidade dos portais oficiais |
| **Pesquisador** | Datasets normalizados, históricos e bulk downloads com metodologia transparente |

Detalhes das personas em [Personas](PERSONAS.md).

## Diferencial Competitivo

O Brasil a Vera se diferencia por três capacidades únicas:

### 1. Motor de Coerência

Detecta pares de votos contraditórios do mesmo parlamentar de forma puramente factual, sem emitir juízo de valor. A plataforma é o espelho — não o juiz.

- Pipeline: classificação temática → direção da proposição → detecção de pares → índice de coerência
- Princípio: falso negativo > falso positivo
- Trust level: L2 (agregação determinística com fórmula pública)

Spec completa: [Motor de Coerência](../future/COHERENCE-ENGINE.md)

### 2. Grafo Legislativo

Modela vínculos reais entre parlamentares como grafo com 4 tipos de aresta (co-votação, co-autoria, comissão, partido). Revela clusters de poder além das fronteiras partidárias.

- Detecção de comunidades (Louvain/Leiden)
- Parlamentares-ponte (betweenness centrality)
- Evolução temporal de coalizões
- Trust level: L1 (arestas) / L2 (métricas) / L3 (comunidades)

Spec completa: [Grafo Legislativo](../future/LEGISLATIVE-GRAPH.md)

### 3. Pirâmide de Confiança

Arquitetura que separa rigorosamente 4 camadas de confiança (L1–L4), com cada dado carregando `trust_level` como metadado persistido, retornado na API e renderizado no frontend.

Spec completa: [Pirâmide de Confiança](../architecture/TRUST-PYRAMID.md)

## Landscape Competitivo

| Projeto | Foco | Status | Lacuna preenchida pelo Brasil a Vera |
|---------|------|--------|--------------------------------------|
| Operação Serenata de Amor | Gastos parlamentares (CEAP) com IA | Semi-abandonado (OKBR) | Foco exclusivo em gastos; sem visão 360° |
| Querido Diário | Diários oficiais municipais | Ativo (OKBR) | Foco municipal; sem votações ou perfil parlamentar |
| Elas no Congresso | Gênero no legislativo | Ativo (AzMina) | Recorte temático único |
| GovTrack (EUA) | Congresso americano completo | Ativo e maduro | Referência de produto; sem equivalente brasileiro |
| Portal da Câmara | Dados da Câmara | Ativo (governo) | UX técnica; sem cruzamento de fontes |

## Princípios de Produto

### Neutralidade Política

O Brasil a Vera é **estritamente apartidário**. Os mesmos critérios se aplicam a todos os parlamentares, partidos e votações. A plataforma não emite opinião, não faz recomendação de voto e não classifica parlamentares como "bons" ou "ruins". A transparência da metodologia é o escudo contra acusações de viés.

### Posicionamento Editorial

Dados factuais como foundation (L1/L2), analytics derivados como camada opt-in (L3/L4), sempre com metodologia 100% transparente e código publicamente auditável. Rankings e índices são apresentados como **cálculos reproduzíveis**, não como vereditos.

### Acessibilidade de Linguagem

O processo legislativo brasileiro usa terminologia técnica inacessível para a maioria dos cidadãos. O Brasil a Vera traduz sem simplificar em excesso: cada termo técnico tem explicação acessível ao lado, e a interface prioriza linguagem natural (ex: "votou a favor" em vez de "registrou voto SIM em votação nominal").

Glossário completo: [Processo Legislativo](../domain/LEGISLATIVE-PROCESS.md)

### Código Publicamente Auditável e Vitrine Técnica

Todo o código é publicamente auditável ([PolyForm Noncommercial 1.0.0](../../LICENSE) — source-available, uso não-comercial; ver [ADR-027](../architecture/ADR/027-licenca-polyform-noncommercial.md)). A qualidade do código é parte da proposta de valor — código simples, testado, reprodutível e auditável. Privilegiamos clareza sobre sofisticação: aplicamos padrões quando há ganho concreto, não como ritual. O repositório serve como referência de engenharia pragmática aplicada a um problema cívico real. Detalhes em [Guia de Contribuição](../contributing/CONTRIBUTING.md).

## Escopo Federativo

### MVP (Waves 0 + 1)

**Câmara dos Deputados** (513 deputados) + **Senado Federal** (81 senadores). APIs mais maduras e dados de maior impacto nacional.

### Expansão (Wave 4+)

Assembleias legislativas estaduais — fonte de dados menos padronizada, requer adapters por estado.

## Sustentabilidade

Lição aprendida de projetos anteriores (Serenata de Amor: crowdfunding esgotado; Querido Diário: dependente de grants): o modelo de sustentabilidade precisa ser pensado desde o início.

Opções a explorar:

- API com tier premium para uso comercial (consultorias, veículos de mídia)
- Patrocínio institucional (fundações de democracia)
- Grants de organizações internacionais de civic tech
- Doações da comunidade

O MVP é de acesso público gratuito com código auditável sob PolyForm Noncommercial 1.0.0. A camada premium (se houver) financia a infraestrutura.

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| APIs oficiais instáveis | Alta | Alto | Cache agressivo, fallback para último snapshot, alertas |
| Acusação de viés político | Média | Crítico | Pirâmide de confiança, metodologia aberta, mesmos critérios para todos |
| Dados incorretos/desatualizados | Média | Alto | Reconciliação periódica, link para fonte, canal de report |
| Classificação de direção errada (Coerência) | Média | Alto | Falso negativo > falso positivo; verbos inequívocos; contexto obrigatório |
| Baixa retenção do cidadão | Alta | Médio | Notificações, conteúdo compartilhável, linguagem acessível |
| Sustentabilidade financeira | Alta | Crítico | Modelo freemium, grants, patrocínio institucional |
| Pressão política para remoção de dados | Baixa | Crítico | Dados 100% públicos; Lei de Acesso à Informação como fundamento |

## Aprendizados das Waves 1 e 2

Esta seção registra ajustes ao posicionamento original derivados de contato com dados reais e operação em produção. Substituem hipóteses por evidências empíricas.

### Volume real (2026-05-13)

| Recurso | Total | Notas |
|---|---|---|
| Parlamentares | 721 | 513 deputados + 81 senadores + suplentes/ex |
| Proposições | 8.852 | Legs. 56 e 57 cobertas; ~85% origem Senado, ~15% Câmara como último ingestor |
| Votações nominais | 1.635 | Câmara: 1.366; Senado: 269 |
| Votos individuais | 17.743 | Average ~10 votos por parlamentar — cobertura recente, cresce com cron |
| Orientações de bancada | 56 | **Apenas Câmara** — Senado não publica orientação via API (issue #83) |
| Gastos CEAP | 57.193 | Cobertura completa Câmara; Senado não tem equivalente |
| Tamanho do banco | 51 MB | Folga de ~20× contra o limite operacional de 1 GB |

### Custo operacional real

- **Cloudflare Workers (deploy)**: R$0/mês — dentro do tier gratuito (100k req/dia)
- **Neon (banco)**: ~$7.52/mês estimado em zona amarela controlada do ADR-017 (threshold $5-15). Free tier reporta $0 actual; estimativa é forecast.
- **GitHub Actions (ingestão)**: R$0/mês — repositório público
- **R2 (arquivamento futuro)**: ainda não em uso. ADR-016 prevê uso quando cobertura temporal for ampliada.

O posicionamento original "custo operacional próximo de zero" se confirma na ordem de grandeza correta — quase tudo grátis, único custo Neon na zona dezenas de dólares/mês quando legislaturas anteriores entrarem.

### Limitações de API descobertas em produção

Hipóteses do PRODUCT-VISION foram refinadas por contato com as APIs reais:

| Hipótese original | Realidade empírica |
|---|---|
| "APIs da Câmara e Senado são equivalentes" | **Falsa** — Senado não publica orientação partidária (#83) nem possui equivalente CEAP de gastos |
| "Idempotência via UNIQUE(parlamentar, source_id) cobre CEAP" | **Falsa** — `codDocumento` da Câmara identifica documento de origem, não lançamento. Parcelas/estornos geram múltiplas rows legítimas. ADR-014 documenta padrão DELETE+INSERT por janela |
| "Source_id como chave única em proposições basta" | **Falsa** — proposições compartilhadas Câmara↔Senado (PL revisado pelo Senado) precisam rastros separados por casa (#74) |
| "APIs públicas brasileiras são confiáveis" | **Parcial** — funcionais mas instáveis. Retry com backoff é regra, não exceção. Detalhes em `ingestion/shared/http.ts` |

### Decisões arquiteturais validadas

- **Cloudflare Workers + Neon serverless** (ADR-003, ADR-009): scale-to-zero real, sem manutenção, custo proporcional ao uso. Validado em ~4 meses de operação contínua.
- **Cache de edge em todas as queries server** (ADR-018): primeira vez em prod confirmou ~25× redução de hits ao banco vs sem cache. Princípio 8 do CLAUDE.md tornou-se gate de PR.
- **Schema por bounded context** (ADR-013): `\dt parlamentares.*` em psql vs busca por prefixo em schema único — diferença prática real conforme número de tabelas cresce.
- **Trust level em aggregate roots** (princípio 3 do CLAUDE.md): coluna `trust_level` + `source_url` + `ingested_at` permitem responder "de onde veio este número?" sem expedição arqueológica.

### Tempo de ingestão por workflow (observado, 2026-05-13)

| Workflow | Trigger | Duração típica | Notas |
|---|---|---|---|
| `deploy.yml` | push em `main` | ~1m30s | inclui auto-migrate via #75 |
| `ingestion-votacoes.yml` | cron 4×/dia | ~12 min | 4 jobs paralelos (Câmara/Senado/orientações/backfill) |
| `ingestion-weekly.yml` | cron 1×/sem | sem dados ainda (primeira run domingo pós-#73) | proposições + tramitação |
| `budget-poll.yml` | cron diário | ~30s | poll Neon API, sem touch DB |

Probes adicionais em `/api/health` (não toca DB) servem como heartbeat — observabilidade ativa sem queimar Neon scale-to-zero.

### Cuidados específicos do runtime Workers

- **Driver `pg` (HTTP) em vez de `pg-native`** — Workers não suporta sockets longos; conexão por request via `@neondatabase/serverless` resolve.
- **`ImageResponse` de `next/og`** usa satori, subset de CSS — sem `calc()`, sem CSS vars, todo `<div>` com múltiplos filhos exige `display: 'flex'`.
- **OpenNext converte Next.js → Workers** (ADR-009) — bundle final ~30 MB, dentro do limite. Build leva ~5-7s em CI.
- **Migrations rodam via `DIRECT_URL`** (não pooled) — Drizzle Kit emite DDL incompatível com pooled connection. Auto-migrate no `deploy.yml` desde #75.

### Princípio 13 (validação empírica) cristalizado

O CLAUDE.md ganhou em 2026-05-12 o princípio 13: *"Decisões de cache, performance ou runtime behavior exigem validação empírica antes de implementação"*. Falsificou hipóteses em 3 ocasiões durante Wave 2.1.1:

1. **#75**: Hipótese "edge CDN nativo em URLs `*.workers.dev` cacheia automaticamente" → falsificada após merge inicial; revert + cache explícito.
2. **#74**: Diagnóstico empírico confirmou 86% dos `source_url` apontando para Senado — não apenas hipótese, mas medida.
3. **#77**: Hipótese "Senado tem endpoint análogo de orientação" → falsificada com 6 endpoints 404; escopo dividido em #77 (Câmara) + #83 (Senado bloqueado).

### Cobertura temporal — ressalva ao posicionamento

PRODUCT-VISION fala em "visão 360° do parlamentar", mas a cobertura atual é parcial:

- **Cobertura horizontal**: 100% dos parlamentares ativos das legislaturas 56 e 57.
- **Cobertura vertical (eventos por parlamentar)**: cresce a cada cron — ~10 votos médios por deputado em 2026-05-13 vs threshold de 50 para alinhamento estatisticamente robusto.

A plataforma é honesta sobre a parcialidade — warnings de "amostra pequena" e empty states explícitos onde dados faltam. O posicionamento mantém-se: o sistema é o espelho. O espelho ainda tem partes embaçadas, mas anuncia onde estão.

---

**Documento semente original**: [Product Vision v1.0 (docx)](../seeds/Brasil-a-Vera-Product-Vision-v1.0.docx)
