# Guia de Contribuição

> Brasil a Vera · Contribuição · v0.2
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

### Pré-requisitos (Waves 0–2)

| Ferramenta | Versão mínima | Finalidade |
|-----------|---------------|-----------|
| Node.js | 20 LTS+ | Monolito Next.js + scripts de ingestão |
| Git | 2.40+ | Controle de versão |
| PostgreSQL | 16+ | Banco de dados local (ou conta Neon free) |

> **Docker é opcional**: pode ser usado para rodar PostgreSQL localmente (`docker run -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16`), mas não é obrigatório se você tiver PostgreSQL instalado ou usar Neon free.

> **Go não é necessário** para contribuições nas Waves 0–2. Go será necessário a partir da Wave 3 quando módulos forem extraídos para microserviços. Ver [ADR-002](../architecture/ADR/002-backend-language-and-framework.md).

### Setup local

```bash
# 1. Clone o repositório
git clone https://github.com/brasil-a-vera/brasil-a-vera.git
cd brasil-a-vera

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env
# Edite .env com URL do PostgreSQL (local ou Neon)

# 4. Rode as migrations
npm run db:migrate

# 5. Rode o dev server (Next.js)
npm run dev

# 6. (Opcional) Rode ingestão manualmente
npx tsx ingestion/camara/sync.ts
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
5. **Import boundaries**: nenhum import cruzado entre módulos? (Biome `noRestrictedImports`)
6. **Clean Architecture**: domínio não depende de infraestrutura?
7. **Documentação**: mudanças de API ou comportamento documentadas?

### CI Pipeline

O CI executa automaticamente em cada PR:

- Lint e formatação (Biome CI — `biome ci .`)
- Pre-commit local (Husky — `biome check` nos arquivos staged)
- Testes unitários (Vitest — `npm run test:coverage`)
- Testes integrados de queries (Vitest + testcontainers — `npm run test:integration`)
- Build (Next.js)

## Padrões de Qualidade

### Arquitetura

- Siga Clean Architecture em cada módulo: `domain/` → `repository/` → `service/` → `routes/` (ver [ADR-002](../architecture/ADR/002-backend-language-and-framework.md))
- Domínio não depende de frameworks, bancos ou APIs externas
- Bounded contexts isolados — Biome `noRestrictedImports` bloqueia imports cruzados (ver [ADR-006](../architecture/ADR/006-frontend-stack.md#import-boundaries-biome))
- Migrations em SQL puro — nunca geradas por ORM
- Todo registro deve ter `trust_level` (ver [Pirâmide de Confiança](../architecture/TRUST-PYRAMID.md))

### Código

- Detalhes em [Estilo de Código](CODE-STYLE.md)

### Testes

- Cobertura mínima: 70% no domínio, 50% nos repositories
- Testes de domínio são unitários (sem I/O) — `npm test` ou `npm run test:coverage`
- Testes integrados de queries usam **testcontainers** com Postgres real
  (`npm run test:integration`). **Requer Docker daemon rodando localmente.**
  GitHub Actions Linux runners têm Docker pré-instalado; em macOS/Windows,
  iniciar Docker Desktop antes. Limitação reconhecida do driver de teste vs.
  produção em [ADR-015](../architecture/ADR/015-split-driver-neon-runtime.md).
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
