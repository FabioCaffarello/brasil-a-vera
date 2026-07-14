import { desc, eq } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { db } from '@/shared/db'
import { emendaParlamentar } from '@/shared/db/schema'

// Emendas parlamentares (ADR-066): destino do dinheiro indicado pelo
// parlamentar via emendas individuais ao orçamento, por ano. A tabela guarda
// o agregado por emenda×localidade (fonte: bulk CGU, ingestão mensal); aqui
// agregamos por ano + top municípios de destino. 62% do valor não tem
// município específico (destino múltiplo/estadual/nacional) — o bucket
// `semMunicipio*` existe para a UI reportar isso com honestidade, nunca
// silenciar. Valores em CENTAVOS (inteiros) — o roundtrip JSON do cache
// preserva number; a UI converte para reais na formatação.

const TOP_MUNICIPIOS_EXIBIDOS = 5

export interface EmendaMunicipioDestino {
  codigoIbge: string
  nome: string
  uf: string | null
  centavosPago: number
  centavosEmpenhado: number
}

export interface EmendasAno {
  ano: number
  emendas: number
  centavosEmpenhado: number
  centavosPago: number
  /** Parcela sem município específico (múltiplo/estadual/nacional). */
  semMunicipioCentavosEmpenhado: number
  semMunicipioCentavosPago: number
  /** Top municípios de destino por valor pago (fallback empenhado). */
  topMunicipios: EmendaMunicipioDestino[]
}

function paraCentavos(valor: string): number {
  return Math.round(Number(valor) * 100)
}

export async function getEmendas(parlamentarId: string): Promise<EmendasAno[]> {
  return cached(
    `parlamentar:emendas:${parlamentarId}`,
    TTL.emendas,
    async () => {
      const rows = await db
        .select({
          ano: emendaParlamentar.ano,
          codigoEmenda: emendaParlamentar.codigoEmenda,
          municipioIbgeCodigo: emendaParlamentar.municipioIbgeCodigo,
          municipioNome: emendaParlamentar.municipioNome,
          uf: emendaParlamentar.uf,
          valorEmpenhado: emendaParlamentar.valorEmpenhado,
          valorPago: emendaParlamentar.valorPago,
        })
        .from(emendaParlamentar)
        .where(eq(emendaParlamentar.parlamentarId, parlamentarId))
        .orderBy(desc(emendaParlamentar.ano))

      const porAno = new Map<
        number,
        {
          emendas: Set<string>
          centavosEmpenhado: number
          centavosPago: number
          semMunicipioCentavosEmpenhado: number
          semMunicipioCentavosPago: number
          municipios: Map<string, EmendaMunicipioDestino>
        }
      >()

      for (const row of rows) {
        let ano = porAno.get(row.ano)
        if (!ano) {
          ano = {
            emendas: new Set(),
            centavosEmpenhado: 0,
            centavosPago: 0,
            semMunicipioCentavosEmpenhado: 0,
            semMunicipioCentavosPago: 0,
            municipios: new Map(),
          }
          porAno.set(row.ano, ano)
        }
        const empenhado = paraCentavos(row.valorEmpenhado)
        const pago = paraCentavos(row.valorPago)
        ano.emendas.add(row.codigoEmenda)
        ano.centavosEmpenhado += empenhado
        ano.centavosPago += pago

        if (row.municipioIbgeCodigo === null || row.municipioNome === null) {
          ano.semMunicipioCentavosEmpenhado += empenhado
          ano.semMunicipioCentavosPago += pago
          continue
        }
        const existente = ano.municipios.get(row.municipioIbgeCodigo)
        if (existente) {
          existente.centavosEmpenhado += empenhado
          existente.centavosPago += pago
        } else {
          ano.municipios.set(row.municipioIbgeCodigo, {
            codigoIbge: row.municipioIbgeCodigo,
            nome: row.municipioNome,
            uf: row.uf,
            centavosPago: pago,
            centavosEmpenhado: empenhado,
          })
        }
      }

      return [...porAno.entries()]
        .sort(([a], [b]) => b - a)
        .map(([ano, agg]) => ({
          ano,
          emendas: agg.emendas.size,
          centavosEmpenhado: agg.centavosEmpenhado,
          centavosPago: agg.centavosPago,
          semMunicipioCentavosEmpenhado: agg.semMunicipioCentavosEmpenhado,
          semMunicipioCentavosPago: agg.semMunicipioCentavosPago,
          topMunicipios: [...agg.municipios.values()]
            .sort(
              (a, b) =>
                b.centavosPago - a.centavosPago ||
                b.centavosEmpenhado - a.centavosEmpenhado ||
                a.nome.localeCompare(b.nome),
            )
            .slice(0, TOP_MUNICIPIOS_EXIBIDOS),
        }))
    },
  )
}
