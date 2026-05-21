import { Footer } from '@/components/site/footer'
import { Navbar } from '@/components/site/navbar'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)]" id="conteudo">
        {children}
      </main>
      <Footer />
    </>
  )
}
