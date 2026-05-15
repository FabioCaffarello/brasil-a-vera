# Design Tokens

> Brasil a Vera · Design · v0.1
> Última atualização: 2026-05-15 (Sprint 3.1 Tarefa 4.A)
> Status: **accepted** — cor primária = **Variante 2 (azul-marinho institucional)**.

---

## Princípios

1. **Refinement, não redesign**. Mantém estrutura visual atual; adiciona personalidade via cor primária e formaliza escalas. Sem refactor amplo de classes Tailwind nos componentes.
2. **Mudança mínima viável**. `zinc` permanece como neutro (95% das ocorrências hoje). Substituir seria refactor de centenas de classes em ~80 arquivos — fora do escopo de "tokens".
3. **Identidade brasileira atenuada**. A escolha de cor primária deve sugerir Brasil sem cair em saturação ou cafonice. Tons sóbrios, baixa saturação, alto contraste para WCAG.
4. **Acessibilidade preservada**. Todos os pares texto/fundo passam WCAG 2.1 AA (≥4.5:1 para texto normal, ≥3:1 para texto grande). Focus rings visíveis em qualquer cor primária escolhida.
5. **Tailwind v4 nativo**. Tokens via `@theme inline` em `globals.css`. Sem `tailwind.config.ts` (projeto está em v4).

---

## Paleta neutra (mantida)

`zinc` da Tailwind, escala completa 50–950. Sem alteração — 95% das ocorrências atuais usam esta escala. Justificativa do projeto: neutralidade puro com hint frio, melhor para texto longo do que `gray` (verdadeiramente neutro) ou `slate` (hint azul mais forte).

## Paleta semântica (mantida)

| Token | Função | Cor base |
|---|---|---|
| `emerald` (700/400 em dark) | Aprovado, alinhamento alto, voto SIM positivo | Tailwind `emerald-700` |
| `rose` (700/400 em dark) | Rejeitado, divergência, contradição | Tailwind `rose-700` |
| `amber` (700/400 em dark) | Warnings, disclaimers, amostra insuficiente | Tailwind `amber-700` |

Sem mudança. Sistema cromático para sinais semânticos é convencional e legível.

---

## Cor primária — **DECIDIDA: Variante 2 (azul-marinho institucional)**

> Decisão do operador em 2026-05-15. Razão: contraste mais alto (10.3:1), referência institucional brasileira (Congresso, Supremo), sem risco de colisão com paleta semântica (`emerald`/`amber`). Variantes 1 e 3 documentadas abaixo para histórico.

Paleta aplicada em `src/app/globals.css`:

```
--color-primary-50:  #f0f4f8
--color-primary-100: #d9e2ec
--color-primary-200: #bcccdc
--color-primary-300: #9fb3c8
--color-primary-400: #7390ad
--color-primary-500: #486581
--color-primary-600: #334e68   ← uso principal (texto / borda ativa)
--color-primary-700: #243b53   ← CTAs primárias (bg)
--color-primary-800: #1a2a3a
--color-primary-900: #102a43
--color-primary-950: #061a35
```

Contraste WCAG: `primary-700` (#243b53) sobre branco = **10.3:1** (AA + AAA). `primary-300` (#9fb3c8) sobre `zinc-950` (#09090b) = **8.7:1** (AA + AAA dark mode).

Aqui o produto adquire identidade. A cor primária aparece em:
- **Focus ring** (acessibilidade)
- **CTAs principais** (botões "Filtrar", "Explorar parlamentares", "Encontrar meus representantes")
- **Links em destaque** (header, navegação principal, cards CTA)
- **Bordas ativas/selecionadas** (filtros aplicados)

A cor primária **não substitui zinc** em texto regular nem em UIs de dados (tabelas, listas). É reservada a interação e identidade.

### Variante 1 — Verde-bandeira sóbrio (não escolhida)

```
--color-primary-50:  #f0f7f1
--color-primary-100: #d8ebda
--color-primary-200: #b5d8b9
--color-primary-300: #87bd8e
--color-primary-400: #5b9d64
--color-primary-500: #3d8048   ← uso principal
--color-primary-600: #2e6638
--color-primary-700: #275230
--color-primary-800: #224128
--color-primary-900: #1d3622
--color-primary-950: #0f1d12
```

Tom verde fosco, sem brilho. Contraste WCAG AA em `#275230` (primary-700) sobre branco: ~8.5:1. Em dark mode, `#87bd8e` (primary-300) sobre `#18181b` (zinc-950): ~8.1:1. **Identidade**: verde da bandeira atenuado para não competir com sinais semânticos (emerald).

Risco: similaridade com `emerald` pode confundir leitor casual. Mitigação: emerald é usado só com badge/contexto semântico explícito (status "aprovado"); primary é estrutura de interação.

### Variante 2 — Azul-marinho institucional (escolhida ✓)

```
--color-primary-50:  #f0f4f8
--color-primary-100: #d9e2ec
--color-primary-200: #bcccdc
--color-primary-300: #9fb3c8
--color-primary-400: #7390ad
--color-primary-500: #486581
--color-primary-600: #334e68   ← uso principal
--color-primary-700: #243b53
--color-primary-800: #1a2a3a
--color-primary-900: #102a43
--color-primary-950: #061a35
```

Azul-marinho próximo do institucional brasileiro (Congresso, Supremo). Mais neutro que verde-bandeira. Contraste `#243b53` sobre branco: ~10.3:1.

Risco: azul é convencional em UIs públicas — pouca diferenciação visual entre Brasil a Vera e outros sites .gov.

### Variante 3 — Âmbar-terra (não escolhida)

```
--color-primary-50:  #fdf8f0
--color-primary-100: #f7ecd1
--color-primary-200: #efd9a3
--color-primary-300: #e3be6c
--color-primary-400: #d09f3e
--color-primary-500: #a87929   ← uso principal
--color-primary-600: #875e1f
--color-primary-700: #6d4b1a
--color-primary-800: #573c17
--color-primary-900: #483115
--color-primary-950: #261805
```

Âmbar/ocre — referência ao amarelo da bandeira atenuado para tom terroso. Contraste `#6d4b1a` sobre branco: ~7.9:1.

Risco: pode colidir visualmente com `amber` semântico (warnings). Mitigação possível mas trabalhosa: amber semântico exigiria badge explícito ou cor levemente diferente (warning fica `yellow-700` em vez de `amber-700`).

---

## Tipografia

### Famílias (mantidas)

- `--font-sans: var(--font-geist-sans)` — Geist Sans, já configurado
- `--font-mono: var(--font-geist-mono)` — Geist Mono, já configurado

Sem adicionar fonte display web. Justificativas: zero impacto em LCP (sem FOUT/FOIT extra), Geist tem peso visual moderno suficiente, princípio mudança mínima.

### Escala (formalizar a já praticada)

Hoje o uso real concentra em `text-xs` (88) + `text-sm` (102), com saltos para `text-2xl/3xl` (8-10 cada). Há **gap em `text-base/lg/xl`** (4-1 ocorrências). A escala vai ser explicitada e usada de forma mais consistente.

| Token | Tamanho | Line-height | Uso |
|---|---|---|---|
| `text-xs` | 12px | 1.5 | Labels secundárias, captions, badges |
| `text-sm` | 14px | 1.5 | Texto auxiliar, hints, body em cards densos |
| `text-base` | 16px | 1.6 | **Body principal de prosa** (pouco usado hoje — usar mais em cards CTA, descrições) |
| `text-lg` | 18px | 1.5 | Subtítulos de seção dentro de card |
| `text-xl` | 20px | 1.4 | Títulos de cards CTA |
| `text-2xl` | 24px | 1.3 | H2 de páginas |
| `text-3xl` | 30px | 1.2 | H1 de páginas de listagem |
| `text-4xl` | 36px | 1.1 | H1 de hero (home) |

Ratio: 1.2× entre níveis adjacentes (modular, não 1.25 — escolha pragmática vs. valores arredondados em px).

### Pesos

- `font-normal` (400) — body, hints
- `font-medium` (500) — labels, badges, navegação
- `font-semibold` (600) — H1/H2, CTAs

Sem `font-bold` (700+) — escala consistente.

---

## Espaçamento

Base **4px** (já é o padrão Tailwind, formalizar). Tokens em uso hoje: `gap-2` (8px), `gap-3` (12px), `p-3` (12px), `p-4` (16px). Tokens recomendados:

| Token | Valor | Uso |
|---|---|---|
| `space-1` (4px) | inline icon + label |
| `space-2` (8px) | gap entre elementos pequenos relacionados |
| `space-3` (12px) | padding interno de cards densos |
| `space-4` (16px) | padding interno de cards normais |
| `space-6` (24px) | gap entre seções no body |
| `space-8` (32px) | gap entre seções principais da página |
| `space-12` (48px) | espaçamento entre hero e conteúdo |

---

## Borda e Radius

| Token | Valor | Uso |
|---|---|---|
| `rounded-md` | 6px | Inputs, badges (raro hoje, manter) |
| `rounded-lg` | 8px | Cards (uso dominante — 31×) |
| `rounded-xl` | 12px | Cards CTA destacados (novo — adicionar) |
| `rounded-full` | 9999px | Avatares (uso atual) |

Bordas: `border-zinc-200` (light) / `border-zinc-700` (dark) — uso atual mantido.

---

## Sombras

Hoje `shadow-sm` (4×) e `shadow-md/lg` (1× cada). Refinement: usar sombra para **elevar cards CTA** apenas (não sobrecarregar com elevação universal).

| Token | Uso |
|---|---|
| (nenhuma sombra) | Cards de listagem, badges, controles de formulário |
| `shadow-sm` | Bordas sutis em hover de cards interativos |
| `shadow-md` | Cards CTA da home (hero) — único nível de elevação destacada |

---

## Estados de interação

| Estado | Tratamento |
|---|---|
| `hover` | Mudança de cor de fundo/borda em ~5-10% mais escuro, transição 150ms |
| `focus-visible` | Ring 2px `primary-500` com offset 2px — sempre visível em navegação por teclado |
| `active` | Cor ligeiramente mais escura que hover |
| `disabled` | Opacity 0.5, cursor `not-allowed`, sem hover effect |

Implementação via Tailwind: `hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2`.

---

## Próximos passos

- [x] Operador escolheu Variante 2 (2026-05-15)
- [ ] Aplicar tokens via `@theme inline` em `src/app/globals.css`
- [ ] Componentes consumem os tokens nas Tarefas 3 (hierarquia perfil) e 4.B (microinterações)

**Sem mudança em componentes nesta fase** — só os tokens. Refactor visual aplicado nas Tarefas seguintes consome esses tokens.
