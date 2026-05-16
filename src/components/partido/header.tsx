interface Props {
  sigla: string
  nomeOficial: string | null
  totalParlamentares: number
}

// Sprint 4.4 PR 1 commit 1/6 — refatorado para tokens semânticos.
// Header simples (eyebrow uppercase + h1 + nome oficial + contagem).
export function PartidoHeader({
  sigla,
  nomeOficial,
  totalParlamentares,
}: Props) {
  return (
    <header className="space-y-2">
      <p className="font-mono text-foreground-muted text-xs uppercase tracking-wider">
        Partido
      </p>
      <h1 className="font-bold text-3xl text-foreground">{sigla}</h1>
      {nomeOficial && nomeOficial !== sigla && (
        <p className="text-foreground-muted text-sm">{nomeOficial}</p>
      )}
      <p className="text-foreground-muted text-sm">
        {totalParlamentares === 0
          ? 'Nenhum parlamentar atualmente filiado nesta sigla.'
          : `${totalParlamentares} ${totalParlamentares === 1 ? 'parlamentar' : 'parlamentares'} no Brasil a Vera.`}
      </p>
    </header>
  )
}
