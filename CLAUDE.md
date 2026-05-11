# Brasil a Vera

Plataforma de transparência política brasileira. Open source, mantida por doação,
projetada para ter custo operacional próximo de zero.

## Propósito

Consolidar dados públicos do Legislativo brasileiro (Câmara, Senado, TSE, Portal
da Transparência) em interface acessível para qualquer cidadão. Slogan:
"Você escolheu quem te representa. Agora veja o que ele faz."

Visão completa: [docs/product/PRODUCT-VISION.md](docs/product/PRODUCT-VISION.md)

## Stack

- Runtime: Node.js 22, TypeScript strict mode
- Framework: Next.js 16 (App Router)
- Banco: PostgreSQL no Neon (não Supabase — ver ADR-003)
- ORM: Drizzle (queries); SQL puro (migrations)
- Validação: Zod em todo boundary externo
- Lint/format: Biome (não ESLint+Prettier)
- Testes: Vitest
- Deploy: Cloudflare Workers via `@opennextjs/cloudflare` (não Vercel — ver ADR-009)
- Ingestão: tsx scripts em GitHub Actions cron

## Princípios de código

1. Funções puras na lógica de domínio. IO isolado.
2. Zod no boundary. Todo dado externo passa por schema validation.
3. Trust level em toda tabela. Coluna `trust_level` (L1/L2/L3/L4) + `source_url`.
4. Migrations em SQL puro versionadas em `src/shared/db/migrations/`.
5. Idempotência na ingestão. `INSERT ... ON CONFLICT DO UPDATE` sempre.
6. Sem `any`. Sem `as` cast exceto pra `unknown -> tipo validado por Zod`.
7. Erros são valores quando possível. Funções que podem falhar retornam tipo
   explícito.

## Comandos

```bash
npm run dev              # Next dev server
npm run build            # Build produção
npm run check            # Biome lint + format check
npm run test             # Vitest watch
npm run test:coverage    # Vitest coverage
npm run db:generate      # Gera migration do schema Drizzle
npm run db:migrate       # Aplica migrations no banco
npm run db:studio        # UI do Drizzle pra inspecionar dados
npm run cf:build         # Build pro Cloudflare Workers via OpenNext
npm run cf:preview       # Preview local com Wrangler
npm run cf:deploy        # Deploy no Cloudflare Workers
```

## Estrutura
src/
├── app/                  # Next App Router (pages + API routes)
├── modules/              # Bounded contexts (criados conforme necessidade)
├── shared/               # Código transversal (db, trust, http)
├── components/           # React components
└── lib/                  # Utilitários gerais
ingestion/                # Scripts ETL standalone (não Next.js)
docs/
├── adr/                  # Architecture Decision Records ativos
├── future/               # Visão futura, não compromisso de implementação
├── product/              # PRODUCT-VISION, ROADMAP, PERSONAS, METRICS
├── architecture/         # Modelos, diagramas, princípios
├── domain/               # Glossário e processo legislativo
├── contributing/         # Guias para contribuidores
└── features/             # Specs de features em escopo (Wave 0-2)

## Convenções

- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
- Branches: `feat/<descricao>`, `fix/<descricao>`. Nunca direto na `main`.
- PRs: descrição obrigatória. CI passando bloqueia merge.
- Sem secrets no repo. `.env` ignorado, GitHub Secrets em CI.

## Regras para Claude Code trabalhar neste projeto

- Sempre cheque `docs/architecture/ADR/` antes de propor mudanças arquiteturais.
  Se a mudança contraria um ADR aceito, ou você muda o ADR (com justificativa
  explícita) ou rejeita a mudança.
- Antes de criar pasta ou módulo novo, verifique se já existe estrutura similar.
- Antes de instalar dependência nova, justifique no PR. Preferimos código próprio
  a libs com escopo amplo.
- NÃO escreva código especulativo. Não crie interfaces "para o caso de".
  Reaja a necessidade real, não a possibilidade futura.
- NÃO use ESLint nem Prettier. Use Biome (`npm run check`).
- NÃO use shadcn/ui sem antes consultar. Componentes próprios mínimos por
  enquanto, até design system definido.
- Erros da API da Câmara são esperados. APIs públicas brasileiras são instáveis.
  Sempre retry com backoff, sempre log estruturado de falha, nunca crash silencioso.
- Plan mode antes de mudanças amplas. Para qualquer task que toque mais de 3
  arquivos, primeiro proponha o plano, espere aprovação, então execute.
- ADRs em `docs/future/adr/` representam visão de longo prazo, não compromisso.
  Não os trate como aceitos.

## Notas

Este é projeto solo (1 dev) mantido por doação. Otimizamos por baixo custo
operacional e simplicidade de manutenção, não por escala teórica.
