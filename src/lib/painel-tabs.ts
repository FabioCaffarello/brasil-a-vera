// Validação centralizada das tabs/subtabs do painel — Fase 2 do refator
// pós-Wave 10 (RFC `docs/product/REFACTOR-PAINEL-TABS.md` §6/§8, ADR-032).
//
// Convenção:
//   - URL slug em kebab-case (`?tab=meus-dados`, `?subtab=da-minha-uf`)
//   - Folder de slot em camelCase quando necessário (`@meusDados/`)
//   - Tabs sem sub-tabs ignoram `?subtab=` silenciosamente (parse* retorna
//     null; o slot aplica seu próprio default)
//
// Por que typed variants em vez de `parseSubtab(tab, value): string | null`
// genérico (sketched no RFC): cada slot só precisa do seu próprio subtab
// type. Variant tipada elimina narrowing manual no slot e dá tipos exatos
// (ParlamentaresSubtab | null vs string | null).

export type TabKey =
  | 'resumo'
  | 'parlamentares'
  | 'alertas'
  | 'configuracoes'
  | 'meus-dados'

export type ParlamentaresSubtab = 'acompanhando' | 'da-minha-uf'
export type AlertasSubtab = 'recebidos' | 'politicas'

export const TAB_KEYS: readonly TabKey[] = [
  'resumo',
  'parlamentares',
  'alertas',
  'configuracoes',
  'meus-dados',
]

const PARLAMENTARES_SUBTABS: readonly ParlamentaresSubtab[] = [
  'acompanhando',
  'da-minha-uf',
]

const ALERTAS_SUBTABS: readonly AlertasSubtab[] = ['recebidos', 'politicas']

/**
 * Parser do query param `?tab=`. Inputs inválidos caem em `resumo`
 * (tab default da Wave 10 Fase 2). Array (múltiplas ocorrências do
 * mesmo param) é tratado como inválido.
 */
export function parseTab(value: string | string[] | undefined | null): TabKey {
  if (typeof value !== 'string') return 'resumo'
  return (TAB_KEYS as readonly string[]).includes(value)
    ? (value as TabKey)
    : 'resumo'
}

/**
 * Parser do query param `?subtab=` para a tab Parlamentares. Retorna
 * `null` quando inválido — o slot aplica seu próprio default (que
 * depende de UF/follows, ver `@parlamentares/page.tsx`).
 */
export function parseParlamentaresSubtab(
  value: string | string[] | undefined | null,
): ParlamentaresSubtab | null {
  if (typeof value !== 'string') return null
  return (PARLAMENTARES_SUBTABS as readonly string[]).includes(value)
    ? (value as ParlamentaresSubtab)
    : null
}

/**
 * Parser do query param `?subtab=` para a tab Alertas. Default
 * `politicas` aplicado no slot quando este retorna null.
 */
export function parseAlertasSubtab(
  value: string | string[] | undefined | null,
): AlertasSubtab | null {
  if (typeof value !== 'string') return null
  return (ALERTAS_SUBTABS as readonly string[]).includes(value)
    ? (value as AlertasSubtab)
    : null
}
