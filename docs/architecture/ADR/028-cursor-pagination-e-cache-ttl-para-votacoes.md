# ADR-028: Cursor pagination e cache TTL para votações

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-05-18
> Status: proposed

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
  - [1. Cursor opaco versionado v1, page-size 24](#1-cursor-opaco-versionado-v1-page-size-24)
  - [2. TTL por tipo de query no detalhe](#2-ttl-por-tipo-de-query-no-detalhe)
  - [3. Invalidação](#3-invalidação)
  - [4. Compatibilidade com URLs antigas](#4-compatibilidade-com-urls-antigas)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Referências](#referências)

---

## Contexto

A Wave 9 ("Votação 360") estende `/votacoes` ao mesmo padrão de qualidade
técnica das Waves 7 (`/parlamentares`) e 8 (`/proposicoes`). Duas dívidas
técnicas isoladas precisam ser resolvidas:

1. **Listagem usa offset pagination** (`limit=50` hard-coded em
   `listVotacoes` em `src/lib/queries/votacoes.ts`), enquanto
   `/parlamentares` e `/proposicoes` migraram para cursor versionado v1
   (ADR-026).
2. **Detalhe `/votacoes/[id]` não cacheia queries de leitura.**
   `getVotacaoById`, `getVotosByVotacao`, `getVotosResumoPorPartido` e
   `getProposicaoVinculada` chamam o Neon diretamente a cada request,
   mesmo sendo dados imutáveis após o fechamento da sessão de votação.

ADR-026 cobre a mecânica de cursor mas seu escopo declarado é Wave 7 —
três listas específicas em `/parlamentares`. Estender ao domínio votações
exige decisão explícita por dois motivos:

- **Page-size** — ADR-026 fixa 20. Listagem de votações é consumida em
  densidade maior (jornalistas escaneando filtros). Vale revisitar.
- **TTL de cache do detalhe** — ADR-018 (cache edge + app) define o
  framework mas deixa o TTL específico para cada domínio. Não há ADR
  cobrindo qual TTL aplicar a queries imutáveis pós-evento.

CLAUDE.md §12 reforça: "banco scale-to-zero do Neon é regra, não
exceção." Cada query não cacheada em rota com tráfego de share
(votações são destino comum de WhatsApp/X) é custo evitável e cold-start
desnecessário.

A jornada **Cidadão Consciente** (P1) termina em compartilhamento — links
como `brasilavera.org/votacoes/<id>` são compartilhados em estado-estável
fora do nosso controle, idêntico ao caso descrito no ADR-026. Mudanças de
schema interno não podem quebrar URLs externos.

Este ADR cristaliza ambos os contratos para o domínio votações.

## Decisão

### 1. Cursor opaco versionado v1, page-size 24

Aplicar ADR-026 ao domínio votações com **uma única alteração:
`page-size = 24`** (vs 20 do ADR-026). Justificativa:

- Listagem de votações é consumida em grid 1-col mobile / 2-col desktop
  (mesmo padrão `/proposicoes`)
- 24 é divisível por 2, 3, 4, 6 → preenche grids harmonicamente em
  qualquer breakpoint (mobile 1×24, tablet 2×12, desktop 3×8, wide 4×6)
- Card de votação é mais denso de informação que parlamentar/proposição
  (3-4 linhas vs 5+), absorve 24 itens sem rolar excessivamente em
  desktop

Demais propriedades **idênticas ao ADR-026**:

- Token opaco em `?after=<token>` (URL-safe base64 de JSON assinado)
- Versionamento `{v: 1, after, limit}` no payload
- "Mostrar mais" como `<a href="?after=...">` puro, scroll-restoration
  nativa
- Versão desconhecida → redirect permanente (308) para página 1
- Reusar helpers `src/lib/cursor.ts` e
  `src/lib/queries/cursor-schemas.ts` (adicionar schema
  `votacoes-list-v1`)

### 2. TTL por tipo de query no detalhe

TTLs já definidos em `src/lib/cache.ts` (`votacaoHistorica = 604_800s` /
7 dias; `listagemFiltrada = 300s` / 5 min). Este ADR cristaliza qual
constante se aplica a cada query.

| Query | TTL | Razão |
|---|---|---|
| `getVotacaoById` | `votacaoHistorica` (7d) | Aggregate root imutável após fechamento da sessão |
| `getVotosByVotacao` | `votacaoHistorica` (7d) | Votos individuais imutáveis |
| `getVotosResumoPorPartido` | `votacaoHistorica` (7d) | Agregação determinística sobre dados imutáveis |
| `getProposicaoVinculada` | `votacaoHistorica` (7d) | Vínculo estabelecido em ingestão, raramente muda |
| `getOrientacoesByVotacao` | `votacaoHistorica` (7d) | Orientações de bancada fixadas pré-votação |
| `getDisciplinaPartidariaPorVotacao` | `votacaoHistorica` (7d) | Agregação determinística |
| `getRebeldesByVotacao` | `votacaoHistorica` (7d) | Agregação determinística |
| `getVotacoesRelacionadas` | `votacaoHistorica` (7d) | Pode ficar levemente stale para votações ingeridas hoje; aceitável |
| `listVotacoesCursor` | `listagemFiltrada` (5min) | Listagem precisa refletir ingestões recentes |
| `countVotacoes` | `listagemFiltrada` (5min) | Idem |

### 3. Invalidação

Cache vence **naturalmente por TTL**. Não há invalidação por escrita
porque:

- Votações fechadas são imutáveis no modelo de domínio (trust_level
  L1-L4 + `ingested_at` congelados após ingestão)
- 7 dias é janela curta o suficiente para correções pontuais via
  re-ingestão refletirem em tempo aceitável
- Implementar invalidação write-through seria complexidade nova sem
  ganho perceptível (tráfego de correção é raro)

Se em produção descobrirmos casos de correção urgente que não podem
esperar 7 dias, abrir ADR sucessor.

### 4. Compatibilidade com URLs antigas

Durante Sprint 9.1 (migração offset → cursor), rota `/votacoes` aceita
**ambos**:

- `?offset=N` — deprecated, retorna mesma resposta que cursor inicial
  (offset 0). Não navega para offsets seguintes — qualquer `?offset=>0`
  cai em página 1 silenciosamente.
- `?cursor=<token>` — novo padrão, versionado v1.

Após release `v0.9.0-votacao-360`, `?offset` é removido completamente.
Janela de 1 release preserva links externos compartilhados em
estado-estável (alinhado com prática ADR-026).

## Alternativas Consideradas

### A. Offset pagination preservado (status quo)

- **Prós**: zero churn, sem migração, sem helper novo
- **Contras**: assimetria com Wave 7 e 8 vira dívida técnica permanente;
  offset escala mal em cache de edge (URLs `?offset=200` são MISS quase
  garantido); jornalista perde idempotência ao adicionar votação nova
  (cardinalidade muda o offset)
- **Veredicto**: rejeitada. Custo de manter assimetria > custo de
  migração curta (Sprint 9.1 PR3).

### B. Cursor sem versionamento

- **Prós**: ainda mais simples que ADR-026
- **Contras**: quando schema de cursor mudar (ex: adicionar campo de
  tie-breaker em `dataHora` ties), URLs externas pré-existentes quebram
  silenciosamente. ADR-026 já resolveu isso ao cravar versionamento como
  contrato.
- **Veredicto**: rejeitada. Reusar mecânica completa ADR-026 inclusive
  versionamento.

### C. Materialized view para listagem

- **Prós**: query mais rápida ainda
- **Contras**: schema duplicado; refresh policy é nova decisão; aumenta
  complexidade de ingestão; ganho marginal para `votacao` com
  cardinalidade moderada (~10k rows/ano)
- **Veredicto**: rejeitada. Cache de edge `listagemFiltrada` já entrega
  o ganho de latência sem complexidade adicional.

### D. Sem cache no detalhe (status quo)

- **Prós**: zero risco de stale data
- **Contras**: cada visita ao detalhe custa N queries no Neon (banco
  scale-to-zero paga cold start). Share WhatsApp gera burst em janela
  curta → cold start repetido. Viola CLAUDE.md §12.
- **Veredicto**: rejeitada. Dados imutáveis pós-fechamento não merecem
  custo de DB hit por request.

### E. TTL longo único (30 dias para tudo no detalhe)

- **Prós**: cache hit rate ainda maior, custo Neon ainda menor
- **Contras**: votações novas (ingeridas há < 30 dias) podem ter
  correções via re-ingestão que não propagam; jornalista lendo análise
  recente vê dado errado
- **Veredicto**: rejeitada. 7 dias é equilíbrio entre custo e tempo
  máximo aceitável para correção propagar.

### F. Page-size 20 (igual ADR-026 sem ajuste)

- **Prós**: zero variação em relação ao padrão estabelecido
- **Contras**: 20 não é divisível por 3 nem 4, gera grids irregulares em
  desktop (4×5, 3×7-resto). Listagem de votações tem densidade
  informacional menor por card → cabem 24 sem prejuízo de cognição.
- **Veredicto**: rejeitada. Ajuste de 4 itens é proporcional ao domínio
  e harmoniza grids.

## Consequências

### Positivas

- Simetria de paginação entre `/parlamentares`, `/proposicoes` e
  `/votacoes` (mesma mental model para cidadão e jornalista)
- `cf-cache-status: HIT` em revisita do detalhe (validar empiricamente
  em PR 9.0.3 + Sprint 9.5 PR4, conforme CLAUDE.md §13)
- Custo Neon reduzido: detalhe estimado a perder ~80% das queries
  diárias em rotas de share (TTL 7d cobre janela típica de tráfego
  noticioso de uma votação)
- Deep links externos com `?offset=` permanecem válidos por 1 release
  (compat curta, não eterna)
- Helpers de cursor já existem (`src/lib/cursor.ts`) → migração é
  adicionar 1 schema, não construir infra

### Negativas

- Correções pontuais via re-ingestão demoram até 7 dias para refletir
  no detalhe → comunicar política em footer "Dados atualizados a cada
  X dias" quando aplicável (não bloqueia esta wave, decisão de UX)
- Listagem fica em janela de 5 minutos — votações ingeridas nesse
  intervalo só aparecem após próximo refresh do cache de edge.
  Aceitável (jornada "votação que aconteceu há 2 minutos" não é
  primária)
- Page-size 24 (vs 20 ADR-026) aumenta payload da listagem em ~20%.
  Mensurar empiricamente bundle/payload no Sprint 9.1 PR3 e validar
  que respeita orçamento ADR-025

### Neutras

- `?offset=` permanece aceito por 1 release → manutenção de dois paths
  temporária na rota
- Helpers `src/lib/queries/cursor-schemas.ts` ganham 1 schema versionado
  a mais (`votacoes-list-v1`) — extensão mínima
- Footer "Dados atualizados a cada 7 dias" passa a ser candidato a copy
  no detalhe (decidir em Sprint 9.2 PR2 ou 9.5 PR3)

## Referências

- [ADR-018 — Cache edge + app](018-cache-edge-app.md)
- [ADR-025 — Chart lib Wave 7](025-chart-lib-wave-7.md) (orçamento de bundle)
- [ADR-026 — Paginação por cursor opaco e versionado em listas SSR](026-paginacao-cursor-ssr.md)
- [WAVE-9-VOTACOES-PLAN.md](../../design/WAVE-9-VOTACOES-PLAN.md) — Decisões D7 (render mode) e D8 (paginação)
- CLAUDE.md §9-§12 — Disciplina de custo Neon serverless
- CLAUDE.md §13 — Validação empírica antes de implementação
