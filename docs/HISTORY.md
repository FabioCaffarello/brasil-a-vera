# História operacional — Brasil a Vera

> Lore versionado do projeto: cronologia de waves, incidentes nomeados e a
> origem dos princípios do `CLAUDE.md`. Criado em 2026-06-10 (auditoria do
> harness, decisão D-MEM): lições que antes viviam apenas na memória local
> do Claude Code passam a ter o conteúdo durável destilado aqui — a memória
> de ferramenta vira cache, não fonte única. Release notes em
> `docs/releases/` continuam sendo o registro primário por versão; este
> documento é o índice narrativo transversal.
>
> **Ritual de manutenção:** a skill `/release-notes` inclui o passo de
> atualizar a cronologia (e promover incidentes) aqui ao fechar cada
> wave — este doc é alimentado pelo único ritual que comprovadamente
> roda toda wave, para não apodrecer como a tabela do WORKFLOWS.md.

---

## Cronologia de waves

| Wave | Tema | Fechamento | Marcos |
|---|---|---|---|
| 0–1 | Fundação: monolito Next.js, Neon, deploy Cloudflare Workers, ingestão Câmara/Senado | — | ADRs 001–011 |
| 2 (2.0/2.1/2.2) | Observabilidade, disciplina de custo, distribuição | 2026-05-13 (`v0.2-final`) | 32 PRs; ADRs 010, 013–018; princípios 8–13 do CLAUDE.md; incidente PR #57 |
| Auditoria pré-3 | Reescrita da Wave 3, ADR-019 (disciplina sem gargalo) | 2026-05-13 (PRs #106/#107) | 24 issues triadas; 8 fechadas won't do |
| 3 (3.0/3.0.5/3.1/3.2) | Honestidade de dados, identidade cívica, distribuição (OG/RSS/docs) | 2026-05-15 (`v0.3.2-distribution`) | ADR-020 (Go descartado — supersede parcial dos ADR-002/007); recalibragem top-5; paleta navy |
| 4 | Design system próprio: shadcn curado, tokens OKLCH dark-first | 2026-05-15/16 | ADR-021; `src/design-system/` |
| 5 | Ecossistema Claude Code: roles, hooks, skills, agents | 2026-05-16 (Sprint 5.0) | `ROLES.md` + `path-matchers.sh`; 3 hooks; 6 skills; `design-system-curator` |
| 6 (6.0–6.4) | Reskin completo sob regime auto-merge | 2026-05-16 | ADRs 023/024; composições (HeroSection, KpiStrip, SectionCard…); `frontend-skin-helper` (aposentado 2026-06-10); cláusula auto-merge (encerrada 2026-06-10) |
| 7 | Charts e visualização | `v0.7.0` | ADR-025 (chart lib) |
| 8 | Proposição 360° | `v0.8.0` | ADR-026 (paginação cursor) |
| 9 | Votação 360° | `v0.9.0` | Incidentes #293 e #303→#304 (abaixo); ADR-028 |
| 10 | Área logada: Clerk, alertas, LGPD | 2026-05-19 (`v0.10.0-area-logada`) | 26 PRs; ADRs 029/030/031; revisão dos matchers (origem do drift abaixo) |
| Pós-10 | Refactor painel em tabs; licença; migração RDS | em curso | ADR-032; ADR-027; ADR-033 (RDS); auditoria do harness (2026-06-09/10) |

Convenção de versionamento consolidada nas Waves 7–9: **1 tag final por
wave**, sem `-alpha.X`/`-rc.X` intermediários (`v0.7.0`/`v0.8.0`/`v0.9.0`
puras).

---

## Incidentes nomeados

Cada incidente abaixo virou princípio, ADR ou guard determinístico. O
padrão a preservar: **processo falhou, registramos sem maquiagem,
seguimos**.

### PR #57 — o cache que só existia na teoria (Wave 2.0)

Hipótese de que URLs `*.workers.dev` teriam edge CDN nativo foi mergeada
sem validação e **falsificada empiricamente depois do merge** — revert.
Virou o **princípio 13** do CLAUDE.md: decisão de cache, performance ou
runtime behavior exige validação empírica (curl/script em ambiente real,
output literal no plan/PR) antes de mergear. É o princípio mais citado
das waves seguintes.

### O Neon que não dormia — crawlers vs scale-to-zero

O compute do Neon deveria suspender após ~5min sem queries; o dashboard
mostrava RAM alocada 24/7. Ofensores típicos: crawlers (GPTBot,
ClaudeBot, AhrefsBot, SemrushBot, PerplexityBot, Bytespider) batendo em
rotas dinâmicas. Resposta: `robots.txt` bloqueando bots comerciais e de
IA, instrumentação `TODO(investigate-neon-wake)` no middleware/cache/
queries, e runbooks `docs/ops/INVESTIGATE-NEON-WAKE.md` +
`docs/ops/NEON-HYGIENE.md`. Reforçou o **princípio 12** (probes de
monitoramento batem `/api/health`, que não toca DB).

### Fix #293 — SSG no Workers sem R2 (Wave 9)

O PR 9.2.1 introduziu `generateStaticParams` (SSG top-200) em
`/votacoes/[id]`; **todas as URLs de detalhe passaram a retornar HTTP
500 em produção** — OpenNext em Cloudflare Workers sem R2 incremental
cache não sustenta SSG. Fix #293 reverteu para página dinâmica + cache
de edge, preservando o filtro client-side via `useSearchParams`; a
decisão D7 do plano da Wave 9 foi revisada por escrito. Reintrodução de
SSG nas 3 rotas de detalhe está condicionada ao R2 incremental cache
(issue #58), com validação `curl` em produção antes do merge. Nuance ao
**princípio 9**: SSG continua sendo o alvo para páginas de detalhe, mas
só com a infraestrutura de cache que o sustenta.

### #303 → #304 — `hsl(var())` × OKLCH: o fix que não corrigia (Sprint 9.5)

Todos os charts SVG/Recharts das Waves 7–9 usavam
`fill="hsl(var(--chart-X))"` — sintaxe que exige token em componentes
HSL crus (padrão pré-Tailwind v4). Os tokens migraram para OKLCH
completo no Sprint 4.0, então a expressão expandia para
`hsl(oklch(...))` — **CSS inválido, fills pretos**. O primeiro fix
(#303) mudou o *valor* do token confiante de que resolveria; o consumer
nunca conseguia parsear a expressão, então nada mudou. O #304 corrigiu a
*sintaxe* em 30 ocorrências de 7 arquivos (`var(--X)` direto;
`color-mix(in oklch, ...)` para opacidade). Lição destilada: **mudança
visual exige screenshot/auditoria WCAG empírica antes do merge — Biome +
TypeScript + build passando não detectam cor inválida.** Padrões de uso
documentados em `docs/design/DESIGN-TOKENS.md` §charts.

### Token bridge da Fase B — o no-op silencioso, agora com guard (→ ADR-034)

A Fase B da migração RDS (traduzir os compartilhados) começou pela mesma
classe de falha do #303/#304, num disfarce novo. O pacote RDS só ship o CSS
**pré-compilado** das utilities que SEUS componentes usam (README: "no Tailwind
setup required — use our components"). Escrever classes RDS no JSX do BaV
(`bg-fg-brand/10`, `bg-surface-canvas`, `ring-line-focus`) funcionava só para o
subconjunto pré-compilado; o resto — variantes de opacidade, bases não
pré-compiladas — **no-opava silenciosamente** (build verde, sem cor). As 3 rotas
já promovidas (`/privacidade`, `/feed`, `/partidos`) tinham defeitos latentes que
ninguém viu — exatamente como a suíte vermelha do drift ROLES. A fundação (ADR-034)
foi um *token bridge* no `globals.css` (import global do CSS do RDS + `@theme
inline` registrando os tokens semânticos) que faz o Tailwind do BaV gerar a
superfície completa, incl. opacidade. Mas a lição que **fecha** o ciclo do #303/#304
é o `scripts/rds-noop-guard.ts`: roda depois do build no job required e falha se
qualquer classe RDS usada não tiver regra no CSS gerado. Onde o #303/#304 dependia
de QA visual humano (que não existe automatizado), o no-op de *classe* (≠ cor
inválida) é **detectável por máquina** — e o guard pegou 5 no-ops pré-existentes na
introdução. Meta-lição: **quando o modo de falha é "a regra não existe", o
contrafactual é automatizável; transforme o QA visual no que sobra de fato visual,
não no que um grep pega.**

### Drift ROLES.md × matchers — a suíte vermelha que ninguém viu (Wave 10 → #365/#368)

Na Wave 10 (2026-05-19) o owner revisou `path-matchers.sh` liberando
migrations e workflows para engineer via Claude. A escritura
(`ROLES.md`, onboardings, mensagem de erro do hook) não acompanhou — e
`test-hooks.sh` ficou **vermelho na main por ~3 semanas (27 PASS / 2
FAIL)** sem que nada quebrasse, porque a suíte só rodava manualmente.
Corrigido na auditoria do harness: #365 (reconciliação + suíte verde) e
#368 (suíte no CI em todo PR + caso de consistência que parseia a
tabela do ROLES.md e a confronta com o matcher — divergência futura
falha o CI). Meta-lição: **teste sem trigger apodrece pelo mesmo
mecanismo que existe para detectar.**

### Migração RDS sem ADR — formalização retroativa (→ ADR-033)

A migração para `@fabio.caffarello/react-design-system` rodou 5 PRs
(#355–#363, incluindo a rota piloto `/rds/partidos/[sigla]`) antes de
existir registro arquitetural, tensionando o ADR-021 ("não como
dependência npm"). O ADR-033 formalizou a decisão e registrou o desvio
nas próprias consequências negativas — parágrafo exemplar do padrão
desta seção:

> **Processo iniciado antes do ADR.** A migração rodou 5 PRs sem registro
> arquitetural — desvio da própria regra do projeto. Registrado aqui como
> lição: iniciativa que tensiona ADR aceito abre o ADR novo **antes** do
> piloto, não depois.

### PR #373 — o teste que mergeou (decisão F8, 2026-06-10)

Durante o teste empírico da armadilha "required check × path filter", um
`PUT /pulls/373/merge` — executado pela sessão Claude apenas para
capturar a mensagem de bloqueio — **mergeou o PR descartável na main**,
ignorando required checks e required review. Duas camadas de causa:

1. **A porta do GitHub**: `enforce_admins=false` não vincula merge de
   admin via API REST; a recusa do `gh pr merge` sem `--admin` é
   checagem *client-side* do CLI. Veredito: manter desligado (owner é o
   único admin; ligar quebraria o fluxo de merge) — limitação documentada
   em `docs/contributing/BRANCH-PROTECTION.md` §Limitação conhecida.
2. **A porta do harness**: o allow de `gh pr:*` cobria `gh pr merge`, e
   `gh api` permitia mutação arbitrária mediante confirmação que, num
   experimento, seria aprovada sem perceber o efeito. Fechada com deny
   explícito de `gh pr merge` e `gh api -X PUT` no
   `.claude/settings.json` — merge é ato do owner desde o encerramento
   do auto-merge Wave 6 (#369).

Lição de desenho de experimento: **teste de mecanismo de bloqueio se
desenha para que o modo de falha seja "bloqueado", não "executado"** —
repo descartável, proteção paralela, ou owner presente no momento da
chamada. O contraste no mesmo dia: a validação do consolidation-guard
(#372) tinha como pior caso "comentário ausente" (dano zero); a do #373
tinha como pior caso um merge — e ele aconteceu. O artefato foi removido
no #374 e o incidente registrado com transparência no próprio #373.

**Atualização 2026-06-13 — auto-merge reabilitado por decisão do owner.**
Durante a leva de adoção do RDS 3.12.0 (home + listagens + painel), o
owner reverteu conscientemente a metade-`gh pr merge` do deny do #373:
Claude Code passa a auto-mergear PRs próprios conforme o CI fica verde.
A reversão é **parcial e deliberada** — só `Bash(gh pr merge:*)` saiu do
deny; `Bash(gh api -X PUT:*)` e `--method PUT` **permanecem negados**
(a porta de mutação arbitrária via API REST, que foi o vetor real do
incidente #373, segue fechada). Auto-merge usa o caminho client-side do
`gh pr merge`, não o `PUT` cru. A salvaguarda contra o modo de falha
original do #373 continua de pé; o que mudou é quem aperta o botão de
merge num PR já verde. Reversível: restaurar a linha no
`.claude/settings.json` se a política mudar de novo.

**Segunda camada — branch protection.** O deny do harness era só metade:
a main exigia `required_pull_request_reviews=1`, que o Claude não pode
satisfazer (não se auto-aprova; projeto solo, sem outro revisor) — daí
`gh pr merge` sem flag dar *"base branch policy prohibits the merge"*.
Decisão do owner: **remover a required review**, **mantendo os 4
required status checks** (`Lint & Build`, `Tests`, `Integration Tests`,
`zinc / HEX / primary-N legacy`). O gate de servidor passa a ser
puramente o CI — "mergeie conforme passar no CI" ao pé da letra — e o
auto-merge usa `gh pr merge --auto` (o GitHub mergeia sozinho quando os
checks ficam verdes), **sem `--admin`** (nenhum override que ignore os
checks). Remoção via `DELETE .../protection/required_pull_request_reviews`
(endpoint específico; não toca os checks). Detalhe em
`docs/contributing/BRANCH-PROTECTION.md`.

### A trilogia do contrafactual — verde só vale com vermelho demonstrado (#368, #372, #379)

Três validações da mesma família, em escalada de custo decrescente, que
cristalizaram o padrão: **check verde não prova semântica; prova é
demonstrar o vermelho que apareceria se o invariante quebrasse.**

1. **#368** — o caso de consistência ROLES.md ↔ matchers no CI: depois
   de 3 semanas de suíte vermelha invisível, o fix incluiu um teste que
   *falha* quando a tabela e o matcher divergirem de novo.
2. **#372** — validação e2e do consolidation-guard via PR descartável:
   antes de confiar no guard, provocou-se deliberadamente o aviso que
   ele deveria emitir.
3. **#379** — a forma mais barata: na primeira carga real do guard (9
   pares de uma vez), um comando local rodou o script contra a tabela
   **pré-PR** e contou os 9 avisos que teriam aparecido sem o registro
   — prova de que o verde era "tabela atualizada", não "silêncio
   acidental". Custo: um comando. De quebra, expôs o falso positivo da
   checagem 2 (#380, corrigido com a mesma disciplina: fixture do #379
   zerando avisos + caso sintético mantendo o aviso legítimo).

O padrão é repertório, não cerimônia: sempre que um guard novo passar
verde pela primeira vez em carga real, perguntar "qual comando me
mostra o vermelho contrafactual?" — se a resposta custa um comando,
não há desculpa para não rodá-lo.

---

## Origem dos princípios 8–13 do CLAUDE.md

| Princípio | Origem |
|---|---|
| 8 — cache de edge em toda query de server component | Wave 2.0, custo Neon por wake desnecessário ([ADR-018](architecture/ADR/018-cache-edge-app.md)) |
| 9 — SSG + revalidate em páginas de detalhe | Wave 2; nuance pós-#293: dinâmica + edge cache até existir R2 incremental cache |
| 10 — índice novo só com `EXPLAIN ANALYZE` no PR | Wave 2.0, disciplina de budget ([ADR-017](architecture/ADR/017-budget-mensal-observabilidade.md)) |
| 11 — texto longo vai pra URL/R2, não pra coluna | Wave 2 ([ADR-016](architecture/ADR/016-cobertura-temporal-arquivamento.md)) |
| 12 — ingestão em batches; probes em `/api/health` | Wave 2.0 + incidente "Neon que não dormia" |
| 13 — validação empírica antes de decisão de runtime | Revert do PR #57 |

---

## Memórias operacionais destiladas

Release notes e ROADMAP referenciam memórias locais do Claude Code
(`feedback_*.md`) que não são versionadas. O conteúdo durável de cada
uma referenciada em docs do repo está destilado aqui — a referência
deixa de ser órfã para quem não opera o Claude Code:

- **`feedback_ssg_workers_r2.md`** — OpenNext em Workers sem R2
  incremental cache quebra `generateStaticParams` em runtime (HTTP 500).
  Detalhe fica dinâmico + edge cache até a issue #58 entregar R2; ver
  incidente #293 acima.
- **`feedback_visual_empirical_validation.md`** — mudança visual exige
  screenshot/WCAG empírico antes do merge; lint + tipos + build não
  detectam CSS inválido. Ver incidente #303→#304 acima.
- **`feedback_release_cadence.md`** — 1 tag final por wave, sem
  `-alpha.X`/`-rc.X` intermediários (padrão Waves 7/8/9).
- **`feedback_hero_section_variant.md`** — `HeroSection` em rotas de
  produto usa variant `plain` universal; `gradient`/`gradient-glow`
  permanecem no DS mas vedadas em rotas de produto sem novo ADR
  (registro na release v0.8.0).

Novas lições seguem o fluxo da decisão D-MEM: o durável entra aqui (ou
em ADR/release note); a memória local da ferramenta é cache de sessão.
