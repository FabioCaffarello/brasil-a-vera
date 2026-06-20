import type { DiscursoMapped } from '../shared/discurso'
import type { SenadoPronunciamento } from './discursos-schema'

// Mapeia pronunciamentos do Senado (/senador/{codigo}/discursos). O texto
// integral fica na URL (`UrlTexto`) — guardamos só metadados + `TextoResumo`
// (resumo curto) + a URL (ADR-016). `CodigoPronunciamento` é o id nativo.

export function mapDiscursosSenado(
  pronunciamentos: SenadoPronunciamento[],
): DiscursoMapped[] {
  return pronunciamentos
    .filter((p) => Boolean(p.DataPronunciamento))
    .map((p) => ({
      sourceId:
        p.CodigoPronunciamento != null ? String(p.CodigoPronunciamento) : null,
      data: p.DataPronunciamento,
      tipo: p.TipoUsoPalavra?.Descricao?.trim() || 'Pronunciamento',
      sumario: p.TextoResumo?.trim() || null,
      keywords: p.Indexacao?.trim() || null,
      urlTexto: p.UrlTexto ?? null,
    }))
}
