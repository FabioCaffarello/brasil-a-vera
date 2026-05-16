---
name: new-adr
description: |
  Cria novo ADR seguindo o template em
  docs/architecture/ADR/000-adr-template.md. Atribui próximo número
  sequencial automaticamente. Argumento: título curto descritivo do
  ADR (ex: "Switching to NATS for events" ou "Cloud Run for Workers").
  Use quando o usuário pedir "novo ADR" ou "registrar decisão X".
---

Quando o usuário invocar `/new-adr <título>`:

## 1. Determinar próximo número

Use `Bash` para listar `docs/architecture/ADR/` e identificar o maior
número existente:

```bash
ls docs/architecture/ADR/ | grep -E '^[0-9]+-' | sort -n | tail -1
```

Próximo número = maior + 1. Use formato `0NN` com zero padding.

**Atenção a lacunas**: o projeto evita lacunas históricas, mas algumas
existem (ex: 004, 005, 012 foram skipped no histórico real). Use
**próximo após o maior**, não preenche lacunas — preencher quebra
referências entre ADRs.

## 2. Leia o template

`docs/architecture/ADR/000-adr-template.md` é a fonte de verdade da
estrutura. Não invente seções.

## 3. Pergunte os campos chave

Antes de gerar, pergunte:

1. **Status inicial** — `proposed` (em discussão), `accepted`
   (já decidido), `superseded by ADR-NNN` (substitui ADR anterior?).
2. **Versão** — primeira versão = `v0.1`.
3. **Data** — hoje em `YYYY-MM-DD`.
4. **Contexto** — qual problema motivou esta decisão? Que forças
   estão em jogo?
5. **Decisão** — o que foi decidido?
6. **Alternativas consideradas** — pelo menos 2, com prós/contras.
7. **Consequências** — positivas, negativas, neutras.
8. **Referências** — outros ADRs relacionados, docs externos.

Se faltar informação para preencher uma seção, pergunte ao usuário ou
peça permissão para deixar `<a preencher>` como placeholder.

## 4. Gere o arquivo

`docs/architecture/ADR/NNN-titulo-em-kebab-case.md`.

Título do arquivo: número padrão `0NN-` + kebab-case do título curto.
Exemplo: `023-clerk-multi-tenant-rbac.md` para "Clerk multi-tenant
RBAC".

Estrutura (do template, com placeholders preenchidos):

```markdown
# ADR-NNN: <Título Descritivo>

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: YYYY-MM-DD
> Status: <status>

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Referências](#referências)

---

## Contexto

<conteúdo>

## Decisão

<conteúdo>

## Alternativas Consideradas

### A. <alternativa 1>

- **Prós**: ...
- **Contras**: ...
- **Veredicto**: ...

### B. <alternativa 2>

- ...

## Consequências

### Positivas

- ...

### Negativas

- ...

### Neutras

- ...

## Referências

- [ADR-NNN — Título](NNN-titulo.md)
- Links externos relevantes
```

## 5. Atualizar CLAUDE.md se aplicável

Alguns ADRs viram regra ativa no `CLAUDE.md` raiz (princípios numerados,
seção de regras). Pergunte ao usuário se este ADR exige atualização do
`CLAUDE.md`. Se sim:

- Adicione 1-line pointer ao novo princípio (não copie o ADR inteiro)
- Atualize na seção mais apropriada (Princípios de código, Regras para
  Claude Code, ou Disciplina operacional)

## 6. Não fazer

- Não commite automaticamente — owner revisa primeiro.
- Não pule alternativas — ADR sem alternativa rejeitada é decisão
  semi-cega.
- Não copie texto de outro ADR — cada decisão é independente.
- Não use o status `accepted` se o ADR ainda está em discussão —
  use `proposed` e mude depois.
