import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { fetchBudgets, fetchCategories, fetchTransactions, upsertBudget } from "@/lib/finance-queries";
import { formatBRL, monthStart, monthLabel } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/budgets")({
  component: BudgetsPage,
});

function BudgetsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const month = monthStart();
  const me = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

  const catQ = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const budQ = useQuery({ queryKey: ["budgets", month], queryFn: () => fetchBudgets(month) });
  const txQ = useQuery({ queryKey: ["transactions"], queryFn: fetchTransactions });

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const saveBudget = useMutation({
    mutationFn: async ({ categoryId, value }: { categoryId: string; value: number }) => {
      await upsertBudget({
        user_id: user!.id,
        category_id: categoryId,
        month,
        planned_amount: value,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets", month] });
      toast.success("Orçamento atualizado");
    },
  });

  const categories = catQ.data ?? [];
  const transactions = txQ.data ?? [];

  function actualFor(catId: string) {
    return transactions
      .filter((t) => t.category_id === catId && t.due_date >= month && t.due_date <= me)
      .reduce((s, t) => s + t.amount, 0);
  }

  function plannedFor(catId: string) {
    return budQ.data?.find((b) => b.category_id === catId)?.planned_amount ?? 0;
  }

  return (
    <div className="space-y-8">
      <header>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{monthLabel()}</span>
        <h1 className="text-4xl font-display font-bold tracking-tight mt-1">Orçamento</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
          Defina o valor previsto por categoria. O sistema compara automaticamente com o realizado do mês.
        </p>
      </header>

      {(["expense", "income"] as const).map((type) => (
        <section key={type} className="bg-surface ring-1 ring-black/5 p-6 lg:p-8 space-y-5">
          <h2 className="font-display font-bold text-lg">
            {type === "expense" ? "Despesas previstas" : "Receitas previstas"}
          </h2>
          <div className="space-y-4">
            {categories.filter((c) => c.type === type).length === 0 && (
              <p className="text-xs font-mono text-muted-foreground">Nenhuma categoria. Crie em Categorias.</p>
            )}
            {categories.filter((c) => c.type === type).map((c) => {
              const planned = plannedFor(c.id);
              const actual = actualFor(c.id);
              const pct = planned === 0 ? 0 : (actual / planned) * 100;
              const over = pct > 100 && type === "expense";
              return (
                <div key={c.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-center pb-4 border-b border-border last:border-0">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="size-2.5" style={{ backgroundColor: c.color }} />
                      <span className="text-sm font-medium">{c.name}</span>
                    </div>
                    <div className="h-2 bg-muted relative overflow-hidden">
                      <div
                        className={`absolute inset-y-0 left-0 ${over ? "bg-negative" : type === "income" ? "bg-positive" : "bg-accent"}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] font-mono text-muted-foreground tabular-nums">
                      <span>Real: {formatBRL(actual)}</span>
                      <span>{planned > 0 ? `${Math.round(pct)}%` : "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={planned || ""}
                      placeholder="0,00"
                      onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                      className="w-32 bg-transparent border-b border-border py-2 text-sm font-mono tabular-nums focus:border-accent outline-none text-right"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const v = drafts[c.id];
                      if (v === undefined) return;
                      saveBudget.mutate({ categoryId: c.id, value: Number(v.replace(",", ".")) || 0 });
                    }}
                    className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest bg-foreground text-background hover:opacity-90"
                  >
                    Salvar
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}