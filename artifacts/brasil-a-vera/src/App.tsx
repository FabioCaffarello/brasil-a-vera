import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";

const HomePage = lazy(() => import("@/pages/home"));
const ParlamentaresPage = lazy(() => import("@/pages/parlamentares"));
const ParlamentarPage = lazy(() => import("@/pages/parlamentar"));
const VotacoesPage = lazy(() => import("@/pages/votacoes"));
const VotacaoPage = lazy(() => import("@/pages/votacao"));
const ProposicoesPage = lazy(() => import("@/pages/proposicoes"));
const ProposicaoPage = lazy(() => import("@/pages/proposicao"));
const BuscaPage = lazy(() => import("@/pages/busca"));
const CompararPage = lazy(() => import("@/pages/comparar"));
const PartidoPage = lazy(() => import("@/pages/partido"));
const DocsPage = lazy(() => import("@/pages/docs"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function SearchForm({ variant = "header" }: { variant?: "header" | "page"; defaultValue?: string }) {
  const [, navigate] = useLocation();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const q = (form.elements.namedItem("q") as HTMLInputElement).value.trim();
    if (q) navigate(`/busca?q=${encodeURIComponent(q)}`);
  }
  if (variant === "header") {
    return (
      <search>
        <form onSubmit={handleSubmit} className="flex items-center">
          <label htmlFor="search-header" className="sr-only">Buscar parlamentares, proposições e votações</label>
          <input
            id="search-header"
            type="search"
            name="q"
            placeholder="Buscar…"
            autoComplete="off"
            className="min-h-[44px] w-32 rounded border border-zinc-300 bg-white px-2 py-1 text-sm placeholder:text-zinc-400 focus:w-48 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:placeholder:text-zinc-500 sm:w-48 sm:focus:w-64"
          />
        </form>
      </search>
    );
  }
  return null;
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:border focus:border-zinc-300 focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-zinc-900 focus:shadow-md focus:outline-none focus:ring-2 focus:ring-zinc-400"
      >
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-10 h-12 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <nav className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="text-sm font-semibold text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300">
            Brasil a Vera
          </Link>
          <ul className="hidden items-center gap-4 text-sm sm:flex">
            <li><Link href="/parlamentares" className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100">Parlamentares</Link></li>
            <li><Link href="/proposicoes" className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100">Proposições</Link></li>
            <li><Link href="/votacoes" className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100">Votações</Link></li>
            <li><Link href="/docs" className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100">Docs</Link></li>
          </ul>
          <SearchForm variant="header" />
        </nav>
      </header>
      <main id="conteudo" className="min-h-[calc(100vh-3rem)]">
        <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="text-sm text-zinc-500">Carregando...</div></div>}>
          {children}
        </Suspense>
      </main>
      <footer className="border-t border-zinc-200 bg-white py-4 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4">
          <span>Dados oficiais da Câmara dos Deputados e do Senado Federal.</span>
          <a href="https://github.com/FabioCaffarello/brasil-a-vera" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Código no GitHub ↗
          </a>
        </div>
      </footer>
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/parlamentares" component={ParlamentaresPage} />
        <Route path="/parlamentares/:id" component={ParlamentarPage} />
        <Route path="/votacoes" component={VotacoesPage} />
        <Route path="/votacoes/:id" component={VotacaoPage} />
        <Route path="/proposicoes" component={ProposicoesPage} />
        <Route path="/proposicoes/:tipo/:numero/:ano" component={ProposicaoPage} />
        <Route path="/busca" component={BuscaPage} />
        <Route path="/comparar" component={CompararPage} />
        <Route path="/partidos/:sigla" component={PartidoPage} />
        <Route path="/docs" component={DocsPage} />
        <Route>
          <div className="mx-auto max-w-3xl px-6 py-12">
            <h1 className="text-2xl font-semibold">Página não encontrada</h1>
            <Link href="/" className="mt-4 inline-block text-sm text-blue-600 underline">Voltar ao início</Link>
          </div>
        </Route>
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
