import { eq } from 'drizzle-orm'
import { normalizeNome } from '@/lib/normalize'
import {
  comissionadoGabinete,
  parlamentar,
} from '@/modules/parlamentares/domain/schema'
import { db } from '../shared/db'
import {
  centavosParaNumeric,
  criarVinculadorSenadores,
  indexarRemuneracoes,
  mapComissionadoSenado,
} from './comissionados-mapper'
import {
  senadoComissionadosListaSchema,
  senadoRemuneracoesListaSchema,
} from './comissionados-schema'
import { fetchSenadoAdmJson } from './senado-adm-client'

// Ingestão de comissionados de gabinete do Senado (ADR-064 v0.3, emenda E2).
// Fonte: API administrativa aberta (adm.senado.gov.br, sem token) —
// /servidores/servidores/comissionados (quadro, incl. desligados → filtrados)
// + /servidores/remuneracoes/{ano}/{mes} (remuneração básica por folha,
// Normal+Suplementar somadas). ⚠️ O join comissionado↔remuneração é por NOME
// normalizado — os `sequencial` dos dois endpoints são espaços de id
// DISTINTOS (verificado 2026-07-16: interseção 238/3.605, todas 0,00);
// homônimos na folha ficam sem R$ (fail-closed).
//
// Vínculo por NOME do senador na lotação ("Gabinete do Senador X" /
// "Escritório de Apoio N do Senador X") — fail-closed (padrão ADR-063).
// Snapshot do quadro ATUAL → DELETE-by-casa + INSERT em transação.

const CASA = 'SENADO' as const

const CHUNK = 500

// Competência: tenta o mês corrente e recua (folha fecha com defasagem).
const MESES_FALLBACK = 4

interface ComissionadosStats {
  itensFetched: number
  itensRejeitados: number
  desligados: number
  foraDeGabinete: number
  semMatchSenador: number
  nomesAmbiguos: number
  inseridos: number
  gabinetesDistintos: number
  comRemuneracao: number
  mesReferencia: string | null
  sample: Array<{ nome: string; cargo: string | null }>
  errors: Array<{ context: string; reason: string }>
}

async function loadSenadores() {
  const rows = await db
    .select({
      id: parlamentar.id,
      nome: parlamentar.nome,
      nomeCivil: parlamentar.nomeCivil,
    })
    .from(parlamentar)
    .where(eq(parlamentar.casa, CASA))
  if (rows.length === 0) {
    throw new Error(
      'Nenhum parlamentar SENADO no banco — rode `npm run ingest:senado:senadores` primeiro',
    )
  }
  return rows
}

// Busca a competência mais recente com folha publicada (recuo de até
// MESES_FALLBACK meses a partir do mês corrente).
async function loadRemuneracoes(stats: ComissionadosStats): Promise<{
  porNome: Map<string, number>
  mesReferencia: string | null
}> {
  const agora = new Date()
  for (let recuo = 0; recuo < MESES_FALLBACK; recuo++) {
    const ref = new Date(
      Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - recuo, 1),
    )
    const ano = ref.getUTCFullYear()
    const mes = ref.getUTCMonth() + 1
    try {
      const raw = await fetchSenadoAdmJson<unknown>(
        `/servidores/remuneracoes/${ano}/${mes}`,
      )
      const parsed = senadoRemuneracoesListaSchema.safeParse(raw)
      if (!parsed.success) {
        stats.errors.push({
          context: `remuneracoes:${ano}-${mes}:parse`,
          reason: parsed.error.issues.map((i) => i.message).join('; '),
        })
        continue
      }
      if (parsed.data.length === 0) continue
      return {
        porNome: indexarRemuneracoes(parsed.data),
        mesReferencia: `${ano}-${String(mes).padStart(2, '0')}-01`,
      }
    } catch (err) {
      stats.errors.push({
        context: `remuneracoes:${ano}-${mes}`,
        reason: err instanceof Error ? err.message : String(err),
      })
    }
  }
  // Sem folha disponível: ingere o quadro sem R$ (fail-honest, não aborta).
  return { porNome: new Map(), mesReferencia: null }
}

export async function ingestComissionadosSenado(): Promise<ComissionadosStats> {
  const senadores = await loadSenadores()
  const vinculador = criarVinculadorSenadores(senadores)

  const stats: ComissionadosStats = {
    itensFetched: 0,
    itensRejeitados: 0,
    desligados: 0,
    foraDeGabinete: 0,
    semMatchSenador: 0,
    nomesAmbiguos: vinculador.ambiguos().length,
    inseridos: 0,
    gabinetesDistintos: 0,
    comRemuneracao: 0,
    mesReferencia: null,
    sample: [],
    errors: [],
  }

  const raw = await fetchSenadoAdmJson<unknown>(
    '/servidores/servidores/comissionados',
  )
  const parsed = senadoComissionadosListaSchema.safeParse(raw)
  if (!parsed.success) {
    stats.errors.push({
      context: 'comissionados:parse',
      reason: parsed.error.issues
        .slice(0, 5)
        .map((i) => i.message)
        .join('; '),
    })
    return stats
  }
  stats.itensFetched = parsed.data.length

  const { porNome, mesReferencia } = await loadRemuneracoes(stats)
  stats.mesReferencia = mesReferencia

  type Insert = typeof comissionadoGabinete.$inferInsert
  const values: Insert[] = []
  const gabinetes = new Set<string>()

  for (const item of parsed.data) {
    const mapped = mapComissionadoSenado(item, vinculador)
    if (mapped === 'desligado') {
      stats.desligados++
      continue
    }
    if (mapped === 'fora_de_gabinete') {
      stats.foraDeGabinete++
      continue
    }
    if (mapped === 'sem_match_senador') {
      stats.semMatchSenador++
      continue
    }
    const centavos = porNome.get(normalizeNome(mapped.nome))
    if (centavos !== undefined) stats.comRemuneracao++
    gabinetes.add(mapped.parlamentarId)
    values.push({
      parlamentarId: mapped.parlamentarId,
      casa: CASA,
      nome: mapped.nome,
      grupo: mapped.grupo,
      cargo: mapped.cargo,
      remuneracaoBasica:
        centavos !== undefined ? centavosParaNumeric(centavos) : null,
      mesReferencia: centavos !== undefined ? mesReferencia : null,
      sourceId: mapped.sequencial,
      trustLevel: 'L1',
      sourceUrl:
        'https://adm.senado.gov.br/adm-dadosabertos/api/v1/servidores/servidores/comissionados',
    })
    if (stats.sample.length < 3) {
      stats.sample.push({ nome: mapped.nome, cargo: mapped.cargo })
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(comissionadoGabinete)
      .where(eq(comissionadoGabinete.casa, CASA))
    for (let i = 0; i < values.length; i += CHUNK) {
      await tx.insert(comissionadoGabinete).values(values.slice(i, i + CHUNK))
    }
  })

  stats.inseridos = values.length
  stats.gabinetesDistintos = gabinetes.size
  return stats
}

const started = Date.now()
ingestComissionadosSenado()
  .then((stats) => {
    console.log(
      JSON.stringify({
        event: 'ingest_comissionados_senado_done',
        durationMs: Date.now() - started,
        ...stats,
        errorsCount: stats.errors.length,
        errorsSample: stats.errors.slice(0, 10),
        errors: undefined,
      }),
    )
    process.exit(stats.errors.length > 0 && stats.inseridos === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_comissionados_senado_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
