import {
  createGetVotacaoUseCase,
  createVotacaoRepository,
} from '../../src/lib/container'
import { camaraClient } from '../camara/camara-client'
import type { CamaraVotacaoResumo } from '../camara/camara-types'
import { senadoClient } from '../senado/senado-client'
import { ensureArray } from '../senado/senado-mapping'
import type {
  SenadoListaVotacoesResponse,
  SenadoVotacao,
} from '../senado/senado-types'
import { fetchAllPages } from '../shared/pagination'
import { finalizeReport, newReport, printReport } from './reconciliation-report'

const SAMPLE_SIZE = 10

/**
 * Pega as últimas N votações da Câmara no ano corrente (ordenadas por data DESC).
 * A API já permite ordenar; pegamos só a primeira página.
 */
async function fetchUltimasVotacoesCamara(): Promise<CamaraVotacaoResumo[]> {
  const ano = new Date().getUTCFullYear()
  const dataInicio = `${ano}-01-01`

  const collected: CamaraVotacaoResumo[] = []
  for await (const page of fetchAllPages<CamaraVotacaoResumo>(
    camaraClient,
    '/votacoes',
    {
      dataInicio,
      itens: String(SAMPLE_SIZE),
      ordenarPor: 'dataHoraRegistro',
      ordem: 'DESC',
    },
  )) {
    collected.push(...page)
    if (collected.length >= SAMPLE_SIZE) break
  }
  return collected.slice(0, SAMPLE_SIZE)
}

/**
 * Pega as últimas N votações do Senado no ano corrente.
 * A API retorna a lista completa do ano; ordenamos client-side por DataSessao DESC.
 */
async function fetchUltimasVotacoesSenado(): Promise<SenadoVotacao[]> {
  const ano = new Date().getUTCFullYear()
  const response = await senadoClient.get<SenadoListaVotacoesResponse>(
    `/dados/ListaVotacoes${ano}.json`,
  )
  const votacoes = ensureArray<SenadoVotacao>(
    response.ListaVotacoes?.Votacoes?.Votacao,
  )
  return votacoes
    .slice()
    .sort((a, b) => b.DataSessao.localeCompare(a.DataSessao))
    .slice(0, SAMPLE_SIZE)
}

function compareDescricao(official: string, local: string): boolean {
  // Comparação truncada em 100 chars: descrições oficiais podem ser revisadas
  // textualmente sem mudar a essência da votação.
  return official.slice(0, 100).trim() === local.slice(0, 100).trim()
}

async function main() {
  const report = newReport('votacoes (amostra)')

  // 1. Coletar amostras das duas casas em paralelo
  const [camara, senado] = await Promise.all([
    fetchUltimasVotacoesCamara(),
    fetchUltimasVotacoesSenado(),
  ])

  report.officialCount = camara.length + senado.length

  const getVotacao = createGetVotacaoUseCase()
  const votacaoRepo = createVotacaoRepository()

  let foundLocal = 0

  // 2. Verificar votações da Câmara
  for (const v of camara) {
    const idExterno = String(v.id)
    const local = await votacaoRepo.findByIdExterno(idExterno)

    if (!local) {
      report.gaps.push({
        idExterno,
        nome: v.descricao?.slice(0, 80),
        note: 'CAMARA',
      })
      continue
    }

    foundLocal++
    const localOutput = await getVotacao.execute({ id: local.votacaoId.id })
    const totalOficial = 0 // a API de listagem não traz totalizadores
    const totalLocal =
      localOutput.resultado.votosSim +
      localOutput.resultado.votosNao +
      localOutput.resultado.abstencoes +
      localOutput.resultado.ausentes

    if (!compareDescricao(v.descricao ?? '', localOutput.descricao)) {
      report.stale.push({
        idExterno,
        field: 'descricao',
        official: (v.descricao ?? '').slice(0, 80),
        local: localOutput.descricao.slice(0, 80),
      })
    }

    // Total de votos só faz sentido comparar se a fonte trouxer totalizadores.
    // Como /votacoes (lista) não traz, apenas validamos que temos votos > 0
    // quando a votação foi nominal.
    if (totalLocal === 0) {
      report.stale.push({
        idExterno,
        field: 'totalVotos',
        official: 'desconhecido (lista não traz)',
        local: String(totalOficial),
      })
    }
  }

  // 3. Verificar votações do Senado
  for (const v of senado) {
    const idExterno = `senado-${v.CodigoSessaoVotacao}`
    const local = await votacaoRepo.findByIdExterno(idExterno)

    if (!local) {
      report.gaps.push({
        idExterno,
        nome: v.DescricaoVotacao?.slice(0, 80),
        note: 'SENADO',
      })
      continue
    }

    foundLocal++
    const localOutput = await getVotacao.execute({ id: local.votacaoId.id })
    const isSecreta = v.Secreta === 'S'

    const oficialDesc =
      v.DescricaoVotacao ||
      v.DescricaoIdentificacaoMateria ||
      `Votação Senado ${v.CodigoSessaoVotacao}`

    if (!compareDescricao(oficialDesc, localOutput.descricao)) {
      report.stale.push({
        idExterno,
        field: 'descricao',
        official: oficialDesc.slice(0, 80),
        local: localOutput.descricao.slice(0, 80),
      })
    }

    // Para Senado podemos comparar contagem total (votos vêm na resposta).
    const oficialVotos = isSecreta
      ? 0 // votação secreta: não persistimos votos nominais
      : ensureArray(v.Votos?.VotoParlamentar).length
    const totalLocal =
      localOutput.resultado.votosSim +
      localOutput.resultado.votosNao +
      localOutput.resultado.abstencoes +
      localOutput.resultado.ausentes

    if (oficialVotos !== totalLocal) {
      report.stale.push({
        idExterno,
        field: 'totalVotos',
        official: String(oficialVotos),
        local: String(totalLocal),
      })
    }
  }

  // localCount = quantos da amostra estão no banco
  report.localCount = foundLocal

  finalizeReport(report)
  printReport(report)

  process.exit(report.divergenceCount === 0 ? 0 : 1)
}

main().catch((error) => {
  process.stdout.write(
    `\nFATAL: ${error instanceof Error ? error.message : 'Unknown'}\n`,
  )
  process.exit(2)
})
