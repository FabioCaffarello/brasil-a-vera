'use client'

import { Check, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/design-system/primitives/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/design-system/primitives/popover'
import { cn } from '@/lib/cn'

export type ComboboxOption = {
  value: string
  label: string
}

type ComboboxProps = {
  /**
   * Nome do hidden input para integração com form GET. Quando definido,
   * renderiza `<input type="hidden">` que acompanha o valor selecionado —
   * o form parent submete o valor selecionado sem precisar de JS handler.
   */
  name?: string
  options: ComboboxOption[]
  /** Valor inicialmente selecionado (controla o estado interno no mount). */
  defaultValue?: string
  /**
   * Label do botão quando nada está selecionado (e do item "Todos" no topo
   * da lista, que limpa a seleção).
   */
  placeholder?: string
  /** Placeholder do input de busca dentro do popover. */
  searchPlaceholder?: string
  /** Mensagem quando nenhum option casa com a busca. */
  emptyText?: string
  /**
   * Label do item que limpa a seleção, sempre no topo. Default 'Todos'.
   * Passe `null` para não renderizar.
   */
  allOptionLabel?: string | null
  /** Largura do trigger button — default 'w-full' (preenche o container). */
  className?: string
  /** Largura do PopoverContent — default 'w-[var(--radix-popover-trigger-width)]'. */
  contentClassName?: string
  /** aria-label para o trigger button (acessibilidade quando não há label visível). */
  ariaLabel?: string
}

/**
 * Combobox — composição da Wave 7 (Sprint 7.1 PR3).
 *
 * Substitui `<select>` nativo quando a lista tem busca como UX crítica
 * (~30+ opções). Consome as primitivas Command (Sprint 7.0 PR3) e
 * Popover (Sprint 5.0 PR5).
 *
 * Integração com form GET: passe `name="partido"` e o componente
 * renderiza um `<input type="hidden" name="partido" value={selected}>`
 * que acompanha o estado. Form submete via Enter ou botão sem precisar
 * de JS handler externo — o Combobox é apenas a camada visual.
 *
 * Fallback sem JS: o trigger button mostra o valor atual mas não abre
 * — o usuário ainda pode editar o URL diretamente ou usar o botão
 * Limpar. Trade-off aceitável: usuário com JS off em filtro avançado
 * de listagem é caso raro.
 *
 * A11y: cmdk + Radix Popover garantem `role="combobox"`, `aria-expanded`,
 * `aria-controls`, navegação por setas, Esc fecha.
 */
export function Combobox({
  name,
  options,
  defaultValue = '',
  placeholder = 'Selecionar...',
  searchPlaceholder = 'Buscar...',
  emptyText = 'Nenhum resultado',
  allOptionLabel = 'Todos',
  className,
  contentClassName,
  ariaLabel,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(defaultValue)

  const selected = options.find((o) => o.value === value)

  function handleSelect(nextValue: string) {
    setValue(nextValue === value ? '' : nextValue)
    setOpen(false)
  }

  return (
    <>
      {name ? <input name={name} type="hidden" value={value} /> : null}
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <button
            aria-expanded={open}
            aria-label={ariaLabel}
            className={cn(
              'flex min-h-[44px] w-full items-center justify-between rounded-md border border-line-emphasis bg-surface-canvas px-2 py-1.5 text-fg-primary text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2',
              className,
            )}
            role="combobox"
            type="button"
          >
            <span className={cn('truncate', !selected && 'text-fg-tertiary')}>
              {selected ? selected.label : placeholder}
            </span>
            <ChevronsUpDown
              aria-hidden
              className="ml-2 h-4 w-4 shrink-0 text-fg-tertiary"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className={cn(
            'w-[var(--radix-popover-trigger-width)] p-0',
            contentClassName,
          )}
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {allOptionLabel !== null ? (
                  <CommandItem
                    onSelect={() => handleSelect('')}
                    value={allOptionLabel}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === '' ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {allOptionLabel}
                  </CommandItem>
                ) : null}
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    onSelect={() => handleSelect(opt.value)}
                    value={opt.label}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === opt.value ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  )
}
