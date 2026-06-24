import { permanentRedirect } from 'next/navigation'

// Redireciona /rankings → /rankings/patrimonio enquanto há apenas um ranking.
// Quando novos rankings forem adicionados (G12 vetos, coerência, etc.),
// substituir por uma página de índice.
export default function RankingsPage() {
  permanentRedirect('/rankings/patrimonio')
}
