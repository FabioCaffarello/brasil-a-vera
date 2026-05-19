// Sub-tab "Da minha UF" — Wave 10 Etapa 4.
//
// Se usuário não tem UF preenchida: empty state com FormUfInline.
// Senão: lista parlamentares da UF, marcando os que o usuário já
// acompanha (toggle visual).

import { ParlamentarCard } from '@/components/parlamentar/parlamentar-card'
import { listRecomendacoesByUf } from '@/lib/queries/recomendacoes'

import { FormUfInline } from './form-uf-inline'

interface Props {
  uf: string | null
  followingIds: Set<string>
}

export async function ListaDaMinhaUf({ uf, followingIds }: Props) {
  if (!uf) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8">
        <h3 className="font-medium text-foreground text-lg">
          Selecione sua UF
        </h3>
        <p className="mt-2 text-foreground-muted text-sm">
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
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <h3 className="font-medium text-foreground text-lg">
          Nenhum parlamentar ativo em {uf} encontrado
        </h3>
        <p className="mt-2 text-foreground-muted text-sm">
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
