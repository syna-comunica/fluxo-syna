import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">404</p>
        <h1 className="mt-2 text-3xl font-display font-bold">Página não encontrada</h1>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center bg-foreground text-background px-4 py-2 text-xs font-mono uppercase tracking-widest"
        >
          Voltar
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error }: { error: Error }) {
  console.error(error);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-display font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Fluxo — Gestão financeira para agências" },
      { name: "description", content: "Sistema financeiro completo para agências de marketing: fluxo de caixa, contas a pagar e receber, orçamento e categorias." },
      { property: "og:title", content: "Fluxo — Gestão financeira para agências" },
      { name: "twitter:title", content: "Fluxo — Gestão financeira para agências" },
      { property: "og:description", content: "Sistema financeiro completo para agências de marketing: fluxo de caixa, contas a pagar e receber, orçamento e categorias." },
      { name: "twitter:description", content: "Sistema financeiro completo para agências de marketing: fluxo de caixa, contas a pagar e receber, orçamento e categorias." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/06001e2e-cd65-4c7f-b35e-b107b336fe5f/id-preview-893cb884--edab3707-58b9-4f7d-a463-4b2c59813756.lovable.app-1778687569787.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/06001e2e-cd65-4c7f-b35e-b107b336fe5f/id-preview-893cb884--edab3707-58b9-4f7d-a463-4b2c59813756.lovable.app-1778687569787.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const themeScript = `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}})()`;

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        {/* Aplica tema antes da pintura para evitar flash */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
