'use client'

// Re-export wrapper de bundle (mesmo padrão de rds-accordion/rds-autocomplete):
// importa o Dialog do barrel /granular DENTRO de um módulo client p/ o
// tree-shaking ESM podar os re-exports não usados. Importar o barrel direto de
// um Server Component (RSC) vaza o entry inteiro
// (+294KB medidos). O Dialog é client (estado open/close).
//
// O DialogContent do RDS ganhou `showCloseButton` no v4 (issue #221, default
// true → mantém o X que o DialogContent local sempre renderizava). Modais
// não-dispensáveis passam `showCloseButton={false}`.

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@fabio.caffarello/react-design-system/granular'
