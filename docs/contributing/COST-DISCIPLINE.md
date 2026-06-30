# Disciplina de custo — princípios 8-13

> Referência para contributors. Documenta os princípios de custo operacional
> do projeto (CLAUDE.md §8-13) com exemplos concretos de como se manifestam
> em código e decisões de arquitetura.

Brasil à Vera é mantida por doação com custo operacional próximo de zero.
Isso não é aspiração — é restrição de design. Os princípios abaixo são
guard-rails que mantêm o banco (Neon serverless) e o runtime (Cloudflare
Workers) dentro da faixa gratuita ou sub-$5/mês.

---

## Princípio 8 — Cache de edge em toda query de Server Component

> Toda nova query em `src/lib/queries/**` consumida por server component
> tem cache de edge configurado. Sem cache = decisão intencional no PR.

**Por quê:** Neon cobra por compute time de conexão. Cada `SELECT` sem cache
toca o banco. Em SSG + ISR, a mesma query pode ser respondida do CDN sem
custo de DB.

**Como se manifesta:**

```typescript
// ✅ Query com cache (padrão)
import { cached } from '@/lib/cache'
import { TTL } from '@/lib/cache-ttl'

export const getRankingAlinhamento = cached(
  async (limit: number) => { /* drizzle query */ },
  { tags: ['rankings'], revalidate: TTL.rankings }, // 24h
)

// ❌ Query sem cache — precisa de justificativa explícita no PR
export async function getVotacoesRecentes() {
  return db.select(...) // sem cached() → toca DB a cada request
}
```

TTLs canônicos estão em `src/lib/cache-ttl.ts`. Antes de criar um TTL novo,
verifique se o existente serve.

**Exceções documentadas:**
- `/api/health` — dinâmico por design (sinaliza DB vivo sem caching)
- Buscas e filtros customizados — `searchParams` força dynamic rendering
- Área logada (`/painel/*`) — personalização impede cache compartilhado

---

## Princípio 9 — SSG com `revalidate` periódico nas páginas de detalhe

> Páginas de detalhe usam SSG com `revalidate` periódico — não dynamic
> rendering. Dynamic rendering somente em buscas e filtros customizados.

**Por quê:** Dynamic rendering = query DB a cada request de cada usuário.
SSG + revalidate = uma query por janela de tempo, independente do volume
de tráfego.

**Como se manifesta:**

```typescript
// ✅ Página SSG com revalidate (padrão para perfis e listagens estáticas)
export const revalidate = 3600 // revalida a cada 1h

// ✅ Dynamic rendering justificado (filtros do usuário)
// src/app/parlamentares/page.tsx — searchParams força dynamic
export default async function ParlamentaresPage({ searchParams }) { ... }

// ❌ Dynamic rendering sem necessidade
export const dynamic = 'force-dynamic' // sem comentário explicando por quê
```

**Regra prática:** se a página tem `searchParams` ou `auth()`, provavelmente
é dynamic por necessidade. Se não tem, deve ser SSG.

---

## Princípio 10 — `EXPLAIN ANALYZE` antes de todo novo índice

> Antes de criar índice novo, anexar output de `EXPLAIN ANALYZE` no PR
> provando que a query atual precisa dele.

**Por quê:** Índice = overhead de escrita permanente. Toda `INSERT`/`UPDATE`
na tabela indexada paga o custo de manter o índice. No Neon serverless, isso
afeta o compute time da ingestão diária.

**Como se manifesta no processo de PR:**

```sql
-- Antes de propor o índice, rodar no banco de staging:
EXPLAIN ANALYZE
SELECT * FROM votacoes.votacao
WHERE casa = 'CAMARA' AND proposicao_id IS NULL
ORDER BY data_hora DESC
LIMIT 100;

-- Copiar o output e colar no PR. Se aparece Seq Scan com cost alto → índice justificado.
-- Se aparece Index Scan existente ou cost < 1ms → índice desnecessário.
```

**Índices já criados seguem esse padrão.** Ver comentários em `src/shared/db/schema.ts`
e `src/modules/*/domain/schema.ts` — cada `index()` tem comentário com a
query que o justifica.

---

## Princípio 11 — Campos `text` longos → URL + fetch on-demand

> Antes de adicionar campo `text` com média estimada > 500 bytes, considerar
> armazenar URL + fetch on-demand em vez do conteúdo inline.

**Por quê:** Texto longo em tabela relacional infla o banco linearmente.
Neon cobra por armazenamento. R2 (Cloudflare) é mais barato para conteúdo
estático grande.

**Exemplo em produção:**
- Discursos (`ingestion/camara/discursos.ts`, `ingestion/senado/discursos.ts`):
  metadados ingeridos (data, título, URL), texto integral não armazenado (#512).
  Quando o texto completo for necessário, virá via URL do arquivo + arquivamento
  em R2 — não coluna `text` no Neon.

**Regra prática:** se o campo vai guardar `ementa_completa`, `texto_pl`,
`transcrição_discurso` ou similar — R2 primeiro, DB depois.

---

## Princípio 12 — Ingestão em batch; banco scale-to-zero é a norma

> Crons de ingestão concentram trabalho em batches curtos. Não disparar
> queries fora dos windows de ingestão planejados.

**Por quê:** Neon serverless escala a zero após inatividade. A primeira query
após scale-to-zero paga o custo de cold start (~100-300ms de conexão). Se o
monitor de saúde pinga o banco a cada minuto, o banco nunca escala a zero e
o compute time acumula.

**O que segue essa regra:**
- `GET /api/health` retorna `{ status: "ok" }` sem tocar o DB
- Probes de monitoring apontam para `/api/health`, nunca para rotas com `SELECT`
- Budget poll (`budget-poll.yml`) consulta a API do Neon, não o banco
- Crons de ingestão têm `concurrency: group` que previne runs paralelos

**O que viola essa regra (e não deve ser replicado):**
- Qualquer probe que execute `SELECT 1` ou similar para "verificar se o banco está vivo"
- Webhooks que disparam queries síncronas fora dos windows de ingestão

---

## Princípio 13 — Validação empírica antes de implementação

> Decisões de cache, performance ou runtime behavior exigem validação
> empírica antes de implementação. Hipótese teórica não basta.

**Por quê:** o projeto perdeu uma semana revertendo PR #57 (hipótese sobre
CDN em `*.workers.dev` falsificada após merge). Teoria sobre edge cache,
latência de DB e comportamento de CDN deve ser confirmada com `curl` real
antes de entrar em `main`.

**Como se manifesta no processo de PR:**

1. **Hipótese:** "O `cf-cache-status: HIT` em `/parlamentares` vai reduzir
   o P95 de 800ms para <50ms."
2. **Gate empírico:** rodar `curl -I https://brasilavera.org/parlamentares`
   e copiar o header literal no PR.
3. **Só então mergear.**

**Limitações conhecidas documentadas com esse princípio:**
- `/parlamentares` é dynamic (searchParams + auth) → sem SSG; medir LCP em
  prod antes de propor mudança (#104)
- API Senado `/votacao` tem janela deslizante de ~12 meses → confirmado
  empiricamente 2026-06-23, documentado em #566 e DATA-SOURCES.md

**Forma de registrar no PR:**
```
Validação empírica:
$ curl -I https://brasilavera.org/sobre/metodologia
cf-cache-status: HIT
age: 3421
[output literal copiado do terminal]
```

---

## Referências

- `docs/contributing/DATA-SOURCES.md` — cobertura e limitações por fonte
- `docs/architecture/ADR/017-budget-mensal-observabilidade.md` — thresholds de custo
- `docs/architecture/ADR/018-cache-edge-app.md` — estratégia de cache de edge
- `ingestion/registry.ts` — registro de cadências e timeouts de ingestão
