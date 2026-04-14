# Product Vision

> Brasil a Vera · Produto · v0.1
> Última atualização: 2026-04-14
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

Spec completa: [Motor de Coerência](../features/COHERENCE-ENGINE.md)

### 2. Grafo Legislativo

Modela vínculos reais entre parlamentares como grafo com 4 tipos de aresta (co-votação, co-autoria, comissão, partido). Revela clusters de poder além das fronteiras partidárias.

- Detecção de comunidades (Louvain/Leiden)
- Parlamentares-ponte (betweenness centrality)
- Evolução temporal de coalizões
- Trust level: L1 (arestas) / L2 (métricas) / L3 (comunidades)

Spec completa: [Grafo Legislativo](../features/LEGISLATIVE-GRAPH.md)

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

Dados factuais como foundation (L1/L2), analytics derivados como camada opt-in (L3/L4), sempre com metodologia 100% transparente e open-source. Rankings e índices são apresentados como **cálculos reproduzíveis**, não como vereditos.

### Acessibilidade de Linguagem

O processo legislativo brasileiro usa terminologia técnica inacessível para a maioria dos cidadãos. O Brasil a Vera traduz sem simplificar em excesso: cada termo técnico tem explicação acessível ao lado, e a interface prioriza linguagem natural (ex: "votou a favor" em vez de "registrou voto SIM em votação nominal").

Glossário completo: [Processo Legislativo](../domain/LEGISLATIVE-PROCESS.md)

### Open Source e Vitrine Técnica

Todo o código é open-source. O repositório serve como referência de excelência técnica: DDD, Clean Architecture, arquitetura hexagonal, SOLID, design patterns. A qualidade do código é parte da proposta de valor. Detalhes em [Guia de Contribuição](../contributing/CONTRIBUTING.md).

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

O MVP é gratuito e open-source. A camada premium (se houver) financia a infraestrutura.

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

---

**Documento semente original**: [Product Vision v1.0 (docx)](../seeds/Brasil-a-Vera-Product-Vision-v1.0.docx)
