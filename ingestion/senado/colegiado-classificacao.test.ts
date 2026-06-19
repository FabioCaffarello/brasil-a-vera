import { describe, expect, it } from 'vitest'

import {
  classificarColegiadoPorNome,
  INDETERMINADOS_COMISSAO,
} from '../shared/membro-comissao'
import corpus from './__fixtures__/colegiado-nomes.json'

// Corpus = nomes DISTINTOS de colegiado que a run completa local dos 81
// senadores revelou (universo bruto, antes de qualquer filtro — inclui o ruído
// que não chega ao banco). Regenerar com o script documentado no PR quando a
// composição mudar; o diff da fixture é o ponto de revisão humana.
const nomes = corpus as string[]
const allow = new Set(INDETERMINADOS_COMISSAO.map((e) => e.nome))

describe('classificarColegiadoPorNome — cobertura do corpus real (proativo)', () => {
  it('todo nome é comissao, ruido, ou indeterminado-ratificado', () => {
    const semClasse = nomes.filter(
      (nome) =>
        classificarColegiadoPorNome(nome) === 'indeterminado' &&
        !allow.has(nome),
    )
    // Falhou? Uma FAMÍLIA NOVA surgiu no corpus que os padrões não reconhecem.
    // Triar cada nome: é ruído (estender a deny-list) ou comissão de nome sujo
    // (entrar na allow-list INDETERMINADOS_COMISSAO com motivo). Nunca ignorar —
    // é justamente o ruído que entraria silencioso por fallback fail-open.
    expect(semClasse).toEqual([])
  })

  it('allow-list sem entrada morta (anti-zumbi): cada entrada está no corpus e é indeterminada', () => {
    const corpusSet = new Set(nomes)
    for (const { nome } of INDETERMINADOS_COMISSAO) {
      expect(
        corpusSet.has(nome),
        `allow-list órfã (fora do corpus): ${nome}`,
      ).toBe(true)
      // Se uma entrada deixou de ser indeterminada (passou a casar padrão), ela
      // virou redundante e deve sair da allow-list.
      expect(classificarColegiadoPorNome(nome)).toBe('indeterminado')
    }
  })
})

describe('classificarColegiadoPorNome — casos', () => {
  it('ruído conhecido vira "ruido"', () => {
    expect(classificarColegiadoPorNome('Comenda Zilda Arns')).toBe('ruido')
    expect(classificarColegiadoPorNome('Conselho da Ordem do CN')).toBe('ruido')
    expect(classificarColegiadoPorNome('Veto Parcial nº 1, de 2015')).toBe(
      'ruido',
    )
    expect(classificarColegiadoPorNome('Frente Parlamentar Evangélica')).toBe(
      'ruido',
    )
    expect(
      classificarColegiadoPorNome(
        'Relatores Setoriais do Projeto de Lei Orçamentária',
      ),
    ).toBe('ruido')
  })

  it('comissão por padrão positivo (incl. abreviações da fonte)', () => {
    expect(classificarColegiadoPorNome('Comissão de Assuntos Econômicos')).toBe(
      'comissao',
    )
    expect(classificarColegiadoPorNome('CESP - Código Civil - 1984')).toBe(
      'comissao',
    )
    expect(
      classificarColegiadoPorNome('CMESP - Reforma Judiciário - 2004'),
    ).toBe('comissao')
    expect(classificarColegiadoPorNome('CT - Defesa Civil - 2011')).toBe(
      'comissao',
    )
    expect(
      classificarColegiadoPorNome('Subc. Perm. de Acompanhamento da Mineração'),
    ).toBe('comissao')
  })

  it('nome terso fora de padrão e não-ratificado vira "indeterminado"', () => {
    expect(classificarColegiadoPorNome('Assunto Qualquer - 2030')).toBe(
      'indeterminado',
    )
  })
})
