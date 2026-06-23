'use client'

// Re-export wrapper de bundle (mesmo padrão de rds-dialog/rds-accordion):
// importa o Drawer do barrel /granular DENTRO de um módulo client p/ o
// tree-shaking ESM podar os re-exports não usados. Importar o barrel direto de
// um Server Component vaza o entry inteiro (+294KB medidos). O Drawer é client
// (estado open/close + listeners de Escape/overlay + portal).
//
// DrawerContent exige um nome acessível (WCAG aria-dialog-name): passar
// `title` (vira heading + aria-labelledby) ou `aria-label`. Sem nenhum, um
// console.warn dev-only dispara.

export {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from '@fabio.caffarello/react-design-system/granular'
