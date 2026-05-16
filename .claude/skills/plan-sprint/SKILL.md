---
name: plan-sprint
description: |
  Cria draft de plano de sprint seguindo o formato consolidado nas
  Waves 3-4 do Brasil a Vera. Argumento: nome curto da sprint
  (ex: "5.1 — Performance & Lighthouse" ou "6.0 — Onboarding").
  Use quando o usuário pedir "monta o plano da Sprint X" ou
  "vamos planejar a próxima sprint".
---

Quando o usuário invocar `/plan-sprint <nome>`:

## 1. Pré-leitura para contexto

Use `Read` para carregar:

- `docs/product/ROADMAP.md` — estado atual das Waves, sprints fechadas
- `docs/releases/` — release notes recentes (últimas 3-4)
- `CLAUDE.md` (raiz) — princípios atualizados
- `docs/architecture/ADR/` — ADRs mais recentes (numerados ≥ 015)

## 2. Pergunte os campos chave

Antes de gerar o draft, pergunte ao usuário (uma de cada vez se preferir):

1. **Wave parente** (ex: Wave 5 — Ecossistema Claude) e **número da
   sprint** (ex: 5.1).
2. **Objetivo central** (1-2 frases).
3. **Pré-leitura confirmada** (lista de arquivos canônicos consultados).
4. **Decisões já tomadas** (a copiar do owner, "não revisitar").
5. **Decisões pendentes** (perguntas para o owner antes de PRs).
6. **PRs propostos** (ordem + escopo de cada).
7. **Dependências novas** (com justificativa ADR-019).
8. **Riscos identificados**.

## 3. Gere o draft em `docs/sprints/SPRINT-X-Y-plan.md`

Estrutura padrão (replicada das Waves 3-4):

```markdown
# Plano Sprint X.Y — <título>

> Brasil a Vera · Wave N Sprint X.Y · vP1
> Data: <YYYY-MM-DD>
> Status: draft (aguardando aprovação do owner)

## Pré-leitura confirmada
- [x] arquivo 1
- [x] arquivo 2
...

## Decisões já tomadas (não revisitar)
1. <decisão 1>
2. <decisão 2>

## Decisões pendentes
- **D1** — <pergunta>
- **D2** — <pergunta>

## PRs propostos
| # | Conteúdo | Tipo |
|---|---|---|
| 1 | <PR 1> | feat/refactor/chore |
| 2 | <PR 2> | ... |
...

## Dependências novas (com justificativa ADR-019)
- <dep ou "Nenhuma">

## Riscos identificados
1. <risco>
...

## Critério de sucesso da sprint
- <bullet 1>
- <bullet 2>
```

Se `docs/sprints/` não existir, crie-o no primeiro `Write`.

## 4. Apresente para revisão

Após gerar, **NÃO commite**. Mostre o caminho do arquivo e diga:

> Draft em `docs/sprints/SPRINT-X-Y-plan.md`. Revise e me avise quando
> aprovar para o primeiro PR.

O owner aprova antes de qualquer arquivo de implementação ser tocado
(plan mode obrigatório para sprints).

## 5. Não fazer

- Não invente decisões pendentes. Se você não souber, pergunte.
- Não pule a pré-leitura — o plano sai vazio sem contexto.
- Não combine plan mode com implementação.
