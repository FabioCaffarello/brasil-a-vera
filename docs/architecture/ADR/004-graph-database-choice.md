# ADR-004: Escolha do Graph Database

> Brasil a Vera · Arquitetura · v0.2
> Última atualização: 2026-04-14
> Status: deferred

---

> **Nota**: esta decisão foi **adiada para a Wave 3+**. O [ADR-003](003-database-strategy.md) estabeleceu PostgreSQL como único banco nas Waves 0–2, com estratégia faseada para capacidades de grafo (SQL simples → NetworkX + Apache AGE → graph database dedicado se necessário). Este ADR permanece como referência para quando a decisão precisar ser retomada.

---

## Sumário

- [Contexto](#contexto)
- [Por que foi adiada](#por-que-foi-adiada)
- [Reavaliação Planejada — Wave 3](#reavaliação-planejada--wave-3)
- [Decisão Original (referência)](#decisão-original-referência)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Referências](#referências)

---

## Contexto

O [ADR-003](003-database-strategy.md) originalmente estabeleceu uma estratégia de persistência poliglota com Neo4j como analytical twin para o [Grafo Legislativo](../../features/LEGISLATIVE-GRAPH.md). Após revisão das necessidades reais e restrições de custo, a decisão foi adiada.

Requisitos do Grafo Legislativo (inalterados):

- **~600 nós** (deputados + senadores) com propriedades ricas (partido, estado, comissões)
- **Milhões de arestas** — co-votação ao longo de múltiplas legislaturas, co-autoria, comissões em comum
- **4 tipos de aresta** com pesos: co-votação, co-autoria, comissão, partido/bloco (ver [Grafo Legislativo](../../features/LEGISLATIVE-GRAPH.md))
- **Queries de traversal** — adjacência, caminho, vizinhança
- **Métricas de centralidade** — betweenness, closeness, degree
- **Detecção de comunidades** — Louvain/Leiden
- **Custo zero ou baixo** — projeto open-source sem funding inicial

## Por que foi adiada

1. **600 nós são trivialmente manejáveis com SQL** — queries de co-votação (GROUP BY + COUNT) são performáticas para este volume
2. **Apache AGE amadureceu** — extensão PostgreSQL que roda dentro do banco existente, suportando openCypher, sem nova infraestrutura
3. **Neo4j CE requer VM dedicada** com mínimo 4GB RAM — custo injustificável antes de ter usuários e métricas reais
4. **A escolha deve ser guiada por dados reais** — a decisão entre Neo4j CE, Apache AGE e Kuzu DB deve considerar performance medida no workload real do Brasil a Vera, não suposições

## Reavaliação Planejada — Wave 3

Na Wave 3, a decisão será retomada com base em:

| Critério | Métrica | Threshold |
|----------|---------|-----------|
| Volume de traversals | Queries de grafo por minuto | > 100 req/min com latência p95 > 500ms no AGE |
| Frequência de análise | Recalculação de centralidade/comunidades | > 1x por dia |
| Volume de dados | Nós + arestas no grafo | > 5.000 nós (assembleias estaduais) |
| Performance do AGE | Latência de queries de vizinhança 2-hop | > 200ms em p95 |

Se os thresholds forem atingidos, a escolha será entre:

- **Neo4j CE** — property graph nativo, Cypher, GDS library (algoritmos out-of-the-box)
- **Kuzu DB** — embedded graph database, performance excelente para análise, sem servidor separado
- **Apache AGE continuado** — se a performance for suficiente, manter sem nova infraestrutura

## Decisão Original (referência)

A análise original favorecia **Neo4j Community Edition** pelos seguintes motivos:

| Critério | Neo4j CE |
|----------|----------|
| Modelo de dados | Property graph nativo (labeled property graph) |
| Linguagem de query | Cypher — declarativa, legível, amplamente documentada |
| Algoritmos de grafo | Neo4j Graph Data Science (GDS) library — Louvain, PageRank, betweenness, etc. |
| Licença | GPLv3 (Community Edition) — compatível com open-source |
| Comunidade | Maior comunidade de graph database, abundância de recursos |

### Modelo de dados planejado

- **Nós**: `(:Parlamentar {id, nome, partido, uf, trust_level: "L1"})`, `(:Proposicao {id, tipo, ementa, trust_level: "L1"})`
- **Arestas**: `[:CO_VOTACAO {peso, periodo, trust_level: "L1"}]`, `[:CO_AUTORIA {peso, trust_level: "L1"}]`, `[:COMISSAO_COMUM {peso, trust_level: "L1"}]`, `[:MESMO_PARTIDO {trust_level: "L1"}]`
- **Métricas de centralidade**: calculadas como propriedades do nó (L2), recalculadas periodicamente
- **Clusters**: resultado de detecção de comunidades, armazenados como label adicional no nó (L2/L3)

## Alternativas Consideradas

### Apache AGE (extensão PostgreSQL)

- **Prós**: roda dentro do PostgreSQL existente (sem segundo banco), linguagem openCypher, sem custo adicional, amadureceu significativamente desde 2024
- **Contras**: sem library equivalente ao GDS para algoritmos de grafo (mas NetworkX supre essa lacuna em batch), performance em traversals profundos precisa ser validada no workload real
- **Veredicto**: **candidato forte para Wave 3** — combinar com NetworkX para algoritmos batch resolve a lacuna de GDS

### Kuzu DB

- **Prós**: embedded (sem servidor separado), performance excelente para análise de grafos, Cypher compatível, licença MIT
- **Contras**: projeto mais jovem que Neo4j, menos documentação e comunidade, sem equivalente a GDS
- **Veredicto**: alternativa interessante ao Neo4j para o caso de uso analítico — avaliar na Wave 3

### Neo4j Community Edition

- **Prós**: property graph nativo, Cypher, GDS library, driver para múltiplas linguagens, maior comunidade
- **Contras**: requer VM dedicada com 4GB+ RAM, Community Edition é single-instance, GDS tem licença NTCL separada
- **Veredicto**: referência da indústria, mas custo/complexidade só se justifica com volume que demande

### Amazon Neptune

- **Prós**: managed service, suporta property graph e RDF
- **Contras**: vendor lock-in AWS, custo significativo, não roda localmente
- **Veredicto**: incompatível com princípios de custo zero e independência de cloud

### JanusGraph

- **Prós**: open-source, distribuído, suporta múltiplos backends
- **Contras**: complexidade operacional alta, overhead desproporcional para ~600 nós
- **Veredicto**: sobredimensionado para o volume do Brasil a Vera

## Referências

- [Neo4j Community Edition](https://neo4j.com/download-center/#community)
- [Apache AGE — Graph Extension for PostgreSQL](https://age.apache.org/)
- [Kuzu DB](https://kuzudb.com/)
- [NetworkX — Python Graph Library](https://networkx.org/)
- [Neo4j Graph Data Science Library](https://neo4j.com/docs/graph-data-science/current/)
