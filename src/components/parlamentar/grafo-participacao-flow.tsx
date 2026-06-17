'use client'

import '@xyflow/react/dist/style.css'
import { Background, type Edge, type Node, ReactFlow } from '@xyflow/react'
import { useMemo } from 'react'

import type { GrafoParticipacao } from '@/modules/eleitoral/domain/grafo'

// Canvas ReactFlow do ego-grafo (Eixo 2 — Camada D). Componente da camada
// Brasil a Vera (ADR-037 §5: o RDS não terá grafo). Read-only: layout radial
// determinístico (parlamentar no centro, empresas em círculo), sem arrastar/
// conectar. A lista acessível com os detalhes vive no bloco server.

const MAX_NOS = 18
const RAIO = 240

interface Props {
  grafo: GrafoParticipacao
  parlamentarNome: string
}

export function GrafoParticipacaoFlow({ grafo, parlamentarNome }: Props) {
  const { nodes, edges } = useMemo(() => {
    const empresas = grafo.empresas.slice(0, MAX_NOS)
    const n = Math.max(empresas.length, 1)

    const nodes: Node[] = [
      {
        id: 'parlamentar',
        position: { x: 0, y: 0 },
        data: { label: parlamentarNome },
        style: {
          background: 'var(--color-surface-raised)',
          color: 'var(--color-fg-brand)',
          border: '2px solid var(--color-fg-brand)',
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 12,
          width: 150,
        },
      },
    ]
    const edges: Edge[] = []

    empresas.forEach((e, i) => {
      const ang = (2 * Math.PI * i) / n - Math.PI / 2
      nodes.push({
        id: e.key,
        position: { x: Math.cos(ang) * RAIO, y: Math.sin(ang) * RAIO },
        data: {
          label: e.label.length > 24 ? `${e.label.slice(0, 24)}…` : e.label,
        },
        style: {
          background: 'var(--color-surface-base)',
          color: 'var(--color-fg-primary)',
          border: e.resolvido
            ? '1px solid var(--color-chart-1)'
            : '1px dashed var(--color-fg-quaternary)',
          borderRadius: 6,
          fontSize: 11,
          width: 150,
        },
      })
      edges.push({
        id: `edge-${e.key}`,
        source: 'parlamentar',
        target: e.key,
        style: { stroke: 'var(--color-line-emphasis)' },
      })
    })

    return { nodes, edges }
  }, [grafo, parlamentarNome])

  return (
    <div className="h-96 w-full overflow-hidden rounded-lg border border-line-default">
      <ReactFlow
        edges={edges}
        edgesFocusable={false}
        fitView
        minZoom={0.2}
        nodes={nodes}
        nodesConnectable={false}
        nodesDraggable={false}
      >
        <Background />
      </ReactFlow>
    </div>
  )
}
