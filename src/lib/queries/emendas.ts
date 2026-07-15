import { and, desc, eq, isNotNull } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { normalizeNome } from '@/lib/normalize'
import { db } from '@/shared/db'
import {
  emendaParlamentar,
  tseCandidatura,
  votoCandidatoMunicipio,
} from '@/shared/db/schema'

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

// ── Confronto emendas × colégio eleitoral (ADR-066 D5) ────────────────────
//
// "Que fração do dinheiro indicado via emendas foi para os municípios que
// elegeram o parlamentar?" — cálculo L2 sobre vínculos já estabelecidos.
// Fórmula pública em /docs/metodologia#confronto-emendas-colegio (publicada
// ANTES desta UI, exigência do planejamento da Wave 14).
//
// Ponte entre fontes: o TSE identifica municípios por código próprio e a CGU
// pelo código IBGE — o casamento é por nome normalizado + UF, determinístico
// e fail-closed (município que não casa conta no denominador, nunca no
// numerador; emenda com município sem UF não é confrontável e fica fora dos
// dois lados). O colégio persiste os 20 maiores municípios do pleito
// (ADR-065 §E3) — o percentual real de aderência pode ser maior, nunca menor.

export interface ConfrontoEmendasColegio {
  /** Pleito mais recente do parlamentar com colégio persistido. */
  anoPleito: number
  centavosEmpenhadoComMunicipio: number
  centavosEmpenhadoNoColegio: number
  centavosPagoComMunicipio: number
  centavosPagoNoColegio: number
  /** Municípios de destino de emendas que casaram com o top-20 do colégio. */
  municipiosNoColegio: number
  /** Municípios distintos de destino de emendas (com UF identificada). */
  municipiosComDestino: number
}

function chaveMunicipio(nome: string, uf: string): string {
  return `${normalizeNome(nome)}|${uf.trim().toUpperCase()}`
}

export async function getConfrontoEmendasColegio(
  parlamentarId: string,
): Promise<ConfrontoEmendasColegio | null> {
  return cached(
    `parlamentar:confronto-emendas-colegio:${parlamentarId}`,
    TTL.emendas,
    async () => {
      // Municípios do colégio do pleito mais recente (top-20 persistidos).
      const colegioRows = await db
        .select({
          anoEleicao: votoCandidatoMunicipio.anoEleicao,
          nome: votoCandidatoMunicipio.municipioNome,
          uf: votoCandidatoMunicipio.uf,
        })
        .from(votoCandidatoMunicipio)
        .innerJoin(
          tseCandidatura,
          and(
            eq(tseCandidatura.anoEleicao, votoCandidatoMunicipio.anoEleicao),
            eq(tseCandidatura.sqCandidato, votoCandidatoMunicipio.sqCandidato),
          ),
        )
        .where(eq(tseCandidatura.parlamentarId, parlamentarId))
        .orderBy(desc(votoCandidatoMunicipio.anoEleicao))

      if (colegioRows.length === 0) return null
      const anoPleito = colegioRows[0].anoEleicao
      const colegio = new Set(
        colegioRows
          .filter((r) => r.anoEleicao === anoPleito)
          .map((r) => chaveMunicipio(r.nome, r.uf)),
      )

      // Distribuição COMPLETA de emendas com município identificado (a
      // getEmendas trunca top-5 só na exibição; aqui não há truncagem).
      const emendasRows = await db
        .select({
          nome: emendaParlamentar.municipioNome,
          uf: emendaParlamentar.uf,
          valorEmpenhado: emendaParlamentar.valorEmpenhado,
          valorPago: emendaParlamentar.valorPago,
        })
        .from(emendaParlamentar)
        .where(
          and(
            eq(emendaParlamentar.parlamentarId, parlamentarId),
            isNotNull(emendaParlamentar.municipioNome),
            isNotNull(emendaParlamentar.uf),
          ),
        )

      if (emendasRows.length === 0) return null

      const confronto: ConfrontoEmendasColegio = {
        anoPleito,
        centavosEmpenhadoComMunicipio: 0,
        centavosEmpenhadoNoColegio: 0,
        centavosPagoComMunicipio: 0,
        centavosPagoNoColegio: 0,
        municipiosNoColegio: 0,
        municipiosComDestino: 0,
      }
      const municipiosVistos = new Set<string>()
      const municipiosCasados = new Set<string>()

      for (const row of emendasRows) {
        // isNotNull no WHERE garante; narrow para o type system.
        if (row.nome === null || row.uf === null) continue
        const chave = chaveMunicipio(row.nome, row.uf)
        const empenhado = Math.round(Number(row.valorEmpenhado) * 100)
        const pago = Math.round(Number(row.valorPago) * 100)
        confronto.centavosEmpenhadoComMunicipio += empenhado
        confronto.centavosPagoComMunicipio += pago
        municipiosVistos.add(chave)
        if (colegio.has(chave)) {
          confronto.centavosEmpenhadoNoColegio += empenhado
          confronto.centavosPagoNoColegio += pago
          municipiosCasados.add(chave)
        }
      }

      if (confronto.centavosEmpenhadoComMunicipio <= 0) return null
      confronto.municipiosComDestino = municipiosVistos.size
      confronto.municipiosNoColegio = municipiosCasados.size
      return confronto
    },
  )
}
