# Brasil a Vera

> **Você escolheu quem te representa. Agora veja o que ele faz.**

![Status](https://img.shields.io/badge/status-Wave%203%20em%20andamento%20%E2%80%94%20estabilizado-green)
![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-orange)
![Node](https://img.shields.io/badge/node-22-green)

Plataforma de transparência política brasileira com código publicamente
auditável (source-available). Consolida dados públicos do Legislativo
(Câmara, Senado, TSE, Portal da Transparência) em uma interface acessível
para qualquer cidadão.

## O que é?

O Brasil tem um dos ecossistemas de dados legislativos abertos mais robustos da
América Latina, mas o cidadão enfrenta três barreiras: fragmentação (dados
espalhados por 5–6 portais), complexidade (linguagem técnica críptica) e
ausência de visão integrada (nenhuma plataforma cruza votações, proposições e
gastos numa visão 360° do parlamentar).

O Brasil a Vera nasce para preencher essa lacuna. É uma plataforma centrada no
parlamentar que unifica fontes oficiais e responde de forma factual: o que cada
um vota, propõe e gasta — sem juízo de valor, sem viés, sem recomendação. A
plataforma é o espelho, não o juiz.

Mantida por doação, com custo operacional próximo de zero por design. Visão
completa em [docs/product/PRODUCT-VISION.md](docs/product/PRODUCT-VISION.md).

## Stack

Construído com Next.js 16, TypeScript strict, Drizzle ORM, PostgreSQL no Neon e
deploy em Cloudflare Workers (via OpenNext). Ingestão via scripts tsx rodando em GitHub Actions.
Lint/format com Biome, testes com Vitest, validação com Zod.

## Como rodar localmente

### Pré-requisitos

- **Node.js 22+** ([volta](https://volta.sh) ou [nvm](https://github.com/nvm-sh/nvm) recomendados)
- **Conta no [Neon](https://neon.tech)** para criar um banco PostgreSQL gratuito
- **npm 10+** (vem com Node 22)

### Setup

```bash
git clone https://github.com/<seu-usuario>/brasil-a-vera.git
cd brasil-a-vera
npm install
cp .env.example .env.local
```

Preencha `DATABASE_URL` e `DIRECT_URL` no `.env.local` com as connection strings
do seu projeto Neon (a `DATABASE_URL` é a versão pooled; a `DIRECT_URL` é a
conexão direta usada pelo Drizzle Kit para migrations).

### Comandos principais

```bash
npm run dev              # Inicia o dev server em http://localhost:3000
npm run check            # Lint + format check com Biome
npm run test             # Vitest em watch mode
npm run build            # Build de produção
npm run db:generate      # Gera migration a partir do schema Drizzle
npm run db:migrate       # Aplica migrations no banco
```

Lista completa em [CLAUDE.md](CLAUDE.md).

## Como contribuir

> **Contribuições externas via PR estão fechadas.** Apenas membros do projeto
> podem abrir pull requests; PRs de outras origens são fechados automaticamente
> (ver [ADR-027](docs/architecture/ADR/027-licenca-polyform-noncommercial.md)).
> Bug reports, sugestões de feature e correções de dado incorreto seguem por
> [issue](https://github.com/FabioCaffarello/brasil-a-vera/issues/new) —
> qualquer pessoa pode abrir.

Leia o [Guia de Contribuição](docs/contributing/CONTRIBUTING.md) para o fluxo
completo. Padrões adicionais em
[CODE-STYLE.md](docs/contributing/CODE-STYLE.md) e
[COMMIT-CONVENTION.md](docs/contributing/COMMIT-CONVENTION.md).

Wave 2 entregue (tag `v0.2-final`, 2026-05-13). Wave 3 em andamento —
sprints de estabilização concluídos (3.0 `v0.3.0-stable` e 3.0.5
`v0.3.0.5-honest`); próximo passo é Sprint 3.1 (narrativa cívica e
melhorias de frontend). Veja o [Roadmap](docs/product/ROADMAP.md) para
detalhe dos sprints entregues e próximos.

## Documentação

- **[Visão de Produto](docs/product/PRODUCT-VISION.md)** — problema, solução e diferenciais
- **[Roadmap](docs/product/ROADMAP.md)** — waves, critérios de done, dependências
- **[ADRs](docs/architecture/ADR/)** — decisões arquiteturais registradas
- **[Pirâmide de Confiança](docs/architecture/TRUST-PYRAMID.md)** — modelo L1–L4 que organiza todo dado da plataforma
- **[Fontes de Dados](docs/architecture/DATA-SOURCES.md)** — APIs oficiais consumidas e estratégia de ingestão
- **[Processo Legislativo](docs/domain/LEGISLATIVE-PROCESS.md)** — glossário do domínio
- **[Visão de Longo Prazo](docs/future/)** — capacidades futuras (Motor de Coerência, Grafo Legislativo); não representam compromisso

Índice completo em [docs/README.md](docs/README.md).

## Licença

Distribuído sob a [PolyForm Noncommercial License 1.0.0](LICENSE). O código é
publicamente auditável — cidadãos podem inspecionar a metodologia, contribuidores
convidados podem estudar e modificar — mas **uso comercial não é permitido sem
autorização expressa**. Fork via GitHub TOS continua permitido para estudo,
pesquisa, uso pessoal e contribuição.

Motivação e alternativas consideradas em
[ADR-027](docs/architecture/ADR/027-licenca-polyform-noncommercial.md).
