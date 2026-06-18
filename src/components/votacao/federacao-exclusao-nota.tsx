// Sinal de nível-lista (ADR-041 §5; issues #482/#484): bancadas de partidos
// em federação somem da análise de orientação (disciplina e divergências)
// porque a Câmara publica a orientação de voto pela federação ('Fdr ...',
// descartada na ingestão — ADR-040 §1), não pela sigla individual. O join
// `orientacao_bancada.partido_sigla = parlamentar.partido_sigla` não encontra
// linha para esses partidos, então seus deputados ficam invisíveis SEM AVISO.
//
// Esta nota explica a ausência no nível da seção (não marca deputado a
// deputado, o que poluiria a lista). Copy neutra e factual (ADR-040 §4): sem
// termo valorativo, sem juízo. A detecção determinística vive em
// `src/shared/federacoes.ts`; aqui só recebemos as siglas já filtradas.

interface Props {
  /** Siglas federadas presentes na votação mas ausentes desta análise. */
  siglas: readonly string[]
}

export function FederacaoExclusaoNota({ siglas }: Props) {
  if (siglas.length === 0) return null
  return (
    <p className="mt-3 border-line-default border-t pt-2 text-fg-tertiary text-xs">
      Partidos em federação não entram nesta análise (nesta votação:{' '}
      {siglas.join(', ')}). A Câmara publica a orientação de voto pela
      federação, não pela sigla do partido — não há orientação partidária da
      sigla para comparar. Isto não é amostra insuficiente.
    </p>
  )
}
