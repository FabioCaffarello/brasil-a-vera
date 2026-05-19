# Refator do Painel — RFC: multi-rota → tabs únicas via Parallel Routes

> Brasil à Vera · Produto · v1.0
> Última atualização: 2026-05-19
> Status: aprovado (Fase 1 do plano)
> ADR derivado: [ADR-032](../architecture/ADR/032-painel-tabs-parallel-routes.md)

---

## 1. Contexto e motivação

A Wave 10 foi entregue conforme planejado no [LOGGED-AREA-VISION.md §4](./LOGGED-AREA-VISION.md): área autenticada estruturada em 5 rotas (`/painel`, `/painel/parlamentares`, `/painel/alertas`, `/painel/configuracoes`, `/painel/configuracoes/meus-dados`). Cada rota é uma RSC `dynamic` própria, com queries isoladas e `metadata` estática. O resultado funciona; foi auditado no release `v0.10.0-area-logada`.

Após revisão de produto pós-entrega, decidiu-se **migrar para rota única `/painel` com tabs reais via Parallel Routes** (`@slot/`). A motivação **não é técnica** — é UX: as 4–5 áreas do painel são pilares paralelos da experiência de usuário logado, não níveis hierárquicos. Multi-rota tradicional carrega o custo cognitivo de "navegar entre páginas" quando o usuário deveria perceber "trocar de pilar dentro do mesmo lugar".

A decisão tem três efeitos derivados aceitos:
- **Reversão parcial da arquitetura aprovada** no VISION §4 (ganha addendum apontando para ADR-032 na Fase 4).
- **Promoção de "Meus dados"** de sub-rota (`/painel/configuracoes/meus-dados`) a tab principal (`/painel?tab=meus-dados`), refletindo o princípio "privacidade é feature" do VISION §1.
- **Custo técnico assumido**: ~3 sprints de refactor sobre código estável, com 5× mais queries server-side por request (mitigado por `cached()` do ADR-018).

Esta decisão é consciente do dono do produto. Não é correção de bug — é priorização de UX visual sobre simplicidade arquitetural. Tradeoffs estão registrados em §4 e §7 deste RFC e em ADR-032.

---

## 2. Estado atual (antes do refator)

5 rotas implementadas na Wave 10 (Etapas 3, 4, 5, 6, 9.5):

- `/painel` — Resumo com 4 estados dinâmicos (onboarding-wizard/novo/onboarding/maduro)
- `/painel/parlamentares` — sub-tabs Acompanhando | Da minha UF (`?tab=`)
- `/painel/alertas` — sub-tabs Recebidos | Políticas (`?tab=`)
- `/painel/configuracoes` — Perfil + Temas + Comunicação + links
- `/painel/configuracoes/meus-dados` — Dashboard LGPD (3 blocos)

| Rota | Arquivo | Linhas |
|---|---|---|
| `/painel` | `src/app/(authenticated)/painel/page.tsx` | 85 |
| `/painel/parlamentares` | `src/app/(authenticated)/painel/parlamentares/page.tsx` | 129 |
| `/painel/alertas` | `src/app/(authenticated)/painel/alertas/page.tsx` | 86 |
| `/painel/configuracoes` | `src/app/(authenticated)/painel/configuracoes/page.tsx` | 118 |
| `/painel/configuracoes/meus-dados` | `src/app/(authenticated)/painel/configuracoes/meus-dados/page.tsx` | 205 |
| **Total pages** | | **623** |
| Route group layout | `src/app/(authenticated)/layout.tsx` (preservado) | 42 |

Componentes `<SubTabs>` específicos (a reescrever — §6):
- `src/components/painel/parlamentares/sub-tabs.tsx` (60 linhas) — emite `?tab=acompanhando|da-minha-uf`
- `src/components/painel/alertas/sub-tabs.tsx` (60 linhas) — emite `?tab=recebidos|politicas`

APIs (NÃO tocadas pelo refator — 11 routes em `/api/painel/*`).

---

## 3. Estado desejado (depois do refator)

Estrutura final usando Parallel Routes (`@slot/`):

```
src/app/(authenticated)/painel/
├── layout.tsx              ← TabBar + composição dos 5 slots; passa cada slot
│                              como prop para <ActiveSlotPicker /> (client)
├── page.tsx                ← entry-point neutro (só wrapper de slots; sem queries)
├── @resumo/
│   ├── default.tsx         ← fallback exigido pelo Next.js
│   └── page.tsx            ← conteúdo do Resumo (queries próprias)
├── @parlamentares/
│   ├── default.tsx
│   └── page.tsx            ← conteúdo dos Parlamentares (lê ?subtab= via cookie/util)
├── @alertas/
│   ├── default.tsx
│   └── page.tsx            ← conteúdo dos Alertas
├── @configuracoes/
│   ├── default.tsx
│   └── page.tsx            ← conteúdo das Configurações
└── @meusDados/
    ├── default.tsx
    └── page.tsx            ← conteúdo do Dashboard LGPD (promovido)
```

**Papel de `default.tsx`**: Next.js exige um `default.tsx` em cada slot. Renderiza quando o slot não tem match com a URL atual (caso raro com query params, mas obrigatório pelo framework — usar `null` como conteúdo é aceitável).

**Fluxo de render** (Pattern A — confirmado em Q1):
1. Cliente acessa `/painel?tab=parlamentares&subtab=da-minha-uf`
2. Next.js dispara RSC paralelo dos **5 slots simultaneamente** (`@resumo/page.tsx`, `@parlamentares/page.tsx`, etc.) — cada um faz suas queries no Neon
3. Layout recebe 5 slot props + monta `<TabBar />` + `<ActiveSlotPicker slots={...} />`
4. `<ActiveSlotPicker />` (client component) lê `useSearchParams().get('tab')` e renderiza só o slot correspondente
5. Slots não selecionados foram fetchados mas não montam na DOM final — mitigação via `cached()` (ADR-018) com TTL por slot

`?subtab=` é lido **dentro do slot** via util de validação `src/lib/painel-tabs.ts` (§8). Sub-tab logic permanece local ao slot (`@parlamentares` decide entre acompanhando/da-minha-uf; `@alertas` decide entre recebidos/politicas).

---

## 4. Decisões técnicas com fundamentação

| # | Decisão | Alternativa rejeitada | Por quê |
|---|---|---|---|
| D1 | **Parallel Routes** (`@slot/`) | Query param puro com swap server-side em single page.tsx | Perde split de código por slot + RSC streaming concorrente; cliente nunca enxerga o código de tabs não visitadas |
| D1 | Parallel Routes | Tabs client-side com `useState` | Perde RSC totalmente; SSR não emite conteúdo de nenhuma tab; SEO/LCP pioram; viola CLAUDE.md "RSC default" |
| D2 | **5 tabs principais** (Resumo, Parlamentares, Alertas, Configurações, Meus Dados) | Manter 4 + Meus Dados como sub-rota | Privacidade é pilar (VISION §1 #2). Sub-rota escondia LGPD num link de footer de Configurações |
| D3 | **Sub-tabs via `?subtab=`** | Sub-tabs como Parallel Routes aninhados | Aninhar `@subtab/` dentro de `@tab/` complica default.tsx, exige 2 níveis de switch client. Query param é suficiente — sub-tab é estado leve dentro do slot |
| D4 | **Zero retrocompatibilidade** (sem redirects de URLs antigas) | 301/308 das URLs antigas → novas | Produto pré-lançamento, sem links externos, sem SEO. Redirects custam código + middleware + manutenção. URLs `/painel/parlamentares`, `/painel/alertas`, `/painel/configuracoes/meus-dados`, `/painel/configuracoes` deixam de existir |
| D5 | **`generateMetadata` dinâmica** baseada em `?tab=` | `metadata` estática no layout | Layout em Next.js não acessa `searchParams`; `metadata` por slot não compõe (cada slot teria seu próprio título quando deveria haver um só). `generateMetadata` em `page.tsx` raiz lê `searchParams.tab` e produz `<title>` dinâmico |
| D6 | **Validação de tab/subtab em util** (`src/lib/painel-tabs.ts`) | Validação inline em cada slot | Inline duplica `if (tab === 'X' \|\| tab === 'Y')` em 6+ lugares. Util exporta `parseTab(value): TabKey` e `parseSubtab(tab, value): SubtabKey \| null` com defaults + ignorância silenciosa (§8) |
| D7 | **Util em flat `src/lib/painel-tabs.ts`** | `src/lib/painel/tabs.ts` (novo dir) | Convenção do repo: `admin-auth.ts`, `auth-guards.ts` são flat. Dirs em `src/lib/` aparecem quando há ≥2 arquivos coesos (`queries/`, `lgpd-cron/`). Promover a dir se segundo arquivo emergir |
| D8 | **Slot folder `@meusDados/`** (camelCase) | `@meus-dados/` (kebab) | Prop em JSX fica ergonômica (`meusDados`). Slug URL `?tab=meus-dados` (kebab, padrão URL) mapeado no util do D6 |
| D9 | **Aceitar 5× queries server-side por request** (mitigado por `cached()`) | Single page.tsx com swap manual; ou dynamic segment `[tab]/page.tsx` | Single page.tsx foi rejeitada em D1 (perde split + streaming). Dynamic segment troca o pattern Parallel Routes (rejeitada na decisão de produto §1). `cached()` ADR-018 + TTL adequado por slot reduz o custo no caminho quente |

**Custo de D9 detalhado**: cada request `/painel` dispara queries de 5 slots em paralelo. Ex.: ~10–15 queries Drizzle/request × N navegações dentro do painel. Sem cache, ~3–5× o custo do estado atual. Com `cached()` por slot (TTL 60s para Resumo, 1h para Da minha UF, 0s para inboxes mutáveis), a maioria das navegações reaproveita. **Risco trackeado em §7**.

---

## 5. Plano de execução em 4 fases

| Fase | Conteúdo | Critério de done |
|---|---|---|
| **1 (esta)** | RFC + ADR-032 publicados em `docs/` | Ambos os documentos aprovados pelo owner; PR único `wave-10/refactor-painel-fase-1-rfc-adr` mergeado |
| **2** | Refator estrutural (PR 2). Mover páginas para slots, criar `layout.tsx` com TabBar, escrever `src/lib/painel-tabs.ts`, reescrever 2 `<SubTabs>`, atualizar 6 links internos, atualizar 1 teste com URL hard-coded, criar `<ActiveSlotPicker />` client. **Sem polimento visual.** | `npm run build` + `npx vitest run` + `npm run check` verdes; deploy preview Cloudflare OK; smoke manual das 5 tabs + sub-tabs funcionais; bundle não cresce >30% vs baseline |
| **3** | Polimento visual (PR 3). Header "SUA ÁREA · Nome · Email", TabBar com ícones e contadores (follows count, deliveries unread, etc.), KPIs do Resumo no padrão visual aprovado pelo owner | Revisão visual aprovada pelo owner; lighthouse mobile/desktop sem regressão; acessibilidade preservada (tab por teclado, aria-*) |
| **4** | Atualização documental (PR 4). VISION §4 ganha addendum apontando para ADR-032; ROADMAP ganha entrada de "Refator Painel pós-Wave 10"; CLAUDE.md/README atualizados se mencionarem URLs antigas; `LGPD-ERASE-MENORES.md` atualizado; `CLERK-SETUP.md` revisado | Nenhuma URL antiga (`/painel/parlamentares`, `/painel/alertas`, `/painel/configuracoes`, `/painel/configuracoes/meus-dados`, `/painel/meus-dados`) presente em docs ativas (excluído `releases/v0.10.0-area-logada.md` que é histórico) |

---

## 6. Inventário de mudanças (Fase 2)

### Páginas movidas (5 arquivos → slots)

| Origem | Destino |
|---|---|
| `src/app/(authenticated)/painel/page.tsx` | `src/app/(authenticated)/painel/@resumo/page.tsx` |
| `src/app/(authenticated)/painel/parlamentares/page.tsx` | `src/app/(authenticated)/painel/@parlamentares/page.tsx` |
| `src/app/(authenticated)/painel/alertas/page.tsx` | `src/app/(authenticated)/painel/@alertas/page.tsx` |
| `src/app/(authenticated)/painel/configuracoes/page.tsx` | `src/app/(authenticated)/painel/@configuracoes/page.tsx` |
| `src/app/(authenticated)/painel/configuracoes/meus-dados/page.tsx` | `src/app/(authenticated)/painel/@meusDados/page.tsx` |

5× `default.tsx` (1 por slot) renderizando `null` — fallback exigido pelo Next.js.

Layout novo: `src/app/(authenticated)/painel/layout.tsx` recebendo 5 slot props + renderizando TabBar (client) + `<ActiveSlotPicker />`.

Page raiz: `src/app/(authenticated)/painel/page.tsx` reescrita como entry-point neutro (wrapper).

### Componentes (3 reescritos / criados)

- `src/components/painel/parlamentares/sub-tabs.tsx` — emite `?tab=parlamentares&subtab=acompanhando|da-minha-uf`
- `src/components/painel/alertas/sub-tabs.tsx` — emite `?tab=alertas&subtab=recebidos|politicas`
- `src/components/painel/active-slot-picker.tsx` (**novo**) — client component que consome `useSearchParams()` e renderiza só o slot ativo
- `src/components/painel/tab-bar.tsx` (**novo**) — client component com 5 links para `/painel?tab=...` + active state via `useSearchParams`

### Util (1 criado)

- `src/lib/painel-tabs.ts` (**novo**) — exporta `parseTab`, `parseSubtab`, type `TabKey` e `SubtabKey`, e a tabela de defaults

### Links internos (6 hits)

| Arquivo | Linha | De | Para |
|---|---|---|---|
| `src/app/(authenticated)/painel/@configuracoes/page.tsx` (movida de `configuracoes/page.tsx`) | 98 | `/painel/configuracoes/meus-dados` | `/painel?tab=meus-dados` |
| `src/app/(authenticated)/painel/@meusDados/page.tsx` (movida) | 84 | `/painel/configuracoes` | `/painel?tab=configuracoes` |
| `src/app/privacidade/page.tsx` | 249 + 251 | `/painel/meus-dados` (404 hoje) | `/painel?tab=meus-dados` |
| `src/components/painel/estado-novo.tsx` | 68 | `/painel/configuracoes` | `/painel?tab=configuracoes` |
| `src/app/api/painel/onboarding/route.ts` | 97-98 | `/painel/parlamentares?tab=da-minha-uf` (ou `?tab=acompanhando`) | `/painel?tab=parlamentares&subtab=da-minha-uf` (ou `&subtab=acompanhando`) |

### Testes (1 com URL hard-coded)

- `src/components/painel/onboarding-wizard.test.tsx` — linhas 32 + 132 (`/painel/parlamentares?tab=da-minha-uf` → `/painel?tab=parlamentares&subtab=da-minha-uf`)

Outros 14 testes em `src/components/painel/*` testam componentes em isolamento e **não dependem da topologia de rotas** — sem mudança.

### Documentação (Fase 4)

8 arquivos:

- `docs/product/LOGGED-AREA-VISION.md` (§4, §5, §11, §12 — addendum)
- `docs/product/ROADMAP.md` (Wave 10 closure — entrada de refactor)
- `docs/architecture/ADR/022-clerk-para-autenticacao.md` (addendum)
- `docs/architecture/ADR/029-modelo-dados-area-logada-e-topologia-auth.md` (addendum)
- `docs/architecture/ADR/030-sistema-alertas-e-resend.md` (1 referência cosmética)
- `docs/architecture/ADR/031-framework-lgpd-area-logada.md` (3 hits)
- `docs/contributing/CLERK-SETUP.md` (9 hits — URLs after-sign-in continuam `/painel`)
- `docs/contributing/LGPD-ERASE-MENORES.md` (3 hits)
- `README.md` (1 hit cosmético — `area /painel/*` segue válido como descrição)

**NÃO alterar**: `docs/releases/v0.10.0-area-logada.md` (histórico do release).

---

## 7. Riscos e mitigações

| # | Risco | Prob | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | **5× queries por request `/painel`** (D9) | Alta (sistêmico) | Custo Neon + latência | `cached()` ADR-018 por slot. TTLs propostos: Resumo 60s; Parlamentares (Da minha UF) 1h; Alertas (Recebidos) 0s (inbox); Alertas (Políticas) 0s (form); Configurações 0s (form); Meus Dados 0s (LGPD exige tempo real). Aceitar custo do Resumo + Parlamentares; demais querem inativos quase-zero pela natureza form-only. Pós-deploy: medir tempo médio de `/painel` no Plausible/observability e comparar baseline |
| R2 | **Regressão do OnboardingWizard** | Alta | Bloqueia novo usuário | Smoke manual obrigatório no PR Fase 2 — abrir `/painel` com `onboarded_at IS NULL` em ambiente preview. OnboardingWizard fica em `@resumo/page.tsx` (mesma posição estrutural) |
| R3 | **Bundle do painel inteiro** > 30% maior | Média | LCP do path logado | Comparar bundle pré/pós com `next build` output. Se >30%, avaliar `dynamic(() => import())` por slot com `ssr: true` (split-point sem perder RSC). Decisão pós-deploy |
| R4 | **Quebra de testes existentes** | Alta | CI vermelho | Listar e revisar todos os 15 testes em `src/components/painel/*` antes do PR Fase 2. Apenas 1 (`onboarding-wizard.test.tsx`) tem URL hard-coded — atualizar. Demais testam componentes isolados; sem mudança esperada |
| R5 | **`?subtab=` inválido em tab sem sub-tabs** | Média | UX inconsistente | Util `parseSubtab(tab, value)` em `src/lib/painel-tabs.ts` retorna `null` quando tab não tem sub-tabs OU subtab é inválida. Slot ignora valor `null` silenciosamente. Teste unitário cobre matriz §8 |
| R6 | **SEO `<title>` perdido** | Baixa (pré-lançamento) | — | `generateMetadata({ searchParams })` em `/painel/page.tsx` produz `<title>` dinâmico baseado em `?tab=`. Cada tab tem título próprio (ex.: "Painel — Brasil à Vera", "Parlamentares — Painel", "Meus dados — Painel") |
| R7 | **TabBar/ActiveSlotPicker como pontos de falha client** | Média | Tabs não funcionam se JS falha | TabBar com `<Link href="/painel?tab=...">` é SSR-friendly (links HTML); JS adiciona prefetch e active state visual. ActiveSlotPicker é client mas slots já vieram do servidor renderizados — JS desligado mostra todos os 5 stackados (degradação graciosa, não 500) |
| R8 | **Navbar Hotfix 10.3 ("Painel" link)** | Baixa | Active state da nav | `isNavLinkActive('/painel', '/painel')` continua `true`. Hotfix 10.3 não muda — apenas o pathname `/painel` é o único da área |

---

## 8. Comportamento de sub-tabs (especificação)

| Tab principal | Sub-tabs válidas | Default | Notas |
|---|---|---|---|
| `resumo` | — | — | Tab sem sub-tabs; estado interno (4 estados) decidido por dados no slot |
| `parlamentares` | `acompanhando`, `da-minha-uf` | Dinâmico: sem UF → `acompanhando`; com UF + 0 follows → `da-minha-uf`; demais → `acompanhando` | Preserva lógica do `defaultTab()` atual em `parlamentares/page.tsx` |
| `alertas` | `recebidos`, `politicas` | `politicas` (até Etapa 7 do release) | Preserva default atual |
| `configuracoes` | — | — | Form vertical sem sub-divisão |
| `meus-dados` | — | — | Promovida a tab principal; dashboard único em 3 blocos |

### Comportamento de inputs inválidos

| Input | Resultado | Implementação |
|---|---|---|
| `?tab=xpto` | Renderizar `resumo` (default) | `parseTab(value)` retorna `'resumo'` quando value não bate com 5 keys |
| `?tab=resumo&subtab=qualquer-coisa` | Ignorar `subtab`; renderizar `resumo` | `parseSubtab('resumo', value)` retorna `null` sempre |
| `?tab=alertas&subtab=xpto` | Renderizar `alertas` com sub-tab default (`politicas`) | `parseSubtab('alertas', 'xpto')` retorna `null`; slot aplica default |
| `?subtab=politicas` (sem `?tab=`) | Renderizar `resumo` (default da tab), `subtab` ignorada | `parseTab()` default + `parseSubtab('resumo', value)` = null |
| `?tab=resumo&subtab=xpto&subtab=yzt` (múltiplos) | Next.js entrega array; pegar `[0]` ou ignorar (validador trata como inválido) | `parseSubtab` rejeita não-string |

**Util centralizado** (`src/lib/painel-tabs.ts`):

```ts
export type TabKey = 'resumo' | 'parlamentares' | 'alertas' | 'configuracoes' | 'meus-dados'
export type ParlamentaresSubtab = 'acompanhando' | 'da-minha-uf'
export type AlertasSubtab = 'recebidos' | 'politicas'

export function parseTab(value: string | string[] | undefined): TabKey { ... }
export function parseSubtab(tab: TabKey, value: string | string[] | undefined): string | null { ... }
```

Teste unitário cobre a matriz de inputs inválidos acima (~6 casos).

---

## 9. Compatibilidade com features existentes

Cada item: preservado idêntico salvo flag explícita.

| # | Feature | Status no refactor |
|---|---|---|
| F1 | **OnboardingWizard** (modal full-screen no primeiro `/painel` quando `onboarded_at IS NULL`) | **Preservado idêntico.** Permanece em `@resumo/page.tsx`. Smoke manual obrigatório (R2) |
| F2 | **ConsentGate** (RSC server-side no `(authenticated)/layout.tsx`) | **Preservado idêntico.** `(authenticated)/layout.tsx` (42 linhas) **não tocado** |
| F3 | **MigracaoLocalStorageModal** (defensivo) | **Preservado idêntico.** Reside em `(authenticated)/layout.tsx`, não tocado |
| F4 | **4 estados dinâmicos do Resumo** (onboarding-wizard/novo/onboarding/maduro) | **Preservado idêntico.** Lógica movida sem alteração para `@resumo/page.tsx` |
| F5 | **Banner de mudança de UF** em Parlamentares | **Preservado idêntico.** Movido para `@parlamentares/page.tsx` |
| F6 | **Modal de revisão em lote de UF anterior** (`<RevisarAcompanhadosUFAntiga />`) | **Preservado idêntico.** Componente em `src/components/painel/parlamentares/` não tocado |
| F7 | **Sub-tab `recebidos`** de Alertas (inbox) | **Preservado.** Acessível via `?tab=alertas&subtab=recebidos` |
| F8 | **Sub-tab `politicas`** de Alertas (form) | **Preservado.** Default, acessível via `?tab=alertas` ou `?tab=alertas&subtab=politicas` |
| F9 | **Dashboard LGPD** (`meus-dados`) com 3 ações (exportar/anonimizar/eliminar) | **Preservado idêntico, agora em tab principal.** Movido para `@meusDados/page.tsx`. `<AcoesLgpd />` e queries (`listDataRequestsByUser`, etc.) não tocados. **Mudança incidental**: link broken `/painel/meus-dados` em `privacidade/page.tsx` passa a funcionar |

APIs (`/api/painel/*`) preservadas 100% — body de request, response shape, paths.

---

## 10. Critérios de aceitação (Fase 2)

Lista verificável que o owner cobrirá manualmente + automação CI:

- [ ] Acessar `/painel` (sem query) renderiza Resumo (tab default)
- [ ] Acessar `/painel?tab=resumo` renderiza Resumo
- [ ] Acessar `/painel?tab=parlamentares` renderiza Parlamentares com sub-tab default (dinâmica: UF/follows)
- [ ] Acessar `/painel?tab=parlamentares&subtab=acompanhando` renderiza Parlamentares > Acompanhando
- [ ] Acessar `/painel?tab=parlamentares&subtab=da-minha-uf` renderiza Parlamentares > Da minha UF (form inline se UF vazia)
- [ ] Acessar `/painel?tab=alertas` renderiza Alertas > Políticas (default)
- [ ] Acessar `/painel?tab=alertas&subtab=recebidos` renderiza Alertas > Recebidos
- [ ] Acessar `/painel?tab=alertas&subtab=politicas` renderiza Alertas > Políticas
- [ ] Acessar `/painel?tab=configuracoes` renderiza Configurações
- [ ] Acessar `/painel?tab=meus-dados` renderiza Dashboard LGPD
- [ ] Acessar `/painel?tab=xpto` renderiza Resumo (default; ignora `tab` inválida)
- [ ] Acessar `/painel?tab=resumo&subtab=qualquer-coisa` renderiza Resumo (ignora `subtab`)
- [ ] Acessar `/painel?tab=alertas&subtab=xpto` renderiza Alertas > Políticas (default da tab)
- [ ] Acessar `/painel/alertas` retorna **404** (rota antiga removida)
- [ ] Acessar `/painel/parlamentares` retorna **404**
- [ ] Acessar `/painel/configuracoes` retorna **404**
- [ ] Acessar `/painel/configuracoes/meus-dados` retorna **404**
- [ ] OnboardingWizard ainda dispara em primeiro acesso (`onboarded_at IS NULL`)
- [ ] ConsentGate ainda intercepta usuário sem consent renovado
- [ ] Modal LocalStorage ainda dispara quando chave detectada
- [ ] Botão "Acompanhar" no card de parlamentar continua funcionando (`/api/painel/follows`)
- [ ] Form de Políticas salva via `/api/painel/alertas/policy`
- [ ] Form de Perfil salva via `/api/painel/profile`
- [ ] 3 ações LGPD continuam funcionando (`/api/painel/dados/*`)
- [ ] Link "Painel" na navbar (Hotfix 10.3) tem `aria-current="page"` em qualquer URL `/painel?tab=...`
- [ ] `<title>` da página muda conforme tab (`generateMetadata` dinâmica)
- [ ] `npm run check` (Biome) verde
- [ ] `npx vitest run` verde (atualizado o 1 teste com URL hard-coded)
- [ ] `npm run build` verde
- [ ] `npx tsc --noEmit` sem erros novos
- [ ] Bundle não cresce >30% vs baseline (medir antes/depois)
- [ ] Deploy preview Cloudflare OK (manual smoke nas 5 tabs)

---

## 11. Fora de escopo

Repetindo o spec da decisão para fixar referência:

- **APIs `/api/painel/*`** (11 routes) — body, response, paths preservados; nem código nem testes tocados
- **Schema do banco** (`usuario.*`, `parlamentares.*`, etc.) — nenhuma migration
- **Auth** (Clerk, middleware, `auth.protect()`, `ClerkProvider`) — não tocado
- **OnboardingWizard, ConsentGate, MigracaoLocalStorageModal** — comportamento idêntico
- **Conteúdo de cada tab** (queries internas, componentes `<EstadoNovo>`/`<EstadoMaduro>`/`<FormPoliticas>`/etc.) — não tocado; só o **wrapping em slot** muda
- **Polimento visual** (header novo, tab bar com ícones/contadores, KPIs reskinned) — Fase 3, **não** Fase 2
- **Documentação** (VISION/ADR-022/ADR-029/CLERK-SETUP/README) — Fase 4, **não** Fase 2

---

## 12. Anti-patterns a evitar nesta refator

| # | Anti-pattern | Por quê |
|---|---|---|
| AP1 | **React state para tab ativa** | URL state é fonte da verdade (refresh, share link, back/forward). `useState` quebra deep-link + back button |
| AP2 | **`useSearchParams()` em RSC** | É hook client; tentar usar em RSC dá erro de build. RSC recebe `searchParams` como prop |
| AP3 | **Queries no layout** | Layout é compartilhado entre slots; queries lá viram dependência cruzada. Cada slot tem suas queries em `@slot/page.tsx` |
| AP4 | **Componente `<Tabs>` genérico reutilizável** | O painel tem UMA TabBar específica. Generificar agora cria abstração sem demanda (ADR-019). Reabrir só quando segundo consumidor aparecer |
| AP5 | **Tocar estilos/visual nesta fase** | Fase 3 é polimento. Mantém PR Fase 2 reviewable (só topologia, sem ruído visual) |
| AP6 | **Nova dependência** | Refator é exclusivamente Next.js nativo (Parallel Routes) + util próprio. Nenhuma lib de tabs/router/state |
| AP7 | **Esconder slot inativo via CSS (`display:none`)** sem `<ActiveSlotPicker />` | Tira do DOM = fora do tab order, sem render desnecessário. CSS hide só remove visual; React continua montando = waste de bundle/DOM. ActiveSlotPicker condicionalmente retorna `null` para slots inativos |
| AP8 | **`metadata` estática em cada slot** | Slots compõem; cada um teria seu `<title>`. Resultado: HTML com 5 `<title>` indeterminados. Single `generateMetadata` no `page.tsx` raiz é o padrão correto |
| AP9 | **Manter URLs antigas como redirects** | Decisão §1 #4 do spec: zero retrocompatibilidade. Redirects custam middleware code + manutenção mental ("isso ainda existe?") sem benefício |
