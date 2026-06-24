// OG card de proposições de autoria (ADR-054, issue #591).
//
// Neutralidade (ADR-040 §4): contagem factual sem juízo de valor.
// Posição percentil = posição de fato na distribuição, não mérito.
// Satori: todo <div> multi-filho precisa display:flex; só hex inline.

import { ImageResponse } from 'next/og'
import { formatPercentil } from '@/lib/format'
import {
  BrandFooter,
  fallbackOg,
  OG_CONTENT_TYPE,
  OG_SIZE,
  truncate,
} from '@/lib/og/chrome'
import {
  getComparacoesCasa,
  getParlamentarById,
} from '@/lib/queries/parlamentares'

export const alt =
  'Proposições de autoria — Brasil à Vera, plataforma de transparência política'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

interface Props {
  params: Promise<{ id: string }>
}

const cargoLabel = (casa: string) =>
  casa === 'CAMARA' ? 'Deputado Federal' : 'Senador'

const casaNome = (casa: string) =>
  casa === 'CAMARA' ? 'Câmara dos Deputados' : 'Senado Federal'

export default async function OgFatoProposicoes({ params }: Props) {
  const { id } = await params
  const [p, comparacoes] = await Promise.all([
    getParlamentarById(id),
    getComparacoesCasa(id),
  ])
  if (!p) return fallbackOg('Parlamentar não encontrado')

  const count = comparacoes.proposicoesCount
  const percentil = comparacoes.percentilProposicoesCasa

  const countStr = count !== null ? String(count) : 'N/D'

  const subtitulo =
    count === null || count === 0
      ? 'Sem proposições registradas na base atual'
      : percentil !== null
        ? `${formatPercentil(percentil)} na ${casaNome(p.casa)}`
        : `proposições na ${casaNome(p.casa)}`

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
            Proposições de autoria ou coautoria
          </span>
          <span style={{ fontSize: '21px', color: '#52525b' }}>
            {casaNome(p.casa)}
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
            {countStr}
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
          Fonte: {casaNome(p.casa)} · Inclui autoria direta e coautoria ·
          Cobertura pode ser parcial
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
