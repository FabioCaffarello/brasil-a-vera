# Auditoria UX/Frontend — brasilavera.org (2026-07-20)

> Varredura estratégica de produção: ~35 rotas × desktop (1440px) + mobile (390px)
> + amostra dark, via Playwright headless, com coleta de erros de console, requests
> 4xx/5xx, overflow horizontal e altura de página. Revisão de design por 3 passes
> independentes (jornada principal, rotas secundárias, mobile) + auditoria estática
> de adoção RDS (ADR-038/053) + ancoragem de cada bug no código-fonte.
>
> Nenhum overflow horizontal em nenhuma rota. Zero page errors de JS. O design
> system está sólido e consistente — os problemas concentram-se em **estados de
> erro/vazio, edge cases de dados e páginas sem truncagem**.

---

## P0 — Quebra de experiência

### P0.1 — Error boundary e 404 sem tema, em inglês
- **Evidência:** `/rota-inexistente` → 404 default do Next ("404 | This page could not be found."), fundo branco num site dark, sem PT, sem CTA de retorno. O mesmo vale para o error boundary: durante a varredura, `/parlamentares/[id]/gastos` respondeu 500 **duas vezes** (desktop e mobile, "ERROR 4026118615") com a tela default "This page couldn't load".
- **Causa:** não existem `not-found.tsx` nem `error.tsx`/`global-error.tsx` customizados no app router (boundaries default do Next).
- **Fix:** criar `src/app/not-found.tsx` e `src/app/error.tsx` com tokens RDS (surface-canvas, EmptyState, Button de retorno), copy em PT.

### P0.2 — 500 intermitente em `/parlamentares/[id]/gastos`
- **Evidência:** 2 ocorrências durante a varredura (~minutos de intervalo), depois 200 em recheck. Padrão de esgotamento de conexões/cold-start do Neon sob rajada.
- **Fix:** investigar logs do Workers; garantir cache de edge (ADR-018) na query de gastos e comportamento de erro gracioso (fallback + retry) em vez de crash da rota. O P0.1 mitiga o impacto visual enquanto isso.

### P0.3 — Páginas sem truncagem: perfil com 81.500px e /frentes com 90.000px
- **Perfil de parlamentar (senador):** a seção "Vetos presidenciais" renderiza ~350 cards — um por *dispositivo* do mesmo veto, todos com título idêntico (VET 29/2025 repetido dezenas de vezes). 39.834px = 73% da página.
  - **Causa:** `src/lib/queries/vetos.ts:172-213` (`getVotosByParlamentar`) sem LIMIT e com granularidade por dispositivo; `src/app/parlamentares/[id]/page.tsx:394` passa o array inteiro; `src/components/parlamentar/vetos-senador.tsx:86-116` mapeia sem slice.
  - **Fix:** agrupar por `vetoId` (1 card por veto com contagem de dispositivos Sim/Não) + "mostrar mais".
- **`/frentes`:** `src/lib/queries/frentes.ts:34-70` (`listFrentes`) sem LIMIT; `src/app/frentes/page.tsx` renderiza tudo (centenas de frentes, 13MB de página).
  - **Fix:** paginação por `?page=` ou busca + cap com "mostrar mais".

---

## P1 — UX e dados incorretos

### P1.1 — `/votacoes` default sem valor informativo
Listagem dominada por dezenas de cards idênticos "Aprovado o Parecer." (CCOM, simbólicas), sem link de proposição e sem distinção entre si. O próprio subtítulo manda o usuário filtrar por nominais.
- **Fix:** default do filtro "Tipo de registro" = nominais/plenário (ou agrupar simbólicas de comissão por dia/órgão em linha compacta). Cards de simbólica deveriam mostrar a proposição vinculada quando houver.

### P1.2 — Busca não é accent-insensitive
"educacao" → "Nenhum resultado encontrado" (e a dica sugere "tente sem acento", que é justamente o que falhou); "saude" retorna resultados; existe tema "Educação" com 434 proposições.
- **Causa:** `src/lib/queries/busca.ts:81-119` usa `ILIKE` puro, sem `unaccent`.
- **Fix:** `unaccent(coluna) ILIKE unaccent(pattern)` (extensão `unaccent` no Neon) ou coluna normalizada; ajustar a dica do EmptyState.

### P1.3 — Ordenação alfabética quebrada em `/parlamentares`
"AJ Albuquerque" → "ANDRÉ ABDON" → "Abilio Brunini" (byte-order/C collation: maiúsculas antes de minúsculas, acentos no fim).
- **Causa:** `src/lib/queries/parlamentares.ts:91` — `ORDER BY nome ASC` cru (idem cursor em :175 e :189).
- **Fix:** `ORDER BY lower(unaccent(nome))` (mantendo `id` como desempate) ou `COLLATE "pt-BR-x-icu"`; alinhar a keyset pagination à mesma expressão.

### P1.4 — Rankings com dados errados ou vazios
- **`/rankings/presenca`:** "Mais ausentes" mostra Hugo Motta "7.7% ausente · 4/52 votações" — 4/52 presenças = 92,3% de ausência; o valor exibido é a *presença* com rótulo "ausente".
- **`/rankings/coerencia`:** "Mais contradições" e "Mais coerentes" listam os mesmos parlamentares, todos com 0 pares — 50 linhas de zeros como ranking. Deveria cair em EmptyState honesto ("base atual não detecta pares contraditórios") até haver sinal.

### P1.5 — `/institucional/mesa-diretora` com dado estagnado e Senado ausente
Dois "Presidente" na Câmara (Arthur Lira, legislatura anterior + Hugo Motta) e nenhuma seção do Senado apesar da intro prometer as duas casas.
- **Fix:** filtrar membros por legislatura/data-fim na query ou ingestão; adicionar bloco do Senado ou ajustar copy/escopo da página.

### P1.6 — `/comparar` sem ponto de entrada
Estado vazio instrui montar URL à mão com UUIDs (`/comparar?ids=<uuid1>,<uuid2>`). Cidadão não tem como usar; jargão de dev exposto.
- **Fix:** seletor com autocomplete (2-3 parlamentares) no estado vazio; CTA "Comparar" nos perfis/listagem.

### P1.7 — Navbar: espaçamento e descobribilidade
- Links visualmente colados: `src/components/site/nav-links.tsx:64` usa `gap-0.5` (2px). Fix: `gap-1`/`gap-2`.
- `NAV_LINKS` não inclui `/rankings`, `/vetos`, `/frentes`, `/feed`, `/comparar` — features inteiras sem entrada no menu (rankings é core do produto). Fix: repensar IA da navegação (ex.: item "Rankings" + dropdown "Explorar" para vetos/frentes/temas/feed).

### P1.8 — Beacon RUM do Cloudflare bloqueado por CORS em todas as páginas
Analytics silenciosamente quebrado + 2 erros de console por página (52 ocorrências na varredura).
- **Causa:** `src/app/layout.tsx:161-170` injeta `beacon.min.js` com `NEXT_PUBLIC_CF_BEACON_TOKEN`, mas o endpoint `/cdn-cgi/rum` não devolve CORS para a origem — token não registrado para `brasilavera.org` no Cloudflare Web Analytics.
- **Fix:** registrar a origem exata no site de Web Analytics dono do token (ou remover o token do env se a telemetria vem de outro lugar).

### P1.9 — Avatares vazios (fallback de iniciais não dispara)
Círculos cinza vazios em listagem, rankings, quem-me-representa e perfis (senadores mais afetados: André Abdon, Alexandre Guimarães, Astronauta Marcos Pontes...).
- **Causa provável:** `parlamentar-avatar.tsx` passa `fallback={iniciais(nome)}` corretamente; o `onError` do Avatar RDS não dispara — hipótese: a URL de foto responde 200 com payload inválido (HTML/redirect) em vez de 404, ou o fallback do RDS só cobre `src` undefined. Verificar empiricamente 2-3 URLs de foto de senador e o comportamento do Avatar (possível issue upstream RDS).

---

## P2 — Polish, copy e consistência

| # | Item | Evidência / causa | Fix |
|---|---|---|---|
| 1 | Votação simbólica: 3 empty-states repetidos + "Ver todos os 0 votos" | `votacoes/[id]/page.tsx:154-185` empilha MargemDecisao + Hemiciclo/Consolidados + VotosResumo, cada um com sua msg de simbólica; `votos-drawer.tsx:53` sem guard `total===0` | Branch único no parent quando `totalNominal===0`; esconder botão com 0 votos |
| 2 | "p1 da Senado" / "em 100% das 1 votações" | `leitura-rapida.tsx:50` ("da" hard-coded) e `:64-65` (plural fixo) | Artigo por casa; plural condicional |
| 3 | "menos de 1 votações comparáveis" | fato/alinhamento + cards de listagem | "nenhuma votação comparável" / plural condicional |
| 4 | Mojibake "Sa¬úde" (soft hyphen U+00AD) | ementas passam cruas: `proposicoes-core.ts:179,194`, `senado/proposicoes.ts:64,79`; zero sanitização no repo | `sanitizeText` no mapper (strip U+00AD + control chars) + backfill das linhas existentes |
| 5 | "Regime: ." (valor vazio truthy) | `perfil-header.tsx:63-70` — guard truthiness deixa passar `"."` | `regime?.trim()` + strip de pontuação no ingest |
| 6 | Nomes ALL-CAPS ("ANDRÉ ABDON") | mappers passam `nome` verbatim (`deputados-mapper.ts:18`, `senadores-mapper.ts:37`); sem title-case no repo | `toTitleCase` pt-BR (conectivos de/da/dos, numerais romanos) nos mappers + backfill |
| 7 | Breadcrumb de votação termina em data "17/07/2026" (barras colidem com separador) | `votacoes/[id]/page.tsx:288` usa `formatDataBR` | "17 jul 2026" ou label descritivo |
| 8 | Breadcrumb de frente quebra com título longo ALL-CAPS em 4 linhas | frente-detalhe (nome cru da fonte no crumb e no H1) | Title Case + truncar crumb com ellipsis |
| 9 | Breadcrumb abaixo do H1 em tema-detalhe, acima nos demais | tema-detalhe | Padronizar acima do H1 |
| 10 | Headers de página: centralizado+eyebrow (temas/busca) vs esquerda (rankings/mesa/vetos/frente) | — | Padronizar via PageHeader/HeroSection RDS |
| 11 | Jargão interno no copy público: "ADR-059", "ADR-040/047", "Sprint 3.0.5", "auto-fetch reverso", "sem NLP no MVP", "p1" | veto-detalhe, perfil (pares/afinidade), metodologia | Reescrever para linguagem cidadã; detalhes técnicos só em /docs |
| 12 | Footer mobile desalinhado (3 links justificados, baselines diferentes) | quase todas as rotas mobile | Stack vertical ou wrap com gap consistente |
| 13 | Grid de stats 2×2 com 4º quadrante vazio em `/parlamentares` mobile | 3 stats em grid de 4 | `grid-cols-3` ou 4º stat |
| 14 | Pill "Total" verde em /vetos confunde tipo com status | `vetos/page.tsx` | Tom neutro para tipo; cores só para situação |
| 15 | Eixo do chart de autores trunca "REPUBLICANOS" ("ᴾUBLICANOS"); chart de barra para 1 autor é overkill | proposicao-detalhe | Esconder chart com n=1; margem/rotação de label |
| 16 | "Amostra insuficiente · 45 votações no período" soa contraditório | cards de parlamentar | Copy: "45 votações — abaixo do mínimo de N para índice" |
| 17 | "728 parlamentares em exercício" (>594 assentos) | headline vs subtítulo da listagem | Esclarecer critério (inclui efetivados/suplentes no período) ou filtrar |

---

## Workstream RDS (ADR-038/053 + tokens)

Adoção madura: 113 arquivos importam RDS 4.11.0; primitivas consolidadas; Avatar/Timeline/Breadcrumb/EmptyState/Card compound adotados; zero duplicatas. Débitos:

1. **`/vetos` fora do padrão — pills à mão em vez de `DataBadge`** (~18 sítios): `app/vetos/page.tsx:28,36,44`, `app/vetos/[id]/page.tsx:35-100`, `parlamentar/vetos-senador.tsx:24-75`, `parlamentar/candidaturas-eleitorais.tsx:13-14`, `partidos/[sigla]/page.tsx:86-87` (`bg-amber-100/bg-red-100/bg-green-100` cru + dark variants manuais).
2. **`shadow` no Card base do RDS** contraria depth borders-only do BaV: vem de `dist/index.js:14843` do RDS (Card renderiza `bg-surface-base shadow ...`). Abrir issue upstream no repo do RDS (variant/elevation="none"), não patch local.
3. **Barras de progresso com cor crua** → tokens de chart: `partido/distribuicao-bancada.tsx:54` (`bg-blue-400`), `partido/gasto-bancada.tsx:50` (`bg-orange-400`), `partido/alinhamento-medio.tsx:28` (`bg-blue-500`).
4. **Ícones dos rankings com cores cruas** (`text-green-600` etc.): `rankings/page.tsx:28-68` + sub-rotas. Baixo impacto; consistência.
5. **Código morto:** `src/design-system/tokens/*.ts` (0 consumidores) — remover.
6. **Regra do CLAUDE.md possivelmente obsoleta:** RDS ≥4.11 publica tokens em `@theme {}` (dist/tokens.css:1303-1408) importado sem layer — `var(--color-fg-*)` inline provavelmente **resolve** agora (contraria CLAUDE.md e a memória do projeto). Exige verificação empírica (princípio 13) antes de atualizar doc ou código (`mix-composicao.tsx:19`, `alinhamento.tsx:87`).
7. **Issue #420 pode fechar:** único resíduo é byte-idêntico intencional documentado (`painel/@meusDados/page.tsx:195`).

---

## Sugestão de ondas de execução

1. **Onda A — bugs de runtime e dados (P0 + P1.2-P1.4):** error/not-found boundaries, agrupamento de vetos no perfil, paginação de frentes, unaccent na busca, collation da ordenação, rótulo de presença, empty-state de coerência, investigação do 500 de gastos.
2. **Onda B — IA de navegação e features órfãs (P1.1, P1.5-P1.7):** default de votações, navbar (gap + Rankings/Explorar), seletor do /comparar, mesa-diretora.
3. **Onda C — pipeline de dados (P2.4-P2.6 + P1.9):** sanitização + title-case nos mappers com backfill, investigação do fallback de avatar, RUM CORS (config, não código).
4. **Onda D — polish de copy e consistência (demais P2) + workstream RDS (1-7).**

Evidências: screenshots em scratchpad da sessão (`shots/*.png`), relatório `report.json` com console/network por rota.
