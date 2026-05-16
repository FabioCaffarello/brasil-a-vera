import Link from 'next/link'

import { MunicipioAutocomplete } from '@/components/meu-parlamentar/municipio-autocomplete'
import { UfSelectForm } from '@/components/meu-parlamentar/uf-select-form'
import { ParlamentarCard } from '@/components/parlamentar/parlamentar-card'
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

  // Sem UF: tela inicial com copy pedagógico (Variante A) + form de UF.
  if (!ufParam || !isUf(ufParam)) {
    return (
      <PageShell>
        <Heading
          title="Encontre seus representantes"
          subtitle="Descubra quem te representa no Congresso Nacional a partir do seu estado."
        />
        <p className="mb-6 max-w-2xl text-foreground text-sm leading-relaxed">
          No Congresso Nacional,{' '}
          <strong>você é representado pelo seu estado inteiro</strong>.
          Deputados federais e senadores votam em nome de toda a bancada
          estadual — não de um município específico. Em vereadores e deputados
          estaduais (que não estão na plataforma), a representação é
          municipal/regional.
        </p>
        <UfSelectForm />
      </PageShell>
    )
  }

  const uf = ufParam as Uf
  const municipios = getMunicipiosByUf(uf)

  // UF presente mas sem município válido: passo 2 do fluxo.
  const municipioValido = municipioParam
    ? findMunicipio(uf, municipioParam)
    : null
  if (!municipioValido) {
    return (
      <PageShell>
        <Heading
          title="Encontre seus representantes"
          subtitle={`Em ${nomeUfCompleto(uf)} (${uf}).`}
        />
        <div className="space-y-4 rounded-lg border border-border bg-surface p-5">
          <UfSelectFormInline selecionada={uf} />
          <MunicipioAutocomplete uf={uf} municipios={municipios} />
          {municipioParam && (
            <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
              &quot;{municipioParam}&quot; não consta como município de {uf}.
              Verifique a grafia ou selecione na lista.
            </p>
          )}
        </div>
      </PageShell>
    )
  }

  // UF + município válidos: carrega representantes da UF.
  const [deputados, senadores] = await Promise.all([
    listParlamentares({ casa: 'CAMARA', uf }),
    listParlamentares({ casa: 'SENADO', uf }),
  ])

  return (
    <PageShell>
      <Heading
        title={`Seus representantes em ${municipioValido.nome}, ${uf}`}
        subtitle={`${deputados.length} ${deputados.length === 1 ? 'deputado federal' : 'deputados federais'} e ${senadores.length} ${senadores.length === 1 ? 'senador' : 'senadores'} pelo ${nomeUfCompleto(uf)}.`}
      />

      {/* Copy pedagógico reforçando (Variante B — curta). */}
      <p className="mb-8 max-w-2xl text-foreground text-sm leading-relaxed">
        Você vota em deputados federais e senadores que representam todo o seu
        estado — independente da cidade onde você mora. Vereadores e deputados
        estaduais ficam fora da plataforma.
      </p>

      <section className="mb-10">
        <header className="mb-4">
          <h2 className="font-semibold text-2xl text-foreground tracking-tight">
            Deputados Federais ({deputados.length})
          </h2>
          <p className="mt-1 text-foreground-muted text-sm">
            Mandato pela Câmara dos Deputados.
          </p>
        </header>
        {deputados.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-5 text-foreground-muted text-sm">
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
      </section>

      <section className="mb-10">
        <header className="mb-4">
          <h2 className="font-semibold text-2xl text-foreground tracking-tight">
            Senadores ({senadores.length})
          </h2>
          <p className="mt-1 text-foreground-muted text-sm">
            Mandato pelo Senado Federal.
          </p>
        </header>
        {senadores.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-5 text-foreground-muted text-sm">
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
      </section>

      <Link
        className="inline-flex min-h-[44px] items-center text-brand text-sm underline decoration-dotted underline-offset-2 hover:text-brand/80"
        href="/o-meu-parlamentar"
      >
        ← Trocar de município ou estado
      </Link>
    </PageShell>
  )
}

// ── helpers de layout ──────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-4xl px-4 py-8">{children}</div>
}

function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      <h1 className="font-semibold text-3xl text-foreground tracking-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-foreground-muted text-sm">{subtitle}</p>
      )}
    </header>
  )
}

// Versão compacta do form de UF para reuso após primeira seleção
// (mantém UF selecionada visível como contexto).
function UfSelectFormInline({ selecionada }: { selecionada: Uf }) {
  return <UfSelectForm selecionada={selecionada} />
}
