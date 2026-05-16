---
name: release-notes
description: |
  Gera draft de release notes seguindo o padrão dos releases v0.3.x /
  v0.4.x do Brasil a Vera. Argumento: tag-name de saída (ex:
  "v0.5.0-claude-ecosystem"). Lê git log da tag anterior até HEAD,
  agrupa commits por sprint usando Conventional Commits, produz
  draft em docs/releases/. Use quando uma sprint ou wave estiver
  fechando.
---

Quando o usuário invocar `/release-notes <tag-name>`:

## 1. Identificar baseline

Use `Bash` para descobrir a tag mais recente que precede HEAD:

```bash
git describe --tags --abbrev=0 HEAD^ 2>/dev/null || git tag -l --sort=-v:refname | head -1
```

Confirme com o usuário: "Comparando contra a tag `<baseline>`. Está
correto?" Se ele quiser outra baseline, ajuste antes de prosseguir.

## 2. Coletar commits

```bash
git log <baseline>..HEAD --oneline --reverse
```

Note: o projeto usa **Conventional Commits em inglês imperativo**
(ver `docs/contributing/COMMIT-CONVENTION.md`). Cada linha de log tem
formato `<tipo>(<escopo>): <descrição>`.

Tipos comuns: `feat`, `fix`, `refactor`, `docs`, `chore`, `perf`,
`test`, `style`, `ci`, `build`.

## 3. Agrupar por sprint

O projeto agrupa releases **por sprint** (não por tipo Conventional
Commits). Padrão observado em `docs/releases/v0.4-final-public.md`:

```markdown
## Sprints consolidadas nesta tag

| Sprint | Conteúdo | PRs |
|---|---|---|
| 4.0 | Fundação do DS | #138-#145 |
| 4.1 | Shell — Navbar, Footer... | #146-#151 |
...
```

Detecte a sprint de cada commit via:
- Convenção do projeto: muitos commits têm escopo `wave4/sprint-4.6`
  ou similar no escopo do Conventional Commits.
- Datas e dependências entre PRs (#NNN).
- Pergunte ao usuário quando ambíguo.

## 4. Estrutura do release notes

Replicar exatamente o padrão de `docs/releases/v0.4-final-public.md`:

```markdown
# Release `<tag-name>`

> Wave N — <título> — fechamento (ou subtítulo apropriado)
> Tag publicada em: YYYY-MM-DD
> Sucessor de: [`<baseline-tag>`](github URL)
> Próximo: <Wave/Sprint seguinte>

## Resumo executivo

<2-4 parágrafos sobre o que mudou e por quê>

## Sprints consolidadas nesta tag

| Sprint | Conteúdo | PRs |
|---|---|---|
...

## Achados-chave

### <padrão 1 observado durante a Wave>

<descrição>

### <padrão 2>

...

## Decisões registradas durante a Wave

### <decisão notável 1>

<contexto e veredito>

## Validação empírica

| Check | Resultado |
|---|---|
| `npm run ci` | ✓ N arquivos sem fixes |
| `npm run test --run` | ✓ N testes em M arquivos |
| `npm run build` | ✓ K rotas |
| `npm run cf:build` | ✓ Worker X MB gzipped |

## Documentação atualizada nesta release

- arquivo 1
- arquivo 2

## Issues abertas pela Wave

| Issue | Conteúdo | Label |
|---|---|---|
| [#NNN](url) | ... | `wave-N+` |

## Próximo

<Wave/Sprint seguinte>

## Pós-tag

Comando para publicar (owner executa):

```bash
git tag -a <tag-name> -m "<mensagem>"
git push origin <tag-name>
```
```

## 5. Não fazer

- Não invente PRs — só liste o que está no git log.
- Não invente Achados-chave — pergunte ao usuário se você não
  observou os padrões diretamente.
- Não use vocabulário valorativo ("magnífico", "revolucionário"...).
  O projeto é apartidário e técnico — tom factual.
- Não comprometa-se com data exata de "Próximo" — Wave 5+ é open
  ground, sem cronograma fixo.

## 6. Apresente para revisão

Após gerar, mostre o caminho e diga:

> Draft em `docs/releases/<tag-name>.md`. Revise os achados-chave e
> decisões. Quando aprovar, abrimos PR e executamos o `git tag`
> manualmente.
