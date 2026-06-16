'use client'

// Re-export wrapper: faz o import do barrel /granular acontecer DENTRO de um
// módulo client — tree-shaking ESM normal poda os re-exports não usados.
// Importar o barrel direto de um Server Component (filtros.tsx é RSC) cria
// client reference do entry inteiro (+294KB medidos). Mesmo padrão do
// `rds-accordion.ts`. O Autocomplete é client (busca/teclado); os filtros o
// renderizam como ilha. Ganhou `name`/`form` no RDS v4.1 (issue #225) → integra
// com o `<form method="get">` nativo igual ao Combobox local que substituiu.

export { Autocomplete } from '@fabio.caffarello/react-design-system/granular'
