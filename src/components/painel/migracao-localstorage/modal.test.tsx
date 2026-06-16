import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MigracaoLocalStorageModal } from './modal'

const LS_KEY = 'bav.parlamentares.favoritos'
const UUID_A = '019e184f-0cdd-7109-ab34-bbfa9f92bd13'
const UUID_B = '019e184f-1234-7109-ab34-bbfa9f92bd13'

const mockRouterRefresh = vi.fn()

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRouterRefresh, push: vi.fn() }),
}))

// jsdom no Node 22+ não fornece localStorage funcional sem flags
// específicas — Object.getPrototypeOf retorna null prototype, sem
// métodos. Reusamos shim em memória para os testes.
class MemoryStorage {
  private store = new Map<string, string>()
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  clear(): void {
    this.store.clear()
  }
  get length(): number {
    return this.store.size
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }
}

describe('MigracaoLocalStorageModal', () => {
  beforeEach(() => {
    mockRouterRefresh.mockReset()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: new MemoryStorage(),
    })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('LS vazio → no-op (não renderiza nada)', () => {
    const { container } = render(<MigracaoLocalStorageModal />)
    expect(container.textContent).toBe('')
  })

  it('LS com JSON malformado → silent no-op (não toca LS)', () => {
    window.localStorage.setItem(LS_KEY, 'not-json{{{')
    const { container } = render(<MigracaoLocalStorageModal />)
    expect(container.textContent).toBe('')
    expect(window.localStorage.getItem(LS_KEY)).toBe('not-json{{{')
  })

  it('LS com schema inválido (números) → silent no-op', () => {
    window.localStorage.setItem(LS_KEY, JSON.stringify([1, 2, 3]))
    const { container } = render(<MigracaoLocalStorageModal />)
    expect(container.textContent).toBe('')
    expect(window.localStorage.getItem(LS_KEY)).toBeTruthy()
  })

  it('LS vazio array → silent no-op (min(1) no schema)', () => {
    window.localStorage.setItem(LS_KEY, JSON.stringify([]))
    const { container } = render(<MigracaoLocalStorageModal />)
    expect(container.textContent).toBe('')
  })

  it('LS com array de UUIDs → modal renderiza com contagem', async () => {
    window.localStorage.setItem(LS_KEY, JSON.stringify([UUID_A, UUID_B]))
    render(<MigracaoLocalStorageModal />)
    await waitFor(() => {
      expect(screen.getByText('Migrar favoritos antigos?')).toBeDefined()
    })
    // Botão "Migrar 2" reflete a contagem (sem ambiguidade com outros 2 na UI).
    expect(screen.getByRole('button', { name: /Migrar 2/ })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Ignorar' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Depois' })).toBeDefined()
  })

  it('Migrar dispara POST para cada UUID e limpa LS', async () => {
    window.localStorage.setItem(LS_KEY, JSON.stringify([UUID_A, UUID_B]))
    render(<MigracaoLocalStorageModal />)
    await waitFor(() => screen.getByText('Migrar favoritos antigos?'))

    await userEvent.click(screen.getByRole('button', { name: /Migrar 2/ }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
    expect(calls[0][0]).toBe('/api/painel/follows')
    expect(JSON.parse(calls[0][1].body)).toEqual({ parlamentarId: UUID_A })
    expect(JSON.parse(calls[1][1].body)).toEqual({ parlamentarId: UUID_B })

    await waitFor(() => {
      expect(window.localStorage.getItem(LS_KEY)).toBeNull()
    })
    expect(mockRouterRefresh).toHaveBeenCalled()
  })

  it('Ignorar limpa LS sem chamar API', async () => {
    window.localStorage.setItem(LS_KEY, JSON.stringify([UUID_A]))
    render(<MigracaoLocalStorageModal />)
    await waitFor(() => screen.getByText('Migrar favoritos antigos?'))

    await userEvent.click(screen.getByRole('button', { name: 'Ignorar' }))

    expect(global.fetch).not.toHaveBeenCalled()
    expect(window.localStorage.getItem(LS_KEY)).toBeNull()
  })

  it('Depois fecha sem limpar LS (pergunta de novo no próximo render)', async () => {
    window.localStorage.setItem(LS_KEY, JSON.stringify([UUID_A]))
    const { container } = render(<MigracaoLocalStorageModal />)
    await waitFor(() => screen.getByText('Migrar favoritos antigos?'))

    await userEvent.click(screen.getByRole('button', { name: 'Depois' }))

    await waitFor(() => {
      expect(container.textContent).toBe('')
    })
    expect(global.fetch).not.toHaveBeenCalled()
    // LS preservado
    expect(window.localStorage.getItem(LS_KEY)).toBeTruthy()
  })

  it('Migrar com sucesso parcial → toast warning + LS limpo', async () => {
    let callIndex = 0
    global.fetch = vi.fn(() => {
      callIndex += 1
      return Promise.resolve({
        ok: callIndex === 1, // primeiro OK, segundo falha
        status: callIndex === 1 ? 200 : 500,
        json: async () => ({}),
      } as Response)
    })
    const { useToast } = await import('@/design-system/primitives/rds-toast')
    const toast = useToast()

    window.localStorage.setItem(LS_KEY, JSON.stringify([UUID_A, UUID_B]))
    render(<MigracaoLocalStorageModal />)
    await waitFor(() => screen.getByText('Migrar favoritos antigos?'))
    await userEvent.click(screen.getByRole('button', { name: /Migrar 2/ }))

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalled()
    })
    // LS limpo mesmo com falha parcial.
    expect(window.localStorage.getItem(LS_KEY)).toBeNull()
  })
})
