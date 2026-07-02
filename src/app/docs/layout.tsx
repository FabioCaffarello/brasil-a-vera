import { SidebarNav } from './_components/sidebar-nav'

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-5xl py-12 sm:py-16">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[200px_1fr]">
        <aside className="md:sticky md:top-6 md:self-start">
          <SidebarNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
