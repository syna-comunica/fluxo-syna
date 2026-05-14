import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agency, setAgency] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { agency_name: agency || "Minha Agência" },
          },
        });
        if (error) throw error;
        toast.success("Conta criada. Bem-vindo!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao autenticar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-foreground text-background">
        <div className="flex items-center gap-2">
          <div className="size-3 bg-accent" />
          <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">
            Marketing Operations Console
          </span>
        </div>
        <div>
          <h1 className="text-5xl font-display font-bold tracking-tight">Fluxo</h1>
          <p className="mt-4 max-w-sm text-sm opacity-70">
            Gestão financeira completa para agências de marketing. Fluxo de caixa, contas a pagar
            e receber, orçamento e saúde do negócio em um só lugar.
          </p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest opacity-50">
          © {new Date().getFullYear()} Fluxo HQ
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {mode === "signin" ? "Entrar" : "Criar conta"}
            </p>
            <h2 className="mt-2 text-3xl font-display font-bold">
              {mode === "signin" ? "Acessar painel" : "Comece agora"}
            </h2>
          </div>

          {mode === "signup" && (
            <Field label="Nome da agência">
              <input
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                className="input-studio"
                placeholder="Estúdio Criativo"
              />
            </Field>
          )}
          <Field label="E-mail">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-studio"
              placeholder="voce@agencia.com"
            />
          </Field>
          <Field label="Senha">
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-studio"
              placeholder="••••••••"
            />
          </Field>

          <button
            disabled={submitting}
            type="submit"
            className="w-full bg-foreground text-background py-3 text-xs font-mono uppercase tracking-widest hover:opacity-90 transition disabled:opacity-50"
          >
            {submitting ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition"
          >
            {mode === "signin" ? "Não tem conta? Criar" : "Já tem conta? Entrar"}
          </button>
        </form>
      </div>

      <style>{`
        .input-studio {
          width: 100%;
          background: transparent;
          border: 0;
          border-bottom: 1px solid var(--color-border);
          padding: 10px 0;
          font-family: var(--font-mono);
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .input-studio:focus {
          border-color: var(--color-accent);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}