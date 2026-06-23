// Card de fato (ADR-054): imagem OG de UM par de votos em direções opostas.
//
// Diferente do OG de perfil (que omite coerência por ser "o fato mais
// descontextualizável"), aqui o par INTEIRO viaja na imagem — ambas as
// votações, datas, tema, fonte + Confiança L2 — para passar no teste do print:
// recortado o contexto da página, o fato segue verdadeiro porque o contexto
// está embutido. Neutralidade (ADR-040 §4): factual, SEM adjetivo-veredito e
// SEM cor de juízo (chips em cinza neutro, não verde/vermelho).
//
// Satori: todo `<div>` multi-filho precisa `display: flex`; só hex inline,
// sem CSS vars/calc.

import { ImageResponse } from 'next/og'

import { formatDataBR, formatProposicaoRef } from '@/lib/format'
import {
  BrandFooter,
  fallbackOg,
  OG_CONTENT_TYPE,
  OG_SIZE,
  truncate,
} from '@/lib/og/chrome'
import {
  findPar,
  getParesContraditoriosCached,
  type ParContraditorio,
} from '@/lib/queries/coerencia'
import { getParlamentarById } from '@/lib/queries/parlamentares'

export const alt =
  'Par de votos em direções opostas — Brasil à Vera, plataforma de transparência política'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

interface Props {
  params: Promise<{ id: string; voto1: string; voto2: string }>
}

const casaLabel = (casa: string) =>
  casa === 'CAMARA' ? 'Câmara dos Deputados' : 'Senado Federal'
const cargoLabel = (casa: string) =>
  casa === 'CAMARA' ? 'Deputado Federal' : 'Senador'
const votoLabel = (voto: string) =>
  voto === 'SIM' ? 'Sim' : voto === 'NAO' ? 'Não' : voto
const direcaoLabel = (direcao: ParContraditorio['voto1']['direcao']) =>
  direcao === 'RESTRITIVA' ? 'Restritiva' : 'Permissiva'

// Bloco de um voto. Cores NEUTRAS de propósito (ADR-040 §4): no print sem
// contexto, verde/vermelho lê como bom/ruim.
function VotoBloco({ voto }: { voto: ParContraditorio['voto1'] }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        gap: '10px',
        padding: '24px',
        borderRadius: '14px',
        border: '2px solid #e4e4e7',
        backgroundColor: '#ffffff',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '20px',
          color: '#71717a',
        }}
      >
        <span style={{ fontFamily: 'monospace' }}>
          {formatProposicaoRef(
            voto.proposicaoTipo,
            voto.proposicaoNumero,
            voto.proposicaoAno,
          )}
        </span>
        <span>·</span>
        <span>{formatDataBR(voto.dataHora)}</span>
      </div>
      <span style={{ fontSize: '23px', color: '#18181b', lineHeight: 1.25 }}>
        {truncate(voto.ementa, 95)}
      </span>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginTop: 'auto',
        }}
      >
        <span
          style={{
            display: 'flex',
            padding: '4px 12px',
            borderRadius: '6px',
            backgroundColor: '#f4f4f5',
            color: '#3f3f46',
            fontSize: '18px',
          }}
        >
          Direção: {direcaoLabel(voto.direcao)}
        </span>
        <span
          style={{
            display: 'flex',
            padding: '4px 12px',
            borderRadius: '6px',
            backgroundColor: '#18181b',
            color: '#fafafa',
            fontSize: '18px',
            fontWeight: 700,
          }}
        >
          Votou {votoLabel(voto.voto)}
        </span>
      </div>
    </div>
  )
}

export default async function OgContradicao({ params }: Props) {
  const { id, voto1, voto2 } = await params
  const [p, pares] = await Promise.all([
    getParlamentarById(id),
    getParesContraditoriosCached(id, 10),
  ])
  if (!p) return fallbackOg('Parlamentar não encontrado')
  const par = findPar(pares, voto1, voto2)
  if (!par) return fallbackOg('Par não encontrado')

  const diasLabel =
    par.diasEntreVotos === 0
      ? 'no mesmo dia'
      : `${par.diasEntreVotos} ${par.diasEntreVotos === 1 ? 'dia' : 'dias'} entre os votos`

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
          gap: '20px',
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

        {/* Enunciado factual do fato */}
        <span style={{ fontSize: '26px', color: '#18181b' }}>
          Votos em <b>direções opostas</b> sobre o mesmo tema:{' '}
          <b>{truncate(par.tema, 40)}</b> — {diasLabel}.
        </span>

        {/* Os dois votos */}
        <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
          <VotoBloco voto={par.voto1} />
          <VotoBloco voto={par.voto2} />
        </div>

        {/* Fonte + confiança DENTRO da imagem (teste do print) */}
        <span style={{ fontSize: '18px', color: '#71717a' }}>
          Fonte: {casaLabel(p.casa)} · Confiança L2 (agregação determinística) ·
          Contexto importa — verifique cada votação na fonte oficial.
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
