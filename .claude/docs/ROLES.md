# ROLES — Matriz canônica de permissão por role

> Brasil a Vera · Wave 5 Sprint 5.0 · v0.1
> Lida por hooks (`.claude/hooks/pre-edit-guardrail.sh`) e por humanos.

Este projeto opera com roles. Cada role tem escopo distinto. A matriz
abaixo é a **fonte de verdade** que os hooks consomem.

## Como o role é detectado

A variável de ambiente `BAV_CLAUDE_ROLE` define o role da sessão atual.
Valores aceitos: `designer`, `engineer`.

```bash
# Designer (default — mais restritivo)
unset BAV_CLAUDE_ROLE
# ou:
export BAV_CLAUDE_ROLE=designer

# Engineer (declarado explicitamente)
export BAV_CLAUDE_ROLE=engineer
```

Default é `designer` se a variável estiver vazia ou ausente. A escolha é
por sessão — não vive em arquivo dotfile do repo. Cada engineer exporta
no próprio `.zshrc` / `.bashrc`.

## Matriz role × path

| Caminho | Designer | Engineer | Por quê |
|---|---|---|---|
| `src/design-system/**` | ✅ | ✅ | Coração do design system (ADR-021) |
| `src/components/**` | ✅ | ✅ | Apresentação de domínio |
| `src/app/**` (rotas) | ✅ (UI) | ✅ | Páginas — UI/UX |
| `src/lib/cn.ts` | ✅ | ✅ | Helper de UI |
| `src/lib/format*.ts` | ✅ | ✅ | Formatadores de display |
| `src/lib/queries/**` | ❌ | ✅ | Toca banco, custo Neon (princípios 8-12) |
| `src/modules/**` | ❌ | ✅ | Bounded contexts de domínio |
| `src/shared/db/schema.ts` | ❌ | ✅ | Schema é fonte da migration |
| `src/shared/**` (resto) | ❌ | ✅ | Shared kernel |
| `ingestion/**` | ❌ | ✅ | ETL crítica, dados oficiais |
| `src/shared/db/migrations/**` | ❌ | ❌ | Migrations entram via PR humano explícito (hook bloqueia mesmo engineer pelo Claude) |
| `.env*` | ❌ | ❌ | Sempre via Wrangler secrets / GitHub Actions secrets |
| `docs/design/**` | ✅ | ✅ | Design é coautor |
| `docs/contributing/**` | ✅ | ✅ | Onboarding e processos abertos |
| `docs/features/**` | ✅ | ✅ | Specs de features |
| `docs/product/**` | ❌ | ✅ | ROADMAP, PERSONAS, METRICS |
| `docs/architecture/ADR/**` | ❌ | ✅ | ADRs requerem contexto sistêmico |
| `docs/releases/**` | ❌ | ✅ | Release notes (operação) |
| `public/**` | ✅ | ✅ | Assets estáticos |
| `.github/workflows/**` | ❌ | ❌ | Workflows mudam por PR humano deliberado (hook bloqueia mesmo engineer pelo Claude) |
| `.github/actions/**` | ❌ | ✅ | Composite actions |
| `.github/labels.yml` | ❌ | ✅ | Vocabulário canônico |
| `.github/CODEOWNERS` | ❌ | ✅ | Governança de revisão |
| `.github/PULL_REQUEST_TEMPLATE.md` | ❌ | ✅ | Template de PR |
| `.github/ISSUE_TEMPLATE/**` | ❌ | ✅ | Issue forms |
| `biome.json` | ❌ | ✅ | Lint/format config |
| `next.config.ts`, `open-next.config.ts`, `drizzle.config.ts` | ❌ | ✅ | Build/runtime config |
| `package.json`, `package-lock.json` | ❌ | ✅ | Dependências |
| `wrangler.jsonc`, `wrangler.toml` | ❌ | ✅ | Deploy config |
| `tsconfig*.json` | ❌ | ✅ | TypeScript config |
| `.claude/skills/**` | ✅ (propor) | ✅ | Skills evoluem com a operação |
| `.claude/docs/**` | ✅ | ✅ | Onboarding é colaborativo |
| `.claude/agents/**` | ❌ | ✅ | Núcleo de governança |
| `.claude/hooks/**` | ❌ | ✅ | Núcleo de governança |
| `.claude/settings.json` | ❌ | ✅ | Núcleo de governança |
| `CLAUDE.md` (raiz), `AGENTS.md` | ❌ | ✅ | Contrato do projeto |

## Notas de leitura da matriz

- **Designer ganha em empate.** Se um path serve UI e também aparece em
  domínio (raro), default é bloquear para designer.
- **Engineer não é admin.** Há paths que **engineer também não toca via
  Claude**: migrations e workflows. Bypass exige edit manual fora do
  Claude (assumido como ato deliberado e revisado).
- **Hooks são determinísticos.** A matriz acima vira matcher de path em
  `.claude/hooks/lib/path-matchers.sh` (PR 4). Mudanças aqui exigem
  refletir lá.

## Adicionando role novo

Quando aparecer um perfil que não cabe em `designer` nem `engineer`
(ex: `data-analyst`, `community-mod`):

1. Documentar a necessidade concreta em ADR ou comentário de PR
   (ADR-019 — não preencher por dor inexistente).
2. Adicionar coluna na matriz acima.
3. Atualizar `.claude/hooks/lib/path-matchers.sh` para reconhecer o
   novo valor de `BAV_CLAUDE_ROLE`.
4. Atualizar `.claude/hooks/lib/role-detect.sh` se a detecção precisar
   de signal extra.
5. Adicionar onboarding em `.claude/docs/ONBOARDING-<ROLE>.md`.
