// `/painel/parlamentares` — Wave 10 Etapa 4.
//
// 2 sub-tabs com URL state em `?tab=`:
//   - acompanhando: parlamentares que o usuário acompanha
//   - da-minha-uf:  parlamentares da UF do perfil (com botão Acompanhar)
//
// Default tab (LOGGED-AREA-VISION §5.6):
//   - sem UF preenchida → acompanhando (mais relevante; UF vazia força
//     form inline no da-minha-uf, melhor não ser default)
//   - com UF preenchida + 0 follows → da-minha-uf (pós-wizard)
//   - com UF preenchida + ≥1 follow → acompanhando

import { auth } from '@clerk/nextjs/server'

import { BannerMudancaUf } from '@/components/painel/parlamentares/banner-mudanca-uf'
import { ListaAcompanhando } from '@/components/painel/parlamentares/lista-acompanhando'
import { ListaDaMinhaUf } from '@/components/painel/parlamentares/lista-da-minha-uf'
import {
  SubTabs,
  type TabKey,
} from '@/components/painel/parlamentares/sub-tabs'
import { getFollowsWithParlamentarMeta } from '@/lib/queries/follows'
import {
  findUserProfileByClerkId,
  getOrCreateUserProfileId,
} from '@/lib/queries/user-profile'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Parlamentares — Brasil à Vera',
}

function normalizeTab(value: string | undefined): TabKey | undefined {
  if (value === 'acompanhando' || value === 'da-minha-uf') return value
  return undefined
}

function defaultTab(uf: string | null, followsCount: number): TabKey {
  if (!uf) return 'acompanhando'
  return followsCount === 0 ? 'da-minha-uf' : 'acompanhando'
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function PainelParlamentaresPage({
  searchParams,
}: PageProps) {
  const { userId } = await auth()
  if (!userId) return null

  const internalUserId = await getOrCreateUserProfileId(userId)
  if (!internalUserId) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-foreground-muted">
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

  const activeTab =
    normalizeTab(params.tab) ?? defaultTab(profile.uf, acompanhados.length)

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-semibold text-3xl text-foreground tracking-tight">
          Parlamentares
        </h1>
        <p className="mt-1 text-foreground-muted">
          Acompanhe quem te representa e descubra outros da sua UF.
        </p>
      </header>

      {profile.uf && followsForeign.length > 0 && (
        <div className="mb-4">
          <BannerMudancaUf followsForeign={followsForeign} newUf={profile.uf} />
        </div>
      )}

      <SubTabs
        acompanhandoCount={acompanhados.length}
        active={activeTab}
        daMinhaUfCount={null}
      />

      <div className="mt-6">
        {activeTab === 'acompanhando' ? (
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
