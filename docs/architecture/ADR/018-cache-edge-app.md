# ADR-018: Estratégia de cache no edge para queries do app

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-05-12
> Status: accepted

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Referências](#referências)

---

## Contexto

O app web do Brasil a Vera roda em Cloudflare Workers (ver
[ADR-009](009-cloudflare-pages.md)) com driver `neon-http` (ver
correção em PR #20 e issue #34 para ADR-015 retroativo). Cada
query HTTP ao Neon consome **CU-hours** (Compute Units) — métrica
de billing do Neon que combina tempo de compute ativo e número de
requisições.

Características que tornam o app candidato natural a cache agressivo:

1. **Dados políticos têm cadência de atualização baixa**. Quando uma
   votação acontece, ela é registrada e raramente muda. Quando uma
   proposição entra em tramitação, o ritmo de eventos é diário, não
   por minuto. Quando um parlamentar troca de partido, a mudança é
   rara mas relevante.

2. **App é predominantemente read-heavy**. Wave 1 entregou zero
   mutations no app — todas as escritas vêm de scripts de ingestão
   em GitHub Actions (Node, runtime separado). O app só faz SELECT.

3. **Cloudflare Workers tem Cache API nativa** que não cobra storage
   e é distribuída em todos os datacenters da rede. Custo
   marginal: zero.

4. **Sem cache, Neon não dorme**. O Neon serverless tem
   *scale-to-zero* — se ninguém consultar por ~5 minutos, o compute
   suspende e para de cobrar CU-hours. Tráfego contínuo (mesmo
   pequeno) impede a suspensão. Cache no edge é o mecanismo direto
   pra deixar o banco dormir entre janelas de ingestão.

Sem estratégia explícita, cada `npm run dev` local + visita real à
produção dispara N queries no Neon. À medida que a Wave 2 expandir
features (busca incremental, filtros mais ricos, dashboards), o
custo de CU-hours sobe linearmente com o tráfego.

## Decisão

### Tabela de TTLs por tipo de dado

| Tipo | TTL | Justificativa |
|---|---|---|
| Parlamentar (perfil) | **1h** | Partido e situação_mandato podem mudar; ritmo de mudança é dia, não minuto |
| Votação recente (< 30 dias) | **1h** | `aprovada` pode mudar em pós-edição (caso raro mas real) |
| Votação histórica (> 30 dias) | **7d** | Imutável na prática; mudança nesse range é correção retroativa, não evento |
| Proposição em tramitação | **6h** | Movimentos diários (entrada de tramitação, mudança de relator, etc.) |
| Proposição arquivada / aprovada | **7d** | Estado final estabilizado |
| Gastos ano corrente | **6h** | Atualizados em ciclo CEAP (varia, mas batches diários no máximo) |
| Filiação histórica | **24h** | Muda raramente; consulta em listagem |
| Listagem com filtros (`?casa=X&partido=Y`) | **5min** | Sensível a queries customizadas; pode haver muitas variantes |
| Busca textual (`/busca?q=...`) | **não cachear** | Cada query é única; cache hit rate ínfimo |
| `/api/stats` (admin) | **não cachear** | Dados frescos por definição |
| `/api/health` | **não cachear** | Health não toca DB; cache irrelevante |

### Implementação canônica (referência, código entra na Wave 2)

Quando implementado (issue #41), o padrão é:

1. Server components consomem `src/lib/queries/**` (já existe)
2. Cada função de query encapsula `cache.match` + `fetch real` +
   `cache.put` (a criar em `src/lib/cache.ts`)
3. Constants de TTL ficam em `src/lib/cache.ts` espelhando a tabela
   acima
4. **Cache key inclui versão do schema** (`migration_id` da migration
   mais recente) — invalidação automática quando schema muda
5. **Cache key inclui versão do código** (hash do build) — invalidação
   em deploy quando lógica de query mudar mesmo sem schema mudar

Implementação canônica preliminar (a refinar na Wave 2):

```typescript
// src/lib/cache.ts (a criar)
const TTL = {
  parlamentarPerfil: 3600,
  votacaoRecente: 3600,
  votacaoHistorica: 604800,
  proposicaoEmTramitacao: 21600,
  proposicaoArquivada: 604800,
  gastoAnoCorrente: 21600,
  filiacaoHistorica: 86400,
  listagemFiltrada: 300,
} as const

const SCHEMA_VERSION = '0004' // bump em cada migration nova

export async function cached<T>(
  key: string,
  ttl: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cache = (caches as unknown as { default: Cache }).default
  const cacheKey = new Request(
    `https://cache.local/${SCHEMA_VERSION}/${key}`,
  )
  const hit = await cache.match(cacheKey)
  if (hit) return (await hit.json()) as T

  const fresh = await loader()
  await cache.put(
    cacheKey,
    new Response(JSON.stringify(fresh), {
      headers: { 'cache-control': `max-age=${ttl}` },
    }),
  )
  return fresh
}
```

### Invalidação proativa pós-ingestão

Cache em TTL é defensivo (dados ficam stale até expirar). Quando
um workflow de ingestão termina com sucesso, dispara webhook
para `/api/revalidate` que invalida rotas afetadas
imediatamente. Detalhes em issue #43.

### Critérios de NÃO cachear

- **Páginas que mudam por user**: `/busca?q=...` com termo único.
- **Endpoints admin**: `/api/stats` precisa de dados frescos por
  definição.
- **Health check**: sem dependência de DB, sem benefício.
- **Mutations**: não existem hoje; mas se aparecerem na Wave 2+,
  qualquer rota com `POST`/`PUT`/`PATCH`/`DELETE` é não-cacheada.

## Alternativas Consideradas

### Sem cache, depender de scale-to-zero do Neon

- **Prós**: zero complexidade; código permanece como está.
- **Contras**: tráfego contínuo (mesmo pequeno: monitoramento,
  bots de search engine, RSS readers) mantém o banco acordado e
  consumindo CU-hours 24/7. Scale-to-zero só funciona em janelas
  reais de ociosidade.
- **Veredicto**: descartado. O caso "site cívico vira referência e
  recebe RSS/scrapers" é cenário desejável que mata essa estratégia.

### Cache no banco (materialized views)

- **Prós**: ferramenta nativa do Postgres; ACID; refresh agendado.
- **Contras**: a query ainda vai ao banco. Não reduz CU-hours, só
  reduz CPU dentro do banco. Não dorme. Resolve performance,
  não custo.
- **Veredicto**: descartado por não atacar o problema.

### Redis externo (Upstash, Redis Cloud)

- **Prós**: cache compartilhado entre isolates; controle fino de
  invalidação.
- **Contras**: novo serviço externo, novo custo recorrente (mesmo
  free tiers existem), nova dependência operacional. Cloudflare
  Cache API já distribui entre isolates da rede globalmente, sem
  custo adicional.
- **Veredicto**: descartado por trade-off ruim contra Cache API
  nativa do Worker.

### KV do Cloudflare (Workers KV)

- **Prós**: armazenamento durável; APIs simples.
- **Contras**: precificação por leitura (free tier 100k/dia depois
  custo); latência ligeiramente maior que Cache API; semântica de
  "eventually consistent" em vez de "request-scoped".
- **Veredicto**: descartado para este caso de uso. KV é melhor para
  config/feature flags; Cache API é melhor para resposta de query
  efêmera.

### Cache mais frouxo (TTLs uniformes de 24h)

- **Prós**: simplicidade; menos código.
- **Contras**: dados de votação recente (que podem mudar em pós-
  edição) ficariam até 24h desatualizados, criando casos onde
  jornalista vê resultado errado. TTLs por tipo casa com a
  realidade dos dados.
- **Veredicto**: descartado por sub-precisão.

## Consequências

### Positivas

- **Redução estimada de 70-85% em CU-hours no app web**, baseado
  em proporção de hits esperados. Listagens e perfis (~80% do
  tráfego) terão hit rate > 80% com TTLs de 1h+.
- **Latência menor para o usuário**: cache hit do edge fica em
  ~10ms vs 50-150ms de query ao Neon US-East. Brasil acessando
  Cloudflare PoP local + cache hit é a configuração ideal.
- **Banco dorme**: com cache de TTL longo nos dados imutáveis e
  invalidação proativa pós-ingestão, o Neon pode efetivamente ficar
  suspenso a maior parte do tempo entre crons.
- **Custo de produção provável**: free tier ou Launch mínimo, sem
  pressão de growth orgânico de tráfego.

### Negativas

- **Dados podem ficar stale até TTL expirar**. Aceitável dado a
  cadência política, mas usuário curioso pode ver "última atualização"
  defasada. Mitigado por invalidação proativa pós-ingestão.
- **Invalidação manual em casos extremos**: se algum dado for
  corrigido manualmente no banco (operação rara mas possível), o
  cache precisa ser invalidado via deploy ou via endpoint admin.
- **Cache key versionado por schema** adiciona overhead conceitual:
  toda migration precisa bumpar `SCHEMA_VERSION`. Esquecer = cache
  servindo dados de schema antigo. Mitigação: validação em build
  ou em CI (Wave 2+).

### Neutras

- A tabela de TTLs é editorial. Ajustes virão com observação de
  hit rates reais quando o `/api/stats` estiver instrumentado.
- A decisão entre Cache API (request-scoped global) e novos
  mecanismos (caches.open(), KV) pode ser revisada se a tabela de
  TTLs evoluir para requerer features que a Cache API não suporta.

## Referências

- [Issue #41 — criar src/lib/cache.ts com TTLs do ADR-018](https://github.com/FabioCaffarello/brasil-a-vera/issues/41)
- [Issue #42 — migrar páginas de detalhe para SSG com revalidate](https://github.com/FabioCaffarello/brasil-a-vera/issues/42)
- [Issue #43 — webhook de revalidação pós-ingestão](https://github.com/FabioCaffarello/brasil-a-vera/issues/43)
- [Cloudflare Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)
- [Next.js — revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidatePath)
- [Neon — Pricing (CU-hours)](https://neon.tech/pricing)
- [ADR-009 — Deploy em Cloudflare Workers](009-cloudflare-pages.md)
- [ADR-017 — Budget mensal e observabilidade](017-budget-mensal-observabilidade.md) — cache é mecanismo principal aqui
- [ADR-016 — Cobertura temporal](016-cobertura-temporal-arquivamento.md) — complementar (controle de growth de storage)
