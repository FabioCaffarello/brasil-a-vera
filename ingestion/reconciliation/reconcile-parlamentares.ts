import { createListParlamentaresUseCase } from '../../src/lib/container'
import { camaraClient } from '../camara/camara-client'
import type { CamaraDeputado } from '../camara/camara-types'
import { senadoClient } from '../senado/senado-client'
import { ensureArray } from '../senado/senado-mapping'
import type {
  SenadoListaSenadoresResponse,
  SenadoParlamentarResumo,
} from '../senado/senado-types'
import { fetchAllPages } from '../shared/pagination'
import { finalizeReport, newReport, printReport } from './reconciliation-report'

type LocalParlamentar = {
  idExterno: string
  nome: string
  uf: string
  partidoSigla: string
  casa: string
}

async function fetchDeputadosOficiais(): Promise<Map<string, CamaraDeputado>> {
  const map = new Map<string, CamaraDeputado>()
  for await (const page of fetchAllPages<CamaraDeputado>(
    camaraClient,
    '/deputados',
    { idLegislatura: '57', itens: '100' },
  )) {
    for (const dep of page) {
      map.set(String(dep.id), dep)
    }
  }
  return map
}

async function fetchSenadoresOficiais(): Promise<
  Map<string, SenadoParlamentarResumo>
> {
  const response = await senadoClient.get<SenadoListaSenadoresResponse>(
    '/senador/lista/atual.json',
  )
  const senadores = ensureArray<SenadoParlamentarResumo>(
    response.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar,
  )
  const map = new Map<string, SenadoParlamentarResumo>()
  for (const s of senadores) {
    const codigo = s.IdentificacaoParlamentar?.CodigoParlamentar
    if (codigo) map.set(codigo, s)
  }
  return map
}

async function fetchParlamentaresLocais(): Promise<LocalParlamentar[]> {
  // ListParlamentaresUseCase paginado; precisamos de TODOS os registros.
  const useCase = createListParlamentaresUseCase()
  const all: LocalParlamentar[] = []

  let page = 1
  const perPage = 200
  while (true) {
    const result = await useCase.execute({ page, perPage })
    for (const p of result.items) {
      all.push({
        idExterno: p.idExterno,
        nome: p.nome,
        uf: p.uf,
        partidoSigla: p.partido.sigla,
        casa: p.casa,
      })
    }
    if (result.items.length < perPage) break
    page++
  }
  return all
}

async function main() {
  const report = newReport('parlamentares')

  // 1. Fontes oficiais (em paralelo) + locais
  const [deputadosOficial, senadoresOficial, locais] = await Promise.all([
    fetchDeputadosOficiais(),
    fetchSenadoresOficiais(),
    fetchParlamentaresLocais(),
  ])

  report.officialCount = deputadosOficial.size + senadoresOficial.size
  report.localCount = locais.length

  // 2. Indexar locais por idExterno
  const localMap = new Map<string, LocalParlamentar>()
  for (const l of locais) localMap.set(l.idExterno, l)

  // 3. Verificar deputados (gaps + stale)
  for (const [id, dep] of deputadosOficial) {
    const local = localMap.get(id)
    if (!local) {
      report.gaps.push({ idExterno: id, nome: dep.nome, note: 'CAMARA' })
      continue
    }
    if (local.casa !== 'CAMARA') {
      report.stale.push({
        idExterno: id,
        field: 'casa',
        official: 'CAMARA',
        local: local.casa,
      })
    }
    if (local.uf !== dep.siglaUf) {
      report.stale.push({
        idExterno: id,
        field: 'uf',
        official: dep.siglaUf,
        local: local.uf,
      })
    }
    if (local.partidoSigla !== dep.siglaPartido) {
      report.stale.push({
        idExterno: id,
        field: 'partidoSigla',
        official: dep.siglaPartido,
        local: local.partidoSigla,
      })
    }
  }

  // 4. Verificar senadores (idExterno tem prefixo 'senado-')
  for (const [codigo, sen] of senadoresOficial) {
    const id = `senado-${codigo}`
    const local = localMap.get(id)
    const ident = sen.IdentificacaoParlamentar
    if (!local) {
      report.gaps.push({
        idExterno: id,
        nome: ident?.NomeParlamentar,
        note: 'SENADO',
      })
      continue
    }
    if (local.casa !== 'SENADO') {
      report.stale.push({
        idExterno: id,
        field: 'casa',
        official: 'SENADO',
        local: local.casa,
      })
    }
    if (local.uf !== ident?.UfParlamentar) {
      report.stale.push({
        idExterno: id,
        field: 'uf',
        official: ident?.UfParlamentar ?? '',
        local: local.uf,
      })
    }
    if (local.partidoSigla !== ident?.SiglaPartidoParlamentar) {
      report.stale.push({
        idExterno: id,
        field: 'partidoSigla',
        official: ident?.SiglaPartidoParlamentar ?? '',
        local: local.partidoSigla,
      })
    }
  }

  // 5. Detectar orphans: registros locais que não estão em NENHUMA fonte
  for (const l of locais) {
    if (l.casa === 'CAMARA') {
      if (!deputadosOficial.has(l.idExterno)) {
        report.orphans.push({
          idExterno: l.idExterno,
          nome: l.nome,
          note: 'CAMARA — não está mais na lista oficial (renunciou/faleceu?)',
        })
      }
    } else if (l.casa === 'SENADO') {
      const codigo = l.idExterno.replace(/^senado-/, '')
      if (!senadoresOficial.has(codigo)) {
        report.orphans.push({
          idExterno: l.idExterno,
          nome: l.nome,
          note: 'SENADO — não está mais na lista oficial',
        })
      }
    }
  }

  finalizeReport(report)
  printReport(report)

  // Exit code reflete presença de divergências (útil para CI)
  process.exit(report.divergenceCount === 0 ? 0 : 1)
}

main().catch((error) => {
  process.stdout.write(
    `\nFATAL: ${error instanceof Error ? error.message : 'Unknown'}\n`,
  )
  process.exit(2)
})
