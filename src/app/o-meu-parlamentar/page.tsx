import { MapPin } from 'lucide-react'
import Link from 'next/link'

import { MunicipioAutocomplete } from '@/components/meu-parlamentar/municipio-autocomplete'
import { UfSelectForm } from '@/components/meu-parlamentar/uf-select-form'
import { ParlamentarCard } from '@/components/parlamentar/parlamentar-card'
import { DataBadge } from '@/design-system/compositions/data-badge'
import { HeroSection } from '@/design-system/compositions/hero-section'
import { SectionCard } from '@/design-system/compositions/section-card'
import {
  findMunicipio,
  getMunicipiosByUf,
  isUf,
  nomeUfCompleto,
  type Uf,
} from '@/lib/municipios'
import { listParlamentares } from '@/lib/queries/parlamentares'

export const metadata = {
  title: 'Meus representantes — Brasil a Vera',
  description:
    'Encontre os deputados federais e senadores que representam o seu estado no Congresso Nacional.',
}

// Dynamic by design — searchParams (uf, municipio) entram em runtime.
// Cache do Worker cobre repetições. Não SSG.
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ uf?: string; municipio?: string }>
}

export default async function MeuParlamentarPage({ searchParams }: PageProps) {
  const params = await searchParams
  const ufParam = params.uf
  const municipioParam = params.municipio?.trim() ?? ''

  // Estado entry — landing-like com HeroSection gradient (D1 do plano Sprint 6.4)
  if (!ufParam || !isUf(ufParam)) {
    return (
      <>
        <HeroSection
          description="Descubra quem te representa no Congresso Nacional a partir do seu estado."
          kicker={
            <DataBadge
              icon={<MapPin className="h-3 w-3" />}
              label="Porta de entrada cívica"
              tone="accent"
            />
          }
          title="Encontre seus representantes"
          variant="gradient"
        />
        <div className="mx-auto max-w-4xl px-4 pb-8">
          <p className="mb-6 max-w-2xl text-foreground text-sm leading-relaxed">
            No Congresso Nacional,{' '}
            <strong>você é representado pelo seu estado inteiro</strong>.
            Deputados federais e senadores votam em nome de toda a bancada
            estadual — não de um município específico. Em vereadores e deputados
            estaduais (que não estão na plataforma), a representação é
            municipal/regional.
          </p>
          <UfSelectForm />
        </div>
      </>
    )
  }

  const uf = ufParam as Uf
  const municipios = getMunicipiosByUf(uf)

  // UF presente mas sem município válido: estado intermediário com plain hero
  const municipioValido = municipioParam
    ? findMunicipio(uf, municipioParam)
    : null
  if (!municipioValido) {
    return (
      <>
        <HeroSection
          description={`Em ${nomeUfCompleto(uf)} (${uf}).`}
          title="Encontre seus representantes"
          variant="plain"
        />
        <div className="mx-auto max-w-4xl px-4 pb-8">
          <div className="space-y-4 rounded-lg border border-border bg-surface p-5">
            <UfSelectForm selecionada={uf} />
            <MunicipioAutocomplete municipios={municipios} uf={uf} />
            {municipioParam && (
              <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
                &quot;{municipioParam}&quot; não consta como município de {uf}.
                Verifique a grafia ou selecione na lista.
              </p>
            )}
          </div>
        </div>
      </>
    )
  }

  // UF + município válidos: carrega representantes da UF.
  const [deputados, senadores] = await Promise.all([
    listParlamentares({ casa: 'CAMARA', uf }),
    listParlamentares({ casa: 'SENADO', uf }),
  ])

  return (
    <>
      <HeroSection
        description={`${deputados.length} ${deputados.length === 1 ? 'deputado federal' : 'deputados federais'} e ${senadores.length} ${senadores.length === 1 ? 'senador' : 'senadores'} pelo ${nomeUfCompleto(uf)}.`}
        title={`Seus representantes em ${municipioValido.nome}, ${uf}`}
        variant="plain"
      />

      <div className="mx-auto max-w-4xl space-y-6 px-4 pb-8">
        {/* Copy pedagógico reforçando (Variante B — curta). */}
        <p className="max-w-2xl text-foreground text-sm leading-relaxed">
          Você vota em deputados federais e senadores que representam todo o seu
          estado — independente da cidade onde você mora. Vereadores e deputados
          estaduais ficam fora da plataforma.
        </p>

        <SectionCard
          subtitle="Mandato pela Câmara dos Deputados."
          title={`Deputados Federais (${deputados.length})`}
        >
          {deputados.length === 0 ? (
            <p className="text-foreground-muted text-sm">
              Nenhum deputado federal ingerido para {uf}.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {deputados.map((p) => (
                <li key={p.id}>
                  <ParlamentarCard parlamentar={p} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          subtitle="Mandato pelo Senado Federal."
          title={`Senadores (${senadores.length})`}
        >
          {senadores.length === 0 ? (
            <p className="text-foreground-muted text-sm">
              Nenhum senador ingerido para {uf}.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {senadores.map((p) => (
                <li key={p.id}>
                  <ParlamentarCard parlamentar={p} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <Link
          className="inline-flex min-h-[44px] items-center rounded text-brand text-sm underline decoration-dotted underline-offset-2 hover:text-brand/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          href="/o-meu-parlamentar"
        >
          ← Trocar de município ou estado
        </Link>
      </div>
    </>
  )
}
