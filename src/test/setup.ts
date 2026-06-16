import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// ResizeObserver não existe em jsdom. cmdk (e potencialmente outros componentes
// futuros baseados em Radix que observam tamanho) dependem dele. Mock global
// mínimo: reporta zero dimensões, sem observação real — suficiente para testes
// de render e interação que não dependem de layout calculado.
//
// Vitest 4 não permite mais arrow function em mockImplementation quando o
// código chama `new` no resultado (ResizeObserver é construtor). Class explícita.
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

// scrollIntoView não existe em jsdom. cmdk chama scrollIntoView no item
// selecionado para garantir visibilidade dentro da lista. Mock no-op.
window.HTMLElement.prototype.scrollIntoView = vi.fn()

// Toast do RDS (ADR-038) — sistema hook-based (substituiu o sonner global).
// useToast() exige ToastProvider (montado só no root layout, não nos testes).
// Mock global: useToast() devolve um singleton de spies; ToastProvider passa
// children; ToastContainer vira no-op. Os testes que asseguram toast importam
// o useToast deste módulo p/ checar (ex.: consent-modal, acoes-lgpd, migração).
vi.mock('@/design-system/primitives/rds-toast', () => {
  const toast = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    show: vi.fn(),
    withUndo: vi.fn(),
    dismiss: vi.fn(),
    clearAll: vi.fn(),
  }
  return {
    useToast: () => toast,
    ToastProvider: ({ children }: { children?: unknown }) => children,
    ToastContainer: () => null,
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))
