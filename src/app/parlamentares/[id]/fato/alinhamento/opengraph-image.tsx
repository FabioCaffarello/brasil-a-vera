// OG card de alinhamento partidário (ADR-054, issue #591).
//
// Neutralidade (ADR-040 §4): factual, SEM adjetivo-veredito e SEM cor de
// juízo. Percentual em cinza neutro — no print sem contexto, verde/vermelho
// leria como bom/ruim. Satori: todo <div> multi-filho precisa display:flex;
// só hex inline, sem CSS vars/calc.

import { ImageResponse } from 'next/og'

import {
  BrandFooter,
  fallbackOg,
  OG_CONTENT_TYPE,
  OG_SIZE,
  truncate,
} from '@/lib/og/chrome'
import { getAlinhamentoParlamentar } from '@/lib/queries/alinhamento'
import { getParlamentarById } from '@/lib/queries/parlamentares'

export const alt =
  'Alinhamento ao partido — Brasil à Vera, plataforma de transparência política'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

interface Props {
  params: Promise<{ id: string }>
}

const casaLabel = (casa: string) =>
  casa === 'CAMARA' ? 'Câmara dos Deputados' : 'Senado Federal'
const cargoLabel = (casa: string) =>
  casa === 'CAMARA' ? 'Deputado Federal' : 'Senador'

export default async function OgFatoAlinhamento({ params }: Props) {
  const { id } = await params
  const [p, alinhamento] = await Promise.all([
    getParlamentarById(id),
    getAlinhamentoParlamentar(id),
  ])
  if (!p) return fallbackOg('Parlamentar não encontrado')

  const percentualStr =
    alinhamento.percentual !== null && !alinhamento.emFederacao
      ? `${alinhamento.percentual}%`
      : 'N/A'

  const subtitulo = alinhamento.emFederacao
    ? 'Integrante de federação — alinhamento por sigla não calculado'
    : alinhamento.percentual === null || alinhamento.amostraInsuficiente
      ? 'Amostra insuficiente de votações comparáveis'
      : `${alinhamento.alinhados} de ${alinhamento.total} votos com orientação da liderança`

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fafafa',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          padding: '44px 56px',
          gap: '24px',
        }}
      >
        {/* Identidade */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span
            style={{
              fontSize: '19px',
              color: '#71717a',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {cargoLabel(p.casa)} · {p.partidoSigla} / {p.uf}
          </span>
          <span style={{ fontSize: '38px', fontWeight: 700, color: '#18181b' }}>
            {truncate(p.nome, 40)}
          </span>
        </div>

        {/* Enunciado do fato */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '26px', fontWeight: 700, color: '#18181b' }}>
            Alinhamento à orientação do partido
          </span>
          <span style={{ fontSize: '21px', color: '#52525b' }}>
            Votações nominais comparáveis
          </span>
        </div>

        {/* Número grande + legenda */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '20px',
            flex: 1,
          }}
        >
          <span
            style={{
              fontSize: '120px',
              fontWeight: 800,
              color: '#18181b',
              lineHeight: 1,
              letterSpacing: '-0.04em',
            }}
          >
            {percentualStr}
          </span>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              paddingBottom: '12px',
            }}
          >
            <span
              style={{
                display: 'flex',
                padding: '6px 16px',
                borderRadius: '8px',
                backgroundColor: '#f4f4f5',
                color: '#3f3f46',
                fontSize: '20px',
              }}
            >
              {subtitulo}
            </span>
          </div>
        </div>

        {/* Fonte */}
        <span style={{ fontSize: '18px', color: '#71717a' }}>
          Fonte: {casaLabel(p.casa)} · Mede alinhamento prático com a liderança
          — não posição ideológica. Contexto importa.
        </span>
      </div>
      <BrandFooter />
    </div>,
    {
      ...size,
      headers: { 'cache-control': 'public, max-age=3600, s-maxage=3600' },
    },
  )
}
