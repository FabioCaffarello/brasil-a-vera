# ADR-014: Idempotência sem chave natural única em tabelas de lançamentos contábeis

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

Tabelas que armazenam lançamentos contábeis de fontes públicas
brasileiras (gastos parlamentares CEAP, doações eleitorais TSE,
contratos do Portal da Transparência) não admitem chave natural
única no nível de row, porque um único documento de origem (fatura,
nota fiscal, recibo) gera múltiplos lançamentos legítimos com o
mesmo identificador externo.

A descoberta inicial veio da auditoria pré-Wave 2. Esperava-se que
`(parlamentar_id, source_id)` fosse chave natural única em
`gastos.gasto`, espelhando o padrão das demais tabelas
(`parlamentar`, `proposicao`, `votacao`).

Diagnóstico empírico contra os dados em produção (57.244 rows
ingeridas via `npm run ingest:camara:gastos`):

| Tipo | Grupos | Caráter |
|---|---|---|
| Duplicatas literais (mesmo valor, data, CNPJ, categoria) | 51 | Bug de re-ingestão (race em script ad-hoc) |
| "Falsas duplicatas" (mesmo source_id, valores diferentes) | 2.210 | **Dados legítimos** |

Investigação revelou que `codDocumento` da API da Câmara identifica
o **documento de origem**, não o lançamento individual. Um único
`codDocumento` gera múltiplas rows quando o documento tem parcelas,
estornos, retificações ou reembolsos.

Exemplo concreto extraído dos dados em produção:

- `source_id: 5CC790A6-9B3F-474D-A836-70989AA99F0A` (PASSAGEM AÉREA SIGEPA)
  - Lançamento 1: valor R$ 1.780,76 em 2026-01-28 (cobrança)
  - Lançamento 2: valor −R$ 557,24 em 2026-01-28 (estorno parcial)

São dois lançamentos contábeis distintos da mesma fatura SIGEPA.
Adicionar `UNIQUE(parlamentar_id, source_id)` apagaria um dos dois
silenciosamente, distorcendo o valor total de gastos do parlamentar.

A estrutura "documento → múltiplos lançamentos" não é peculiaridade
da CEAP. É padrão de contabilidade brasileira aplicado em:

- TSE — doação eleitoral pode ser parcelada e retificada
- Portal da Transparência — contrato gera empenhos, liquidações,
  pagamentos parciais (cada um é uma row contábil distinta)
- Receita/despesa partidária (Justiça Eleitoral) — mesmo padrão

Portanto, a decisão precisa estabelecer padrão para a **classe de
tabelas de lançamentos contábeis**, não apenas para `gasto`.

## Decisão

Tabelas que armazenam **lançamentos contábeis de fontes públicas**
NÃO recebem unique constraint estrutural sobre
`(entidade, source_id)`.

Idempotência é garantida em runtime pelo seguinte padrão (referência
canônica: `ingestion/camara/gastos.ts`):

```typescript
await db.transaction(async (tx) => {
  // 1. Delete por janela definida (parlamentar + ano, ou equivalente)
  await tx
    .delete(gasto)
    .where(
      and(
        eq(gasto.parlamentarId, parlamentarId),
        sql`EXTRACT(YEAR FROM ${gasto.dataEmissao}) = ${ano}`,
      ),
    )

  // 2. Bulk insert dos lançamentos do batch
  await tx.insert(gasto).values(rows)
})
```

Características desse padrão:

- **Atomicidade** — transação garante consistência se algo falhar no
  meio
- **Idempotência** — re-rodar o script regenera os dados exatamente
- **Granularidade configurável** — a janela do DELETE
  (parlamentar + ano) é decisão de schema, não de constraint

Tabelas existentes neste padrão: `gastos.gasto`.

Tabelas futuras esperadas neste padrão:

- `eleicoes.doacao` (TSE — Wave 2+)
- `transparencia.empenho` e `transparencia.pagamento` (Wave 3+)
- Outras conforme aparecerem

## Alternativas Consideradas

### `UNIQUE(parlamentar_id, source_id)`

- **Prós**: padrão simples; ON CONFLICT DO UPDATE no insert resolve
  re-ingestão sem necessidade de DELETE prévio.
- **Contras**: apaga lançamentos legítimos. Em produção, 2.210
  grupos de "falsas duplicatas" seriam reduzidos a 1 row cada,
  perdendo dados.
- **Veredicto**: descartado.

### `UNIQUE(parlamentar_id, source_id, valor, data, CNPJ, categoria)`

- **Prós**: distingue parcelas com valores diferentes; preserva
  todos os lançamentos legítimos hoje.
- **Contras**: frágil. Duas parcelas legítimas com mesma assinatura
  composta existem na natureza (combustível dividido em duas notas
  iguais no mesmo dia, por exemplo). Quebra silenciosamente quando
  esse caso aparecer.
- **Veredicto**: descartado por fragilidade.

### Coluna derivada `numero_parcela`

- **Prós**: chave natural composta `(parlamentar_id, source_id,
  numero_parcela)` semanticamente correta.
- **Contras**: ordem da API não é determinística entre execuções;
  numeração derivada pode mudar entre execuções para o mesmo
  documento, criando dupla contagem ou perda.
- **Veredicto**: marcado para investigação futura na
  [issue #27](https://github.com/FabioCaffarello/brasil-a-vera/issues/27).
  Se a API mostrar ordem estável, esta vira a próxima ADR sobre o
  tópico.

### Sem migration (deixar dupes literais)

- **Prós**: zero risco; trabalho zero.
- **Contras**: 51 dupes literais contaminam agregações de gasto
  (somar valores por parlamentar produz números errados).
- **Veredicto**: inaceitável. Migration 0004 deleta as 51 dupes
  literais antes de qualquer outra mudança.

## Consequências

### Positivas

- **Honesto com a natureza dos dados públicos brasileiros** — o
  modelo de dados reflete a realidade do CEAP, não uma idealização
  que se quebra ao primeiro contato.
- **Não introduz fragilidade silenciosa** — qualquer falha de
  idempotência aparece como erro de constraint claro (não como
  perda silenciosa de row).
- **Padrão reutilizável** — TSE, Portal da Transparência e demais
  fontes contábeis brasileiras seguem o mesmo padrão sem
  re-discussão.
- **Documenta limitação da API publicamente**, beneficiando outros
  projetos cívicos (Operação Serenata de Amor, Querido Diário) que
  enfrentam o mesmo problema.

### Negativas

- **Re-ingestão de uma janela completa** (ano de gastos de um
  parlamentar) é mais cara que upsert seletivo — DELETE + bulk
  INSERT vs. ON CONFLICT por row. Aceitável para a cadência atual
  (cron semanal); a reavaliar se cadência subir.
- **Constraint do banco não protege contra bugs em scripts ad-hoc
  manuais** — scripts precisam respeitar a convenção. Não há rede
  de segurança estrutural se um humano rodar um INSERT manual
  fora do padrão.
- **Race condition entre dois jobs paralelos do GitHub Actions
  teoricamente poderia duplicar lançamentos.** Mitigado em duas
  camadas: (1) `concurrency.group` no workflow
  `ingestion-weekly.yml` serializa execuções do mesmo job — quando
  uma instância está rodando, a próxima aguarda em vez de rodar em
  paralelo; (2) o cron é semanal e o trabalho termina em minutos,
  então sobreposição não acontece na prática. Em cenário hipotético
  de cadência mais agressiva ou múltiplos workers ingerindo
  simultaneamente o mesmo parlamentar/ano, a proteção precisaria
  subir para advisory lock no Postgres. Não é problema hoje.

### Neutras

- O princípio de idempotência da ingestão vivia em CLAUDE.md
  (princípio 5) como "INSERT ON CONFLICT DO UPDATE sempre". A
  auditoria pré-Wave 2 atualizou para refletir duas estratégias
  legítimas: upsert quando há chave natural, DELETE+INSERT em
  transação quando não há. Este ADR formaliza a segunda
  estratégia.

## Referências

- [Issue #28 — ADR-014 (registro de gerência)](https://github.com/FabioCaffarello/brasil-a-vera/issues/28)
- [Issue #27 — investigar numero_parcela derivável](https://github.com/FabioCaffarello/brasil-a-vera/issues/27)
- Migration `src/shared/db/migrations/0004_curly_forge.sql` (estado
  pré-ADR — DELETE de 51 dupes + estrutura sem unique em `gasto`)
- `ingestion/camara/gastos.ts` (implementação canônica do padrão)
- [CLAUDE.md princípio 5](../../../CLAUDE.md) — "Idempotência na
  ingestão. Use `INSERT ... ON CONFLICT DO UPDATE` quando há chave
  natural única, ou `DELETE-by-key + INSERT` dentro de uma
  transação quando a substituição é em massa"
- [ADR-003 — Banco no Neon](003-database-neon.md)
