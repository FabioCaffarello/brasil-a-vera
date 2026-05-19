# Wave 9 — Plano de redesign /votacoes · Votação 360

> Brasil a Vera · Design + Engenharia · v1.0
> Última atualização: 2026-05-18
> Status: **planejamento cravado (rodada 1)** — owner autorizou execução
> Cadência de release: **1 tag única ao final da wave** (`v0.9.0-votacao-360`)

---

## Sumário

- [Como ler este plano](#como-ler-este-plano)
- [Contexto](#contexto)
- [Diagnóstico — estado atual de /votacoes](#diagnóstico--estado-atual-de-votacoes)
- [Princípios norteadores (Wave 9)](#princípios-norteadores-wave-9)
- [Decisões cravadas](#decisões-cravadas)
- [Componentes novos & evoluídos](#componentes-novos--evoluídos)
- [Queries novas](#queries-novas)
- [Sequenciamento (6 sprints, 1 tag final)](#sequenciamento-6-sprints-1-tag-final)
- [Contratos de fallback](#contratos-de-fallback)
- [Métricas de sucesso](#métricas-de-sucesso)
- [Riscos & mitigações](#riscos--mitigações)
- [Fora de escopo](#fora-de-escopo)
- [Ordem de execução pós-aprovação](#ordem-de-execução-pós-aprovação)
- [O que NÃO está neste plano](#o-que-não-está-neste-plano)

---

## Como ler este plano

Este documento é **auto-suficiente**. Qualquer Claude que retome a Wave 9
em sessão futura não precisa reler o transcript da rodada de cravamento —
tudo que ficou acordado está cristalizado aqui.

Ordem sugerida de leitura:

1. **Contexto** → tese da Wave 9 (por que votações merecem tratamento próprio)
2. **Decisões cravadas (D1–D8)** → o que NÃO é mais negociável
3. **Sequenciamento** → mapa dos 6 sprints e PRs internos
4. **Ordem de execução** → primeiro PR a abrir
5. **Contratos de fallback** → guarda-corpos durante execução

Engineer Claude da próxima sessão **inicia execução direta**, sem precisar
perguntar. Se uma decisão nova surgir durante execução (escolha entre 2
abordagens de implementação não cobertas aqui), **pausa e pergunta** — não
escolhe por conta própria. Princípio idêntico ao adotado nas Waves 7 e 8.

---

## Contexto

A **Wave 7** consolidou padrão arquitetural em `/parlamentares` (perfil 360°
com KpiStrip comparativo, SectionNav, Accordion mobile, cursor pagination,
dataviz Recharts dynamic-imported). A jornada do **Cidadão Consciente**
ficou validada no eixo "pessoa pública".

A **Wave 8** estendeu o mesmo padrão a `/proposicoes` com 22 PRs entregues
sob a tag `v0.8.0-proposicao-360`. Tese: o cidadão que entendeu seu
parlamentar via Wave 7 consegue entender as proposições daquele
parlamentar com a mesma profundidade.

A **Wave 9** fecha o triângulo `Parlamentar × Proposição × Votação`.
**Mas votação não é só mais uma rota a portar.** Parlamentar é entidade
contínua (carreira no tempo), proposição é processo (tramitação), votação é
**evento instantâneo com tensão dramática única**: orientação de bancada ×
voto individual, disciplina × rebelião, margem de decisão. A narrativa
coletiva colapsa em segundos. Wave 9 captura essa singularidade — não só
reskina.

### Personas

- **P1 — Cidadão consciente** (80% mobile, 375×667): chega por busca ou
  share, quer entender em <10s "essa lei passou ou não, por quanto, e
  como meu parlamentar votou". Mesma persona das Waves 7 e 8.
- **P2 — Jornalista/pesquisador**: precisa exportar CSV, comparar votos
  por bancada, identificar rebeldes (parlamentares que votaram contra
  orientação do próprio partido).
- **P3 — Eleitor que veio do perfil do parlamentar** (jornada validada
  Wave 7→8→9): vi votações do meu deputado, abro uma delas, quero saber
  o que ela decidia e quem mais votou como ele.
- **P4 — Ativista/ONG**: monitora orientações de bancada vs. discurso
  público dos partidos. Persona que ganha mais com Wave 9 do que ganhou
  com 7/8.

### Por que agora

- `/proposicoes` (Wave 8) cravou o footer cross-link "votações vinculadas
  desta proposição". Os links levam a uma página visualmente inferior à
  rota de origem. Dívida estética + cognitiva.
- A rota `/votacoes/[id]` é hoje a **única** das três principais que
  permanece `dynamic = 'force-dynamic'`. Dívida técnica de performance
  isolada e visível.
- A narrativa de **disciplina partidária × rebelião** só faz sentido em
  votações, e está completamente ausente do produto. É a feature de
  identidade única que diferencia "Votação 360" de "mais um redesign".

---

## Diagnóstico — estado atual de /votacoes

Inventário levantado em sessão de auditoria (paths citados literalmente).

### Rotas existentes

- `src/app/votacoes/page.tsx` — Listagem com FiltrosVotacao (casa/ano/resultado/nominais), grid de VotacaoCard, `limit=50` offset
- `src/app/votacoes/[id]/page.tsx` — Detalhe com PerfilVotacaoHeader + KpiStrip básico + SectionNav 4 abas + 4 SectionCard. **`dynamic = 'force-dynamic'`** (justificado por `?voto=X` em searchParams)
- `src/app/votacoes/opengraph-image.tsx` + variante no detalhe — OG images
- **Ausentes**: `loading.tsx`, `error.tsx`, `not-found.tsx`, sub-rotas dedicadas

### Componentes específicos

Em `src/components/votacao/` (7 componentes):

| Arquivo | Função | Composição DS? |
|---|---|---|
| `filtros.tsx` | FilterChips (Casa, Resultado, Só nominais) + select Ano | Sim |
| `votacao-card.tsx` | Card listagem c/ resultado badge | Sim (hover Wave 6.2+) |
| `perfil-header.tsx` | Header detalhe c/ DataBadges + TrustBadge | Sim (Wave 6.3) |
| `votos-resumo.tsx` | Tabela texto-puro SIM/NÃO/Abst/Aus, % numérico | **Sem gráfico** |
| `votos-por-partido.tsx` | Tabela HTML por partido (Sigla × tipo voto) | **Sem gráfico** |
| `votos-individuais.tsx` | Lista filtrada por `?voto=X` (URL query) | Híbrido |
| `proposicao-vinculada.tsx` | Link-card a proposição linkada | Sim |

### Queries

Em `src/lib/queries/votacoes.ts`:

`listVotacoes` (cached `listagemFiltrada`), `getVotacaoById` (**sem cache**),
`getProposicaoVinculada`, `getVotosByVotacao`,
`getVotosResumoPorPartido`, `countVotacoes` (cached),
`getAnosVotacaoDistintos`, `getVotacoesRecentes`.

**Ausentes para Wave 9**: `getOrientacoesByVotacao`,
`getDisciplinaPartidariaPorVotacao`, `getRebeldesByVotacao`,
`getVotacoesRelacionadas`, `listVotacoesCursor`.

### Schemas Drizzle relevantes

`votacao` (aggregate root, trust_level L1-L4), `voto_nominal` (PK
{votacaoId, parlamentarId}), `orientacao_bancada` (PK {votacaoId,
partidoSigla}). Enum `TipoVoto`: SIM, NAO, ABSTENCAO, AUSENTE,
OBSTRUCAO.

`orientacao_bancada` é a tabela **subutilizada** que destrava a narrativa
de disciplina/rebelião da Wave 9.

### Gaps vs /parlamentares (Wave 7) e /proposicoes (Wave 8)

| Camada | Wave 7/8 hoje | /votacoes hoje | Gap a fechar Wave 9 |
|---|---|---|---|
| Render mode detalhe | Dynamic + cache edge | `force-dynamic` | Resolver via client-component filter (D7) |
| Paginação listagem | Cursor ADR-026 v1 | `limit=50` offset | Aplicar ADR-026 |
| KpiStrip detalhe | 4 slots narrativos | 4 slots quantitativos crus | KpiStrip híbrido (D1) |
| Breadcrumb detalhe | Presente | Ausente | Adicionar |
| Compartilhar | CompartilharButton WhatsApp/X | Ausente | Adicionar |
| Accordion mobile | Sim | Não (renderiza flat) | Adicionar |
| Dataviz | Recharts Donut + Bar | Tabelas texto-puro | Adicionar (D3, D4) |
| Cross-links footer | Sim | Ausente | Adicionar VotacoesRelacionadasFooter |
| Cache detalhe | Configurado | `getVotacaoById` sem cache | Aplicar `TTL.votacaoHistorica` |
| Narrativa única do domínio | Coerência (W7) / Tramitação (W8) | **Inexistente** | **Disciplina partidária + Rebeldes (D5)** |

---

## Princípios norteadores (Wave 9)

Oito heranças de Waves 7 e 8 + um princípio novo da Wave 9.

| # | Princípio | Origem |
|---|---|---|
| P1 | **Densidade > floreio.** Espaço por sinal cívico, não estético | CLAUDE.md |
| P2 | **Honestidade do dado preserva trust_level.** Toda agregação ganha L-badge | TRUST-PYRAMID |
| P3 | **Mobile primeiro, 375×667 antes de qualquer outro viewport** | PERSONAS.md |
| P4 | **`--accent` é inflexão narrativa, não CTA** | ADR-024 |
| P5 | **Animação em CSS** (`@starting-style`, View Transitions, scroll-timeline) | ADR-023 |
| P6 | **Dados → cache de edge ou SSG com revalidate** | ADR-018 + CLAUDE.md §9 |
| P7 | **Cada eixo do produto tem narrativa singular.** Parlamentar = coerência; Proposição = ciclo de vida; Votação = tensão coletiva instantânea | herdado Wave 8 (estendido) |
| P8 | **Uniformidade visual entre eixos.** HeroSection plain em todas as rotas | Wave 8 |
| **P9** | **Votação é evento, não pessoa nem processo.** Layout precisa transmitir colapso temporal: a decisão aconteceu, está congelada, e o desafio é desempacotar quem decidiu o quê. Diferente de Wave 7 (carreira longitudinal) e Wave 8 (timeline de tramitação), Wave 9 trabalha com **um único instante** | novo Wave 9 |

P9 consequência prática: o KpiStrip da votação (D1) e o gráfico principal
(D3 hemiciclo) reforçam o caráter de "fotografia da decisão" — não há
linha do tempo na rota de votação, há uma cena. Em contrapartida, o
cross-link footer (D5/Sprint 9.4) traz contexto temporal vizinho ("outras
votações do mesmo órgão na mesma janela").

---

## Decisões cravadas

### Decisões transversais (herdadas)

- **HeroSection `variant="plain"` em todas as rotas, sem exceção** (P8, herdado Wave 8)
- **Cadência de release: 1 tag única por wave** (`v0.9.0-votacao-360` ao final do Sprint 9.5). Sem tags intermediárias `-alpha.X` ou `-rc.X`. Sprints fecham via comentário no PR e atualização deste plano, não via git tag.

### D1 — KpiStrip do detalhe (4 slots: híbrido)

**Decisão:** SIM · NÃO · Margem · Disciplina média.

| Slot | Label | Value | Hint |
|---|---|---|---|
| 1 | **SIM** | `{N}` (contagem nominal) | `{P}% dos nominais` |
| 2 | **NÃO** | `{N}` (contagem nominal) | `{P}% dos nominais` |
| 3 | **Margem** | `+{delta}` (votos a favor) | `votos a favor` ou `votos contra` (signed) |
| 4 | **Disciplina média** | `{P}%` | `média dos partidos com orientação` |

**Why:** SIM/NÃO são âncoras cognitivas — eliminar quebra contrato implícito
com leitor casual. Margem (delta absoluto) é a métrica que define "decisão
apertada vs. consensual", impossível derivar visualmente dos % isolados.
Disciplina média é a métrica de identidade Wave 9 — só faz sentido em
votações, transporta significado político imediato.

**Fallback:** se `orientacao_bancada` está vazia (votação simbólica, antiga),
slot 4 mostra `—` com hint `"sem orientações registradas"`. Não some — a
ausência é informação.

### D2 — HeroSection variant

**Decisão fixa, não revisitar:** `variant="plain"`.

### D3 — Gráfico principal do detalhe

**Decisão:** **Hemiciclo SVG em desktop (≥768px) · Donut em mobile**.

- **Desktop:** `VotacaoHemicicloChart` — arco semicircular SVG puro
  (~80 linhas, sem lib externa, sem impacto no orçamento ADR-025 de
  Recharts). Cada parlamentar = 1 ponto, posicionado por partido,
  colorido por voto (verde=SIM, vermelho=NÃO, amarelo=Abstenção,
  cinza=Ausente). Visualmente único — referência direta ao plenário
  físico.
- **Mobile:** `VotosConsolidadosChart` (Donut SIM/NÃO/Absent) — reuso
  direto da Wave 8. Densidade legível em 375×667.
- **Critério de switch:** CSS container query `@container (min-width:
  768px)`, fallback graceful se container query indisponível
  (`@media` fallback).

**Why:** hemiciclo é a metáfora visual mais honesta de uma votação. Em
desktop entrega identidade visual única e ainda transmite densidade
informacional (513 deputados ou 81 senadores cabem em <500px de altura).
Em mobile, pontos individuais ficam denso demais — Donut entrega a mesma
informação consolidada com legibilidade.

### D4 — Chart "Votação por partido"

**Decisão:** **Bar horizontal empilhada** (`VotacaoPorPartidoChart`),
adaptação do `ApoioPartidoChart` da Wave 8. Substitui a tabela
`votos-por-partido.tsx` atual.

- Cada barra: partido (sigla) à esquerda, segmentos empilhados
  SIM(verde) + NÃO(vermelho) + Abstenção(amarelo) + Ausente(cinza)
- Ordenação por total nominal descrescente (mantém critério atual)
- Tabela HTML do estado atual vira **fallback acessível** dentro de
  `<details>` com `<summary>Ver tabela numérica</summary>`. Preserva
  acessibilidade plena para leitores de tela e fundamenta export CSV.

### D5 — Seção "Quem rebelou-se" (Rebeldes)

**Decisão:** **Sim, condicional**. Renderiza só se:
1. `orientacao_bancada` retorna ≥1 partido com orientação registrada **E**
2. `getRebeldesByVotacao` retorna ≥1 parlamentar que votou ≠ orientação

**Fallback:** se condição 1 falha (votação sem orientações), seção
inteira some. Se condição 1 passa mas condição 2 falha (todos seguiram
orientação), seção renderiza com empty state honesto: `"Nenhum parlamentar
votou contra a orientação do próprio partido nesta votação."`

**Why:** esta é a feature de identidade única da Wave 9. Faz visível a
dimensão de disciplina partidária real (não retórica) — exatamente o que
P4 (Ativista/ONG) precisa. Condicionalidade respeita P2 (honestidade): não
inventar narrativa onde dado não suporta.

### D6 — Comparação de votações

**Decisão:** **Fora do escopo Wave 9.** Diferida para Wave 10+.

**Why:** caso de uso real (jornalista comparando 1º vs 2º turno) é
parcialmente atendido pelo `VotacoesRelacionadasFooter` (D5/Sprint 9.4) e
não justifica esforço de design dedicado. UI de comparação lado-a-lado
exige decisões próprias (que campos sincronizar, como tratar votações com
quóruns diferentes) que merecem rodada dedicada.

### D7 — Render mode do detalhe

**Decisão (revisada 2026-05-18 após fix #293):** **Client component
filter + página dinâmica + cache de edge nas queries.** A parte SSG
da decisão original foi revertida — ver "Lição empírica" abaixo.

`VotosIndividuais` migra para `'use client'`, consome `useSearchParams()`
e filtra in-memory a lista completa (~513 ou ~81 votos) já carregada no
servidor. Remove `dynamic = 'force-dynamic'` da página — agora roda
como dinâmica padrão (server-rendered on demand). Cache de edge nas
queries `cached()` (Sprint 9.0 PR 9.0.3) entrega performance
equivalente a SSG.

**Why:** votações têm cardinalidade finita pequena (centenas de
parlamentares, não milhões de registros). Filter in-memory é trivial,
bundle delta ~2kb gz aceitável (cabe no orçamento ADR-025).

**Lição empírica do fix #293:** o PR 9.2.1 introduziu
`generateStaticParams` confiante de que o "ISR fallback nativo do
Next 16" cobriria long-tail. Após deploy, **todas** as URLs de detalhe
retornaram 500 em produção. Causa: OpenNext em Workers exige binding R2
explícito como incremental cache para servir páginas SSG/ISR — sem R2,
qualquer rota com `generateStaticParams` quebra em runtime. Isso já
estava cravado no comentário do `wrangler.jsonc` ("todas as rotas são
dinâmicas (ƒ). Revisitar quando entrar ISR/Cache Components") e na
Issue #58 — só não foi conectado durante o plano. Lição: validar
SSG/ISR em produção via `curl` empírico antes de mergear (CLAUDE.md §13).

**Trade-off aceito:** sem SSG, primeira request paga DB round-trip; mas
o cache de edge (Sprint 9.0 PR 9.0.3, TTL 7d) cobre revisitas. Paridade
com `/parlamentares/[id]` e `/proposicoes/[tipo]/[numero]/[ano]` que
também são dinâmicas + cached. Quando Issue #58 entregar R2, podemos
reintroduzir SSG em todas as 3 rotas simultaneamente.

### D8 — Paginação da listagem

**Decisão:** migrar `listVotacoes` → `listVotacoesCursor` aplicando
ADR-026 v1 (cursor opaco versionado). Não negociável — dívida técnica
simétrica com /parlamentares e /proposicoes.

**Compat:** rota aceita ambos `?offset=` (deprecated, mantido 1 release)
e `?cursor=` durante Sprint 9.1. Próxima wave remove offset.

---

## Componentes novos & evoluídos

### Reuso direto (sem mudança)

`HeroSection`, `SectionCard`, `SectionNav`, `FilterChips`, `DataBadge`,
`TrustBadge`, `Accordion`, `CompartilharButton`, `Breadcrumb`,
`VotosConsolidadosChart` (Donut, da Wave 8), `recharts-bundle.tsx`
(chunk dedup).

### Evoluídos (adaptados)

| Componente | De | Para | PR |
|---|---|---|---|
| **KpiStrip** | 4 slots quantitativos crus | 4 slots híbridos (D1) | Sprint 9.2 PR4 |
| **ApoioPartidoChart** | Hard-coded "apoio agregado" | `VotacaoPorPartidoChart` com prop `mode` | Sprint 9.3 PR2 |
| **VotacaoCard** | Padrão Sprint 6.2 | Manter, revisão de paridade visual | Sprint 9.1 PR4 |

### Novos

| Componente | Localização | Função |
|---|---|---|
| `VotacaoHemicicloChart` | `src/components/votacao/charts/hemiciclo.tsx` | SVG semicircular, desktop only (D3) |
| `MargemDecisaoBar` | `src/components/votacao/margem-decisao.tsx` | CSS progress bar bilateral SIM↔NÃO |
| `DisciplinaPartidariaChart` | `src/components/votacao/charts/disciplina.tsx` | Bar horizontal % seguiu orientação |
| `RebeldesList` | `src/components/votacao/rebeldes-list.tsx` | Lista condicional (D5) |
| `VotacoesRelacionadasFooter` | `src/components/votacao/footer-relacionadas.tsx` | Cross-links contextuais |

---

## Queries novas

Em `src/lib/queries/votacoes.ts`:

```typescript
getOrientacoesByVotacao(votacaoId: string): Promise<{ partidoSigla: string; orientacao: TipoVoto }[]>

getDisciplinaPartidariaPorVotacao(votacaoId: string): Promise<{
  partido: string
  seguiram: number
  rebelaram: number
  total: number
  pctDisciplina: number  // (seguiram / total) * 100
}[]>

getRebeldesByVotacao(votacaoId: string): Promise<{
  parlamentarId: string
  nome: string
  partido: string
  votou: TipoVoto
  orientacao: TipoVoto
}[]>

getVotacoesRelacionadas(votacaoId: string, limit = 4): Promise<{
  id: string
  casa: Casa
  dataHora: Date
  descricao: string
  aprovada: boolean
  relacao: 'mesma_proposicao' | 'mesmo_orgao_janela'
}[]>

listVotacoesCursor(params: {
  casa?: Casa
  ano?: number
  resultado?: 'aprovadas' | 'rejeitadas'
  somenteNominais?: boolean
  cursor?: string  // opaco versionado v1 (ADR-026)
  limit?: number   // default 24
}): Promise<{
  items: VotacaoListaItem[]
  nextCursor: string | null
}>
```

Cache TTLs (já definidos em `src/lib/cache.ts`):

- `getOrientacoesByVotacao` → `votacaoHistorica` (7 dias)
- `getDisciplinaPartidariaPorVotacao` → `votacaoHistorica` (7 dias)
- `getRebeldesByVotacao` → `votacaoHistorica` (7 dias)
- `getVotacoesRelacionadas` → `votacaoHistorica` (7 dias)
- `listVotacoesCursor` → `listagemFiltrada` (5 min)

Também aplicar `votacaoHistorica` em `getVotacaoById`, `getVotosByVotacao`,
`getVotosResumoPorPartido`, `getProposicaoVinculada` (todas hoje sem cache).

**Índices necessários:** confirmar via `EXPLAIN ANALYZE` em PR 9.0.2 se
`voto_nominal(votacaoId, parlamentarId)` (unique já existente) cobre
`getDisciplinaPartidariaPorVotacao`. Se EXPLAIN mostrar seq scan, abrir
ADR-029 com índice composto justificado (CLAUDE.md §10).

---

## Sequenciamento (6 sprints, 1 tag final)

Cada sprint = unidade lógica, mas **sem tag intermediária**. Fechamento
de sprint = última PR mergeada da unidade. Tag única `v0.9.0-votacao-360`
ao final do Sprint 9.5.

### Sprint 9.0 — Fundamentos & ADR-028

**Objetivo:** preparar terreno sem alterar UX visível.

- **PR 9.0.1** — ADR-028 "Cursor pagination + cache TTL para votações" (doc-only). Justifica extensão ADR-026 ao domínio votações + cravamento de TTL por query. Tamanho ~200 linhas.
- **PR 9.0.2** — Queries novas (`getOrientacoesByVotacao`, `getDisciplinaPartidariaPorVotacao`, `getRebeldesByVotacao`, `getVotacoesRelacionadas`) com testes Vitest. Sem consumo ainda. Anexar output `EXPLAIN ANALYZE` no PR (CLAUDE.md §10).
- **PR 9.0.3** — Cache wrappers em `getVotacaoById`, `getVotosByVotacao`, `getVotosResumoPorPartido`, `getProposicaoVinculada` (TTL `votacaoHistorica`). Confirmar empiricamente `cf-cache-status: HIT` em revisita (CLAUDE.md §13).
- **PR 9.0.4** — `listVotacoesCursor` adicionada (não consome ainda). Mantém `listVotacoes` legacy.

**Saída:** zero diff visual, fundação completa.

### Sprint 9.1 — Listagem /votacoes reskin

**Objetivo:** simetria com /parlamentares e /proposicoes.

- **PR 9.1.1** — HeroSection v2 na listagem (kicker "Câmara + Senado", título, descrição com volume "N votações desde X")
- **PR 9.1.2** — KpiStrip narrativa global no topo da listagem: "Total · Aprovadas · Rejeitadas · Última votação"
- **PR 9.1.3** — Migração offset → cursor (consome `listVotacoesCursor`). Skeleton de loading + empty state honesto.
- **PR 9.1.4** — Revisão FilterChips: paridade visual com Wave 8, sem regressões.

### Sprint 9.2 — Detalhe: moldura

**Objetivo:** alinhar a moldura do detalhe ao padrão Wave 7/8.

- **PR 9.2.1** — Resolver D7: mover `?voto=X` para client component `VotosIndividuais`. Remove `force-dynamic`. (SSG via `generateStaticParams` foi tentada e revertida em fix #293 por incompatibilidade com Workers OpenNext sem R2 — ver D7 atualizada.)
- **PR 9.2.2** — `VotacaoBreadcrumb` + Header v2 (sub-line com casa, órgão, data; chips aprovada/rejeitada com tone semântico).
- **PR 9.2.3** — `CompartilharButton` adaptado. Template WhatsApp: `"Votação [descrição] — [Aprovada/Rejeitada] por [N] a [M] em [casa]. Veja como cada parlamentar votou: [URL]"`.
- **PR 9.2.4** — KpiStrip híbrido conforme D1.
- **PR 9.2.5** — `<Accordion type=multiple>` mobile envolvendo as seções, default-expanded em desktop.

### Sprint 9.3 — Charts

**Objetivo:** dataviz que define identidade Wave 9.

- **PR 9.3.1** — `VotosConsolidadosChart` (reuso Wave 8) em SectionCard "Votos consolidados".
- **PR 9.3.2** — `VotacaoPorPartidoChart` (bar horizontal, adaptação `ApoioPartidoChart`). Substitui tabela `votos-por-partido.tsx`; tabela vira fallback acessível em `<details>`.
- **PR 9.3.3** — `MargemDecisaoBar` (CSS progress puro, sem JS) acima do Donut/Hemiciclo.
- **PR 9.3.4** — `VotacaoHemicicloChart` (SVG arc, desktop only via container query). Validar bundle ≤120kb gz (ADR-025 v0.3). Anexar output de `cf:build` no PR.

### Sprint 9.4 — Disciplina & Rebeldes

**Objetivo:** narrativa de identidade Wave 9.

- **PR 9.4.1** — SectionCard "Disciplina partidária" com `DisciplinaPartidariaChart`. Condicional (renderiza só se há orientações).
- **PR 9.4.2** — SectionCard "Quem rebelou-se" com `RebeldesList`. Link a `/parlamentares/[id]` por linha. Empty state condicional (D5).
- **PR 9.4.3** — `VotacoesRelacionadasFooter` (cross-links: mesma proposição + mesmo órgão na janela ±30 dias).

### Sprint 9.5 — Polish & tag final

**Objetivo:** fechar wave com qualidade auditável.

- **PR 9.5.1** — OG image v2 do detalhe: hemiciclo simplificado + título + casa/data.
- **PR 9.5.2** — `loading.tsx` + `error.tsx` específicos da rota (skeletons que casam com layout real).
- **PR 9.5.3** — Auditoria a11y: ARIA labels nos charts (`aria-describedby` apontando para fallback textual), keyboard nav nos chips, focus visible.
- **PR 9.5.4** — Lighthouse run mobile 3G simulado, anexar relatório (CLAUDE.md §13). Visual QA via skill `visual-qa`. Release notes via skill `release-notes` com arg `v0.9.0-votacao-360`.
- **PR 9.5.5** — Tag final `v0.9.0-votacao-360`.

---

## Contratos de fallback

Matriz de honestidade Wave 9. Cada cenário tem comportamento cravado.

| Cenário | Componente | Comportamento |
|---|---|---|
| Votação sem orientações registradas | KpiStrip slot 4 (Disciplina) | Mostra `—` + hint `"sem orientações registradas"` |
| Votação sem orientações registradas | Sprint 9.4 SectionCard Disciplina | Seção inteira não renderiza |
| Votação sem orientações registradas | Sprint 9.4 SectionCard Rebeldes | Seção inteira não renderiza |
| Votação com orientações mas zero rebeldes | SectionCard Rebeldes | Renderiza com empty state: `"Nenhum parlamentar votou contra a orientação do próprio partido."` |
| Votação simbólica (zero nominais) | KpiStrip slots 1/2/3 | Slot 1/2 mostram `0`; Slot 3 mostra `—` + hint `"Votação simbólica — sem registro nominal"` |
| Votação sem proposição vinculada | SectionCard "Proposição vinculada" | Mensagem honesta `"Votação avulsa, sem proposição ligada"` (não esconde) |
| Lista de votos individuais > 600 | `VotosIndividuais` (client) | Filter in-memory é OK até ~1k itens. Acima disso, paginar (não previsto Wave 9) |
| Bundle do hemiciclo + Recharts > 120kb gz | Sprint 9.3 PR4 | Bloquear merge. Investigar tree-shake do `recharts-bundle.tsx`. Se irresolvível, hemiciclo vira desktop-only behind feature flag e dev resolve antes de tag |

---

## Métricas de sucesso

| Métrica | Baseline (hoje) | Alvo Wave 9 | Como medir |
|---|---|---|---|
| Lighthouse Performance `/votacoes/[id]` | ~85 (dynamic) | ≥95 | Lighthouse CI no Sprint 9.5 PR4 |
| Bundle JS first-load detalhe | ~140kb gz | ≤165kb gz (com hemiciclo) | `npm run cf:build` output |
| LCP mobile 3G simulado | ~3.2s | ≤2.0s | Lighthouse 3G slow |
| TTI desktop | ~1.8s | ≤1.2s | Lighthouse |
| `cf-cache-status: HIT` em revisita do detalhe | MISS (force-dynamic) | HIT | `curl -I` em produção, anexar literal no PR (CLAUDE.md §13) |
| Mobile sem scroll-x indevido | Quebra em `votos-por-partido` | Zero quebras | Visual QA viewport 375 |
| Cobertura de testes Vitest queries novas | n/a | ≥80% das funções D5/disciplina | `npm run test:coverage` |
| PRs auto-merged Wave 9 | n/a | ≥80% | Label `auto-merged-wave-9` (estende política Wave 6 §6 se autorizada) |

---

## Riscos & mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Hemiciclo SVG visualmente pobre vs Donut | Média | Médio | Rodada de design isolada antes de PR 9.3.4. Fallback Donut em mobile já garante baseline |
| `?voto=X` → client component prejudica SEO | Baixa | Baixo | Votos individuais são UX exploratório, não conteúdo indexável. Título/H1/headers permanecem SSR |
| Cursor pagination quebra deep-links existentes | Baixa | Médio | Compat: rota aceita `?offset=` (deprecated) E `?cursor=` durante Sprint 9.1. Remover no próximo release |
| `getDisciplinaPartidariaPorVotacao` pesado em DB | Média | Médio | EXPLAIN ANALYZE em PR 9.0.2. Se seq scan, índice via ADR justificado. Cache `votacaoHistorica` |
| Bundle Recharts + hemiciclo > 120kb gz | Média | Alto | ADR-025 v0.3 controla. Hemiciclo é SVG puro (não conta). Sprint 9.3 PR4 valida e bloqueia merge se exceder |
| Empty states de Rebeldes confundem usuário | Baixa | Baixo | Copy honesto, não esconder seção quando há orientações. Revisão de copy em PR 9.4.2 |
| `generateStaticParams` top-200 deixa votações importantes off-SSG | Baixa | Médio | Top-200 cobre ~95% do tráfego esperado (votações recentes). Long-tail rende ISR fallback |

---

## Fora de escopo

Diferido para Wave 10+:

- **Comparação inter-votação** (lado a lado) — D6 cravada como fora de escopo
- **Watchlist / "seguir votação"** — depende de auth
- **Notificações de orientações divergentes** — depende de auth
- **Diff de versões de proposta votada** — depende de ingestão texto integral
- **Sub-rotas dedicadas** (`/votacoes/[id]/por-bancada`, `/votacoes/[id]/individuais`) — sem evidência de demanda; tudo no mesmo `[id]/page.tsx`
- **Mapa de UFs** (heatmap geográfico SIM/NÃO por estado) — interessante mas exige rodada própria de dataviz; deferido
- **Export CSV no detalhe** — `countVotacoes` da Sprint 3.0 já cobre na listagem; detalhe pode ganhar em Wave 10
- **Analytics Plausible** — segue plano de wave dedicada quando ligar
- **Light mode** — fora de qualquer wave atual

---

## Ordem de execução pós-aprovação

1. **Sprint 9.0 PR 9.0.1** — ADR-027 (doc-only, sem código). Skill `new-adr`.
2. **Sprint 9.0 PR 9.0.2** — Queries novas + testes + EXPLAIN ANALYZE.
3. **Sprint 9.0 PR 9.0.3** — Cache wrappers de detalhe.
4. **Sprint 9.0 PR 9.0.4** — `listVotacoesCursor` (sem consumir ainda).
5. **Sprint 9.1** PRs 1→4 em ordem.
6. **Sprint 9.2** PRs 1→5 em ordem. PR 9.2.1 (resolver force-dynamic) tem prioridade por desbloqueio.
7. **Sprint 9.3** PRs 1→4. PR 9.3.4 (hemiciclo) bloqueia tag se exceder bundle budget.
8. **Sprint 9.4** PRs 1→3.
9. **Sprint 9.5** PRs 1→5 (último é a tag).

Cada PR deve:

- Linkar este plano nas decisões aplicáveis (`Decisão Dx do WAVE-9-VOTACOES-PLAN.md`)
- Anexar output literal de evidência empírica quando aplicável (CLAUDE.md §13)
- Manter tamanho ≤400 linhas de diff útil (excluindo testes e migrations geradas)
- Atualizar este plano se uma decisão precisar mudança (com justificativa explícita no PR description)

---

## O que NÃO está neste plano

- **Copy literal de UI** (strings em PT-BR): definir no PR de cada
  componente, ancorado em PERSONAS e tom do produto. Owner revisa
  copy crítico (KpiStrip labels, empty states de Rebeldes, share
  template WhatsApp).
- **Specs visuais exatas** (tokens, spacing, breakpoints precisos): seguir
  composições e tokens existentes do design system. Desvios exigem
  registro no PR + revisão antes de merge.
- **Implementação literal das queries** (SQL exato dos novos JOINs): será
  resolvida no PR 9.0.2 com EXPLAIN ANALYZE como evidência. Reservar
  espaço para descoberta empírica.
- **ADR-029** (Hemiciclo SVG sem lib): **opcional**, abrir só se durante
  Sprint 9.3 PR4 surgir decisão arquitetural não trivial (ex: SVG vs Canvas,
  componente compartilhável). Por padrão, hemiciclo é implementação interna
  sem ADR.

---

**Status final:** plano cravado, 7 tasks criadas em TaskList, primeira ação
imediata é Sprint 9.0 PR 9.0.1 (ADR-028 via skill `new-adr`).
