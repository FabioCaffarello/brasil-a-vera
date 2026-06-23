// Porta de entrada "Quem me representa" — seletor de UF (estático, zero-JS:
// 27 links agrupados por região). O cidadão sabe seu estado, não os nomes dos
// parlamentares.

import { HeroSection } from '@fabio.caffarello/react-design-system/server'
import { MapPin } from 'lucide-react'
import Link from 'next/link'

import { SectionCard } from '@/design-system/compositions/section-card'
import { ufsPorRegiao } from '@/lib/ufs'

export const metadata = {
  title: 'Quem me representa? — Brasil à Vera',
  description:
    'Escolha o seu estado e veja os parlamentares federais que o representam: senadores e deputados federais.',
}

export default function QuemMeRepresentaPage() {
  const grupos = ufsPorRegiao()

  return (
    <>
      <HeroSection
        align="center"
        description="Você escolheu quem te representa. Escolha o seu estado e veja os parlamentares federais — 3 senadores e os deputados federais."
        kicker={<MapPin className="mx-auto h-5 w-5 text-accent" />}
        title="Quem me representa?"
        variant="plain"
      />

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        {grupos.map(({ regiao, ufs }) => (
          <SectionCard id={regiao.toLowerCase()} key={regiao} title={regiao}>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {ufs.map((uf) => (
                <li key={uf.sigla}>
                  <Link
                    className="flex items-center gap-2 rounded-lg border border-line-default p-3 hover:bg-surface-raised"
                    href={`/quem-me-representa/${uf.sigla}`}
                  >
                    <span className="font-mono font-semibold text-fg-primary">
                      {uf.sigla}
                    </span>
                    <span className="text-fg-tertiary text-sm">{uf.nome}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        ))}
      </div>
    </>
  )
}
