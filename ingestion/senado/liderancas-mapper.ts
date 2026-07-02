import type { LiderancaCargoRow } from '../camara/liderancas-mapper'
import type { SenadoLiderancaItem } from './liderancas-schema'

export type { LiderancaCargoRow }

// siglaTipoUnidadeLideranca → tipo base de liderança.
// Valores institucionais conhecidos; tudo que não casar é tratado como PARTIDO.
const UNIT_SIGLA_MAP: Record<string, string> = {
  GOV: 'LIDER_GOVERNO',
  OPO: 'LIDER_OPOSICAO',
  MIN: 'LIDER_MINORIA',
  MAI: 'LIDER_MAIORIA',
}

function normalizarTipoSenado(
  siglaTipo: string | null | undefined,
  siglaUnidade: string | null | undefined,
): string {
  const unidade = (siglaUnidade ?? '').trim().toUpperCase()
  const tipo = (siglaTipo ?? '').trim().toUpperCase()
  // "V" = Vice-Líder; "L" = Líder (e fallback para qualquer outro valor)
  const isVice = tipo === 'V' || tipo === 'VL'
  const base = UNIT_SIGLA_MAP[unidade] ?? 'LIDER_PARTIDO'
  return isVice ? base.replace('LIDER_', 'VICE_LIDER_') : base
}

export function mapLiderancasSenado(
  items: SenadoLiderancaItem[],
  legislatura: number,
  parlamentarPorSourceId: Map<string, string>,
): LiderancaCargoRow[] {
  const rows: LiderancaCargoRow[] = []

  for (const item of items) {
    if (item.casa !== 'SF') continue

    const parlamentarId = parlamentarPorSourceId.get(item.codigoParlamentar)
    if (!parlamentarId) continue

    rows.push({
      parlamentarId,
      tipo: normalizarTipoSenado(
        item.siglaTipoLideranca,
        item.siglaTipoUnidadeLideranca,
      ),
      entidade:
        item.siglaPartidoFiliacao ??
        item.siglaTipoUnidadeLideranca ??
        'DESCONHECIDO',
      casa: 'SENADO',
      legislatura,
      dataInicio: item.dataDesignacao ?? null,
      dataFim: null,
    })
  }

  return rows
}
