'use client'

import { useClerk } from '@clerk/nextjs'
import {
  type LucideIcon,
  BellRing,
  Eye,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { cn } from '@/lib/cn'
import { parseTab, type TabKey } from '@/lib/painel-tabs'

interface Props {
  displayName: string | null
  email: string
  uf: string | null
  followsCount: number
  unreadAlertsCount: number
  children: React.ReactNode
}

const TABS: readonly { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'resumo', label: 'Resumo', icon: LayoutDashboard },
  { key: 'parlamentares', label: 'Parlamentares', icon: Users },
  { key: 'alertas', label: 'Alertas', icon: BellRing },
  { key: 'configuracoes', label: 'Configurações', icon: Settings },
  { key: 'meus-dados', label: 'Meus dados', icon: Shield },
]

const TAB_TITLES: Record<TabKey, string> = {
  resumo: 'Painel',
  parlamentares: 'Parlamentares',
  alertas: 'Alertas',
  configuracoes: 'Configurações',
  'meus-dados': 'Meus dados',
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 1) return parts[0]?.[0]?.toUpperCase() ?? '?'
    return (
      (parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')
    ).toUpperCase()
  }
  return email[0]?.toUpperCase() ?? '?'
}

function SidebarContent({
  activeTab,
  counters,
}: {
  activeTab: TabKey
  counters: { parlamentares: number; alertas: number }
}) {
  return (
    <nav
      aria-label="Navegação do painel"
      className="flex-1 space-y-1 px-3 py-4"
    >
      <ul className="space-y-1">
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab
          const count = counters[tab.key as keyof typeof counters] ?? 0
          const Icon = tab.icon
          return (
            <li key={tab.key}>
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'inline-flex w-full items-center gap-3 rounded-md px-3 py-2 font-medium text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated',
                  isActive
                    ? 'bg-brand/10 text-brand'
                    : 'text-foreground-muted hover:bg-surface hover:text-foreground',
                )}
                href={`/painel?tab=${tab.key}`}
              >
                <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                <span className="truncate">{tab.label}</span>
                {count > 0 ? (
                  <span className="text-foreground-subtle text-xs whitespace-nowrap">
                    {count}
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function SidebarUser({
  displayName,
  email,
  uf,
}: {
  displayName: string | null
  email: string
  uf: string | null
}) {
  const { signOut } = useClerk()
  const initials = getInitials(displayName, email)

  return (
    <div className="border-t border-border px-3 py-4">
      <div className="mb-3 flex items-center gap-3">
        <div
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-primary font-semibold text-xs text-white ring-1 ring-white/10"
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground text-sm">
            {displayName ?? email.split('@')[0]}
          </p>
          <p className="truncate text-foreground-muted text-xs">
            {email}
            {uf ? <span className="ml-1">· {uf}</span> : null}
          </p>
        </div>
      </div>
      <button
        type="button"
        className="inline-flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-foreground-muted hover:bg-surface hover:text-foreground text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated"
        onClick={() => signOut({ redirectUrl: '/' })}
      >
        <LogOut className="h-4 w-4" />
        <span>Sair</span>
      </button>
    </div>
  )
}

export function DashboardShell({
  displayName,
  email,
  uf,
  followsCount,
  unreadAlertsCount,
  children,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const searchParams = useSearchParams()
  const activeTab = parseTab(searchParams.get('tab'))
  const counters = { parlamentares: followsCount, alertas: unreadAlertsCount }

  const currentTitle = TAB_TITLES[activeTab]

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-60 flex-col shrink-0 border-r border-border bg-surface-elevated">
        {/* Logo */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary text-white"
          >
            <Eye className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold text-foreground hidden sm:block">
            Brasil à Vera
          </span>
        </div>

        {/* Nav */}
        <SidebarContent activeTab={activeTab} counters={counters} />

        {/* User Section */}
        <SidebarUser displayName={displayName} email={email} uf={uf} />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Sidebar Panel */}
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col bg-surface-elevated border-r border-border shadow-lg">
            {/* Logo */}
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary text-white"
                >
                  <Eye className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  Brasil à Vera
                </span>
              </div>
              <button
                type="button"
                className="rounded-md p-1 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5 text-foreground" />
              </button>
            </div>

            {/* Nav */}
            <SidebarContent activeTab={activeTab} counters={counters} />

            {/* User Section */}
            <SidebarUser displayName={displayName} email={email} uf={uf} />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 flex items-center shrink-0 border-b border-border bg-surface px-4 gap-3">
          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden rounded-md p-1.5 hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5 text-foreground" />
            <span className="sr-only">Abrir menu</span>
          </button>

          {/* Page Title */}
          <span className="text-foreground font-medium text-sm md:text-base">
            {currentTitle}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Alerts Bell */}
            {unreadAlertsCount > 0 ? (
              <Link
                href="/painel?tab=alertas"
                className="rounded-md p-1.5 hover:bg-surface-elevated relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <BellRing className="h-5 w-5 text-foreground-muted hover:text-foreground" />
                {unreadAlertsCount > 0 ? (
                  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-destructive" />
                ) : null}
              </Link>
            ) : null}

            {/* User Avatar */}
            <div
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-primary font-semibold text-xs text-white ring-1 ring-white/10"
            >
              {getInitials(displayName, email)}
            </div>
          </div>
        </header>

        {/* Content */}
        <main
          id="conteudo"
          className="flex-1 overflow-y-auto bg-background p-4 sm:p-6"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
