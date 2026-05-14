import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";

const NAV = [
  { to: "/dashboard", label: "Painel" },
  { to: "/transactions", label: "Lançamentos" },
  { to: "/budgets", label: "Orçamento" },
  { to: "/categories", label: "Categorias" },
  { to: "/clients", label: "Clientes" },
  { to: "/recurrences", label: "Recorrências" },
  { to: "/dre", label: "DRE" },
  { to: "/projection", label: "Projeção" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="size-3 bg-accent" />
              <span className="font-display font-bold tracking-tight text-lg">Fluxo</span>
            </Link>
            <nav className="hidden md:flex gap-1">
              {NAV.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`px-3 py-1.5 text-xs font-mono uppercase tracking-widest transition ${
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                    {active && <span className="block h-px bg-accent mt-1" />}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {user?.email}
            </span>
            <button
              onClick={toggleTheme}
              aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
              className="text-muted-foreground hover:text-foreground transition"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              onClick={() => signOut()}
              className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition"
            >
              Sair
            </button>
          </div>
        </div>
        <nav className="md:hidden flex gap-1 px-6 pb-3 overflow-x-auto">
          {NAV.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-widest whitespace-nowrap ${
                  active ? "text-foreground border-b border-accent" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="max-w-7xl mx-auto px-6 lg:px-10 py-8 lg:py-12">{children}</main>
    </div>
  );
}