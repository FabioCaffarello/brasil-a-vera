// Slot Parlamentares do painel (área logada, RSC) — promovido ao RDS (ADR-033).
//
// 2 sub-tabs com URL state em `?subtab=`. `auth()` (Clerk) + queries
// (follows, user-profile) preservadas. `BannerMudancaUf` (client island),
// `SubTabs`/`ListaAcompanhando`/`ListaDaMinhaUf` e `painel-tabs` (parsers puros)
// importados dos canônicos. Classnames em tokens RDS (text-fg-primary,
// text-fg-tertiary).

import { auth } from '@clerk/nextjs/server'

import { BannerMudancaUf } from '@/components/painel/parlamentares/banner-mudanca-uf'
import { ListaAcompanhando } from '@/components/painel/parlamentares/lista-acompanhando'
import { ListaDaMinhaUf } from '@/components/painel/parlamentares/lista-da-minha-uf'
import { SubTabsParlamentares } from '@/components/painel/parlamentares/sub-tabs'
import {
  type ParlamentaresSubtab,
  parseParlamentaresSubtab,
} from '@/lib/painel-tabs'
import { getFollowsWithParlamentarMeta } from '@/lib/queries/follows'
import {
  findUserProfileByClerkId,
  getOrCreateUserProfileId,
} from '@/lib/queries/user-profile'

export const dynamic = 'force-dynamic'

function defaultSubtab(
  uf: string | null,
  followsCount: number,
): ParlamentaresSubtab {
  if (!uf) return 'acompanhando'
  return followsCount === 0 ? 'da-minha-uf' : 'acompanhando'
}

interface PageProps {
  searchParams: Promise<{ subtab?: string | string[] }>
}

export default async function ParlamentaresSlot({ searchParams }: PageProps) {
  const { userId } = await auth()
  if (!userId) return null

  const internalUserId = await getOrCreateUserProfileId(userId)
  if (!internalUserId) {
    return (
      <div className="container mx-auto max-w-2xl py-16 text-fg-tertiary">
        Não conseguimos carregar seu perfil. Tente atualizar a página em alguns
        segundos.
      </div>
    )
  }

  const profile = await findUserProfileByClerkId(userId)
  if (!profile) return null

  const params = await searchParams
  const acompanhados = await getFollowsWithParlamentarMeta(internalUserId)
  const followingIds = new Set(acompanhados.map((p) => p.id))

  const followsForeign = profile.uf
    ? acompanhados
        .filter((p) => p.uf !== profile.uf)
        .map((p) => ({
          id: p.id,
          nome: p.nome,
          partidoSigla: p.partidoSigla,
          uf: p.uf,
          urlFoto: p.urlFoto,
        }))
    : []

  const activeSubtab =
    parseParlamentaresSubtab(params.subtab) ??
    defaultSubtab(profile.uf, acompanhados.length)

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <header className="mb-6">
        <h1 className="font-semibold text-3xl text-fg-primary tracking-tight">
          Parlamentares
        </h1>
        <p className="mt-1 text-fg-tertiary">
          Acompanhe quem te representa e descubra outros da sua UF.
        </p>
      </header>

      {profile.uf && followsForeign.length > 0 && (
        <div className="mb-4">
          <BannerMudancaUf followsForeign={followsForeign} newUf={profile.uf} />
        </div>
      )}

      <SubTabsParlamentares
        acompanhandoCount={acompanhados.length}
        active={activeSubtab}
        daMinhaUfCount={null}
      />

      <div className="mt-6">
        {activeSubtab === 'acompanhando' ? (
          <ListaAcompanhando
            acompanhados={acompanhados.map((p) => ({
              id: p.id,
              nome: p.nome,
              casa: p.casa,
              partidoSigla: p.partidoSigla,
              uf: p.uf,
              urlFoto: p.urlFoto,
              pctAlinhamento: p.pctAlinhamento,
              votacoesAnalisadas: p.votacoesAnalisadas,
            }))}
            isAnonymous={false}
          />
        ) : (
          <ListaDaMinhaUf followingIds={followingIds} uf={profile.uf} />
        )}
      </div>
    </div>
  )
}
