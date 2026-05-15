// Diagnóstico fino da vinculação votação→proposição (Sprint 3.0.5 Bloco 2).
//
// Para cada uma das 19 votações nominais Câmara sem `proposicao_id`, classifica
// a causa do gap em 4 categorias:
//
//   (a) Proposição referenciada pela API NÃO está no banco (janela curta de
//       ingest:camara:proposicoes — backfill não tem o que vincular).
//   (b) Proposição ESTÁ no banco mas matching falhou (bug de
//       backfill-votacao-proposicao.ts; custo zero corrigir).
//   (c) Referência aparece SÓ na descrição em texto livre — API retorna
//       `proposicoesAfetadas` vazio (adicionar parser regex em backfill).
//   (d) Sem referência alguma — procedimento puro (correto que fique sem prop).
//
// Saída: tabela markdown + distribuição percentual + recomendação por
// causa dominante. Read-only.
//
// Uso: DATABASE_URL=... npx tsx --tsconfig tsconfig.ingestion.json \
//        ingestion/ops/diagnose-3-0-5-vinculacao.ts

import { and, eq, isNull, sql } from 'drizzle-orm'

import { proposicao, votacao } from '@/shared/db/schema'
import { camaraVotacaoDetalheSchema } from '../camara/votacao-detalhe-schema'
import { db } from '../shared/db'
import { fetchWithRetry, HttpFetchError } from '../shared/http'

const BASE_URL = 'https://dadosabertos.camara.leg.br/api/v2'

type Causa = 'a' | 'b' | 'c' | 'd'

interface Linha {
  votacaoId: string
  sourceId: string
  descricao: string
  causa: Causa
  detalhe: string
}

// Regex para tipo + número + ano em descrições da Câmara. Casos esperados:
//   "Proposta de Emenda à Constituição n° 383, de 2017"
//   "PEC 383/2017"
//   "PL 1944/2026"
//   "Projeto de Lei n.º 1234, de 2025"
const TIPO_TEXTUAL: Record<string, string> = {
  'proposta de emenda à constituição': 'PEC',
  'proposta de emenda a constituicao': 'PEC',
  'emenda à constituição': 'PEC',
  'projeto de lei complementar': 'PLP',
  'medida provisória': 'MPV',
  'medida provisoria': 'MPV',
  'projeto de decreto legislativo': 'PDC',
  'projeto de resolução': 'PRC',
  'projeto de resolucao': 'PRC',
  'projeto de lei': 'PL', // sempre por último — substring genérica
}
const SIGLA_RE =
  /\b(PEC|PLP|MPV|PDC|PRC|PL)\s*n?[º°.]*\s*(\d+)[\s,/]+(?:de\s+)?(\d{4})\b/i

function parseDescricao(
  descricao: string,
): { tipo: string; numero: number; ano: number } | null {
  // Tentativa 1: sigla direta
  const m1 = SIGLA_RE.exec(descricao)
  if (m1) {
    return {
      tipo: m1[1].toUpperCase(),
      numero: Number(m1[2]),
      ano: Number(m1[3]),
    }
  }
  // Tentativa 2: tipo textual
  const lower = descricao.toLowerCase()
  for (const [textual, sigla] of Object.entries(TIPO_TEXTUAL)) {
    const idx = lower.indexOf(textual)
    if (idx === -1) continue
    const after = descricao.slice(idx + textual.length)
    const m2 = /n?[º°.]*\s*(\d+)[\s,/]+(?:de\s+)?(\d{4})/i.exec(after)
    if (m2) {
      return { tipo: sigla, numero: Number(m2[1]), ano: Number(m2[2]) }
    }
  }
  return null
}

async function loadVotacoesAlvo(): Promise<
  Array<{ id: string; sourceId: string; descricao: string }>
> {
  return db
    .select({
      id: votacao.id,
      sourceId: votacao.sourceId,
      descricao: votacao.descricao,
    })
    .from(votacao)
    .where(
      and(
        eq(votacao.casa, 'CAMARA'),
        isNull(votacao.proposicaoId),
        sql`EXISTS (SELECT 1 FROM votacoes.voto_nominal vn WHERE vn.votacao_id = ${votacao.id})`,
      ),
    )
}

async function fetchDetalhe(sourceId: string) {
  try {
    const r = await fetchWithRetry(`${BASE_URL}/votacoes/${sourceId}`, {
      headers: {
        accept: 'application/json',
        'user-agent':
          'brasil-a-vera/0.1 (+https://github.com/FabioCaffarello/brasil-a-vera) diagnose-3-0-5',
      },
    })
    const json = (await r.json()) as { dados: unknown }
    return camaraVotacaoDetalheSchema.parse(json.dados)
  } catch (err) {
    if (err instanceof HttpFetchError && err.status === 404) return null
    throw err
  }
}

async function proposicaoExistsBySourceId(sourceId: string): Promise<boolean> {
  const rows = await db
    .select({ id: proposicao.id })
    .from(proposicao)
    .where(eq(proposicao.sourceId, sourceId))
    .limit(1)
  return rows.length > 0
}

async function proposicaoExistsByChave(
  tipo: string,
  numero: number,
  ano: number,
): Promise<boolean> {
  const rows = await db
    .select({ id: proposicao.id })
    .from(proposicao)
    .where(
      and(
        eq(proposicao.tipo, tipo as 'PL'),
        eq(proposicao.numero, numero),
        eq(proposicao.ano, ano),
      ),
    )
    .limit(1)
  return rows.length > 0
}

async function classificar(v: {
  id: string
  sourceId: string
  descricao: string
}): Promise<Linha> {
  const detalhe = await fetchDetalhe(v.sourceId)

  // Caso API tenha proposicoesAfetadas
  if (detalhe?.proposicoesAfetadas && detalhe.proposicoesAfetadas.length > 0) {
    const ref = detalhe.proposicoesAfetadas[0]
    const sourceId = String(ref.id)
    const existeBanco = await proposicaoExistsBySourceId(sourceId)
    if (existeBanco) {
      return {
        votacaoId: v.id,
        sourceId: v.sourceId,
        descricao: v.descricao.slice(0, 80),
        causa: 'b',
        detalhe: `API → ${ref.siglaTipo} ${ref.numero}/${ref.ano} (sourceId=${sourceId}) — está no banco, matching deveria ter sucedido`,
      }
    }
    return {
      votacaoId: v.id,
      sourceId: v.sourceId,
      descricao: v.descricao.slice(0, 80),
      causa: 'a',
      detalhe: `API → ${ref.siglaTipo} ${ref.numero}/${ref.ano} (sourceId=${sourceId}) — não está ingerida`,
    }
  }

  // API vazia — tenta parsear descrição
  const fromText = parseDescricao(v.descricao)
  if (fromText) {
    const existeBanco = await proposicaoExistsByChave(
      fromText.tipo,
      fromText.numero,
      fromText.ano,
    )
    return {
      votacaoId: v.id,
      sourceId: v.sourceId,
      descricao: v.descricao.slice(0, 80),
      causa: 'c',
      detalhe: `texto → ${fromText.tipo} ${fromText.numero}/${fromText.ano} (no banco: ${existeBanco})`,
    }
  }

  return {
    votacaoId: v.id,
    sourceId: v.sourceId,
    descricao: v.descricao.slice(0, 80),
    causa: 'd',
    detalhe: 'sem referência detectável (procedimento puro)',
  }
}

async function main() {
  console.log(
    '# Diagnóstico vinculação votação→proposição — Sprint 3.0.5 Bloco 2',
  )
  console.log(`# Timestamp: ${new Date().toISOString()}\n`)

  const alvos = await loadVotacoesAlvo()
  console.log(
    `## Total: ${alvos.length} votações nominais Câmara sem proposicao_id\n`,
  )

  const linhas: Linha[] = []
  for (const v of alvos) {
    const linha = await classificar(v)
    linhas.push(linha)
  }

  // Tabela markdown
  console.log('| votacao_id | source_id | causa | detalhe | descrição |')
  console.log('|---|---|---|---|---|')
  for (const l of linhas) {
    const desc = l.descricao.replace(/\|/g, ' ').replace(/\n/g, ' ')
    console.log(
      `| ${l.votacaoId.slice(0, 8)}… | ${l.sourceId} | (${l.causa}) | ${l.detalhe} | ${desc} |`,
    )
  }

  // Distribuição
  console.log('\n## Distribuição por causa')
  const dist: Record<Causa, number> = { a: 0, b: 0, c: 0, d: 0 }
  for (const l of linhas) dist[l.causa]++
  const labels: Record<Causa, string> = {
    a: 'Proposição NÃO no banco (janela curta)',
    b: 'Proposição no banco, matching FALHOU (bug backfill)',
    c: 'Referência só no texto (regex parser)',
    d: 'Sem referência (procedimento puro)',
  }
  const total = linhas.length
  console.log('| causa | count | % | implicação |')
  console.log('|---|---|---|---|')
  for (const c of ['a', 'b', 'c', 'd'] as const) {
    const pct = total > 0 ? ((dist[c] / total) * 100).toFixed(1) : '0'
    console.log(`| (${c}) ${labels[c]} | ${dist[c]} | ${pct}% | — |`)
  }

  process.exit(0)
}

main().catch((e) => {
  console.error('vinculacao failed:', e)
  process.exit(1)
})
