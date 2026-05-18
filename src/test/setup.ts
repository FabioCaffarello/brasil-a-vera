import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// ResizeObserver não existe em jsdom. cmdk (e potencialmente outros componentes
// futuros baseados em Radix que observam tamanho) dependem dele. Mock global
// mínimo: reporta zero dimensões, sem observação real — suficiente para testes
// de render e interação que não dependem de layout calculado.
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// scrollIntoView não existe em jsdom. cmdk chama scrollIntoView no item
// selecionado para garantir visibilidade dentro da lista. Mock no-op.
window.HTMLElement.prototype.scrollIntoView = vi.fn()

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
