'use client'

// Re-export wrapper: faz o import do barrel /granular acontecer DENTRO
// de um módulo client — tree-shaking ESM normal poda os ~200 re-exports
// não usados (sideEffects: ["**/*.css"] do pacote). Importar o barrel
// direto de um Server Component cria client reference do entry inteiro
// (+294KB medidos). Ver PR da varredura 3.9.0.

export { Accordion } from '@fabio.caffarello/react-design-system/granular'
