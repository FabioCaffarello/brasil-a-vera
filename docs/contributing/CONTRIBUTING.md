# Guia de Contribuição

> Brasil a Vera · Contribuição · v0.1
> Última atualização: 2026-04-14
> Status: draft

---

## Sumário

- [Bem-vindo](#bem-vindo)
- [Como Contribuir](#como-contribuir)
- [Ambiente de Desenvolvimento](#ambiente-de-desenvolvimento)
- [Fluxo de Trabalho](#fluxo-de-trabalho)
- [Padrões de Qualidade](#padrões-de-qualidade)
- [Código de Conduta](#código-de-conduta)

---

## Bem-vindo

O Brasil a Vera é um projeto open-source de transparência legislativa. Toda contribuição que melhore a qualidade, precisão ou acessibilidade da plataforma é bem-vinda.

**Antes de contribuir**, familiarize-se com:
- [Product Vision](../product/PRODUCT-VISION.md) — o que o projeto faz e por quê
- [Bounded Contexts](../architecture/BOUNDED-CONTEXTS.md) — como o código está organizado
- [Pirâmide de Confiança](../architecture/TRUST-PYRAMID.md) — princípio fundamental de credibilidade

**Princípio inegociável**: o Brasil a Vera é estritamente apartidário. Contribuições que introduzam viés político, linguagem valorativa ou tratamento diferenciado por partido serão rejeitadas independentemente da qualidade técnica.

## Como Contribuir

### Issues

- **Bug report**: descreva o comportamento esperado vs. observado, com passos para reproduzir
- **Feature request**: descreva o problema que a feature resolve e a persona beneficiada (ver [Personas](../product/PERSONAS.md))
- **Dado incorreto**: se um dado da plataforma diverge da fonte oficial, reporte com link para a fonte
- **Melhoria de documentação**: typos, clarificações, traduções

### Pull Requests

1. Faça fork do repositório
2. Crie branch a partir de `main` com nome descritivo: `feat/busca-por-tema`, `fix/sync-camara-paginacao`
3. Implemente a mudança seguindo os [padrões de código](CODE-STYLE.md)
4. Escreva testes (cobertura mínima: 70% no domínio)
5. Siga a [convenção de commits](COMMIT-CONVENTION.md)
6. Abra PR com descrição clara do que muda e por quê

### Tipos de contribuição

| Tipo | Label | Descrição |
|------|-------|-----------|
| Feature | `feat` | Nova funcionalidade |
| Bug fix | `fix` | Correção de bug |
| Documentação | `docs` | Melhorias na documentação |
| Dados | `data` | Correção ou melhoria de ingestão de dados |
| Infra | `infra` | CI/CD, Docker, tooling |
| Teste | `test` | Adição ou melhoria de testes |

## Ambiente de Desenvolvimento

### Pré-requisitos

| Ferramenta | Versão mínima | Finalidade |
|-----------|---------------|-----------|
| Go | 1.22+ | Backend services |
| Node.js | 20 LTS+ | Frontend (Next.js) |
| Docker | 24+ | PostgreSQL, Neo4j, NATS locais |
| Docker Compose | 2.20+ | Orquestração local |
| Git | 2.40+ | Controle de versão |

### Setup local

```bash
# 1. Clone o repositório
git clone https://github.com/brasil-a-vera/brasil-a-vera.git
cd brasil-a-vera

# 2. Suba a infraestrutura (PostgreSQL, Neo4j, NATS)
docker-compose up -d

# 3. Backend — instale dependências e rode testes
cd services/parlamentares
go mod download
go test ./...

# 4. Frontend — instale dependências e rode dev server
cd web
npm install
npm run dev
```

### Variáveis de ambiente

Copie `.env.example` para `.env` e ajuste conforme necessário. Nunca commite `.env` ou arquivos com credenciais.

Para acesso à API do Portal da Transparência, cadastre-se em portaldatransparencia.gov.br e obtenha uma API key gratuita.

## Fluxo de Trabalho

### Branching

```
main (protegido — merge via PR)
  └── feat/nome-da-feature
  └── fix/descricao-do-bug
  └── docs/area-do-doc
```

- `main` é a branch protegida — todo merge via PR com ao menos 1 review
- Branches de feature partem de `main`
- Rebase antes de merge (sem merge commits)

### Code Review

Todo PR passa por review com foco em:

1. **Correção**: o código faz o que diz fazer?
2. **Trust level**: dados novos têm `trust_level` correto?
3. **Neutralidade**: nenhuma linguagem valorativa ou viés?
4. **Testes**: cobertura adequada, especialmente no domínio?
5. **Clean Architecture**: dependências apontam para dentro (domínio), nunca para fora?
6. **Documentação**: mudanças de API ou comportamento documentadas?

### CI Pipeline

O CI executa automaticamente em cada PR:

- Lint (Go: golangci-lint; TypeScript: ESLint)
- Testes unitários
- Build
- Verificação de formatação

## Padrões de Qualidade

### Arquitetura

- Siga Clean Architecture / hexagonal em cada bounded context (ver [ADR-002](../architecture/ADR/002-backend-language-and-framework.md))
- Domínio não depende de frameworks, bancos ou APIs externas
- Bounded contexts comunicam via domain events, nunca por imports diretos (ver [ADR-005](../architecture/ADR/005-event-driven-communication.md))
- Todo registro deve ter `trust_level` (ver [Pirâmide de Confiança](../architecture/TRUST-PYRAMID.md))

### Código

- Detalhes em [Estilo de Código](CODE-STYLE.md)

### Testes

- Cobertura mínima: 70% no domínio, 50% nos adapters
- Testes de domínio são unitários (sem I/O)
- Testes de integração usam containers (testcontainers)
- Testes de pipeline de ingestão usam fixtures (respostas gravadas das APIs)

### Dados

- Nunca introduza dados fictícios em ambientes que não sejam explicitamente de teste
- Dados L1 devem sempre ter `source_url` verificável
- Use o [Dicionário de Dados](../domain/DATA-DICTIONARY.md) como referência para tipos e nomes de campos

## Código de Conduta

O Brasil a Vera adota um código de conduta baseado no [Contributor Covenant](https://www.contributor-covenant.org/).

Resumo:
- Trate todos com respeito e profissionalismo
- Foco na qualidade técnica e na missão do projeto
- Zero tolerância para assédio, discriminação ou intimidação
- Discussões políticas são sobre o processo legislativo, não sobre posições partidárias
- Mantenha a neutralidade que o projeto exige
