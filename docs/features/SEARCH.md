# Busca Unificada

> Brasil a Vera · Feature · v0.1
> Última atualização: 2026-04-14
> Status: draft

---

## Sumário

- [Visão Geral](#visão-geral)
- [Tipos de Busca](#tipos-de-busca)
- [Interface de Busca](#interface-de-busca)
- [Implementação Técnica](#implementação-técnica)
- [Performance](#performance)

---

## Visão Geral

A Busca Unificada permite encontrar parlamentares, proposições e temas numa única barra de busca. É o ponto de entrada principal para o **Cidadão Consciente** ("quero encontrar meu deputado") e o **Jornalista Investigativo** ("quero encontrar proposições sobre tema X").

Disponível a partir da Wave 1 (MVP).

## Tipos de Busca

### Busca por parlamentar

| Critério | Exemplo | Trust Level |
|----------|---------|-------------|
| Nome | "Fulano de Tal" | L1 |
| Partido | "PT" | L1 |
| UF | "SP", "São Paulo" | L1 |
| Combinação | "Fulano PT SP" | L1 |

Retorna: lista de parlamentares com foto, nome, partido e UF. Link para [Página 360°](PARLAMENTAR-360.md).

### Busca por proposição

| Critério | Exemplo | Trust Level |
|----------|---------|-------------|
| Número | "PL 1234/2025", "PEC 45" | L1 |
| Palavra-chave na ementa | "agrotóxicos", "reforma tributária" | L1 |
| Tema oficial | "Meio Ambiente", "Educação" | L1 |

Retorna: lista de proposições com tipo, número, ano, ementa resumida e situação.

### Busca por tema

| Critério | Exemplo | Trust Level |
|----------|---------|-------------|
| Tema oficial da Câmara/Senado | "Trabalho e Emprego" | L1 |
| Palavra-chave | "saúde pública" | L1 |

Retorna: página de tema com proposições relacionadas, votações recentes e ranking de parlamentares por atividade no tema.

## Interface de Busca

### Barra principal

Campo único de busca no topo de toda página, com autocomplete:

```
┌─────────────────────────────────────────────────┐
│  🔍 Buscar parlamentar, proposição ou tema...    │
│  ┌───────────────────────────────────────────┐  │
│  │  Parlamentares                             │  │
│  │  • Dep. Fulano de Tal (PT-SP)             │  │
│  │  • Dep. Fulana da Silva (PT-RJ)           │  │
│  │                                            │  │
│  │  Proposições                               │  │
│  │  • PL 1234/2025 — Proíbe agrotóxicos...   │  │
│  │                                            │  │
│  │  Temas                                     │  │
│  │  • Meio Ambiente (47 proposições)          │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Autocomplete

- Ativa a partir de 2 caracteres
- Debounce de 300ms
- Agrupa resultados por tipo (parlamentar, proposição, tema)
- Máximo 3 resultados por tipo no dropdown
- "Ver todos os resultados" leva para página de resultados completa

### Busca avançada (Wave 2)

Disponível para Jornalista e Ativista:

- Filtros combinados: tipo de proposição + tema + período + partido + UF
- Operadores: AND, OR (implícito e explícito)
- Filtro por situação da proposição (tramitando, aprovada, rejeitada, arquivada)
- Filtro por tipo de voto em votação (SIM, NÃO)
- Ordenação: relevância, data, atividade

## Implementação Técnica

### Estratégia MVP (Wave 1)

**PostgreSQL full-text search** com `tsvector` / `tsquery`:

- Índice full-text na coluna `nome` de parlamentares (com unaccent para busca sem acento)
- Índice full-text na coluna `ementa` de proposições
- Busca por número de proposição via pattern matching (`tipo + numero + ano`)
- Temas buscados via tabela de referência

```sql
-- Exemplo: busca de parlamentar
SELECT id, nome, partido, uf
FROM parlamentares.parlamentares
WHERE search_vector @@ plainto_tsquery('portuguese', 'fulano tal')
ORDER BY ts_rank(search_vector, plainto_tsquery('portuguese', 'fulano tal')) DESC
LIMIT 10;
```

### Evolução (Wave 2+)

Se o volume ou complexidade de busca justificar, migrar para Elasticsearch ou Meilisearch:

- Fuzzy matching (typo tolerance)
- Faceted search (filtros por tema, partido, período)
- Highlighting de matches na ementa
- Sinônimos (ex: "deputado" → "parlamentar")

A decisão de migração será registrada em novo ADR quando necessário.

### API de Busca

```
GET /api/v1/search?q=fulano&type=parlamentar&limit=10

Response:
{
  "results": [
    {
      "type": "parlamentar",
      "id": "178957",
      "title": "Dep. Fulano de Tal",
      "subtitle": "PT-SP · Câmara dos Deputados",
      "url": "/parlamentares/178957",
      "trust_level": "L1"
    }
  ],
  "total": 3,
  "trust_level": "L1"
}
```

Parâmetros:

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `q` | string | Termo de busca (obrigatório) |
| `type` | enum | Filtro por tipo: `parlamentar`, `proposicao`, `tema` (opcional) |
| `limit` | int | Máximo de resultados (default: 10, max: 100) |
| `offset` | int | Paginação (default: 0) |
| `partido` | string | Filtro por sigla do partido (Wave 2) |
| `uf` | string | Filtro por UF (Wave 2) |
| `tema` | string | Filtro por tema (Wave 2) |
| `periodo` | string | Filtro por período — `2025`, `2025-01` (Wave 2) |

## Performance

| Métrica | Target |
|---------|--------|
| Autocomplete latência (p95) | < 200ms |
| Busca full-text latência (p95) | < 500ms |
| Resultado vazio | < 300ms |

### Otimizações

- Índices GIN no PostgreSQL para `tsvector`
- `unaccent` extension para busca sem acentos (critical para pt-BR)
- Cache de queries frequentes (top parlamentares, temas populares)
- Debounce no cliente para autocomplete (300ms)
- Resultados de autocomplete podem ser server-side cached (parlamentares mudam raramente)
