// Temas de interesse — Wave 10 Etapa 3.
// Lista fixa de 8 opções consumida pelo wizard de onboarding (passo 2)
// e pela seção "Temas de interesse" em /painel/configuracoes (Etapa 5).
//
// Persistência em `user_profile.themes` (jsonb array de `Tema` ids).
// Lista canônica em LOGGED-AREA-VISION §5.4 e §5.6.

export const TEMAS = [
  { id: 'educacao', label: 'Educação' },
  { id: 'saude', label: 'Saúde' },
  { id: 'seguranca', label: 'Segurança' },
  { id: 'economia', label: 'Economia' },
  { id: 'meio_ambiente', label: 'Meio ambiente' },
  { id: 'direitos_humanos', label: 'Direitos humanos' },
  { id: 'transporte', label: 'Transporte' },
  { id: 'trabalho', label: 'Trabalho' },
] as const

export type TemaId = (typeof TEMAS)[number]['id']

export const TEMA_IDS = TEMAS.map((t) => t.id) as readonly TemaId[]

export function isTemaId(value: string): value is TemaId {
  return (TEMA_IDS as readonly string[]).includes(value)
}
