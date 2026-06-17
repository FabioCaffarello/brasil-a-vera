'use client'

import '@xyflow/react/dist/style.css'
import {
  Background,
  BackgroundVariant,
  type Edge,
  type EdgeProps,
  getStraightPath,
  Handle,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  useInternalNode,
} from '@xyflow/react'
import { useMemo } from 'react'

import type { GrafoParticipacao } from '@/modules/eleitoral/domain/grafo'

// Canvas ReactFlow do ego-grafo (Eixo 2 — Camada D). Camada Brasil a Vera
// (ADR-037 §5). Custom nodes + floating edges (centro→centro, ocultas sob os
// nós) para spokes radiais limpos; espessura da aresta e ordem codificam a
// magnitude declarada. Read-only.
//
// IMPORTANTE (tokens): só `--color-chart-N` existe como CSS var no :root; os
// tokens fg/surface/line são `@theme inline` (compilados nas utilities, NÃO
// expostos como var). Logo a COR vem de className Tailwind; var() inline só
// para chart-N. Aprendizado registrado em memória.

const MAX_NOS = 18
const RAIO = 270

function brlCurto(valor: string): string {
  const n = Number(valor)
  if (n >= 1_000_000)
    return `R$ ${(n / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (n >= 1_000)
    return `R$ ${Math.round(n / 1000).toLocaleString('pt-BR')} mil`
  return `R$ ${n.toLocaleString('pt-BR')}`
}

interface EmpresaData {
  nome: string
  valor: string
  resolvido: boolean
  [key: string]: unknown
}
interface EgoData {
  nome: string
  [key: string]: unknown
}
interface ArestaData {
  width: number
  [key: string]: unknown
}

function EmpresaNode({ data }: NodeProps) {
  const d = data as EmpresaData
  return (
    <div
      className={`w-[158px] rounded-lg bg-surface-base px-2.5 py-2 text-fg-primary shadow-md ${
        d.resolvido
          ? 'border-[1.5px] border-[var(--color-chart-1)] border-solid'
          : 'border-[1.5px] border-fg-quaternary border-dashed'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0 }}
        isConnectable={false}
      />
      <div
        className="line-clamp-2 font-semibold text-[11px] leading-tight"
        title={d.nome}
      >
        {d.nome}
      </div>
      <div className="mt-0.5 text-[10px] text-fg-tertiary">
        {brlCurto(d.valor)}
        {d.resolvido ? '' : ' · s/ CNPJ'}
      </div>
    </div>
  )
}

function EgoNode({ data }: NodeProps) {
  const d = data as EgoData
  return (
    <div className="max-w-[190px] rounded-full border-2 border-[var(--color-chart-1)] bg-surface-raised px-4 py-2.5 text-center font-bold text-[12.5px] text-fg-primary shadow-lg">
      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0 }}
        isConnectable={false}
      />
      {d.nome}
    </div>
  )
}

// Floating edge: liga o centro do ego ao centro da empresa; os nós (desenhados
// por cima) ocultam o miolo, deixando só o "raio" entre as bordas. Cor via
// classe (stroke-current + text-fg-tertiary); espessura por valor.
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
  const width = (data as ArestaData | undefined)?.width ?? 1.5
  return (
    <path
      className="stroke-current text-fg-quaternary opacity-70"
      d={path}
      fill="none"
      style={{ strokeWidth: width }}
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
  const { nodes, edges } = useMemo(() => {
    const empresas = [...grafo.empresas]
      .sort((a, b) => Number(b.totalDeclarado) - Number(a.totalDeclarado))
      .slice(0, MAX_NOS)
    const n = Math.max(empresas.length, 1)
    const maxTotal = Math.max(
      ...empresas.map((e) => Number(e.totalDeclarado)),
      1,
    )

    const nodes: Node[] = [
      {
        id: 'parlamentar',
        type: 'ego',
        position: { x: 0, y: 0 },
        data: { nome: parlamentarNome },
        draggable: false,
      },
    ]
    const edges: Edge[] = []

    empresas.forEach((e, i) => {
      const ang = (2 * Math.PI * i) / n - Math.PI / 2
      nodes.push({
        id: e.key,
        type: 'empresa',
        position: { x: Math.cos(ang) * RAIO, y: Math.sin(ang) * RAIO },
        data: {
          nome: e.nomeCurto,
          valor: e.totalDeclarado,
          resolvido: e.resolvido,
        },
        draggable: false,
      })
      const width =
        Math.round((1.2 + 3.3 * (Number(e.totalDeclarado) / maxTotal)) * 10) /
        10
      edges.push({
        id: `edge-${e.key}`,
        source: 'parlamentar',
        target: e.key,
        type: 'floating',
        data: { width },
      })
    })

    return { nodes, edges }
  }, [grafo, parlamentarNome])

  return (
    <div className="h-[26rem] w-full overflow-hidden rounded-lg border border-line-default bg-surface-canvas">
      <ReactFlow
        edges={edges}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.2}
        nodes={nodes}
        nodesConnectable={false}
        nodesDraggable={false}
        nodeTypes={nodeTypes}
        panOnScroll={false}
        zoomOnScroll={false}
      >
        <Background gap={20} variant={BackgroundVariant.Dots} />
      </ReactFlow>
    </div>
  )
}
