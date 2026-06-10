# ADR-021: Design System próprio com shadcn/ui curado

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-09
> Status: accepted — parcialmente superseded pelo [ADR-033](033-adocao-react-design-system-externo.md)
> (a proibição de dependência npm de UI e o pipeline shadcn-CLI para novas
> primitivas foram revistos; curadoria, tokens e import boundary permanecem)

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [Componentes Tier 1 / Tier 2 / Tier 3](#componentes-tier-1--tier-2--tier-3)
- [Tokens semânticos e tema dark-first](#tokens-semânticos-e-tema-dark-first)
- [Regra de import boundary](#regra-de-import-boundary)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Referências](#referências)

---

## Contexto

A Sprint 3.2 (`v0.3.2-distribution`) fechou a fase cívica do produto. A próxima
fase (Wave 4) não é mais features de domínio — é elevar a qualidade do frontend
para nível de showcase profissional sem comprometer os princípios técnicos do
projeto (ADR-019, ADR-020).

Um designer parceiro entregou um protótipo (`usernamette/vera-politica`) com:

- **Sistema visual premium dark-first** com paleta OKLCH bem calibrada
- **Information architecture** estruturada (página de análise, perfil 360°,
  área autenticada)
- **Componentes shadcn-style** com tokens consistentes
- **Stack incompatível**: TanStack Start + Vite + Tailwind v4 + chamadas
  client-side direto à API da Câmara + auth via `localStorage`

Stack incompatível mas a *linguagem visual* e a *IA* valem extrair. Reusar
componentes shadcn como base acelera o trabalho e mantém qualidade — desde que
não vire dependência opaca.

A nota no [ADR-006](006-frontend-stack.md) já previa: "componentes próprios
mínimos até o design system amadurecer; vale rever quando design system
amadurecer". E o `CLAUDE.md` carrega a regra "NÃO use shadcn/ui sem antes
consultar". Este ADR é a consulta — e a autorização explícita.

O critério aplicado é o mesmo do [ADR-019](019-disciplina-arquitetural-sem-gargalo.md),
mas em versão mais leve: **bibliotecas de UI não são infraestrutura**. Não
exigem ADR específico por componente nem métrica de gargalo em produção. Exigem
justificativa de PR (bundle, manutenção, alternativa rejeitada) e adaptação
curada aos tokens do projeto.

## Decisão

### 1. shadcn/ui autorizado, mas com curadoria

Componentes do shadcn entram via CLI (`npx shadcn@latest add <componente>`),
**não como dependência npm**. Cada arquivo copiado é revisado, adaptado aos
tokens do nosso design system e versionado em `src/design-system/primitives/`.
A regra "não consumir shadcn como dependency" do ADR-006 permanece — copiar é
diferente de depender.

### 2. Localização e divisão de papéis

| Camada | Caminho | O que vive aqui |
|---|---|---|
| Primitivas | `src/design-system/primitives/` | Peças sem contexto de domínio. Button, Card, Badge, Input, Skeleton, Dialog, Tabs, etc. Servem qualquer feature. Copiadas do shadcn, adaptadas aos tokens. |
| Composições | `src/design-system/compositions/` | Padrões visuais repetíveis sem domínio acoplado. Hero, StatsGrid, FilterBar, EmptyState. Configuráveis via props. |
| Tokens | `src/design-system/tokens/` | Mapa TS dos tokens semânticos (cores, raios, sombras, motion). Exporta tipos. Aponta para CSS vars — não inlina valores. |
| Documentação | `src/design-system/docs/` (Storybook só se justificar) + `docs/design/DESIGN-TOKENS.md` | Quando usar cada primitiva, exemplos visuais. |
| Componentes de domínio | `src/components/<contexto>/` (já existe) | Componentes que sabem de domínio (`ParlamentarCard`, `VotoBadge`). Consomem primitivas e composições. |

### 3. Processo de adoção (um PR por componente)

Cada componente shadcn copiado segue o ciclo:

1. **Justificativa no PR**: consumer concreto da Wave 4 (Sprint X.Y) que vai
   usar o componente. Sem consumer, sem cópia (ADR-019 aplicado a UI).
2. **Bundle delta declarado**: medido com `npm run build` antes/depois ou
   `bundle-phobia <peer-dep>`. Registrado no corpo do PR.
3. **Adaptação aos tokens**: trocar `bg-primary text-primary-foreground` etc.
   por CSS vars do nosso `globals.css`. Sem `--primary` cru do shadcn default
   — sempre o nosso.
4. **`cn` helper local**: usar `@/lib/cn` (que combina `clsx` + `tailwind-merge`),
   não o `cn` default do shadcn.
5. **Smoke test**: pelo menos um teste Vitest + RTL renderizando o componente
   em variantes-chave sem warnings.
6. **Commit isolado**: mensagem `feat(ds): add <componente> primitive` para
   facilitar revert seletivo.
7. **Revisão visual**: componente novo aparece em `/dev/design` (rota
   interna, `noindex`, criada na Sprint 4.0) para QA visual manual.

### 4. Princípio 14 (implícito, descrito aqui)

Bibliotecas de UI seguem critério mais leve que infraestrutura: justificar
bundle, manutenção e alternativa rejeitada no próprio PR. **Não exigem ADR
específico por dependência adicionada**. ADR-019 (3 condições concorrentes)
aplica-se a runtime, banco, broker, gateway — não a peer deps de UI.

O `CLAUDE.md` carrega apenas uma linha-pointer para este ADR. A regra completa
mora aqui.

## Componentes Tier 1 / Tier 2 / Tier 3

A lista é viva — atualizada conforme features pedem. Estado em 2026-05-15
(início da Sprint 4.0):

### Tier 1 — Essenciais (entram na Sprint 4.0)

| Componente | Por que essencial | Peer deps adicionadas |
|---|---|---|
| `button` | CTAs em toda página | `@radix-ui/react-slot`, `class-variance-authority` |
| `card` | Container dominante (parlamentar, votação, proposição) | nenhuma |
| `badge` | Trust badges (L1-L4), status de voto, partido | nenhuma |
| `skeleton` | Loading states em listagens | nenhuma |
| `sonner` | Toasts (form feedback, ações futuras) | `sonner` |
| `dialog` | Modais de confirmação, expansão de cards | `@radix-ui/react-dialog` |
| `input` | Filtros, busca, forms futuros | nenhuma |
| `label` | Acompanha input em filtros e forms | `@radix-ui/react-label` |
| `separator` | Divisor visual entre seções de perfil | `@radix-ui/react-separator` |
| `tabs` | Reorganização do perfil 360° (Sprint 4.3) | `@radix-ui/react-tabs` |

Bundle Tier 1 total estimado: ~40 kB gzip distribuído entre as primitivas
(tree-shake por consumer real).

### Tier 2 — Sob demanda (Sprints 4.2–4.5 se feature concreta pedir)

`popover`, `command` (search overlay), `avatar`, `scroll-area`, `progress`,
`alert`, `tooltip`, `dropdown-menu`, `select`, `sheet` (mobile nav).

Critério para promover: PR de feature que use o componente abre, com
consumer concreto identificado.

### Tier 3 — Não copiar sem feature concreta

`accordion`, `breadcrumb`, `checkbox`, `radio-group`, `switch`, `slider`,
`pagination`, `table` (já temos `<table>` próprio funcionando bem em RSC),
`toggle*`, `navigation-menu`, `carousel`, `drawer`, `otp-input`, `menubar`,
`hover-card`, `aspect-ratio`, `context-menu`, `resizable`, `calendar`.

Razão: protótipo do designer usa alguns destes, mas sem demanda concreta
nossa. ADR-019 / princípio 14 aplicado: não copiar sem consumer.

## Tokens semânticos e tema dark-first

### Sprint 4.0 entrega dark only

- **Dark é o padrão visual da Wave 4**. Alinhado com o protótipo do designer
  e com a maior parte das interfaces cívicas modernas (gov.uk dark, etc.).
- Tema light fica **dormente**: paleta `--color-primary-*` HEX atual
  (Variante 2 azul-marinho institucional do `DESIGN-TOKENS.md`) permanece em
  `:root`, mas o `<html>` aplica `className="dark"` por padrão.
- **Toggle dark/light vai para Sprint 4.1+** quando houver decisão de
  produto e auditoria WCAG completa nos dois temas (princípio 13:
  validação empírica antes de adoção).
- Sem `next-themes` no Sprint 4.0. Hardcode `<html className="dark">`.
  `next-themes` entra com o toggle.

### Tokens semânticos (introduzidos pela Sprint 4.0)

Em `:root` (light dormente) e `.dark` (ativo), expostos via `@theme inline`:

| Token | Função |
|---|---|
| `--background` | Fundo da página |
| `--surface` | Fundo de card padrão |
| `--surface-elevated` | Card com elevação (CTA, hero) |
| `--surface-overlay` | Backdrop de dialog/sheet |
| `--border` | Borda padrão |
| `--border-strong` | Borda em hover/focus |
| `--foreground` | Texto principal |
| `--foreground-muted` | Texto secundário |
| `--foreground-subtle` | Texto terciário (captions) |
| `--primary` | Cor de marca / CTA principal |
| `--primary-foreground` | Texto sobre `--primary` |
| `--success` | Estado positivo (votação aprovada, alinhamento alto) |
| `--warning` | Disclaimers, amostras insuficientes |
| `--destructive` | Estado negativo (votação rejeitada, contradição) |
| `--ring` | Focus ring (aponta para `--primary`) |
| `--chart-1` … `--chart-5` | Paleta para Recharts (Sprint 4.3+ se entrar) |

Valores OKLCH e tabela de contraste WCAG ficam em `docs/design/DESIGN-TOKENS.md`
(atualizado no PR 2 da Sprint 4.0). Auditoria WCAG re-feita em
`docs/architecture/WCAG-AUDIT.md` no mesmo PR — qualquer par texto-sobre-fundo
abaixo de 4.5:1 (corpo) ou 3:1 (UI/large) é ajustado antes do merge, não
documentado como dívida.

### Utilitários portados do protótipo (CSS puro, sem JS)

Em `@layer utilities` no `globals.css`:

- `.glass` — superfície translúcida com blur (header, sheet)
- `.grid-bg` — fundo com grid sutil (hero da home)
- `.text-gradient` — gradiente em headings hero
- `.shadow-glow` — elevação com brilho de marca (CTA destacado)
- `.shadow-soft` — sombra suave (cards elevados)

Nenhum exige Framer Motion. Animações usam CSS `transition`/`@keyframes`
respeitando `@media (prefers-reduced-motion)` (já em produção desde Wave 1).

## Regra de import boundary

**`src/design-system/` é folha do grafo de dependências interno**:

- ✅ `design-system/primitives/*` PODE importar de:
  `design-system/tokens/*`, `lib/cn`, `lib/format`, libs externas (React,
  Radix, lucide-react).
- ✅ `design-system/compositions/*` PODE importar de:
  `design-system/primitives/*`, `design-system/tokens/*`, mesmas libs.
- ❌ `design-system/**` NÃO PODE importar de:
  `components/<contexto>/*`, `lib/queries/*`, `modules/*`, `shared/db/*`.
- ✅ `components/<contexto>/*` PODE importar de:
  `design-system/**`, `lib/queries/*`, `modules/*`.

A regra é enforced de duas maneiras:

1. **Biome `noRestrictedImports`** se a versão suportar regra contextual por
   path (validar no PR 2 da Sprint 4.0).
2. **Vitest test `src/design-system/__tests__/import-boundaries.test.ts`**
   que falha o suite se um arquivo de `design-system/**` importar dos paths
   proibidos. Cobre o gap até Biome ter regra contextual madura.

## Alternativas Consideradas

### A. Radix puro (sem shadcn)

- **Prós**: zero shadcn convention; controle total. Bundle similar (shadcn
  é só código + Radix peer dep).
- **Contras**: design system tem que ser escrito do zero. Variantes,
  composições, defaults razoáveis — tudo nosso. Custo de tempo alto na fase
  inicial. shadcn entrega ~70% pronto, calibrado, com boas defaults a11y.
- **Veredicto**: descartado. shadcn-curado entrega mesmo controle (já que
  copiamos), mais rápido.

### B. Headless UI (Tailwind Labs)

- **Prós**: também unstyled + a11y. Stack Tailwind-native.
- **Contras**: cobertura menor (sem Dialog moderno, sem Sonner, sem Combobox
  rico). shadcn ganhou tração maior em 2024-2025, comunidade maior, mais
  componentes Tier 2/3 prontos quando precisarmos.
- **Veredicto**: descartado por cobertura.

### C. Park UI (Ark UI debaixo)

- **Prós**: também copy-paste, tokens via Panda CSS.
- **Contras**: exige Panda CSS (outro paradigma de styling); nossa stack é
  Tailwind v4 puro. Migração de paradigma é fricção sem ganho proporcional.
- **Veredicto**: descartado por incompatibilidade com Tailwind v4 nativo.

### D. Código próprio 100%

- **Prós**: zero peer deps; controle total.
- **Contras**: Dialog acessível (focus trap, esc, scroll lock, aria) leva
  dias para escrever corretamente. Combobox/Listbox idem. Custo cívico real
  (trust_level, fontes oficiais, copy honesto) compete com custo de UI
  primitives. Em projeto solo, reinventar primitivas a11y é antieconômico.
- **Veredicto**: descartado para primitivas. Mantido para composições
  (StatsGrid, Hero, FilterBar) onde domínio + identidade falam alto.

### E. Material UI / Mantine / Chakra

- **Prós**: ecossistemas grandes, designs prontos.
- **Contras**: dependency-heavy (bundle 80-200kb gzip), opinião visual forte
  difícil de override, ergonomia oposta ao "tokens via CSS var + Tailwind".
- **Veredicto**: descartado por bundle e identidade.

## Consequências

### Positivas

- **Velocidade na Wave 4** sem sacrificar identidade visual nem a11y.
- **Tokens versionados** em CSS vars + TS — qualquer mudança de paleta vira
  PR único.
- **Boundary explícito** entre design system (sem domínio) e componentes de
  domínio (sabem de parlamentar, votação) — reusabilidade real.
- **Bundle controlável** por componente. Cada cópia é decisão consciente
  com bundle delta registrado no PR.
- **Princípio 14 documentado** explicitamente: bibliotecas de UI seguem
  critério leve (justificativa de PR), não o pesado do ADR-019 (3 condições
  concorrentes).

### Negativas

- **Manutenção manual**: quando shadcn atualizar um componente upstream,
  precisamos reaplicar a diff. Mitigação: cada cópia tem commit isolado;
  reaplicar é git-ergonomico. Em 1+ ano de uso real, shadcn alterou
  raramente componentes Tier 1 estáveis.
- **Curva de adaptação aos tokens**: cada cópia exige troca cuidadosa de
  `--primary` shadcn-default para o nosso. Mitigação: checklist no
  `src/design-system/README.md` (a criar no PR 2).
- **Peer deps Radix somam ~40kb gzip Tier 1**: aceitável dado que cada peer
  só carrega quando o consumer existe (tree-shake) e dado que a alternativa
  (escrever Dialog a11y do zero) custa dias.

### Neutras

- **CLAUDE.md** muda de "NÃO use shadcn/ui sem antes consultar" para
  "shadcn/ui curado autorizado conforme ADR-021". A regra original existia
  como guardrail até design system amadurecer — agora amadureceu.
- **shadcn como filosofia (copy-paste)** se alinha bem com nosso histórico
  de evitar deps com escopo amplo. Não é exceção ao princípio "preferimos
  código próprio a libs com escopo amplo" do CLAUDE.md — é a aplicação
  literal dele (código fica nosso após cópia).

## Referências

- [ADR-006 — Frontend stack (Next.js + componentes próprios mínimos)](006-frontend-stack.md)
- [ADR-018 — Cache no edge para queries do app](018-cache-edge-app.md)
- [ADR-019 — Disciplina arquitetural (sem gargalo empírico)](019-disciplina-arquitetural-sem-gargalo.md)
- [ADR-020 — Permanência do monolito TypeScript](020-permanencia-monolito-typescript.md)
- [DESIGN-TOKENS.md](../../design/DESIGN-TOKENS.md) — paleta atual (Variante 2 azul-marinho); atualizado com OKLCH dark no PR 2 da Sprint 4.0
- [WCAG-AUDIT.md](../WCAG-AUDIT.md) — auditoria de contraste; re-validada no PR 2 da Sprint 4.0
- [shadcn/ui — Documentation](https://ui.shadcn.com/)
- [Radix UI — Primitives](https://www.radix-ui.com/primitives)
- Protótipo de referência (read-only): `https://github.com/usernamette/vera-politica`
