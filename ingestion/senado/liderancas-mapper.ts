import type { LiderancaCargoRow } from '../camara/liderancas-mapper'
import type {
  SenadoLiderancaBloco,
  SenadoLiderancasEnvelope,
} from './liderancas-schema'

export type { LiderancaCargoRow }

// Posições institucionais que mapeiam para tipo específico (case-insensitive).
// Tudo que não casar aqui é tratado como liderança partidária.
const INSTITUCIONAL: Record<string, string> = {
  governo: 'LIDER_GOVERNO',
  oposição: 'LIDER_OPOSICAO',
  oposicao: 'LIDER_OPOSICAO',
  minoria: 'LIDER_MINORIA',
  maioria: 'LIDER_MAIORIA',
}

function normalizarTipoSenado(
  sigla: string,
  papel: string | null | undefined,
): string {
  const siglaLower = sigla.trim().toLowerCase()
  const baseInstit = INSTITUCIONAL[siglaLower]

  if (baseInstit) {
    // Vice-líder institucional (ex.: "Vice-Lider" do Governo)
    const papelLower = (papel ?? '').trim().toLowerCase()
    if (papelLower.includes('vice')) {
      return baseInstit.replace('LIDER_', 'VICE_LIDER_')
    }
    return baseInstit
  }

  // Liderança partidária / bloco
  const papelLower = (papel ?? '').trim().toLowerCase()
  if (papelLower.includes('vice')) return 'VICE_LIDER_PARTIDO'
  return 'LIDER_PARTIDO'
}

export function mapLiderancasSenado(
  envelope: SenadoLiderancasEnvelope,
  legislatura: number,
  parlamentarPorSourceId: Map<string, string>,
): LiderancaCargoRow[] {
  const blocos: SenadoLiderancaBloco[] =
    envelope.ListaLiderancas.Lideranca ?? []
  const rows: LiderancaCargoRow[] = []

  for (const bloco of blocos) {
    const membros = bloco.Membros?.Membro ?? []
    for (const membro of membros) {
      const parlamentarId = parlamentarPorSourceId.get(membro.CodigoParlamentar)
      if (!parlamentarId) continue

      rows.push({
        parlamentarId,
        tipo: normalizarTipoSenado(bloco.SiglaLideranca, membro.Papel),
        entidade: bloco.SiglaLideranca,
        casa: 'SENADO',
        legislatura,
        dataInicio: null,
        dataFim: null,
      })
    }
  }

  return rows
}
