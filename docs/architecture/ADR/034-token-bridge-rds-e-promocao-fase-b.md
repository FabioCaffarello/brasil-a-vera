# ADR-034: Token bridge do RDS e estratégia da Fase B (tradução dos compartilhados)

> Brasil a Vera · Arquitetura · v0.2
> Última atualização: 2026-06-17
> Status: accepted (estende o [ADR-033](033-adocao-react-design-system-externo.md))

---

> **Atualização 2026-06-17 — o bridge `@theme inline` auto-referente foi SUPERSEDED
> (ver [§7](#7-supersessão-do-bridge-auto-referente--consumo-da-fonte-theme-do-rds-2026-06-17)).**
> O mecanismo da Decisão §1 (registrar `--color-fg-brand: var(--color-fg-brand)` etc.
> em `@theme inline`) **quebrou estruturalmente** no RDS 4.3.0+: o Tailwind emitia
> essas declarações em `layer(theme)` colidindo com as do RDS no mesmo layer →
> referência circular → **39/41 tokens semânticos resolviam vazio** (botão primário
> invisível). Causa de fundo: o RDS publicava só CSS **compilado**, sem fonte `@theme`
> consumível. Resolvido em duas frentes (issues RDS#234 + BaV#468): o RDS passou a
> exportar `./theme` (fonte `@theme` raw) e o BaV a consumi-la nativamente, deletando
> o bridge. Detalhe na §7.

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [Limitação `text-` / `stroke-`](#limitação-text--stroke)
- [Alternativas consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Referências](#referências)

---

## Contexto

O [ADR-033](033-adocao-react-design-system-externo.md) adotou o
`@fabio.caffarello/react-design-system` (RDS) como pacote externo e definiu a
migração strangler-fig: cópias sob `src/app/rds/**` traduzidas para tokens RDS,
servidas em paralelo à produção. Concluída a migração de rotas (19/21) e
validado o mecanismo de **promoção** (3 rotas simples promovidas: `/privacidade`,
`/feed`, `/partidos/[sigla]`), a **Fase B** precisa traduzir os ~12 **componentes
compartilhados** (TrustBadge, DataBadge, Button primitive, `getTipoVotoStyle` etc.)
para que as rotas ricas possam ser promovidas sem deixar produção com visual misto.

A investigação empírica **falsificou** a premissa de que isso seria uma tradução
cosmética e segura de nomes de classe:

1. **O RDS só ship o CSS pré-compilado e tree-shaken** das utilities que os
   *próprios componentes* dele usam. Não há `@theme`/preset para o app gerar
   utilities. O README do pacote é explícito: *"No Tailwind setup required — use
   our components."* O `src/app/globals.css` tinha **zero** consciência do RDS.
2. Logo, classes RDS escritas no **JSX do BaV** (`text-fg-primary`,
   `bg-surface-canvas`, `ring-line-focus`, `bg-fg-brand/10`…) só resolvem para o
   subconjunto que o RDS pré-compilou. As demais — em especial **variantes de
   opacidade** (`/10`, `/40`) e **bases não pré-compiladas** (`surface-canvas`,
   `line-focus`) — **no-opam silenciosamente**: o build fica verde, o elemento
   renderiza sem cor. É a classe de falha do incidente #303/#304.
3. **Prova (CSS shipado do build, antes do bridge):** `ring-line-focus`,
   `bg-fg-brand/5`, `border-fg-brand/60`, `text-fg-brand/80`, `bg-surface-canvas`
   apareciam em **0** arquivos CSS. As **3 rotas já promovidas tinham defeitos
   latentes** (focus ring sem cor, hover sem tint, opacidade ignorada).
4. O token-map traduz `bg-brand/10 border-brand/40 text-brand` → `bg-fg-brand/10
   border-fg-brand/40 text-fg-brand`. O original BaV **funciona** (brand/success
   são tokens do `@theme` do BaV); a versão traduzida **no-opa** em fundo/borda.
   Traduzir ingênuo deixava o componente **pior**, com CI verde.

Conclusão: a Fase B exige uma **fundação** antes de tocar qualquer componente —
um *token bridge* que faça o Tailwind do BaV gerar a superfície completa de
utilities RDS.

## Decisão

### 1. Token bridge em `src/app/globals.css` (import global + `@theme` por referência)

- `@import "@fabio.caffarello/react-design-system/styles"` **global** (no
  `globals.css`, carregado pelo root layout) — traz o `:root`/`.dark` com os
  tokens `--color-*` do RDS (fonte única de verdade dos valores) e o cascade
  dark/light do pacote.
- Bloco `@theme inline` registrando os tokens semânticos RDS-únicos das famílias
  **`fg-*`, `surface-*`, `line-*` e `error*`** (lista gerada do CSS do pacote;
  `surface-overlay`, `success`, `warning` ficam de fora — colidem com o `@theme`
  do BaV). `inline` faz o Tailwind inlinar `var(--color-X)` nas utilities sem
  emitir um `:root` próprio; o `var()` resolve no `:root`/`.dark` do RDS,
  preservando o theme-switch.

Validação empírica (princípio 13, output literal no PR): após o bridge, as 5
classes antes-MISS passaram de **0 → presentes** no CSS gerado, com as variantes
de opacidade emitidas via `@supports (color-mix)`. O bridge **corrige de quebra**
os no-ops latentes das 3 rotas já promovidas.

### 2. Neutralização de colisão (bridge puramente aditivo)

O import global traz as utilities **bare** do RDS (`.bg-success`, `.text-warning`
etc.), que referenciam `--color-success`/`--color-warning` (emerald-400/amber-400).
Sem ação, rotas **não migradas** sofreriam shift visual silencioso dos valores
WCAG-tunados do BaV. Um bloco **unlayered** `:root { --color-success: var(--success);
--color-warning: var(--warning) }` reaponta essas variáveis para os tokens do BaV
(unlayered vence o `@layer theme` do RDS — confirmado no CSS gerado). `error` **não**
é neutralizado: nenhum componente BaV usa bare `error` (o BaV usa `destructive`),
então `bg-error` converge para rose-* do RDS — exatamente o destino do estado
destructive no token-map (piloto-3). `fg-success`/`fg-warning`/`fg-error` (família
RDS usada pela migração) ficam intactos. Resultado: a tradução de cada componente
muda só quando a **sua** onda roda, sob QA.

### 3. Guard automatizado de no-op (`scripts/rds-noop-guard.ts`)

Roda **depois do build** no job required **Lint & Build**: falha (exit 1) se
alguma classe que referencia um token semântico do RDS for usada em `src/**` mas
não tiver regra no CSS gerado (`.next/static/**`). É o contrafactual-provável que
torna o **"auto-merge on green" confiável** na Fase B — o vermelho aparece
exatamente quando uma tradução produziria no-op. Na introdução, o guard pegou 5
no-ops pré-existentes nas cópias `/rds/` (2 de `text-`/`stroke-` overloaded, 3 de
`bg-error/N`), todos corrigidos.

### 4. Ordem por ondas + deferral dos charts

Tradução in-place por blast-radius (Onda 1: Button/DataBadge/EmptyState/
TrustBadge/ExportCsvLink; Onda 2: FollowButton/CompartilharButton×3/FilterChip/
Combobox/PartyBadge/`getTipoVotoStyle`), cada onda com `check`+`build`+`vitest`+
guard verdes → PR → auto-merge on green.

### 5. Fase C (charts/SVG) — NÃO traduzem; são resíduo BaV + bugfix #303/#304

Os charts (recharts + SVG hemiciclo) usam a paleta categórica `--chart-1..5`
(Okabe-Ito colorblind-safe) e o `--accent` roxo — tokens **sem equivalente no
RDS** (o pacote não expõe paleta de chart). Logo os charts **permanecem em
tokens BaV por inteiro** (data + chrome de tooltip/legenda): é um resíduo
documentado, mesma categoria do `accent`/`success-foreground`. O chrome BaV é
sub-perceptualmente idêntico ao RDS, então um chart BaV numa rota RDS não destoa.

O que a "Fase C" entregou de fato: a investigação encontrou um bug #303/#304
LATENTE — `votos-consolidados-chart.tsx` (proposição) ainda usava
`hsl(var(${cssVar}))` (fills e swatches), que com tokens OKLCH vira
`hsl(oklch(...))` = CSS inválido → fatias pretas em produção (`/proposicoes/[…]`;
o #304 corrigiu 30 ocorrências em 7 arquivos mas perdeu esta). Corrigido para
`var(${cssVar})` direto (padrão dos outros charts). E o **guard de cor inválida**
foi adicionado: `scripts/rds-noop-guard.ts` agora também falha se `hsl(var(`
aparecer em `src/**` (fora de comentário) — todo token é OKLCH, então
`hsl(var())` é sempre inválido. Fecha a classe #303/#304 por máquina.

### 6. Fix de cascade-layer do bridge (RDS em `@layer rds`, abaixo de `utilities`)

O import do CSS do RDS (§1) traz a `@layer utilities` **pré-compilada do pacote**
— inclusive utilities genéricas de layout (`.hidden`, `.flex`, `.block`, `.grid`).
Sem controle de layer, esse conteúdo entrava **depois** do `utilities` do BaV sob
o **mesmo nome de layer**; por ser fonte posterior de igual especificidade,
**sobrescrevia as variantes responsivas do BaV**: `.hidden{display:none}` do RDS
vencia `@media (min-width:40rem){.sm\:block{display:block}}` do BaV mesmo em
≥640px. Efeito: **`hidden sm:block` colapsava para `display:none` no desktop**. Os
perfis usam exatamente esse split (Accordion mobile `sm:hidden` + stack de
SectionCards desktop `hidden sm:block`), então em ≥640px o **miolo inteiro do
perfil ficava invisível** (só header + KPIs + footer). Latente desde o bridge
(#405) — atingia em produção os perfis **parlamentar e proposição já promovidos**;
descoberto no QA visual do perfil de votação.

Diagnóstico empírico (princípio 13) no CSS buildado: `.sm\:block` @ byte 64210 <
`.hidden` (RDS) @ 72322, mesma especificidade (0,1,0), mesmo nome de layer →
fonte posterior vence. `sm:hidden` (Accordion) funcionava por simetria inversa
(não depende de sobrescrever um `.hidden` explícito).

Fix (3 linhas em `globals.css`): declarar **`@layer rds;` como primeira layer**
(menor prioridade) e importar o RDS nela —
`@import "@fabio.caffarello/react-design-system/styles" layer(rds)`. As utilities
do BaV (layer `utilities`, padrão do Tailwind) passam a vencer sempre; o RDS
continua provedor único dos tokens `--color-*` (resolvem por `var()`, independem
de layer) e as utilities RDS-únicas (`bg-surface-canvas` etc.) seguem aplicando
(sem competidor no BaV). A neutralização unlayered de `success`/`warning` (§2)
fica **mais** robusta: unlayered vence qualquer layer, incl. `rds`.

Validação empírica: rebuild → `.hidden` do RDS aninhada em
`@layer rds{@layer utilities{…}}` (baixa prioridade), `.sm\:block` do BaV no
`utilities` top-level. Playwright em 5 rotas (1280px): todo `hidden md:block`
computa `block`/`flex`/`grid`; docH do perfil de votação **1091 → 8928px** (miolo
+ hemiciclo colorido renderizam); perfis parlamentar/proposição corrigidos
retroativamente; listagens/home sem regressão; 0 erro de console, 0 fill preto.
O `rds-noop-guard.ts` ganhou uma checagem de **invariante de fonte**: falha se o
`globals.css` perder o `@layer rds;` ou o `layer(rds)` do import.

### 7. Supersessão do bridge auto-referente — consumo da fonte `@theme` do RDS (2026-06-17)

**Problema.** O bridge da §1 registrava os tokens RDS em `@theme inline` por
**auto-referência** (`--color-fg-brand: var(--color-fg-brand)`). A premissa ("`inline`
não emite `:root`, o `var()` resolve no RDS") era falsa contra o **RDS 4.3.0+**: o
Tailwind emitia `:root { --color-fg-brand: var(--color-fg-brand) }` em `layer(theme)`,
e como o RDS 4.3.0+ também declara seus tokens em `layer(theme)`, a auto-referência
vencia por ordem de fonte → **referência circular → vazio**. Probe runtime: **39 de
41** famílias `fg-*`/`surface-*`/`line-*` resolviam vazio; `bg-surface-brand-strong`
(botão primário) ficava `transparent`. Causa de fundo: o RDS publicava **só CSS
compilado** (sem fonte `@theme` consumível), forçando o consumidor a esse bridge frágil.

**Decisão.** Resolver na raiz, em duas frentes:

1. **RDS (issue [#234](https://github.com/FabioCaffarello/react-design-system/issues/234),
   entregue no 4.5.0):** novo export `./theme` → `dist/tokens.css` — a fonte `@theme`
   **raw** (não compilada) dos tokens + overrides `.light`/`.dark`.
2. **BaV (issue #468):** em `globals.css`,
   - `@import ".../theme" layer(rds)` — o Tailwind do BaV processa os `@theme {}` e gera
     as utilities nativamente, com os valores theme-aware do RDS. Em `layer(rds)` para
     a neutralização unlayered da §2 (success/warning/surface-overlay) continuar vencendo.
   - `@source ".../dist/**/*.{js,cjs}"` — varre os componentes do RDS para o Tailwind do
     BaV **regerar as utilities deles na própria `layer(utilities)`** (prioridade máxima).
     Necessário porque a utility do RDS compilado fica em `layer(rds)` (baixa, mantida
     pelo fix #416) e ali **perde** para o reset `button { background: transparent }` do
     preflight (`layer base`) — deixando `<button>` de variante primária transparente.
   - **Deleção** do bloco bridge `@theme inline` auto-referente (famílias fg/surface/line/error).

**Validação empírica (princípio 13, dev real).** Pós-fix: as 41 famílias resolvem
(0 vazias); `bg-surface-brand-strong` em `<button>` = `#7390ad` (era `transparent`);
`hidden sm:block` @1440px = `block` (**#416 não regrediu**); `--color-success/-warning/
-surface-overlay` permanecem nos valores do BaV (neutralização §2 preservada);
`npm run build` verde (4.5s). Telas em `.tmp/design/screens/fixed-*`.

**Consequência:** a §1 (bridge `@theme inline` auto-referente) e a **Limitação
`text-`/`stroke-`** abaixo ficam **OBSOLETAS** — com a fonte `@theme` + `@source`, o
Tailwind do BaV passa a gerar TODAS as utilities color (incl. `text-surface-*`,
`text-line-*`, `stroke-<rds>` e variantes de opacidade) por conta própria, sem depender
do que o RDS pré-compila. O invariante de fonte do guard (§6: `@layer rds;` + `layer(rds)`
no import) **continua válido** — ambos preservados.

## Limitação `text-` / `stroke-`

> **OBSOLETA desde 2026-06-17 (ver §7).** Com a fonte `@theme` + `@source`, o Tailwind do
> BaV gera as variantes `text-`/`stroke-` dos tokens RDS por conta própria. Mantida abaixo
> por contexto histórico.

`text-` e `stroke-` são utilities **overloaded** no Tailwind v4 (também
`text-<size>` e `stroke-<width>`). O bridge por `@theme inline` auto-referente
gera de forma confiável as utilities **color-only** (`bg-`, `border-`, `ring-`,
`fill-`, `divide-`, `outline-`), incl. variantes de opacidade — mas **não** emite
a variante de cor de `text-`/`stroke-` para tokens RDS bridados. `text-fg-*`
funciona porque o **RDS pré-compila** essas classes (seus componentes as usam);
`text-surface-*`, `text-line-*`, `stroke-<rds>` não são pré-compilados **nem**
gerados → no-op. Regras práticas:

- **Texto:** usar `text-fg-*` (pré-compiladas). Para texto sobre superfície
  invertida/clara, usar `text-fg-inverse` (não `text-surface-canvas`).
- **Stroke SVG:** `style={{ stroke: 'var(--color-line-*)' }}` inline (o var()
  resolve no `:root` do RDS global). É também o padrão dos charts na Fase C.

O guard reforça isso: qualquer `text-surface-*`/`stroke-<rds>` novo vira CI
vermelho.

## Alternativas consideradas

- **Copiar os valores OKLCH do RDS para o `@theme` do BaV** (sem import global):
  mais leve nas rotas anônimas, mas duplica valores (drift a cada release do RDS)
  e exige fiar light/dark à mão. **Rejeitada** pelo owner — fonte única de verdade
  vale o peso.
- **Manter os compartilhados em tokens BaV** (não traduzir; confiar que BaV ≈ RDS):
  nunca consolida; deixa um sistema de tokens duplo permanente. **Rejeitada** —
  contraria o destino do ADR-033.
- **Import do CSS do RDS por componente** (em vez de global): frágil — um
  compartilhado puramente apresentacional não tem motivo para importar JS do RDS,
  e a utility no-oparia em rotas que não puxam outro componente RDS.

## Consequências

**Positivas:** toda a superfície de utilities RDS fica disponível no JSX do BaV;
os no-ops latentes das 3 rotas promovidas são corrigidos; o guard previne
regressões da mesma classe; a tradução dos compartilhados passa a ser confiável.

**Negativas / custos:**

- **+~14,75KB gzip** de CSS do RDS em **toda** rota que carrega o `globals.css`
  (inclui anônimas — tensão com o [ADR-022](022-clerk-para-autenticacao.md); é CSS,
  não JS, e o owner aceitou em troca da fonte única). Canário de build: 3,9s
  (main) → 4,3s (com bridge), +0,4s de processamento CSS — **não** o salto de 5s+
  que sinalizaria vazamento de `ingestion/` no bundle.
- **Preflight aplicado 2×** (Tailwind do BaV + bundle do RDS) — idempotente; já
  coexistia nas 3 rotas promovidas.
- A neutralização de `success`/`warning` é um **shim permanente** até uma eventual
  convergência explícita desses tokens para o RDS.
- A limitação `text-`/`stroke-` precisa ser lembrada nas ondas (mitigada pelo guard).

**Reversibilidade:** o bridge é uma mudança isolada em `globals.css` +
`scripts/rds-noop-guard.ts` + 1 step de CI; `git revert`-able.

## Referências

- [ADR-033](033-adocao-react-design-system-externo.md) — adoção do RDS externo
- [ADR-022](022-clerk-para-autenticacao.md) — peso de rotas anônimas
- [ADR-024](024-acentos-secundarios-accent-roxo.md) — resíduo accent roxo
- `docs/migration/token-map.md` — tabela canônica + nota do bridge
- `docs/migration/route-readiness.md` §3.22 — registro da Fase B
- Princípio 13 (CLAUDE.md) — validação empírica; incidente #303/#304
