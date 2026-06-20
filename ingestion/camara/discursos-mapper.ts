import type { DiscursoMapped } from '../shared/discurso'
import type { CamaraDiscurso } from './discursos-schema'

// Mapeia discursos da Câmara (/deputados/{id}/discursos). A `transcricao`
// (texto integral inline) é DESCARTADA — ADR-016/princípio 11. Guardamos
// `sumario`, `keywords` e metadados. A Câmara não expõe id nativo de discurso
// nem URL estável de texto → sourceId/urlTexto ficam null.

export function mapDiscursosCamara(
  discursos: CamaraDiscurso[],
): DiscursoMapped[] {
  return discursos
    .filter((d) => Boolean(d.dataHoraInicio))
    .map((d) => ({
      sourceId: null,
      data: d.dataHoraInicio,
      tipo:
        d.tipoDiscurso?.trim() || d.faseEvento?.titulo?.trim() || 'Discurso',
      sumario: d.sumario?.trim() || null,
      keywords: d.keywords?.trim() || null,
      urlTexto: d.urlTexto ?? null,
    }))
}
