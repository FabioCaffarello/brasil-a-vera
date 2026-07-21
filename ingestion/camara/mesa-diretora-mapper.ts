import type { LiderancaCargoRow } from './liderancas-mapper'
import type { CamaraMesaItem } from './mesa-diretora-schema'

// Tipos que compõem a Mesa Diretora da Câmara.
// Texto (não enum SQL) para extensibilidade sem migration (ADR-056).
export const MESA_TIPOS = [
  'PRESIDENTE_MESA',
  'VICE_PRESIDENTE_MESA',
  'SECRETARIO_MESA',
  'SUPLENTE_MESA',
] as const

export type TipoMesa = (typeof MESA_TIPOS)[number]

// Normaliza o `titulo` da Câmara → tipo interno.
// Exemplos reais: "Presidente", "1º Vice-Presidente", "2º Vice-Presidente",
// "1º Secretário", "4º Secretário", "1º Suplente de Secretário".
export function normalizarTituloMesa(
  titulo: string | null | undefined,
): TipoMesa {
  const t = (titulo ?? '').trim().toLowerCase()
  if (t === 'presidente') return 'PRESIDENTE_MESA'
  if (t.includes('vice')) return 'VICE_PRESIDENTE_MESA'
  // "suplente de secretário" contém ambas as palavras — checar suplente primeiro
  if (t.includes('suplente')) return 'SUPLENTE_MESA'
  if (t.includes('secretário') || t.includes('secretario'))
    return 'SECRETARIO_MESA'
  return 'SUPLENTE_MESA'
}

export function mapMesaItemCamara(
  item: CamaraMesaItem,
  legislatura: number,
  parlamentarPorSourceId: Map<string, string>,
): LiderancaCargoRow | null {
  const parlamentarId = parlamentarPorSourceId.get(String(item.id))
  if (!parlamentarId) return null

  return {
    parlamentarId,
    tipo: normalizarTituloMesa(item.titulo),
    entidade: 'Mesa Diretora',
    casa: 'CAMARA',
    legislatura,
    // Período real do cargo: biênios encerrados chegam com dataFim
    // preenchida e saem naturalmente do filtro data_fim IS NULL da app.
    dataInicio: item.dataInicio ?? null,
    dataFim: item.dataFim ?? null,
  }
}
