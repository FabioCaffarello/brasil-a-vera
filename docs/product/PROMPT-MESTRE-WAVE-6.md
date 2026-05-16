# Prompt mestre — Wave 6: Frontend de Excelência (autônoma, owner-only)

> Brasil a Vera · Wave 6 · v0.1
> Última atualização: 2026-05-16 (abertura da Sprint 6.0)
> Status: accepted
> Contrato vigente da Wave 6. Releia §0, §1, §5 e §6 a cada início de Sprint.

> Para: Claude Code, agente autônomo do Brasil a Vera
> Contexto: Wave 5 fechada em `v0.5.0-claude-ecosystem` (2026-05-16). Designer parceiro continuou evoluindo `usernamette/vera-politica` em paralelo. Wave 6 absorve a evolução em código de produto.
> Tipo: Plan mode obrigatório no início de cada Sprint. **Execução autônoma autorizada dentro da Sprint** uma vez aprovado o plano.
> Operador: **Owner em role `engineer`**. Felipe entra apenas na Wave 7+ quando shell estiver maduro pra consumo designer-friendly.
> Pré-leitura: `CLAUDE.md`, ADR-018, ADR-019, ADR-021, ADR-022, `docs/releases/v0.5.0-claude-ecosystem.md`, `.claude/docs/ROLES.md`

---

## 0. Resumo executivo

A Wave 4 entregou a fundação do design system. A Wave 5 entregou a infraestrutura de colaboração. **A Wave 6 é a primeira em que ambas as fundações se encontram em código de produto visível ao cidadão**, portando a linguagem visual madura do designer parceiro para a nossa stack RSC + tokens próprios + queries server-side.

**Modo operacional desta wave (autorizado pelo owner em 2026-05-16):**

- Toda a Wave 6 é tocada pelo owner em role `engineer`.
- Claude Code tem **autorização para abrir E mergear PRs sem checkpoint humano explícito**, condicionado às barreiras técnicas detalhadas em §6.
- Felipe NÃO opera nesta wave. Refinamento do `ONBOARDING-DESIGNER.md` baseado em Wave 6 fica para abertura de Wave 7+.
- A regra "humano revisa antes do merge" instalada na Wave 5 é **deliberadamente flexibilizada** para esta wave específica e visual. Registro leve em `CLAUDE.md` (seção operacional, sem ADR). Métrica honesta no release v0.6.0.

**O que vamos fazer**: portar a linguagem visual madura do designer (`vera-politica`) para o nosso código. Sem regredir performance, a11y, trust pyramid ou AuthSlot RSC.

**O que NÃO vamos fazer**: copiar código Lovable (continua produzindo padrões juniors), adotar TanStack Start, react-query no cliente, ou as 24 peers Radix instaladas no protótipo.

**Decisões já fechadas pelo owner (2026-05-16)** — não revisitar:

| # | Decisão | Valor |
|---|---|---|
| D1 | Estratégia de animação | CSS animation + `@starting-style` default. Framer-motion bloqueado salvo critérios do ADR-023 |
| D2 | `/analise` rota | **Fora** da Wave 6. Adiar para Wave 5+/6.7 open ground. Stats agregados ficam como widget na home se aparecer demanda |
| D3 | `/metodologia` vs `/docs/*` | **Híbrido**. `/metodologia` vira hub com TOC sticky + prose. Sub-rotas `/docs/{glossario,fontes,como-ler-um-perfil,piramide-de-confianca}` permanecem com 301 redirect para anchors `/metodologia#secao`. SEO preservado |
| D4 | PartyBadge cores | Const hardcoded em `design-system/compositions/party-badge.tsx`. Tabela DB só se dor real aparecer |
| D5 | Subagent novo | **Sim, criar `frontend-skin-helper`** na Sprint 6.0 PR 8. **Standalone**, não descendente do `design-system-curator` (escopos divergem: curator não toca página, skin-helper sim) |
| D6 | SectionNav mobile | Sticky bar reduzida (icon + label curto, scroll horizontal interno). Tabs implicariam swipe conflitando com scroll vertical |
| D7 | Lighthouse #114 | Sprint 6.6 dedicada. Não paralelizar — reskin muda LCP, medição empírica vale após último PR visual |
| D8 | Auto-merge | **Autorizado para Claude Code em role engineer**, condicionado às barreiras técnicas de §6. Cada PR auto-merged recebe label `auto-merged-wave-6` para auditoria. Métrica vai no release v0.6.0 |
| D9 | ADR-023 modelo | **ADR de critério**, não de decisão fechada. Define quando framer-motion (ou similar) pode entrar; não amarra o futuro |
| D10 | WCAG fallback | Claude Code **autossuficiente** para recalibrar tokens ad-hoc se reprovarem AA. Não para nem pergunta. Decisão registrada no próprio PR via output literal do `wcag-check.ts` antes/depois |
| D11 | Plugins Claude Code | Os 4 plugins instalados (`frontend-design`, `interface-design`, `skill-creator`, `neon`) são **consultivos**. `frontend-design` plugin gera UI mas Wave 6 usa apenas como referência — código continua produzido pelo Claude Code agente operador, não pela skill geradora |

---

## 1. Princípios que orientam esta wave

### 1.1 Autossuficiência ≠ atalho

Auto-merge autorizado **não muda os critérios**, muda **quem clica o botão**. O Claude Code continua obrigado a:

- Anexar screenshot antes/depois em **todo** PR visual.
- Anexar bundle delta (`npm run build` antes/depois) em PR que tocar `package.json` ou adicionar import client.
- Anexar Lighthouse delta em PR de Sprint 6.6 (fechamento #114).
- Validar `cf:build` se mudança afetar runtime Workers.
- Rodar `wcag-check.ts` se tocar token de cor.
- Aplicar label `auto-merged-wave-6` no body do PR.

Se algum desses faltar, **não mergear**. Auto-merge é privilégio condicional, não livre.

### 1.2 ADR-019 continua mordendo

Cada dependência nova pede ADR. Cada subagent novo pede demanda concreta. Esta wave já tem D11 fechando isso — `frontend-skin-helper` (D5) é a única adição autorizada de antemão, e mesmo ela carrega justificativa registrada (subagent análogo ao `design-system-curator` para refactor de página).

### 1.3 Não regredir no que custou caro

A Wave 4 entregou — com sangue — coisas que **NÃO podem ser perdidas**:

- WCAG AA validado por `culori` em `WCAG-AUDIT.md`.
- Lighthouse mobile ≥ 95 perf (issue #114 ainda aberta para 7 rotas — Wave 6 PRECISA fechar isso, não adiar de novo).
- Trust pyramid em todo perfil L2/L3.
- `--font-sans: Inter` + `--font-mono: Geist Mono` (não trocar para Roboto do designer).
- Tema light dormente preservado.
- **AuthSlot RSC anônimo zero-JS** (lição PR #57 e #149 — incidentes documentados em comentários de `deploy.yml`).
- CLS = 0 em listagens (dimensões explícitas em `<img>`).

Cada PR Wave 6 anexa screenshot antes/depois + Lighthouse delta na descrição. Sem isso, não mergear (mesmo com auto-merge autorizado).

### 1.4 Princípio 13 (validação empírica) sobrevive ao auto-merge

Auto-merge **não dispensa** validação empírica. Pelo contrário — em ausência de revisor humano, a validação empírica vira a única defesa. Output literal de comandos, screenshots reais, ratios WCAG calculados ficam **mais críticos**, não menos.

### 1.5 Comprometimento com o cidadão acima de tudo

Wave 6 **não muda** comportamento de domínio. URLs permanecem indexáveis, dados permanecem com trust level visível, fonte oficial permanece linkada. Reskin é só **camada de apresentação**.

---

## 2. Diagnóstico do gap (estado real, 2026-05-16)

### 2.1 Tokens — o que designer tem e nós não

| Token | Designer | Nosso | Decisão Wave 6 |
|---|---|---|---|
| `--accent` (roxo) | `oklch(0.62 0.22 295)` | ausente | **Adicionar** (ADR-024). Usado em badge "Compromisso" e accents. Re-validar WCAG; ajustar L se reprovar (D10) |
| `--accent-foreground` | `oklch(0.99 0 0)` | ausente | Adicionar par |
| `--info` | `oklch(0.7 0.14 220)` | ausente | **Não adicionar** (ADR-024 §5). `--brand` cobre |
| `--card` / `--card-foreground` | sim | usamos `--surface` direto | **Alinhar**: nosso `--surface` cobre. Não duplicar |
| `--popover` / `--popover-foreground` | sim | usamos `--surface-elevated` | Idem — não duplicar |
| `--gradient-primary` | `linear-gradient(135deg, primary→accent)` | ausente | **Adicionar** (ADR-024 §2). Logo navbar, CTA primário, hover overlays |
| `--shadow-glow`, `--shadow-soft` | sim | **temos** | Manter |
| `.glass` | sim | **temos** | Manter |
| `.glass-strong` (blur 18px) | sim | ausente | **Adicionar** (ADR-024 §4). Surfaces sticky elevadas |
| `.bg-hero` (gradient radial primary + accent) | sim | ausente | **Adicionar** (ADR-024 §3). Hero de toda rota principal |
| `.bg-gradient-primary` | sim | ausente | Adicionar como utilitário (ADR-024 §2) |
| `.text-gradient`, `.grid-bg` | sim | **temos** | Manter |
| `--font-sans` | `Roboto` | **Inter** (Wave 4 PR 3) | **Manter Inter** — sem ADR pra reverter |

### 2.2 Composições visuais — o que designer tem como padrão e nós não

| Composição | Onde no designer | Estado nosso |
|---|---|---|
| **Hero section** com `bg-hero` + `grid-bg` + `text-gradient` H1 + badge `Sparkles` + duplo CTA | `index.tsx:35-87`, `proposicoes.tsx:62-130` | Apenas em `/`, sem `text-gradient`, sem badge contexto, sem `bg-hero` |
| **KPI strip** 4-col com ícone + label + value + hint colorido por tone | `parlamentares.$id.tsx:315-345` | Ausente. Perfil usa `<Section>` simples |
| **Section nav** (jump links horizontais sticky) | `parlamentares.$id.tsx:350` | Ausente. Cidadão rola sem orientação |
| **Section card** com badge data-level + ícone + título + subtitle | `parlamentares.$id.tsx:353-390+` | Nosso `<Section>` interno tem só title + hint |
| **Filter chips** (rounded-full + shadow-glow quando ativo) | `proposicoes.tsx:189-204` | Filtros nossos usam `<select>` HTML padrão |
| **Card de listagem** com gradient overlay 6% no hover + seta diagonal | `ParliamentCard.tsx`, `ProjectCard` em `proposicoes.tsx:206-303` | Card horizontal compacto sem hover sofisticado |
| **Stats grid** 4-col com border separator | `index.tsx:74-86` | Temos `CardStats` mas formato 3-card narrativo, não strip |
| **Trust as compromisso section** (gradient card 2-col com 4 chips) | `index.tsx:121-153` | Temos pirâmide expandida (mais informativa, menos impactante) |
| **Sidebar TOC + prose** para `/metodologia` | `metodologia.tsx:10-55` | Temos `/docs/*` com 5 sub-rotas, sem TOC sticky |

### 2.3 Páginas que designer tem e nós não

| Rota | Decisão Wave 6 |
|---|---|
| `/analise` | **Fora** (D2) — Wave 5+/6.7 open ground |
| `/metodologia` | **Sprint 6.5** com híbrido `/docs/*` mantidos como redirect 301 |
| `/minha-area/*` | **Fora** — issue #174 ainda condicional a demanda real |

### 2.4 Anti-patterns Lovable a NÃO importar

| Padrão | Por quê descartar |
|---|---|
| `useQuery` direto à API da Câmara no cliente | Viola ADR-018 + custo Neon |
| `useQueries` em loop para N votações | N+1 clássico. RSC + `Promise.all` resolve |
| `user-store` em localStorage como mock auth | Substituído por Clerk |
| `useMounted` hack para hydration mismatch | RSC server-renderiza, não-problema |
| `framer-motion` para reveal/fade trivial | CSS animation + reduced-motion resolve sem 50kb (ADR-023) |
| Lógica de transformação inline em página | Nossa fatoração em components/parlamentar/ é correta |
| 24 peer deps Radix preventivas | Tier 2/3 do ADR-021 — entrar sob demanda |

---

## 3. Arquitetura-alvo

### 3.1 Camadas a tocar

```
src/app/globals.css                ✅ adicionar tokens novos
src/design-system/
├── primitives/                    ✅ adicionar Tier 2 sob demanda concreta
└── compositions/                  ⚠️ pasta vazia hoje — POPULAR
    ├── hero-section.tsx           NOVO
    ├── kpi-strip.tsx              NOVO
    ├── section-card.tsx           NOVO
    ├── section-nav.tsx            NOVO (1 client component pequeno)
    ├── filter-chips.tsx           NOVO
    ├── party-badge.tsx            NOVO (const hardcoded — D4)
    ├── stats-grid.tsx             NOVO
    └── data-badge.tsx             NOVO (wrapper TrustBadge para hero)

src/components/
├── parlamentar/perfil-header.tsx  REFACTOR
├── proposicao/proposicao-card.tsx REFACTOR
├── parlamentar/parlamentar-card.tsx REFACTOR
├── home/                          REFACTOR (3 cards → narrative hero + features grid)
├── site/navbar.tsx                REFACTOR (sticky + backdrop + logo)
└── site/footer.tsx                REFACTOR (alinha visual)

src/app/
├── page.tsx                       REFACTOR
├── parlamentares/[id]/page.tsx    REFACTOR
├── proposicoes/page.tsx           REFACTOR
├── proposicoes/[tipo]/[numero]/[ano]/page.tsx   REFACTOR
├── parlamentares/page.tsx         REFACTOR
├── votacoes/page.tsx              REFACTOR
└── metodologia/page.tsx           NOVO (Sprint 6.5)

src/app/docs/*/page.tsx            REFACTOR Sprint 6.5 (vira 301 redirect para /metodologia#anchor)

INTOCADO (camada de domínio):
src/lib/queries/**                 ❌
src/modules/**                     ❌
src/shared/**                      ❌
ingestion/**                       ❌
```

### 3.2 Boundary import (já enforced)

- `design-system/compositions/` PODE importar de `design-system/primitives/`, `design-system/tokens/`, `lib/cn`.
- `design-system/compositions/` **NÃO PODE** importar de `components/`, `lib/queries/`, `modules/`, `shared/`.
- Smoke test `import-boundaries.test.ts` (Wave 4) cobre. Se Biome ainda não escala para boundary, smoke test é o gate.

---

## 4. Sprints propostas

Cada sprint = 1 plan-mode aprovado pelo owner antes da execução. **Dentro da sprint**, execução é autônoma com auto-merge condicional.

### Sprint 6.0 — Tokens expandidos + composições fundamentais

**Objetivo**: trazer os 6 tokens/utilitários que faltam + criar as 8 composições que vão alimentar todas as outras sprints.

Entregáveis: 8 PRs sequenciais, formato consolidado Waves 3-5. PRs 2-7 são designer-tocáveis em waves futuras; PRs 1 e 8 exigem role engineer permanentemente (ADRs + `.claude/`).

Critérios de aceite:
- `npm run check`, `ci`, `test`, `build`, `cf:build` passam.
- `/dev/design` renderiza todas as composições novas.
- WCAG: todos os pares foreground/background com tokens novos ≥ 4.5:1 (corpo) ou ≥ 3:1 (UI/large). Output literal de `wcag-check.ts` no PR.
- Bundle delta JS no `/` ≤ +0kb (composições puro CSS+RSC).
- Lighthouse mobile no `/` mantém score Wave 4.
- ROADMAP atualizado com seção "Wave 6" nova.

### Sprint 6.1 — Reskin shell (navbar + footer + home)

Critérios de aceite:
- Lighthouse mobile no `/` ≥ 95 perf, 100 a11y, CLS 0.
- AuthSlot RSC não regrede: anônimo zero-JS Clerk.
- Mobile 360px viewport OK.
- Diff visual antes/depois anexado.
- Bundle delta ≤ +5kb.

### Sprint 6.2 — Reskin listagens (parlamentares + proposições + votações)

Critérios de aceite:
- URL state preservado em todos os filtros (GET params).
- SSG mantido onde aplica.
- Empty state cobre filtros vazios com CTA "limpar filtros".
- Lighthouse mobile mantém.
- TrustBanner mantido onde existia.

### Sprint 6.3 — Reskin perfis (parlamentar + proposição + votação)

A página mais importante do produto.

Critérios de aceite:
- LCP ≤ 2.5s em 4G simulado (fechar issue #114 — anexar relatório Lighthouse no PR).
- Trust pyramid visível em cada bloco L2/L3.
- Section nav navega para anchors corretas.
- Mobile: SectionNav vira sticky bar reduzida (D6).

### Sprint 6.4 — Comparar + busca + meu parlamentar

Reskin das 3 rotas restantes.

### Sprint 6.5 — Metodologia + ajustes (D3 híbrido)

Entregáveis:
- `app/metodologia/page.tsx`: hub com sidebar TOC sticky + prose.
- `app/docs/{glossario,fontes,como-ler-um-perfil,piramide-de-confianca}/page.tsx`: viram 301 redirect para `/metodologia#anchor`.
- Polimento de microinterações com `prefers-reduced-motion` validado.

### Sprint 6.6 — Performance final + Lighthouse fechamento

A única sprint não-visual. **Fecha issue #114 — não adia mais.**

Entregáveis:
- Lighthouse mobile real em 15 rotas (production-like via `cf:preview` ou preview deploy real).
- Plano de otimização para qualquer rota < 95 perf ou LCP > 2.5s.
- Implementação dos top 3 ganhos identificados.
- R2 incremental cache (#58) re-avaliado: ainda blocked? Se sim, documentar como Wave 7+.
- Métrica auto-merge: contagem de PRs com label `auto-merged-wave-6` para release notes.
- Tag `v0.6.0-frontend-excellence`.
- ROADMAP atualizado.

### Sprint 6.7+ — Open ground

Conforme dor real:
- `/analise` se evidência mostrar engajamento com stats.
- `/minha-area` se demanda real emergir (issue #174).
- Recharts/visualizações se houver 3+ widgets pedindo.

---

## 5. Restrições e armadilhas

- ❌ **Não migre arquitetura.** RSC fica. Drizzle fica. Neon fica. Clerk fica. Workers fica.
- ❌ **Não copie código do `vera-politica` linha-a-linha.** Use como referência visual.
- ❌ **Não introduza state management global** (Zustand, Jotai).
- ❌ **Não introduza React Query no client.** Quebra ADR-018 e budget Neon.
- ❌ **Não adicione `"use client"` em página inteira** por preguiça. Use ilhas.
- ❌ **Não remova trust_level** por estética.
- ❌ **Não troque Inter por Roboto** sem ADR.
- ❌ **Não bagunce estrutura de pastas.** `lib/queries`, `modules`, `shared` são intocáveis.
- ❌ **Não introduza Storybook**. `/dev/design` cobre.
- ❌ **Não regrida em Lighthouse.** Cada PR anexa antes/depois.
- ❌ **Não pule screenshot antes/depois** em PR visual mesmo com auto-merge.
- ⚠️ **framer-motion**: ADR-023 (critério, D9) obrigatório antes de adicionar. Default: CSS animation.
- ⚠️ **Recharts**: ADR próprio obrigatório. Default: tabelas ranked + bars CSS.
- ⚠️ **Auto-merge** (D8): condicional às barreiras técnicas de §6. Sem barreira verde, não mergear.

---

## 6. Workflow operacional com auto-merge condicional

### 6.1 O que define se um PR pode ser auto-merged

Auto-merge **só dispara** se TODAS estas condições forem verdadeiras simultaneamente:

1. **CI verde** — `Lint & Build`, `Tests`, `Integration Tests` todos passando.
2. **Workflows advisory verdes** — `pr-sanity` sem flags, `design-tokens` sem violações.
3. **PR body completo** — sections preenchidas conforme `.github/PULL_REQUEST_TEMPLATE.md`:
   - "O que muda" descritivo
   - Tipo de mudança marcado
   - Checklist relevante marcado
   - **Screenshot antes/depois anexado** se mexer em UI
   - **Bundle delta** se mexer em `package.json` ou client-side
   - **Lighthouse delta** se mexer em rota principal ou Sprint 6.6
   - **Output literal de `wcag-check.ts`** se mexer em cor
   - Referências (Closes #, ADR, etc.)
4. **Label `auto-merged-wave-6` aplicada** no PR.
5. **PR < 600 linhas de diff** (excluindo lock files). PRs maiores exigem split em PRs menores.

Se qualquer condição falha: **não mergear, abrir comentário no PR explicando o que falta, esperar próxima iteração**.

### 6.2 Sequência operacional por PR

```bash
# 1. Branch
git switch -c feat/wave-6-sprint-X-pr-Y-<descricao-curta>

# 2. Implementação (Claude Code autônomo)

# 3. Validação local obrigatória
npm run check
npm run ci
npm run test
npm run build
npm run cf:build  # se afetar Workers runtime
.local/wcag-check.ts  # se afetar token de cor

# 4. Captura de evidências (Claude Code monta)
# - Screenshot antes (de branch main) e depois (do branch atual)
# - Bundle size antes/depois (npm run build output)
# - Lighthouse (Sprint 6.6 ou rota principal)

# 5. PR
gh pr create --title "feat(escopo): descrição imperativa em inglês" \
  --body "..." \
  --label auto-merged-wave-6

# 6. Aguarda CI
gh pr checks --watch

# 7. Auto-merge (Claude Code dispara) — owner-only por convenção operacional
gh pr merge --squash --auto --delete-branch
```

**Importante sobre owner-only**: branch protection no GitHub permite admin (owner) bypassar review. Claude Code executando comandos no shell do owner herda essa capacidade. Outros contribuidores que rodarem Claude Code **não terão** essa permissão GitHub-side mesmo que tentem comandos similares — branch protection garante.

### 6.3 Quando Claude Code DEVE pausar e perguntar (auto-merge bloqueado)

- Quando teste falha por motivo não-óbvio (não é typo, não é flake, é regressão real).
- Quando WCAG reprova **mesmo após** recalibração ad-hoc (D10).
- Quando bundle delta > +20kb gzip sem dependência nova justificável.
- Quando Lighthouse regrede > 5 pontos em qualquer rota.
- Quando descobre que precisa tocar `src/lib/queries/`, `src/modules/`, `ingestion/`, `src/shared/db/migrations/`.
- Quando PR ultrapassa 600 linhas e não é dividível trivialmente.
- Quando precisaria de dependência npm nova além das já autorizadas pelo plano.
- Quando ADR novo seria necessário e não está no plano da sprint.

Para cada caso acima: **pausar, abrir issue ou comentário no PR, aguardar input do owner**.

### 6.4 Auditoria contínua

Ao final de cada sprint:
- `gh pr list --label auto-merged-wave-6 --search "merged:>=<data-inicio-sprint>"` → contagem de PRs auto-merged.
- Spot-check de 1 PR aleatório por sprint: owner abre, lê, valida. Se algo escapou, ajuste em Sprint seguinte.

Ao final da Wave 6 (Sprint 6.6):
- Métrica total no release v0.6.0: "Wave 6 mergeou X de Y PRs sem revisão humana externa. Trade-off conforme decisão D8 do prompt mestre. Spot-check encontrou Z desvios, todos endereçados em PR de erratum."

### 6.5 Gap fora do escopo da sprint vira `gh issue`

Se durante a execução de uma Sprint Claude Code identifica trabalho bloqueado ou fora do escopo mapeado, **não tenta resolver na sprint atual**. Em vez disso:

```bash
gh issue create \
  --title "<area>: <gap identificado>" \
  --body "..." \
  --label wave-6+,area:<area>
```

Body inclui:
- Contexto onde apareceu (sprint, PR, arquivo)
- Por que não dá pra resolver agora (bloqueio técnico, dependência externa, decisão owner pendente, fora wave)
- Próximo passo proposto (Wave 7+, ADR específico, decisão owner)
- Referência cruzada ao PR/sprint onde foi identificado

Casos típicos: issue #114/#58 se Sprint 6.6 não fecha completamente; Tier 2/3 sem dor empírica suficiente; demanda incerta (`/analise`, `/minha-area`); padrões do designer fora do plano corrente; ADRs futuros (Recharts, framer-motion empírico).

Princípio: cada gap não resolvido vira artefato rastreável, não dívida implícita. Auto-merge **não se aplica a issues** — só a PRs.

---

## 7. Registro leve em `CLAUDE.md` (no lugar de ADR)

Conforme decisão do owner (2026-05-16), o desvio de "humano revisa antes do merge" instalado na Wave 5 fica documentado como linha curta no `CLAUDE.md`, não como ADR formal. Adicionar em PR 1 da Sprint 6.0:

```markdown
## Auto-merge — Wave 6 (operacional, transitório)

Durante a Wave 6 (Sprint 6.0–6.6), o owner em role `engineer`
autoriza o Claude Code a abrir E mergear PRs sem aprovação humana
externa, condicionado às barreiras técnicas detalhadas no prompt
mestre Wave 6 §6.

Aplicabilidade: apenas Wave 6, apenas owner, apenas PRs com label
`auto-merged-wave-6`. Outros contribuidores e outras waves seguem
o regime normal de revisão humana via CODEOWNERS.

Auditoria: métrica de PRs auto-merged vai no release v0.6.0.
```

Sem ADR formal — o desvio é transitório, escopado e auditável.

---

## 8. Plugins Claude Code (estado consultivo)

Quatro plugins instalados (conforme `~/.claude/plugins/installed_plugins.json`):

- `frontend-design@claude-plugins-official` — gera UI evitando estética AI genérica. **Wave 6: consultivo apenas** (D11). Pode ser referência para HeroSection ou /dev/design, mas o código vem do Claude Code agente operador, não da skill geradora.
- `interface-design@claude-plugins-official` — skills `init/extract/audit/critique/status`. **Wave 6: usar `audit` antes do PR 8 de cada sprint** para sanity-check visual.
- `skill-creator@claude-plugins-official` — Wave 6 usa para criar `add-composition` skill em Sprint 6.0 PR 8 (junto com `frontend-skin-helper` subagent).
- `neon@claude-plugins-official` — irrelevante para Wave 6 (não toca DB).

Nenhum conflito com skills locais (`design-token-check`, `visual-qa`, `add-primitive`) — escopos diferentes (plugin gera, local audita).

---

## 9. Subagent `frontend-skin-helper` (D5, standalone)

Criado na Sprint 6.0 PR 8 — depois das composições existirem (para ele saber referenciá-las).

### 9.1 Frontmatter

```yaml
---
name: frontend-skin-helper
description: |
  Helper de reskin de página em domínio. USE PROATIVAMENTE quando
  o usuário pedir para refatorar uma página existente (perfil,
  listagem, home) para consumir composições do design system.
  Conhece HeroSection, KpiStrip, SectionCard, SectionNav,
  FilterChips, PartyBadge, StatsGrid e DataBadge. Standalone —
  escopo distinto do design-system-curator (curator = primitiva,
  skin-helper = página de domínio).
tools: Read, Grep, Glob, Bash, Edit, Write
model: sonnet
---
```

### 9.2 Corpo (resumo do que sabe)

- Lê `src/design-system/compositions/*.tsx` no startup para conhecer props disponíveis.
- Lê `docs/architecture/ADR/021-design-system-shadcn-curado.md` para boundary import.
- Lê este prompt mestre para princípios de §1.
- Sabe que `src/lib/queries/**`, `src/modules/**`, `src/shared/**`, `ingestion/**` são **intocáveis**.
- Sabe que componentes de domínio (`src/components/<contexto>/`) consomem composições + primitivas, nunca o contrário.
- Insiste em screenshot antes/depois antes de declarar concluído.
- Roda `npm run build` antes/depois e calcula bundle delta.
- Roda `/design-token-check` skill antes de fechar PR.

### 9.3 Escopo standalone (não descendente)

`design-system-curator` (Wave 5) trabalha **só em primitivas**: copia via shadcn CLI, adapta tokens, smoke test. Não toca página.

`frontend-skin-helper` (Wave 6) trabalha **só em páginas de domínio**: refatora component de domínio para consumir composição, não toca primitiva.

Escopos disjuntos. Standalone confirmado.

---

## 10. Checklist de pré-execução (cada Sprint)

Antes de propor o plano de cada Sprint 6.x:

- [ ] `CLAUDE.md` (raiz, atual)
- [ ] Este prompt mestre Wave 6 — releitura de §0, §1, §5
- [ ] Estado da Sprint anterior (PRs merged, label `auto-merged-wave-6` count)
- [ ] Issue #114 status
- [ ] `docs/product/ROADMAP.md` Wave 6 section
- [ ] Para Sprint 6.0: `.local/wcag-check.ts` rodando local

---

## 11. Primeiro passo

**Para a Sprint 6.0**: o plano foi produzido em 2026-05-16 e o owner aprovou as decisões D1-D11. PR 1 abre direto seguindo §6.

**Para Sprints 6.1+**: cada uma começa com plan-mode no formato consolidado das Waves 3-5. Owner aprova plano → Claude Code executa autônomo com auto-merge condicional.

---

## 12. Critério de sucesso da Wave 6

A Wave 6 é bem-sucedida se, ao final da Sprint 6.6:

- Visitante anônimo abre `brasilavera.org` e a primeira impressão visual rivaliza com produtos comerciais.
- Cidadão em deep link a perfil parlamentar entende em ≤ 30s: nome, partido, KPIs, fonte oficial, navegação.
- Lighthouse mobile ≥ 95 perf, 100 a11y, LCP ≤ 2.5s em todas as 15 rotas medidas. **Issue #114 fechada com evidência**.
- Trust pyramid visível em 100% dos blocos L2/L3.
- Bundle JS no path anônimo ≤ Wave 5 baseline.
- Cada PR Wave 6 com screenshot antes/depois + Lighthouse delta documentado.
- ADRs 023 (critério animação) e 024 (accent roxo) publicados.
- Métrica honesta de auto-merge no release v0.6.0 ("X de Y PRs auto-merged, Z desvios encontrados em spot-check").

Se em algum ponto decisão estética conflitar com sustentabilidade ou trust — **Claude Code pausa e pergunta** mesmo com auto-merge autorizado. Beleza não vence honestidade cívica.
