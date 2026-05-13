import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('./setup/db'))

import { GET as exportParlamentares } from '@/app/api/export/parlamentares/route'
import { GET as exportProposicoes } from '@/app/api/export/proposicoes/route'
import { GET as exportVotos } from '@/app/api/export/votacoes/[id]/votos/route'
import { GET as exportVotacoes } from '@/app/api/export/votacoes/route'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { proposicao } from '@/modules/proposicoes/domain/schema'
import { votacao, votoNominal } from '@/modules/votacoes/domain/schema'

import { buildParlamentar } from './fixtures/parlamentares'
import { buildProposicao } from './fixtures/proposicoes'
import { buildVotacao, buildVotoNominal } from './fixtures/votacoes'
import { db } from './setup/db'
import { truncateAll } from './setup/truncate'

// `Response.text()` (WHATWG fetch) strip-a BOM automaticamente no decode UTF-8;
// para validar BOM, lemos bytes brutos via `arrayBuffer()`. `text()` segue OK
// para verificar conteúdo, contagem de linhas e filtros.
async function bodyBytes(response: Response): Promise<Uint8Array> {
  return new Uint8Array(await response.arrayBuffer())
}

function hasUtf8Bom(bytes: Uint8Array): boolean {
  return bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
}

function decode(bytes: Uint8Array): string {
  // Decode preservando BOM (não usar Response.text que estripa).
  return new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes)
}

function reqFor(url: string): Request {
  return new Request(`http://localhost${url}`)
}

function rowsOf(text: string): string[] {
  return text.replace(/^﻿/, '').split('\r\n').filter(Boolean)
}

function headerCols(text: string): string[] {
  return rowsOf(text)[0].split(',')
}

function dataRows(text: string): string[] {
  return rowsOf(text).slice(1)
}

describe('api/export/parlamentares (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  it('encoding: preserva acentos com BOM UTF-8 e headers CSV corretos', async () => {
    await db.insert(parlamentar).values(
      buildParlamentar({
        nome: 'José Antônio Mañana',
        partidoSigla: 'PT',
        uf: 'SP',
      }),
    )

    const res = await exportParlamentares(reqFor('/api/export/parlamentares'))

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    expect(res.headers.get('content-disposition')).toBe(
      'attachment; filename="parlamentares.csv"',
    )
    expect(res.headers.get('cache-control')).toBe(
      'private, max-age=0, no-store',
    )

    const bytes = await bodyBytes(res)
    expect(hasUtf8Bom(bytes)).toBe(true)
    expect(decode(bytes)).toContain('José Antônio Mañana')
  })

  it('contagem: header tem trust_level + source_url, linha tem L1 + URL', async () => {
    await db.insert(parlamentar).values(buildParlamentar())

    const res = await exportParlamentares(reqFor('/api/export/parlamentares'))
    const text = await res.text()
    const cols = headerCols(text)
    const rows = dataRows(text)

    expect(cols).toContain('trust_level')
    expect(cols).toContain('source_url')
    expect(rows).toHaveLength(1)

    const cells = rows[0].split(',')
    expect(cells[cols.indexOf('trust_level')]).toBe('L1')
    expect(cells[cols.indexOf('source_url')]).toMatch(
      /^https:\/\/example\.test/,
    )
  })

  it('filtro: ?partido=PT retorna apenas parlamentares do PT', async () => {
    await db
      .insert(parlamentar)
      .values([
        buildParlamentar({ nome: 'Alice', partidoSigla: 'PT' }),
        buildParlamentar({ nome: 'Bruno', partidoSigla: 'PT' }),
        buildParlamentar({ nome: 'Carla', partidoSigla: 'PL' }),
      ])

    const res = await exportParlamentares(
      reqFor('/api/export/parlamentares?partido=PT'),
    )
    const text = await res.text()
    const rows = dataRows(text)

    expect(rows).toHaveLength(2)
    for (const row of rows) {
      expect(row).toContain(',PT,')
    }
  })
})

describe('api/export/proposicoes (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  it('encoding: preserva acentos em ementa com BOM UTF-8', async () => {
    await db.insert(proposicao).values(
      buildProposicao({
        numero: 9001,
        ementa:
          'Institui a Lei Nacional de Diretrizes para Atenção Integral à Asma Grave.',
      }),
    )

    const res = await exportProposicoes(reqFor('/api/export/proposicoes'))

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8')

    const bytes = await bodyBytes(res)
    expect(hasUtf8Bom(bytes)).toBe(true)
    expect(decode(bytes)).toContain('Atenção Integral à Asma Grave')
  })

  it('contagem: cada linha tem trust_level L1 + source_url preenchidos', async () => {
    await db
      .insert(proposicao)
      .values([
        buildProposicao({ numero: 9002 }),
        buildProposicao({ numero: 9003 }),
      ])

    const res = await exportProposicoes(reqFor('/api/export/proposicoes'))
    const text = decode(await bodyBytes(res))
    const cols = headerCols(text)
    const rows = dataRows(text)

    expect(rows).toHaveLength(2)
    const trustIdx = cols.indexOf('trust_level')
    const sourceIdx = cols.indexOf('source_url')
    expect(trustIdx).toBeGreaterThan(-1)
    expect(sourceIdx).toBeGreaterThan(-1)

    for (const row of rows) {
      const cells = row.split(',')
      expect(cells[trustIdx]).toBe('L1')
      expect(cells[sourceIdx]).toMatch(/^https?:\/\//)
    }
  })

  it('filtro: ?tipo=PEC&ano=2024 retorna apenas PEC de 2024', async () => {
    await db
      .insert(proposicao)
      .values([
        buildProposicao({ tipo: 'PEC', ano: 2024, numero: 9101 }),
        buildProposicao({ tipo: 'PEC', ano: 2024, numero: 9102 }),
        buildProposicao({ tipo: 'PEC', ano: 2023, numero: 9103 }),
        buildProposicao({ tipo: 'PL', ano: 2024, numero: 9104 }),
      ])

    const res = await exportProposicoes(
      reqFor('/api/export/proposicoes?tipo=PEC&ano=2024'),
    )
    const text = decode(await bodyBytes(res))
    const cols = headerCols(text)
    const rows = dataRows(text)

    expect(rows).toHaveLength(2)
    const tipoIdx = cols.indexOf('tipo')
    const anoIdx = cols.indexOf('ano')
    for (const row of rows) {
      const cells = row.split(',')
      expect(cells[tipoIdx]).toBe('PEC')
      expect(cells[anoIdx]).toBe('2024')
    }
  })
})

describe('api/export/votacoes (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  it('encoding: preserva acentos em descrição com BOM UTF-8', async () => {
    await db
      .insert(votacao)
      .values(
        buildVotacao({ descricao: 'Aprovação do projeto de eleição direta' }),
      )

    const res = await exportVotacoes(reqFor('/api/export/votacoes'))

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8')

    const bytes = await bodyBytes(res)
    expect(hasUtf8Bom(bytes)).toBe(true)
    expect(decode(bytes)).toContain('Aprovação do projeto de eleição direta')
  })

  it('contagem: header tem votos_sim/votos_nao/abstencoes e trust+source', async () => {
    await db.insert(votacao).values(buildVotacao())

    const res = await exportVotacoes(reqFor('/api/export/votacoes'))
    const text = decode(await bodyBytes(res))
    const cols = headerCols(text)

    for (const required of [
      'votos_sim',
      'votos_nao',
      'abstencoes',
      'trust_level',
      'source_url',
    ]) {
      expect(cols).toContain(required)
    }
  })

  it('filtro: ?casa=SENADO retorna apenas votações do Senado', async () => {
    await db
      .insert(votacao)
      .values([
        buildVotacao({ casa: 'CAMARA' }),
        buildVotacao({ casa: 'CAMARA' }),
        buildVotacao({ casa: 'SENADO' }),
      ])

    const res = await exportVotacoes(reqFor('/api/export/votacoes?casa=SENADO'))
    const text = decode(await bodyBytes(res))
    const cols = headerCols(text)
    const rows = dataRows(text)

    expect(rows).toHaveLength(1)
    expect(rows[0].split(',')[cols.indexOf('casa')]).toBe('SENADO')
  })
})

describe('api/export/votacoes/[id]/votos (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  it('encoding: preserva acentos em nome de parlamentar com BOM UTF-8', async () => {
    const p = buildParlamentar({ nome: 'Acácio Favacho' })
    const v = buildVotacao()
    await db.insert(parlamentar).values(p)
    await db.insert(votacao).values(v)
    await db.insert(votoNominal).values(
      buildVotoNominal({
        votacaoId: v.id as string,
        parlamentarId: p.id as string,
      }),
    )

    const res = await exportVotos(
      reqFor(`/api/export/votacoes/${v.id}/votos`),
      {
        params: Promise.resolve({ id: v.id as string }),
      },
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8')

    const bytes = await bodyBytes(res)
    expect(hasUtf8Bom(bytes)).toBe(true)
    expect(decode(bytes)).toContain('Acácio Favacho')
  })

  it('contagem: linha tem parlamentar_id, voto, trust_level L1 e source_url da votação', async () => {
    const p = buildParlamentar()
    const v = buildVotacao()
    await db.insert(parlamentar).values(p)
    await db.insert(votacao).values(v)
    await db.insert(votoNominal).values(
      buildVotoNominal({
        votacaoId: v.id as string,
        parlamentarId: p.id as string,
        voto: 'NAO',
      }),
    )

    const res = await exportVotos(
      reqFor(`/api/export/votacoes/${v.id}/votos`),
      {
        params: Promise.resolve({ id: v.id as string }),
      },
    )
    const text = decode(await bodyBytes(res))
    const cols = headerCols(text)
    const rows = dataRows(text)

    expect(rows).toHaveLength(1)
    const cells = rows[0].split(',')
    expect(cells[cols.indexOf('parlamentar_id')]).toBe(p.id)
    expect(cells[cols.indexOf('voto')]).toBe('NAO')
    expect(cells[cols.indexOf('trust_level')]).toBe('L1')
    expect(cells[cols.indexOf('source_url')]).toBe(v.sourceUrl)
  })

  it('filtro: 404 quando votação não existe', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000'
    const res = await exportVotos(
      reqFor(`/api/export/votacoes/${fakeId}/votos`),
      {
        params: Promise.resolve({ id: fakeId }),
      },
    )

    expect(res.status).toBe(404)
  })
})

// Truncagem honesta — Opção A (custom headers) escolhida no Sprint 3.0.
// X-Total-Count: total disponível para os filtros (sem limite)
// X-Returned-Count: linhas no CSV
// X-Truncated: "true" quando total > returned, "false" caso contrário
describe('truncagem honesta (proposições)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  it('quando count < limite: x-truncated false, total = returned', async () => {
    await db
      .insert(proposicao)
      .values([
        buildProposicao({ numero: 9201 }),
        buildProposicao({ numero: 9202 }),
      ])

    const res = await exportProposicoes(reqFor('/api/export/proposicoes'))
    expect(res.headers.get('x-total-count')).toBe('2')
    expect(res.headers.get('x-returned-count')).toBe('2')
    expect(res.headers.get('x-truncated')).toBe('false')
  })

  it('com filtro aplicado, x-total-count reflete subset filtrado (não tabela inteira)', async () => {
    await db
      .insert(proposicao)
      .values([
        buildProposicao({ tipo: 'PEC', ano: 2024, numero: 9301 }),
        buildProposicao({ tipo: 'PEC', ano: 2024, numero: 9302 }),
        buildProposicao({ tipo: 'PL', ano: 2024, numero: 9303 }),
      ])

    const res = await exportProposicoes(
      reqFor('/api/export/proposicoes?tipo=PEC&ano=2024'),
    )
    expect(res.headers.get('x-total-count')).toBe('2')
    expect(res.headers.get('x-returned-count')).toBe('2')
    expect(res.headers.get('x-truncated')).toBe('false')
  })
})
