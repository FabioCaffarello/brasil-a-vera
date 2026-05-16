# Onboarding engineer — Brasil a Vera

> Para quem entra com repertório técnico e vai operar áreas de
> domínio, ingestão e infraestrutura.

## 1. Declare seu role

O default da sessão Claude é `designer` (mais restritivo). Antes da
primeira sessão, adicione ao seu `~/.zshrc` (ou `~/.bashrc`):

```bash
export BAV_CLAUDE_ROLE=engineer
```

Reabra o terminal. Verifique:

```bash
echo "$BAV_CLAUDE_ROLE"
# → engineer
```

Sem essa declaração explícita você opera como designer — os hooks
(`.claude/hooks/pre-edit-guardrail.sh`) vão bloquear edições em
`src/lib/queries/**`, `ingestion/**`, ADRs, infra config.

A matriz `role × path` completa está em `.claude/docs/ROLES.md`.

## 2. O que o role engineer adiciona

Em relação ao designer:

- `src/lib/queries/**`, `src/modules/**`, `src/shared/**` — domínio
  e camada de dados.
- `ingestion/**` — ETL.
- `biome.json`, `next.config.ts`, `open-next.config.ts`,
  `drizzle.config.ts`, `wrangler.*`, `package.json`,
  `package-lock.json`, `tsconfig*.json` — config root.
- `docs/architecture/ADR/**`, `docs/product/**`, `docs/releases/**`
  — arquitetura e produto.
- `.claude/agents/**`, `.claude/hooks/**`, `.claude/settings.json`
  — núcleo de governança do Claude.
- `CLAUDE.md`, `AGENTS.md` — contrato do projeto.

## 3. O que o engineer ainda NÃO toca

Por design, mesmo engineer não toca via Claude:

- `.env*` — secrets vivem em Wrangler ou GitHub Actions, sempre.
- `src/shared/db/migrations/**` — migrations entram via PR humano
  explícito, não via sessão Claude (escape deliberado).
- `.github/workflows/**` — workflows mudam via PR humano
  explícito (esta foi exatamente a justificativa por trás da
  hook bloqueante).

Se você **precisa** editar um workflow ou migration, edite no
seu editor fora da sessão Claude, depois commit + push manual.
O Claude pode ajudar no diff conceitualmente, mas não escreve
o arquivo.

## 4. Auditoria local de edições engineer

Toda edição que você faz em modo engineer é logada em
`.claude/.role-log` (gitignored). Formato TSV:

```
2026-05-16T13:42:01Z<TAB>Edit<TAB>src/lib/queries/parlamentares.ts
```

Útil para revisar o que tocou durante uma sessão longa antes de
commitar.

## 5. Adicionar novos componentes do ecossistema

### Skill nova

Crie `.claude/skills/<nome>/SKILL.md` com frontmatter YAML mínimo
(`name`, `description`) e body markdown. Veja
`.claude/skills/design-token-check/` ou `add-primitive/` como
referência.

Critério para criar skill: o fluxo apareceu **3+ vezes** em PRs
reais. Antes disso, é instrução solta no chat.

### Agent novo

Crie `.claude/agents/<nome>.md` com frontmatter (`name`,
`description`, `tools`, `model`) e system prompt no body. Veja
`design-system-curator.md`.

**Promoção skill → agent**: se uma skill cresceu além de
~200 linhas em SKILL.md, ou exige isolamento de contexto, vira
agent dedicado. Pequenos fluxos ficam como skill.

### Hook novo

Crie `.claude/hooks/<nome>.sh` com shebang `#!/usr/bin/env bash`,
`chmod +x`, e registre em `.claude/settings.json` no array
correto (`PreToolUse`, `PostToolUse`).

Hooks devem ter:
- Test matrix determinística em `.claude/hooks/__tests__/`
- Output literal em PT-BR claro no stderr para usuário
- Idempotência (rodar duas vezes não muda nada)
- Sem dependência de Node — só shell + jq (assumido presente)

## 6. Quando precisar fugir de uma proteção

### Path bloqueado para engineer (workflows, migrations)

Edite fora do Claude. Não use `--no-verify`, não use
`bypassPermissions` na sessão. A regra existe porque PR humano
nessas áreas tem revisão extra (CODEOWNERS).

### Bypass temporário de um hook específico

Se um hook tem bug e está bloqueando edição legítima:

1. **NÃO** desabilite o hook globalmente.
2. Edite fora do Claude para destravar.
3. Abra PR corrigindo o hook (lib/path-matchers.sh ou regex
   no script principal).
4. Mergeie o fix.
5. Retome o trabalho com o hook funcional.

## 7. Princípio operacional

ADR-019 vale também dentro do ecossistema `.claude/`. Cada
adição (skill, hook, agent) precisa responder: "qual o problema
concreto observado em 1+ PR real?" Sem isso, não cria — backlog
enxuto vale mais que biblioteca aspiracional.

## 8. Comandos úteis em sessão engineer

```bash
# Atualizar deps com revisão (Dependabot abre PRs semanalmente)
gh pr list --label chore

# Rodar smoke test contra produção
SMOKE_BASE_URL=https://brasilavera.org npm run smoke

# Inspecionar log de role
tail .claude/.role-log

# Disparar sync de labels (após editar .github/labels.yml)
gh workflow run labels-sync.yml
```
