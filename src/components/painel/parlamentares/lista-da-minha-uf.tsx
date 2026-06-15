// Lista de parlamentares da UF do usuário (painel/área logada). Server Component.
// Promovido ao RDS (ADR-033) — classnames em tokens RDS (token-map.md):
// border-line-default, bg-surface-base, text-fg-primary, text-fg-tertiary.
// `FormUfInline` e `ParlamentarCard` importados (client islands).

import { FormUfInline } from '@/components/painel/parlamentares/form-uf-inline'
import { ParlamentarCard } from '@/components/parlamentar/parlamentar-card'
import { listRecomendacoesByUf } from '@/lib/queries/recomendacoes'

interface Props {
  uf: string | null
  followingIds: Set<string>
}

export async function ListaDaMinhaUf({ uf, followingIds }: Props) {
  if (!uf) {
    return (
      <div className="rounded-lg border border-line-default bg-surface-base p-8">
        <h3 className="font-medium text-fg-primary text-lg">
          Selecione sua UF
        </h3>
        <p className="mt-2 text-fg-tertiary text-sm">
          A sua UF personaliza recomendações e o que aparece aqui. Você pulou
          esse passo no onboarding — pode escolher agora.
        </p>
        <div className="mt-4">
          <FormUfInline />
        </div>
      </div>
    )
  }

  // Não usa `listRecomendacoesByUf` que exclui acompanhados — aqui
  // queremos mostrar TODOS da UF marcados como acompanhando/não.
  const parlamentaresDaUf = await listRecomendacoesByUf({
    uf,
    excludeParlamentarIds: [],
    limit: 100,
  })

  if (parlamentaresDaUf.length === 0) {
    return (
      <div className="rounded-lg border border-line-default bg-surface-base p-8 text-center">
        <h3 className="font-medium text-fg-primary text-lg">
          Nenhum parlamentar ativo em {uf} encontrado
        </h3>
        <p className="mt-2 text-fg-tertiary text-sm">
          Pode ser uma falha temporária de ingestão. Tente atualizar a página em
          alguns segundos.
        </p>
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {parlamentaresDaUf.map((p) => (
        <li key={p.id}>
          <ParlamentarCard
            follow={{
              isFollowing: followingIds.has(p.id),
            }}
            parlamentar={p}
          />
        </li>
      ))}
    </ul>
  )
}
