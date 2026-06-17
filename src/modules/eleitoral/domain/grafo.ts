// Lógica de domínio da Camada D — grafo de participação societária (Eixo 2).
// Funções puras: a query lê os bens de participação (categorias TSE 31/32/39)
// de um parlamentar e passa as linhas aqui, que extraem o CNPJ da descrição
// livre e montam o ego-grafo (parlamentar central + empresas).
//
// Determinístico, sem IA (ADR-037): CNPJ por regex; empresa sem CNPJ vira nó
// NÃO-resolvido (chave = descrição normalizada DAQUELA declaração), nunca
// fundido por similaridade. Trust L3 (extração de entidade de texto livre).

// CD_TIPO_BEM do TSE: 31 Ações, 32 Quotas/quinhões, 39 Outras participações.
export const CATEGORIAS_PARTICIPACAO = [31, 32, 39] as const

// CNPJ: 14 dígitos com separadores opcionais (cobre "08.993.224/0001-53",
// "05983662/0001-42" e cru "02386806000195"). Lookarounds evitam casar dentro
// de um número maior.
const CNPJ_RE = /(?<!\d)\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}(?!\d)/
const CNPJ_RE_G = new RegExp(CNPJ_RE.source, 'g')

// Extrai o primeiro CNPJ da descrição → 14 dígitos sem pontuação; null se não
// houver. NÃO valida dígito verificador (a fonte é o que o TSE declarou).
export function extrairCnpj(texto: string): string | null {
  const m = texto.match(CNPJ_RE)
  if (!m) return null
  const d = m[0].replace(/\D/g, '')
  return d.length === 14 ? d : null
}

export function formatarCnpj(cnpj: string): string {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

function normalizar(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

// Rótulo do nó a partir da descrição livre: remove o CNPJ e a palavra "CNPJ",
// colapsa espaços, corta. É o texto declarado (não um nome canônico — L3).
function limparLabel(dsBem: string): string {
  return dsBem
    .replace(CNPJ_RE_G, ' ')
    .replace(/\bCNPJ\b\s*:?\s*-?/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90)
}

function toCents(v: string): number {
  return Math.round(Number(v) * 100)
}
function centsToStr(c: number): string {
  return (c / 100).toFixed(2)
}

export interface ParticipacaoAresta {
  ano: number
  valor: string
  categoria: string
}

export interface EmpresaNo {
  key: string // "cnpj:<14d>" ou "desc:<normalizado>"
  label: string
  cnpj: string | null
  resolvido: boolean
  // Soma nominal das participações declaradas nesta empresa (magnitude do nó).
  totalDeclarado: string
  participacoes: ParticipacaoAresta[]
}

export interface GrafoParticipacao {
  empresas: EmpresaNo[] // ordenadas por totalDeclarado desc
  totalEmpresas: number
  nResolvidas: number
}

// Linha de bem de participação societária vinda do SQL.
export interface GrafoRow {
  anoEleicao: number
  cdTipoBem: number
  dsTipoBem: string
  dsBem: string
  valor: string
}

// Monta o ego-grafo. null se o parlamentar não declarou participação societária.
export function buildGrafoParticipacao(
  rows: GrafoRow[],
): GrafoParticipacao | null {
  if (rows.length === 0) return null

  const map = new Map<
    string,
    {
      label: string
      cnpj: string | null
      resolvido: boolean
      cents: number
      participacoes: ParticipacaoAresta[]
    }
  >()

  for (const r of rows) {
    const cnpj = extrairCnpj(r.dsBem)
    const label =
      limparLabel(r.dsBem) || (cnpj ? formatarCnpj(cnpj) : r.dsTipoBem)
    const key = cnpj ? `cnpj:${cnpj}` : `desc:${normalizar(label)}`
    let e = map.get(key)
    if (!e) {
      e = { label, cnpj, resolvido: cnpj !== null, cents: 0, participacoes: [] }
      map.set(key, e)
    }
    e.cents += toCents(r.valor)
    e.participacoes.push({
      ano: r.anoEleicao,
      valor: r.valor,
      categoria: r.dsTipoBem,
    })
  }

  const empresas: EmpresaNo[] = [...map.entries()]
    .map(([key, e]) => ({
      key,
      label: e.label,
      cnpj: e.cnpj,
      resolvido: e.resolvido,
      totalDeclarado: centsToStr(e.cents),
      participacoes: e.participacoes.sort((a, b) => a.ano - b.ano),
    }))
    .sort((a, b) => Number(b.totalDeclarado) - Number(a.totalDeclarado))

  return {
    empresas,
    totalEmpresas: empresas.length,
    nResolvidas: empresas.filter((e) => e.resolvido).length,
  }
}
