# Onboarding designer — Brasil a Vera

> Boas-vindas. Você não precisa programar para contribuir aqui.

O Brasil a Vera tem um sistema visual robusto e um conjunto de
ferramentas que você pode usar com segurança, mesmo sem repertório
de código. Este guia foi feito para te tirar de zero.

## 1. Conceitos rápidos

- **Design system** mora em `src/design-system/`. As **primitivas**
  (Button, Card, Dialog, Popover) são pedaços reutilizáveis. Você
  pode editar uma primitiva ou propor uma nova.
- **Apresentação** mora em `src/components/`. São combinações das
  primitivas com dados (ParlamentarCard, TrustBadge). Você pode
  editar livremente.
- **Rotas e páginas** moram em `src/app/`. Layout, copy, ordenação
  de elementos. Você pode editar.
- **Domínio, banco, ingestão** ficam em `src/lib/queries/`,
  `src/modules/`, `src/shared/`, `ingestion/`. Você **não toca**.
  Quem cuida disso são os engineers — você abre issue se precisar
  de mudança nessa área.

A matriz completa do que cada role pode ou não pode tocar está em
`.claude/docs/ROLES.md`.

## 2. Como rodar o Claude no projeto

Abra um terminal no diretório do repo e digite:

```bash
claude
```

O Claude Code carrega o ecossistema `.claude/` automaticamente:
permissões, hooks (proteções), agents (especialistas), skills
(atalhos).

Você não precisa configurar nada. Default é role **designer** — o
mais restritivo, que protege você de tocar paths perigosos sem querer.

## 3. Slash commands úteis para você

Digite no chat do Claude:

### `/add-primitive <nome>`

Adicionar uma primitiva nova ao design system seguindo os 7 passos
canônicos (copiar via shadcn, adaptar tokens, criar smoke test,
medir bundle delta, commit isolado). Não precisa decorar — o
subagent `design-system-curator` cuida.

Exemplo: `/add-primitive accordion`

### `/design-token-check`

Verifica se algum arquivo de UI tem classes legacy (`zinc-*`, HEX
inline, `bg-primary-*`). Útil **antes** de abrir PR — confirma que
as cores ficaram com tokens semânticos corretos.

### `/visual-qa`

Roteiro interativo de QA visual antes de abrir PR. Te guia por
`/dev/design`, rotas-amostra, mobile 360px, `prefers-reduced-motion`.
Tipo de checklist que evita "mas funcionava na minha máquina".

### `/plan-sprint <nome>` e `/new-adr <título>`

Esses são para fluxos de planejamento e arquitetura. Se você não
precisar, ignore — quando precisar, chame.

### `/release-notes <tag>`

Gera draft das release notes a partir do `git log`. Normalmente o
owner usa isso quando uma Wave fecha.

## 4. Como abrir um PR

Depois de fazer suas mudanças:

```bash
# 1. Crie uma branch a partir da main
git checkout main
git pull
git checkout -b feat/minha-mudanca

# 2. Faça suas mudanças e commit
git add <arquivos>
git commit -m "feat(ds): improve button hover state"
# Mensagem em inglês, imperativo presente. Tipo: feat (nova feature),
# fix (bug fix), refactor (refactor sem mudança), docs (documentação).
# Veja docs/contributing/COMMIT-CONVENTION.md.

# 3. Empurre a branch
git push -u origin feat/minha-mudanca

# 4. Abra o PR
gh pr create
# O Claude pode te ajudar com o título e descrição usando o template
# em .github/PULL_REQUEST_TEMPLATE.md.
```

## 5. Quando algo der errado

### "Edit blocked" — apareceu uma mensagem assim no Claude

Isso é proteção de role. Você tentou editar algo que designer não
toca. Mensagem original:

```
[BAV pre-edit-guardrail] Edição BLOQUEADA para role "designer":
  <caminho>
```

Caminhos para resolver:
1. **Era erro do Claude** — o Claude tentou tocar algo errado. Diga
   pra ele tentar outra abordagem (sem mexer naquele caminho).
2. **Era intencional** — você quer mesmo mudar lógica de domínio
   (queries, módulos, ingestão). Aí é caso de abrir issue com label
   `feature` ou `design`, e parear com um engineer.

### Outra mensagem de erro

Abra uma issue na aba **Issues** do repo, escolhe "Bug report" e
descreve o que aconteceu. Não tem nada que você não possa pedir
ajuda.

## 6. Onde achar mais coisas

- `CLAUDE.md` (raiz) — princípios do projeto
- `docs/architecture/ADR/` — decisões arquiteturais (não precisa
  ler tudo; o Claude consulta automaticamente quando relevante)
- `src/design-system/README.md` — como o DS funciona
- `docs/design/DESIGN-TOKENS.md` — paleta e tokens

## 7. Princípios para contribuir

- **Apartidarismo** é inegociável. Nada de viés político em nada
  que você produzir aqui.
- **Cidadão é o leitor**. Linguagem clara, sem jargão. Cada
  decisão de design deve facilitar a vida de quem nunca viu o
  Congresso por dentro.
- **Honestidade visual sobre os dados**. Trust badges (L1-L4) e
  cores de % seguem regra fixa documentada em ADR-021. Não invente
  significados visuais novos sem alinhar.

Bem-vinda, bem-vindo.
