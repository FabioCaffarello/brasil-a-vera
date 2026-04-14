# Convenção de Commits

> Brasil a Vera · Contribuição · v0.1
> Última atualização: 2026-04-14
> Status: draft

---

## Sumário

- [Formato](#formato)
- [Tipos](#tipos)
- [Escopos](#escopos)
- [Exemplos](#exemplos)
- [Regras](#regras)

---

## Formato

O Brasil a Vera segue o [Conventional Commits](https://www.conventionalcommits.org/) v1.0.0:

```
<tipo>(<escopo>): <descrição curta>

[corpo opcional]

[rodapé opcional]
```

### Descrição curta

- Imperativo, presente: "add", não "added" ou "adds"
- Minúsculas (sem capitalização da primeira letra)
- Sem ponto final
- Máximo 72 caracteres

## Tipos

| Tipo | Quando usar | Exemplo |
|------|------------|---------|
| `feat` | Nova funcionalidade | `feat(votacoes): add sync de orientação de bancada` |
| `fix` | Correção de bug | `fix(ingestion): handle pagination edge case on camara API` |
| `docs` | Documentação | `docs(architecture): add ADR-005 event-driven communication` |
| `refactor` | Refatoração sem mudança de comportamento | `refactor(parlamentares): extract repository interface` |
| `test` | Adição ou correção de testes | `test(coerencia): add edge case for substitutivos` |
| `chore` | Manutenção (CI, deps, config) | `chore(ci): add golangci-lint to pipeline` |
| `perf` | Melhoria de performance | `perf(search): add GIN index for full-text search` |
| `style` | Formatação (sem mudança de lógica) | `style(web): apply prettier formatting` |
| `build` | Build system e dependências | `build(go): upgrade to Go 1.23` |
| `ci` | CI/CD | `ci: add integration test stage` |

## Escopos

Escopos correspondem a bounded contexts e áreas do projeto:

| Escopo | Área |
|--------|------|
| `parlamentares` | Bounded context Parlamentares |
| `proposicoes` | Bounded context Proposições |
| `votacoes` | Bounded context Votações |
| `gastos` | Bounded context Gastos |
| `eleitoral` | Bounded context Eleitoral |
| `coerencia` | Bounded context Coerência |
| `grafo` | Bounded context Grafo Legislativo |
| `impacto` | Bounded context Impacto |
| `trust` | Trust Metadata (shared kernel) |
| `ingestion` | Pipelines de ingestão |
| `web` | Frontend Next.js |
| `api` | API pública |
| `architecture` | Documentação de arquitetura |
| `product` | Documentação de produto |
| `infra` | Infraestrutura (Docker, CI/CD) |
| `ci` | CI/CD pipeline |

O escopo é opcional mas recomendado para commits que tocam um bounded context específico.

## Exemplos

### Commits simples

```
feat(votacoes): add sync de votos nominais da Câmara
fix(ingestion): handle Senado API returning XML instead of JSON
docs(architecture): add ADR-003 database strategy
refactor(parlamentares): move domain events to shared lib
test(coerencia): add tests for direcao classification
chore(infra): update docker-compose with Neo4j service
```

### Commit com corpo

```
feat(coerencia): add par contraditório detection pipeline

Implements the full pipeline: thematic classification → direction
classification → pair detection → temporal context enrichment.

Only unambiguous verbs (proíbe, flexibiliza, etc.) trigger direction
classification. Ambiguous cases are marked as NAO_CLASSIFICADA.

Refs #42
```

### Breaking change

```
feat(api)!: change trust_level response format

BREAKING CHANGE: trust_level is now an object with level, source_url
and disclaimer fields instead of a plain string.
```

## Regras

1. **Um commit por mudança lógica** — não misture feature + refactor + fix num único commit
2. **Commit compilável** — cada commit deve compilar e passar nos testes
3. **Escopo correto** — se o commit toca múltiplos bounded contexts, omita o escopo ou use o escopo mais relevante
4. **Inglês para commits** — mensagens de commit em inglês (padrão open-source); documentação em pt-BR
5. **Referência a issues** — quando aplicável, referencie a issue no rodapé: `Refs #42` ou `Closes #42`
6. **Sem WIP** — não faça commit de código incompleto em `main` (use branches)
