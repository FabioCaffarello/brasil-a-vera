import { GlowyWavesHero } from '@/design-system/compositions/glowy-waves-hero'

export default function GlowyHeroDemo() {
  return (
    <div className="bg-background">
      <GlowyWavesHero
        highlights={['Dados oficiais', 'Atualização diária', 'API pública']}
        kicker="Dados oficiais · Câmara dos Deputados"
        primaryCta={{
          href: '/parlamentares',
          label: 'Explorar parlamentares',
        }}
        secondaryCta={{
          href: '/proposicoes',
          label: 'Ver proposições',
        }}
        stats={[
          { label: 'Deputados Federais', value: '513' },
          { label: 'Proposições rastreadas', value: '+250k' },
          { label: 'Votações analisadas', value: '+30k' },
          { label: 'Atualização', value: 'Diária' },
        ]}
        subtitle="Acompanhe deputados, votações, gastos parlamentares e proposições usando dados públicos oficiais — em uma interface que respeita seu tempo."
        title="Transparência política sem ruído."
      />
    </div>
  )
}
