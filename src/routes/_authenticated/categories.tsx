import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { fetchCategories, insertCategory, deleteCategory } from "@/lib/finance-queries";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/categories")({
  component: CategoriesPage,
});

const PALETTE = ["#16a34a", "#0ea5e9", "#ef4444", "#f59e0b", "#8b5cf6", "#64748b", "#ec4899", "#14b8a6"];

function CategoriesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const catQ = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [color, setColor] = useState(PALETTE[0]);

  const create = useMutation({
    mutationFn: async () => {
      await insertCategory({ user_id: user!.id, name, type, color });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setName("");
      toast.success("Categoria criada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await deleteCategory(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Removida");
    },
  });

  const cats = catQ.data ?? [];

  return (
    <div className="space-y-8">
      <header>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Estrutura</span>
        <h1 className="text-4xl font-display font-bold tracking-tight mt-1">Categorias</h1>
      </header>

      <form
        onSubmit={(e) => { e.preventDefault(); if (name) create.mutate(); }}
        className="bg-surface ring-1 ring-black/5 p-6 grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-4 items-end"
      >
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Nome</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent border-b border-border py-2 text-sm focus:border-accent outline-none mt-1" placeholder="Ex: Tráfego pago" />
        </label>
        <div className="flex gap-1">
          {(["expense", "income"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} className={`px-3 py-2 text-[10px] font-mono uppercase tracking-widest border ${type === t ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground"}`}>
              {t === "expense" ? "Despesa" : "Receita"}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {PALETTE.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} className={`size-6 ring-2 ${color === c ? "ring-foreground" : "ring-transparent"}`} style={{ backgroundColor: c }} aria-label={c} />
          ))}
        </div>
        <button type="submit" className="bg-foreground text-background px-4 py-2.5 text-xs font-mono uppercase tracking-widest hover:opacity-90">
          Adicionar
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(["income", "expense"] as const).map((t) => (
          <section key={t} className="bg-surface ring-1 ring-black/5 p-6">
            <h2 className="font-display font-bold text-lg mb-4">{t === "income" ? "Receitas" : "Despesas"}</h2>
            <ul className="divide-y divide-border">
              {cats.filter((c) => c.type === t).map((c) => (
                <li key={c.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-3" style={{ backgroundColor: c.color }} />
                    <span className="text-sm">{c.name}</span>
                  </div>
                  <button onClick={() => { if (confirm("Remover categoria?")) remove.mutate(c.id); }} className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-negative">
                    Remover
                  </button>
                </li>
              ))}
              {cats.filter((c) => c.type === t).length === 0 && (
                <li className="py-6 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Nenhuma</li>
              )}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}