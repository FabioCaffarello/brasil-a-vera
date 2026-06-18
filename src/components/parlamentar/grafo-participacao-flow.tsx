'use client'

import '@xyflow/react/dist/style.css'
import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  type EdgeProps,
  getStraightPath,
  Handle,
  MiniMap,
  type Node,
  type NodeProps,
  Panel,
  Position,
  ReactFlow,
  useInternalNode,
} from '@xyflow/react'
import { Building2, HelpCircle } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import type { GrafoParticipacao } from '@/modules/eleitoral/domain/grafo'

// Canvas ReactFlow do ego-grafo de participação societária (Eixo 2 — Camada D).
// Camada Brasil a Vera (ADR-037 §5); chrome via tokens RDS (classes Tailwind).
// Padrões dos exemplos do ReactFlow: custom nodes, floating edges, hover-focus,
// Controls + Panel + Background. Read-only.
//
// Tokens: só --color-chart-N é CSS var; fg/surface/line vêm de classe Tailwind
// (var() inline resolve vazio). Ver memória feedback_theme_tokens_css_vars.

const MAX_NOS = 18

function brlCurto(valor: string | number): string {
  const n = typeof valor === 'number' ? valor : Number(valor)
  if (n >= 1_000_000)
    return `R$ ${(n / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (n >= 1_000)
    return `R$ ${Math.round(n / 1000).toLocaleString('pt-BR')} mil`
  return `R$ ${n.toLocaleString('pt-BR')}`
}

interface EmpresaData {
  nome: string
  valor: string
  valorPct: number
  resolvido: boolean
  anos: string
  focado: boolean
  [key: string]: unknown
}
interface EgoData {
  nome: string
  resumo: string
  [key: string]: unknown
}
interface ArestaData {
  width: number
  focado: boolean
  [key: string]: unknown
}

function EmpresaNode({ data }: NodeProps) {
  const d = data as EmpresaData
  return (
    <div
      className={`w-44 rounded-lg bg-surface-base px-3 py-2 shadow-md transition-shadow ${
        d.resolvido
          ? 'border border-[var(--color-chart-1)] border-solid'
          : 'border border-fg-quaternary border-dashed'
      } ${d.focado ? 'ring-2 ring-[var(--color-chart-1)] ring-offset-1' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0 }}
        isConnectable={false}
      />
      <div className="flex items-center gap-1.5">
        {d.resolvido ? (
          <Building2 className="h-3.5 w-3.5 shrink-0 text-fg-tertiary" />
        ) : (
          <HelpCircle className="h-3.5 w-3.5 shrink-0 text-fg-quaternary" />
        )}
        <span
          className="line-clamp-2 font-semibold text-[11px] text-fg-primary leading-tight"
          title={d.nome}
        >
          {d.nome}
        </span>
      </div>
      <div className="mt-1 font-medium text-[11px] text-fg-primary tabular-nums">
        {brlCurto(d.valor)}
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-elevated">
        <div
          className="h-full rounded-full bg-[var(--color-chart-1)]"
          style={{ width: `${Math.max(d.valorPct * 100, 4)}%` }}
        />
      </div>
      <div className="mt-1 text-[9px] text-fg-tertiary uppercase tracking-wide">
        {d.resolvido ? 'CNPJ' : 's/ CNPJ'} · {d.anos}
      </div>
    </div>
  )
}

function EgoNode({ data }: NodeProps) {
  const d = data as EgoData
  return (
    <div className="max-w-[210px] rounded-xl border-2 border-[var(--color-chart-1)] bg-surface-raised px-4 py-3 text-center shadow-lg">
      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0 }}
        isConnectable={false}
      />
      <div className="font-bold text-[13px] text-fg-primary">{d.nome}</div>
      <div className="mt-0.5 text-[10px] text-fg-tertiary">{d.resumo}</div>
    </div>
  )
}

// Floating edge centro→centro (ocultas sob os nós → spokes radiais limpos).
function FloatingEdge({ source, target, data }: EdgeProps) {
  const s = useInternalNode(source)
  const t = useInternalNode(target)
  if (!s || !t) return null
  const sx = s.internals.positionAbsolute.x + (s.measured?.width ?? 0) / 2
  const sy = s.internals.positionAbsolute.y + (s.measured?.height ?? 0) / 2
  const tx = t.internals.positionAbsolute.x + (t.measured?.width ?? 0) / 2
  const ty = t.internals.positionAbsolute.y + (t.measured?.height ?? 0) / 2
  const [path] = getStraightPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  })
  const d = data as ArestaData | undefined
  return (
    <path
      className={
        d?.focado
          ? 'stroke-current text-[var(--color-chart-1)]'
          : 'stroke-current text-fg-quaternary'
      }
      d={path}
      fill="none"
      style={{ strokeWidth: d?.width ?? 1.5, opacity: d?.opacity as number }}
    />
  )
}

const nodeTypes = { empresa: EmpresaNode, ego: EgoNode }
const edgeTypes = { floating: FloatingEdge }

interface Props {
  grafo: GrafoParticipacao
  parlamentarNome: string
}

export function GrafoParticipacaoFlow({ grafo, parlamentarNome }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)

  const empresas = useMemo(
    () =>
      [...grafo.empresas]
        .sort((a, b) => Number(b.totalDeclarado) - Number(a.totalDeclarado))
        .slice(0, MAX_NOS),
    [grafo],
  )
  const totalGeral = useMemo(
    () => grafo.empresas.reduce((acc, e) => acc + Number(e.totalDeclarado), 0),
    [grafo],
  )

  const { nodes, edges } = useMemo(() => {
    const n = Math.max(empresas.length, 1)
    const maxTotal = Math.max(
      ...empresas.map((e) => Number(e.totalDeclarado)),
      1,
    )
    // Raio escala com a contagem p/ evitar sobreposição (arc > largura do nó).
    const raio = Math.max(240, n * 30)

    const nodes: Node[] = [
      {
        id: 'parlamentar',
        type: 'ego',
        position: { x: 0, y: 0 },
        data: {
          nome: parlamentarNome,
          resumo: `${grafo.totalEmpresas} ${grafo.totalEmpresas === 1 ? 'empresa' : 'empresas'} · ${brlCurto(totalGeral)}`,
        },
        draggable: false,
        style: { opacity: hovered ? 0.95 : 1 },
      },
    ]
    const edges: Edge[] = []

    empresas.forEach((e, i) => {
      const ang = (2 * Math.PI * i) / n - Math.PI / 2
      const ativo = hovered === null || hovered === e.key
      const anos = [...new Set(e.participacoes.map((p) => p.ano))]
        .sort((a, b) => a - b)
        .join(', ')
      nodes.push({
        id: e.key,
        type: 'empresa',
        position: { x: Math.cos(ang) * raio, y: Math.sin(ang) * raio },
        data: {
          nome: e.nomeCurto,
          valor: e.totalDeclarado,
          valorPct: Number(e.totalDeclarado) / maxTotal,
          resolvido: e.resolvido,
          anos,
          focado: hovered === e.key,
        },
        draggable: false,
        style: { opacity: ativo ? 1 : 0.28, transition: 'opacity 150ms' },
      })
      const width =
        Math.round((1.2 + 3.3 * (Number(e.totalDeclarado) / maxTotal)) * 10) /
        10
      edges.push({
        id: `edge-${e.key}`,
        source: 'parlamentar',
        target: e.key,
        type: 'floating',
        data: {
          width: hovered === e.key ? width + 1 : width,
          focado: hovered === e.key,
          opacity: ativo ? 0.75 : 0.12,
        },
      })
    })

    return { nodes, edges }
  }, [empresas, totalGeral, grafo.totalEmpresas, parlamentarNome, hovered])

  const onEnter = useCallback((_: unknown, node: Node) => {
    setHovered(node.id === 'parlamentar' ? null : node.id)
  }, [])
  const onLeave = useCallback(() => setHovered(null), [])

  const capN = grafo.totalEmpresas - empresas.length

  return (
    <div
      aria-label={`Grafo de participação societária de ${parlamentarNome}: ${grafo.totalEmpresas} ${grafo.totalEmpresas === 1 ? 'empresa' : 'empresas'}. Detalhes na lista abaixo.`}
      className="h-[28rem] w-full overflow-hidden rounded-lg border border-line-default bg-surface-canvas"
      role="img"
    >
      <ReactFlow
        colorMode="dark"
        edges={edges}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        maxZoom={1.5}
        minZoom={0.15}
        nodes={nodes}
        nodesConnectable={false}
        nodesDraggable={false}
        nodeTypes={nodeTypes}
        onNodeMouseEnter={onEnter}
        onNodeMouseLeave={onLeave}
        panOnScroll={false}
        proOptions={{ hideAttribution: false }}
        zoomOnScroll={false}
      >
        <Background gap={22} size={1} variant={BackgroundVariant.Dots} />
        <Controls position="bottom-right" showInteractive={false} />
        {grafo.totalEmpresas > 6 ? (
          <MiniMap
            nodeColor={(node) =>
              node.type === 'ego' || (node.data as EmpresaData).resolvido
                ? 'var(--color-chart-1)'
                : 'var(--color-chart-3)'
            }
            nodeStrokeWidth={2}
            pannable
            position="bottom-left"
            zoomable
          />
        ) : null}
        <Panel position="top-left">
          <div className="flex flex-col gap-1 rounded-md border border-line-default bg-surface-base/85 px-2.5 py-1.5 text-[11px] text-fg-tertiary backdrop-blur">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-3 rounded-sm border border-[var(--color-chart-1)]" />
              com CNPJ ({grafo.nResolvidas})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-3 rounded-sm border border-fg-quaternary border-dashed" />
              sem CNPJ ({grafo.totalEmpresas - grafo.nResolvidas})
            </span>
            {capN > 0 ? (
              <span className="text-fg-quaternary">
                mostrando as {empresas.length} maiores de {grafo.totalEmpresas}
              </span>
            ) : null}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
