import type { VotoIndividual } from '@/lib/queries/votacoes'

interface Props {
  votos: readonly VotoIndividual[]
}

// Ordem visual left-to-right: SIM (esquerda) → centro (neutralidades)
// → NÃO (direita). Reflete a metáfora do hemiciclo como "polos de
// posicionamento". Cores semânticas idênticas ao Donut/Bar/Margem
// (consistência cross-chart no domínio).
const ORDEM_VOTO: readonly {
  voto: string
  cssVar: string
  label: string
}[] = [
  { voto: 'SIM', cssVar: '--success', label: 'Sim' },
  { voto: 'ABSTENCAO', cssVar: '--foreground-muted', label: 'Abstenção' },
  { voto: 'AUSENTE', cssVar: '--warning', label: 'Ausente' },
  { voto: 'OBSTRUCAO', cssVar: '--foreground-subtle', label: 'Obstrução' },
  { voto: 'NAO', cssVar: '--destructive', label: 'Não' },
]

const VIEWBOX_W = 600
const VIEWBOX_H = 320
const CENTER_X = VIEWBOX_W / 2
const CENTER_Y = VIEWBOX_H - 20
const INNER_R = 80
const OUTER_R = 280
const PONTO_R = 5
// Distância angular mínima entre pontos consecutivos (radianos). Calibrada
// para 513 pontos (Câmara) caberem confortavelmente em 8-10 fileiras.
const ESPACAMENTO = 14

interface Ponto {
  cx: number
  cy: number
  fill: string
  title: string
}

// Distribui N pontos em arco semicircular (180°) usando fileiras
// concêntricas. Cada fileira tem capacidade proporcional ao raio
// (perímetro do arco / espacamento). Pontos preenchem em ordem da
// esquerda para direita, fileira interna primeiro.
function distribuirPontos(
  votosOrdenados: readonly {
    voto: string
    cssVar: string
    parlamentar: VotoIndividual
  }[],
): Ponto[] {
  const total = votosOrdenados.length
  if (total === 0) return []

  // Calcula número de fileiras e capacidade total
  const fileiras: { raio: number; capacidade: number }[] = []
  let capacidadeAcumulada = 0
  for (
    let raio = INNER_R;
    raio <= OUTER_R && capacidadeAcumulada < total;
    raio += PONTO_R * 2 + 2
  ) {
    const perimetro = Math.PI * raio
    const capacidade = Math.max(1, Math.floor(perimetro / ESPACAMENTO))
    fileiras.push({ raio, capacidade })
    capacidadeAcumulada += capacidade
  }

  // Se ainda faltarem assentos, expande última fileira (caso de N grande).
  while (capacidadeAcumulada < total && fileiras.length > 0) {
    const ultima = fileiras[fileiras.length - 1]
    if (!ultima) break
    ultima.capacidade += 1
    capacidadeAcumulada += 1
  }

  // Distribui votos pelas fileiras proporcionalmente.
  const pontosPorFileira: number[] = fileiras.map((f) =>
    Math.round((f.capacidade / capacidadeAcumulada) * total),
  )
  // Ajusta diferença de arredondamento.
  let soma = pontosPorFileira.reduce((a, b) => a + b, 0)
  let idx = 0
  while (soma < total) {
    const cur = pontosPorFileira[idx % pontosPorFileira.length]
    if (cur !== undefined) {
      pontosPorFileira[idx % pontosPorFileira.length] = cur + 1
      soma += 1
    }
    idx += 1
  }
  while (soma > total) {
    const cur = pontosPorFileira[idx % pontosPorFileira.length]
    if (cur !== undefined && cur > 0) {
      pontosPorFileira[idx % pontosPorFileira.length] = cur - 1
      soma -= 1
    }
    idx += 1
  }

  // Gera coordenadas — vota da esquerda (π) para direita (0).
  const pontos: Ponto[] = []
  let votoIdx = 0
  for (let f = 0; f < fileiras.length; f += 1) {
    const fileira = fileiras[f]
    const nNaFileira = pontosPorFileira[f]
    if (!fileira || nNaFileira === undefined || nNaFileira === 0) continue
    for (let i = 0; i < nNaFileira; i += 1) {
      const v = votosOrdenados[votoIdx]
      if (!v) break
      // π (esquerda, x negativo) → 0 (direita, x positivo).
      const angulo =
        nNaFileira === 1
          ? Math.PI / 2
          : Math.PI - (i / (nNaFileira - 1)) * Math.PI
      const cx = CENTER_X + fileira.raio * Math.cos(angulo)
      const cy = CENTER_Y - fileira.raio * Math.sin(angulo)
      pontos.push({
        cx,
        cy,
        fill: `var(${v.cssVar})`,
        title: `${v.parlamentar.parlamentarNome} (${v.parlamentar.parlamentarPartidoSigla}/${v.parlamentar.parlamentarUf}) — ${ORDEM_VOTO.find((o) => o.voto === v.voto)?.label ?? v.voto}`,
      })
      votoIdx += 1
    }
  }
  return pontos
}

/**
 * VotacaoHemicicloChart — Wave 9 Sprint 9.3 PR4 (D3 do plano: hemiciclo
 * desktop + Donut mobile).
 *
 * SVG arc semicircular puro, sem Recharts, sem JS, sem libs externas
 * (~120 linhas). Cada parlamentar = 1 ponto, posicionado por ordem
 * left-to-right SIM → centro → NÃO, colorido por tipo de voto.
 * Tooltip nativo do navegador via <title> element (acessibilidade
 * built-in para screen readers).
 *
 * Cardinalidade típica:
 * - Câmara: ~513 pontos em 8-10 fileiras
 * - Senado: ~81 pontos em 4-5 fileiras
 *
 * Server Component — render no servidor, zero JS no cliente. Renderiza
 * apenas em desktop (≥md) via `hidden md:block` no caller — em mobile
 * o Donut consolidado (PR1) cobre o caso de uso.
 */
export function VotacaoHemicicloChart({ votos }: Props) {
  if (votos.length === 0) {
    return (
      <p className="text-foreground-muted text-sm">
        Votação simbólica — sem voto individual registrado.
      </p>
    )
  }

  // Agrupa votos por categoria na ORDEM_VOTO (esquerda→direita).
  const votosOrdenados: {
    voto: string
    cssVar: string
    parlamentar: VotoIndividual
  }[] = []
  const contagem: Record<string, number> = {}
  for (const categoria of ORDEM_VOTO) {
    const grupo = votos.filter((v) => v.voto === categoria.voto)
    contagem[categoria.voto] = grupo.length
    for (const p of grupo) {
      votosOrdenados.push({
        voto: categoria.voto,
        cssVar: categoria.cssVar,
        parlamentar: p,
      })
    }
  }

  const pontos = distribuirPontos(votosOrdenados)

  return (
    <figure className="space-y-3">
      <svg
        aria-label={`Hemiciclo da votação com ${votos.length} parlamentares`}
        className="w-full"
        role="img"
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      >
        {pontos.map((p) => (
          <circle
            cx={p.cx}
            cy={p.cy}
            fill={p.fill}
            key={`${p.cx}-${p.cy}`}
            r={PONTO_R}
          >
            <title>{p.title}</title>
          </circle>
        ))}
      </svg>

      <figcaption>
        <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
          {ORDEM_VOTO.map((cat) => {
            const n = contagem[cat.voto] ?? 0
            if (n === 0) return null
            return (
              <li className="flex items-center gap-1.5" key={cat.voto}>
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: `var(${cat.cssVar})` }}
                />
                <span className="text-foreground-muted">{cat.label}</span>
                <span className="tabular-nums text-foreground">{n}</span>
              </li>
            )
          })}
        </ul>
      </figcaption>
    </figure>
  )
}
