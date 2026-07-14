import {
  dedupeLiderancas,
  type LiderancaCargoRow,
} from '../camara/liderancas-mapper'
import type { SenadoCargosEnvelope } from './cargos-schema'

export type { LiderancaCargoRow }

// Normaliza DescricaoCargo → tipo interno (texto, sem enum SQL — ADR-056).
// Vocabulário conservador: só valores observados em produção.
function normalizarTipoCargo(nomeCargo: string): string {
  const lower = nomeCargo.trim().toLowerCase()
  if (lower.includes('1º vice') || lower.includes('1o vice')) {
    return 'PRIMEIRO_VICE_PRESIDENTE_COMISSAO'
  }
  if (lower.includes('vice')) return 'VICE_PRESIDENTE_COMISSAO'
  if (lower.includes('presidente')) return 'PRESIDENTE_COMISSAO'
  if (lower.includes('suplente')) return 'SUPLENTE_COMISSAO'
  if (lower.includes('relator')) return 'RELATOR_COMISSAO'
  // "Membro Titular", "Membro", ou qualquer outro
  return 'MEMBRO_COMISSAO'
}

function parseDate(raw: string | null | undefined): string | null {
  if (!raw) return null
  // A API retorna datas em vários formatos ("YYYY-MM-DD", "DD/MM/YYYY", etc.)
  // Normaliza para YYYY-MM-DD se possível.
  const trimmed = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/')
    return `${y}-${m}-${d}`
  }
  return null
}

export function mapCargosSenado(
  envelope: SenadoCargosEnvelope,
  parlamentarId: string,
  legislatura: number,
): LiderancaCargoRow[] {
  // Shape real verificado em 2026-07-14 (#727 item 3): envelope
  // `CargoParlamentar`, cargo em `DescricaoCargo`, colegiado em
  // `IdentificacaoComissao.SiglaComissao`.
  const cargos = envelope.CargoParlamentar.Parlamentar?.Cargos?.Cargo ?? []
  const rows: LiderancaCargoRow[] = []

  for (const cargo of cargos) {
    rows.push({
      parlamentarId,
      tipo: normalizarTipoCargo(cargo.DescricaoCargo),
      entidade: cargo.IdentificacaoComissao.SiglaComissao.trim().toUpperCase(),
      casa: 'SENADO',
      legislatura,
      dataInicio: parseDate(cargo.DataInicio),
      dataFim: parseDate(cargo.DataFim),
    })
  }

  // A tabela guarda o snapshot por chave natural (parlamentar, tipo,
  // entidade, casa, legislatura): o mesmo cargo exercido em períodos
  // distintos (ex.: presidente da mesma comissão em duas legislaturas de
  // comissão) viraria duplicata e violaria a unique (#727/#728) — mantém
  // o período mais recente.
  return dedupeLiderancas(rows)
}
