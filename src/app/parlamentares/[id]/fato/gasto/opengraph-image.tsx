// OG card de gasto CEAP (ADR-054, issue #591).
//
// Neutralidade (ADR-040 §4): factual, SEM adjetivo-veredito e SEM cor de
// juízo. Total em cinza neutro; percentil como posição de fato, não mérito.
// Satori: todo <div> multi-filho precisa display:flex; só hex inline.

import { ImageResponse } from 'next/og'
import { formatBRL, formatPercentil } from '@/lib/format'
import {
  BrandFooter,
  fallbackOg,
  OG_CONTENT_TYPE,
  OG_SIZE,
  truncate,
} from '@/lib/og/chrome'
import {
  getComparacoesCasa,
  getGastosResumo,
  getParlamentarById,
} from '@/lib/queries/parlamentares'

export const alt =
  'Gasto CEAP — Brasil à Vera, plataforma de transparência política'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

interface Props {
  params: Promise<{ id: string }>
}

const cargoLabel = (casa: string) =>
  casa === 'CAMARA' ? 'Deputado Federal' : 'Senador'

export default async function OgFatoGasto({ params }: Props) {
  const { id } = await params
  const anoCorrente = new Date().getFullYear()
  const [p, gastos, comparacoes] = await Promise.all([
    getParlamentarById(id),
    getGastosResumo(id, anoCorrente),
    getComparacoesCasa(id),
  ])
  if (!p) return fallbackOg('Parlamentar não encontrado')

  const totalStr =
    p.casa === 'CAMARA' && gastos.totalRegistros > 0
      ? formatBRL(gastos.totalGeral)
      : 'N/D'

  const subtitulo =
    p.casa === 'SENADO'
      ? 'CEAP da Câmara — dados do Senado ainda não disponíveis'
      : gastos.totalRegistros === 0
        ? `Nenhum gasto CEAP registrado em ${anoCorrente}`
        : comparacoes.percentilGastoCasa !== null
          ? `${gastos.totalRegistros} registros · ${formatPercentil(comparacoes.percentilGastoCasa)} entre os deputados`
          : `${gastos.totalRegistros} registros em ${anoCorrente}`

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
            Gasto em cota parlamentar (CEAP)
          </span>
          <span style={{ fontSize: '21px', color: '#52525b' }}>
            {anoCorrente} · Câmara dos Deputados
          </span>
        </div>

        {/* Valor grande + legenda */}
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
              fontSize: '72px',
              fontWeight: 800,
              color: '#18181b',
              lineHeight: 1,
              letterSpacing: '-0.03em',
            }}
          >
            {totalStr}
          </span>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              paddingBottom: '8px',
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
          Fonte: Sistema CEAP — Câmara dos Deputados · Dado público para
          acompanhamento cidadão
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
