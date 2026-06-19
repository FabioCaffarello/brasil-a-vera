// View model das comissões de um parlamentar para o perfil. Função pura (sem
// IO) — testável sem banco. Recebe as linhas de membro_comissao já escopadas ao
// mandato pela query e separa em:
//  - ativas (data_fim NULL): vínculo vigente hoje, ordenadas por liderança e
//    depois por início desc;
//  - histórico encerrado no mandato: dedupado por comissão, exposto de forma
//    compacta (contagem + siglas) para a distinção honesta "rotacionado vs
//    nunca serviu" sem poluir a UI.
//
// "Liderança" = cargo_origem presente e diferente de Titular/Suplente
// (Presidente, Vice-Presidente, Relator, Secretário…). Fato puro — não juízo
// (lição ADR-040).

export interface ComissaoRaw {
  sigla: string | null
  nome: string
  cargoOrigem: string | null
  tipoParticipacao: 'TITULAR' | 'SUPLENTE'
  dataInicio: string
  dataFim: string | null
}

export interface ComissaoAtiva {
  sigla: string | null
  nome: string
  /** Rótulo a exibir: o cargo de liderança quando houver, senão Titular/Suplente. */
  cargo: string
  lideranca: boolean
  dataInicio: string
}

export interface ComissoesView {
  ativas: ComissaoAtiva[]
  /** Siglas (ou nome, quando sem sigla) das comissões encerradas no mandato, dedupadas. */
  historicasSiglas: string[]
  totalHistoricas: number
}

const TIPO_LABEL: Record<'TITULAR' | 'SUPLENTE', string> = {
  TITULAR: 'Titular',
  SUPLENTE: 'Suplente',
}

export function ehLideranca(cargoOrigem: string | null): boolean {
  const c = (cargoOrigem ?? '').trim().toLowerCase()
  return c !== '' && c !== 'titular' && c !== 'suplente'
}

// Prioridade de exibição das ativas (menor = mais alto). Vice antes de
// Presidente na checagem porque "vice-presidente" também casa "presidente".
function pesoCargo(
  cargoOrigem: string | null,
  tipo: 'TITULAR' | 'SUPLENTE',
): number {
  const c = (cargoOrigem ?? '').toLowerCase()
  if (c.includes('vice') && c.includes('presidente')) return 1
  if (c.includes('presidente')) return 0
  if (c.includes('relator')) return 2
  if (c.includes('secret')) return 3
  if (ehLideranca(cargoOrigem)) return 4
  return tipo === 'TITULAR' ? 5 : 6
}

export function shapeComissoes(rows: ComissaoRaw[]): ComissoesView {
  const ativas: ComissaoAtiva[] = rows
    .filter((r) => r.dataFim === null)
    .sort((a, b) => {
      const pa = pesoCargo(a.cargoOrigem, a.tipoParticipacao)
      const pb = pesoCargo(b.cargoOrigem, b.tipoParticipacao)
      return pa !== pb ? pa - pb : b.dataInicio.localeCompare(a.dataInicio)
    })
    .map((r) => {
      const lideranca = ehLideranca(r.cargoOrigem)
      return {
        sigla: r.sigla,
        nome: r.nome,
        cargo: lideranca
          ? (r.cargoOrigem ?? '').trim()
          : TIPO_LABEL[r.tipoParticipacao],
        lideranca,
        dataInicio: r.dataInicio,
      }
    })

  const historicas = new Set<string>()
  for (const r of rows) {
    if (r.dataFim !== null) historicas.add(r.sigla ?? r.nome)
  }
  const historicasSiglas = [...historicas].sort((a, b) => a.localeCompare(b))

  return {
    ativas,
    historicasSiglas,
    totalHistoricas: historicasSiglas.length,
  }
}
