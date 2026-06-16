'use client'

// Re-export wrapper de bundle (padrão rds-accordion/rds-autocomplete/rds-dialog):
// importa o sistema de Toast do barrel /granular DENTRO de um módulo client p/ o
// tree-shaking ESM podar os re-exports não usados. O root layout (RSC) monta o
// ToastProvider/ToastContainer; importar o barrel direto de lá vazaria o entry
// inteiro (+294KB). Substitui o `sonner` (toast global imperativo) pelo sistema
// hook-based do RDS: ToastProvider (contexto) + ToastContainer (render) +
// useToast (dispara: success/error/warning/info, mesma nomenclatura do sonner).

export {
  ToastContainer,
  ToastProvider,
  useToast,
} from '@fabio.caffarello/react-design-system/granular'
