# Lighthouse mobile — plano de medição (Sprint 4.6 D7)

Criado em: 2026-05-16 (Sprint 4.6 PR 4)
Status: ⏳ Aguardando execução pelo owner em produção
Referência prévia: [issue #114](https://github.com/FabioCaffarello/brasil-a-vera/issues/114) (Sprint 3.0 Tarefa 5.2)

## Por que este documento existe

Sprint 4.3 declarou critérios de Done de performance:

- LCP ≤ 2.5s em 4G simulado mobile
- Lighthouse mobile performance ≥ 95
- Lighthouse mobile acessibilidade ≥ 100

Esses critérios **não foram medidos** após o reskin para tokens semânticos
OKLCH (Waves 4.0–4.6) — princípio 13 do CLAUDE.md: sem medição empírica
em ambiente production-like = sem claim de atingido.

Issue #114 documentou baseline pré-Wave 4 (2026-05-13) com 3 rotas
acima de 2.5s LCP. Após **17 PRs de reskin** (Sprints 4.0 a 4.6), o
HTML/CSS/bundle mudaram substancialmente — re-medição é necessária para
confirmar se:

- A) Reskin melhorou LCP (menos classes inline, mais reuso de tokens compilados)
- B) Reskin manteve LCP (apenas troca cosmética)
- C) Reskin piorou LCP (improvável — sem novas deps, sem novos componentes)

E para validar o critério com dado, não com hipótese.

## Baseline (referência empírica, issue #114, 2026-05-13)

| Rota | LCP | Performance | Status (vs 2.5s) |
|---|---|---|---|
| `/` | 2.8s | 94-99 | ⚠️ acima |
| `/parlamentares` | 3.1s | 94-99 | ⚠️ acima |
| `/partidos/[sigla]` | 2.8s | 94-99 | ⚠️ acima |
| `/parlamentares/[id]` | 2.3s | 94-99 | ✅ |
| `/proposicoes` | 2.2s | 94-99 | ✅ |
| `/votacoes/[id]` | 1.6s | 94-99 | ✅ |

CLS = 0 em todas. Accessibility e SEO não estavam tabulados.

## Rotas a medir agora (pós-Wave 4)

### Confirmação do baseline (3 rotas problemáticas + 3 OK)

As 6 rotas da auditoria original. Confirmação se mudou:

- [ ] `/`
- [ ] `/parlamentares`
- [ ] `/parlamentares/[id]` (escolher 1 deputado com foto)
- [ ] `/partidos/[sigla]` (escolher 1 partido grande, ex: PT)
- [ ] `/proposicoes`
- [ ] `/votacoes/[id]` (escolher 1 votação nominal recente)

### Rotas novas/reskinned que merecem entrar na medição

- [ ] `/votacoes` (listing — não estava no baseline)
- [ ] `/proposicoes/[tipo]/[numero]/[ano]` (detail — Sprint 4.2; escolher PL recente)
- [ ] `/docs` (hub — Sprint 4.6)
- [ ] `/docs/piramide-de-confianca` (4 cards + 4 TrustBadges)
- [ ] `/busca?q=lula` (Sprint 4.4 — search + resultados)
- [ ] `/comparar?ids=<u1>,<u2>` (Sprint 4.4 — grid 2 colunas)

### Não medir (sem ganho)

- API routes (`/api/*`)
- OG image routes (renderizadas no Worker, fora do cidadão)
- Feeds RSS (`/feed/votacoes/*`) — não são páginas HTML para cidadão
- `/dev/design` (noindex; ferramenta interna)

## Como medir (passo-a-passo)

### Ambiente

- Browser: Chrome (versão estável atual)
- Modo: **Incognito** (extensões podem distorcer; ColorZilla observado distorcendo tempo de render)
- Conexão: throttling **4G** (preset Lighthouse mobile)
- CPU: throttling **4× slowdown** (preset mobile)
- Origem: **produção** (`https://brasilavera.org`), nunca localhost — workers, edge cache, real CSS minified têm impacto não-reproduzível em dev

### Procedimento por rota

1. Abrir DevTools → tab **Lighthouse**
2. Categories: marcar **Performance**, **Accessibility**, **SEO**
3. Device: **Mobile**
4. Mode: **Navigation**
5. Throttling: **Simulated throttling (default)**
6. Clear cache & cookies → **Analyze page load**
7. **Repetir 3×** — single run é ruidoso (variação de até 15% em LCP é normal). Anotar mediana.

### O que registrar (em `LIGHTHOUSE-RESULTS.md`)

Por rota:

- **LCP** (mediana de 3 runs)
- **FCP**
- **TBT** (Total Blocking Time)
- **CLS**
- **Performance score** (mediana)
- **Accessibility score**
- **SEO score**
- **Diagnostics relevantes**: Lighthouse mostra "Largest Contentful Paint element" — anotar (h1, img, etc) para informar otimização

## Critérios de Done (Wave 4.3)

| Critério | Threshold | Como aferir |
|---|---|---|
| LCP mobile | ≤ 2.5s | Mediana de 3 runs por rota |
| Performance score | ≥ 95 | Mediana de 3 runs |
| Accessibility score | = 100 | Lighthouse a11y audit |
| CLS | < 0.1 (idealmente 0) | Confirma baseline |

## O que fazer se falhar

### Cenário 1: LCP > 2.5s em 1-3 rotas

Investigar **causa raiz** via DevTools → Performance → Insights:

#### Hipóteses prováveis (priorizadas)

1. **Avatar remoto (camara.leg.br / senado.leg.br)**: `<img src>` sem
   `loading="eager"` no above-the-fold; dimensões explícitas existem mas
   o asset em si é lento.
   - Mitigação A: `<link rel="preconnect" href="https://www.camara.leg.br">`
     em layout.tsx (free, sem trade-off)
   - Mitigação B: First avatar above-the-fold com `loading="eager"`
     + `fetchpriority="high"`
   - Mitigação C: Next/Image com `remotePatterns` — paga overhead de
     config mas ganha otimização automática (avaliar custo no PR de fix)

2. **HTML inicial grande**: SSR renderiza muito conteúdo (perfil parlamentar
   tem 7 seções; perfil partido tem 4).
   - Mitigação: streaming SSR (Next 16 suporta `<Suspense>` em RSC) —
     LCP element estabiliza enquanto resto carrega abaixo
   - Reduzir conteúdo above-the-fold é trade-off ruim para civic transparency

3. **CSS payload**: 269 arquivos refatorados, Tailwind v4 com tree-shake
   — bundle CSS final deve ser pequeno. Confirmar em DevTools tab Network.

4. **Query DB**: rotas com `dynamic = 'force-dynamic'` (`/partidos/[sigla]`,
   `/feed`) dependem de query Neon — TTL do cache `partidoOverview` está
   documentado em `src/lib/queries/partidos.ts`, mas cold start do Neon
   pode adicionar 200-500ms.

### Cenário 2: Performance score < 95

Abrir diagnostics no Lighthouse — provavelmente é o mesmo problema do
LCP. Score < 95 com LCP < 2.5s é raro (LCP pesa muito no score).

### Cenário 3: Accessibility < 100

**Bloqueia** — accessibility deve ser 100. Diagnostics mostram exatamente
o que está faltando (contraste, aria-label, alt text, foco). Fix vai
direto no código antes de fechar Wave 4.

### Cenário 4: Tudo passa

Atualizar #114 com novo baseline e fechar. Atualizar release notes
v0.4-final-public com tabela de medição. Sem PR de otimização adicional.

## Onde escalar se a investigação for não-trivial

- Abrir issue específica (não usar #114; ela documentou o baseline 3.0)
- Labels: `wave-5+`, `perf`
- Linkar este documento + LIGHTHOUSE-RESULTS.md
- Pré-requisito antes de PR de otimização: causa raiz com dado, não hipótese

## Smoke probe automatizado de performance (não preemptivo)

Decisão D5 da Sprint 4.6: **não criar** smoke probe de perf agora.

Razão (ADR-019): sem gargalo concreto observado, smoke probe adiciona
complexidade ao pipeline com benefício incerto. Quando/se a próxima
auditoria mostrar **regressão real** (LCP voltar a subir após uma
feature nova, por exemplo), aí justifica criar probe.

Lighthouse CI exigiria:
- GitHub Action rodando Chrome headless em cada PR
- Threshold como gate de merge
- Custo: 30-60s adicionais por PR
- Risk: false positives por variação de rede no runner

Tudo isso por ora é especulativo. Aguardar evidência.

## Cronograma sugerido para o owner

1. Mergear PRs 1-3 da Sprint 4.6 (zinc/primary cleanup)
2. Mergear PR 4 (este — plano)
3. Mergear PR 5 (closure + tag `v0.4-final-public`)
4. Executar medição em produção (pode ser dias depois — ambiente já tagged)
5. Preencher `LIGHTHOUSE-RESULTS.md` com resultados
6. Se passa: fechar #114, atualizar release notes v0.4-final-public
7. Se falha: abrir issue específica em `wave-5+` com causa raiz
