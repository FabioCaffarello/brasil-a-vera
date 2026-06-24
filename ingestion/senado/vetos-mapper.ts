import type {
  ListaVetosAno,
  ResultadoVetoDispositivo,
  ResultadoVetoMateria,
} from './vetos-schema'

// Mappers puros para os 3 níveis da chain de vetos presidenciais (ADR-059).
// Princípio 2: dado já validado pelo Zod antes de chegar aqui.

export interface VetoRow {
  sourceId: string
  materiaCodigo: string
  numero: string
  ano: number
  ementa: string
  materiaVetadaSigla: string | null
  materiaVetadaNumero: string | null
  materiaVetadaAno: number | null
  materiaVetadaEmenta: string | null
  vetoTotal: boolean
  assunto: string | null
  dataPublicacao: string | null
  dataRecebimentoCongresso: string | null
  emTramitacao: boolean
}

export interface DispositivoVetoRow {
  sourceId: string
  identificador: string
  descricao: string | null
  assunto: string | null
  situacao: string | null
  tipoVotacao: string | null
  dataSessao: string | null
  possuiVotos: boolean
}

export interface VotoVetoRow {
  nomeRaw: string
  partidoRaw: string | null
  ufRaw: string | null
  voto: string
}

function parseDate(raw: string | undefined | null): string | null {
  if (!raw || raw.trim() === '') return null
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return raw.slice(0, 10)
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  return null
}

function normalizeVoto(raw: string): string {
  const lower = raw.toLowerCase().trim()
  if (lower === 'sim') return 'SIM'
  if (lower === 'não' || lower === 'nao') return 'NAO'
  if (lower.startsWith('absten')) return 'ABSTENCAO'
  return raw.toUpperCase()
}

export function mapVetos(envelope: ListaVetosAno): VetoRow[] {
  const vetos = envelope.ListaVetosAnoCN.Vetos?.Veto ?? []
  return vetos.map((v) => {
    const mat = v.Materia
    const vetada = v.MateriaVetada
    return {
      sourceId: v.Codigo,
      materiaCodigo: mat.Codigo,
      numero: mat.Numero,
      ano: Number(mat.Ano),
      ementa: mat.Ementa?.trim() ?? '',
      materiaVetadaSigla: vetada?.Sigla?.trim() ?? null,
      materiaVetadaNumero: vetada?.Numero?.trim() ?? null,
      materiaVetadaAno: vetada?.Ano ? Number(vetada.Ano) : null,
      materiaVetadaEmenta: vetada?.Ementa?.trim() ?? null,
      vetoTotal: v.Total?.trim().toLowerCase() === 'sim',
      assunto: v.Assunto?.trim() ?? null,
      dataPublicacao: parseDate(v.DataPublicacao),
      dataRecebimentoCongresso: parseDate(v.DataRecebimentoCongresso),
      emTramitacao: mat.EmTramitacao?.trim().toLowerCase() !== 'não',
    }
  })
}

export function mapDispositivos(
  envelope: ResultadoVetoMateria,
): DispositivoVetoRow[] {
  const disps =
    envelope.ResultadoVetoMateriaCN.Veto.Dispositivos?.Dispositivo ?? []
  return disps.map((d) => ({
    sourceId: d.Codigo,
    identificador: d.Identificador,
    descricao: d.Descricao?.trim() ?? null,
    assunto: d.Assunto?.trim() ?? null,
    situacao: d.Situacao?.trim() ?? null,
    tipoVotacao: d.TipoVotacao?.trim() ?? null,
    dataSessao: parseDate(d.DataSessao),
    possuiVotos: d.PossuiVotos?.trim().toLowerCase() === 'sim',
  }))
}

export function mapVotosSenado(
  envelope: ResultadoVetoDispositivo,
): VotoVetoRow[] {
  const votos = envelope.ResultadoVetoDispositivoCN.Votacao?.Senado?.Voto ?? []
  return votos.map((v) => ({
    nomeRaw: v.NomeParlamentar.trim(),
    partidoRaw: v.PartidoParlamentar?.trim() ?? null,
    ufRaw: v.UfParlamentar?.trim() ?? null,
    voto: normalizeVoto(v.TipoVoto),
  }))
}
