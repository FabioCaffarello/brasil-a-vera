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
  type AlinhamentoResult,
  getAlinhamentoParlamentar,
} from '@/lib/queries/alinhamento'
import {
  getComparacoesCasa,
  getGastosResumo,
  getParlamentarById,
} from '@/lib/queries/parlamentares'
import {
  type Casa,
  classificarAlinhamento,
  classificarGasto,
  classificarProposicoes,
} from '@/modules/parlamentares/domain/leitura-rapida'

export const alt =
  'Parlamentar — Brasil à Vera, plataforma de transparência política'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

interface Props {
  params: Promise<{ id: string }>
}

const casaLabel = (casa: Casa) => (casa === 'CAMARA' ? 'Câmara' : 'Senado')

// "Card de Fato" (C1) — derivação das 3 frases factuais a partir dos MESMOS
// classificadores do bloco da página (A1, leitura-rapida.ts). Plain strings
// para o satori. Coerência NÃO entra (decisão de produto: o fato mais
// descontextualizável + query não-cacheada). ADR-040: factual, sem juízo.

function fatoAlinhamento(a: AlinhamentoResult, casa: Casa): string {
  const f = classificarAlinhamento(a, casa)
  switch (f.kind) {
    case 'completo':
      return `${f.percentual}% de acordo com a orientação do partido · ${f.total} votações${
        f.amostraInsuficiente ? ' (amostra pequena)' : ''
      }`
    case 'federacao':
      return `Orientação pela federação ${f.federacaoNome} — não calculado pela sigla`
    case 'senado_sem_dado':
      return 'Alinhamento do Senado: ingestão de orientação pendente'
    case 'sem_orientacao':
      return 'Sem orientação registrada nas votações ingeridas'
  }
}

function fatoGasto(
  gastos: { totalGeral: string; totalRegistros: number },
  percentil: number | null,
  casa: Casa,
  ano: number,
): string {
  const f = classificarGasto(gastos, percentil)
  if (f.kind === 'sem_gasto') return `Sem gastos de cota parlamentar em ${ano}`
  const pct =
    f.percentil !== null
      ? ` · ${formatPercentil(f.percentil)} da ${casaLabel(casa)}`
      : ''
  return `Cota CEAP ${ano}: ${formatBRL(f.total)}${pct}`
}

function fatoProposicoes(
  count: number,
  percentil: number | null,
  casa: Casa,
): string {
  const f = classificarProposicoes(count, percentil, false)
  if (f.kind === 'nenhuma') return 'Nenhuma proposição de autoria'
  const pct =
    f.percentil !== null
      ? ` · ${formatPercentil(f.percentil)} da ${casaLabel(casa)}`
      : ''
  return `${f.count} ${f.count === 1 ? 'proposição' : 'proposições'} de autoria${pct}`
}

function Fato({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span
        style={{
          fontSize: '17px',
          color: '#71717a',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: '25px', color: '#18181b' }}>{value}</span>
    </div>
  )
}

export default async function OgParlamentar({ params }: Props) {
  const { id } = await params
  const p = await getParlamentarById(id)

  if (!p) {
    return fallbackOg('Parlamentar não encontrado')
  }

  // Apenas queries CACHEADAS (disciplina de custo Neon): alinhamento (24h),
  // gastos (6h), comparações (1h, agora também traz a contagem de proposições).
  // getCoerenciaStats (não-cacheada) fica fora — coerência não vai no card.
  const ano = new Date().getFullYear()
  const [alinhamento, gastos, comparacoes] = await Promise.all([
    getAlinhamentoParlamentar(p.id),
    getGastosResumo(p.id, ano),
    getComparacoesCasa(p.id),
  ])

  const cargo = p.casa === 'CAMARA' ? 'Deputado Federal' : 'Senador'
  const partidoUf = `${p.partidoSigla} / ${p.uf}`

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
          flex: 1,
          padding: '56px 64px',
          alignItems: 'center',
          gap: '48px',
        }}
      >
        {p.urlFoto ? (
          // biome-ignore lint/performance/noImgElement: next/image não funciona dentro de ImageResponse (satori). <img> é obrigatório.
          <img
            src={p.urlFoto}
            alt=""
            width={240}
            height={320}
            style={{
              width: '240px',
              height: '320px',
              objectFit: 'cover',
              borderRadius: '16px',
              border: '4px solid #e4e4e7',
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              width: '240px',
              height: '320px',
              borderRadius: '16px',
              backgroundColor: '#e4e4e7',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '110px',
              color: '#a1a1aa',
              fontWeight: 700,
            }}
          >
            {p.nome.charAt(0)}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <span
            style={{
              fontSize: '22px',
              color: '#71717a',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '8px',
            }}
          >
            {cargo}
          </span>
          <span
            style={{
              fontSize: '46px',
              fontWeight: 700,
              color: '#18181b',
              lineHeight: 1.05,
              marginBottom: '10px',
            }}
          >
            {truncate(p.nome, 38)}
          </span>
          <span
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: '#059669',
              fontFamily: 'monospace',
              marginBottom: '24px',
            }}
          >
            {partidoUf}
          </span>

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <Fato
              label="Alinhamento ao partido"
              value={fatoAlinhamento(alinhamento, p.casa)}
            />
            <Fato
              label="Cota CEAP"
              value={fatoGasto(
                gastos,
                comparacoes.percentilGastoCasa,
                p.casa,
                ano,
              )}
            />
            <Fato
              label="Proposições"
              value={fatoProposicoes(
                comparacoes.proposicoesCount ?? 0,
                comparacoes.percentilProposicoesCasa,
                p.casa,
              )}
            />
          </div>
        </div>
      </div>
      <BrandFooter />
    </div>,
    {
      ...size,
      // Limita regeneração (espelha os OGs de listagem). As queries acima já são
      // cacheadas; isto evita re-render da imagem a cada hit de scraper.
      headers: { 'cache-control': 'public, max-age=3600, s-maxage=3600' },
    },
  )
}
