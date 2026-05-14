import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { fetchCategories, fetchTransactions, insertTransaction, updateTransactionPaidState, deleteTransaction, type Transaction } from "@/lib/finance-queries";
import { formatBRL, formatDate } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/transactions")({
  component: TransactionsPage,
});

type Filter = "all" | "income" | "expense" | "pending";

function TransactionsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const txQ = useQuery({ queryKey: ["transactions"], queryFn: fetchTransactions });
  const catQ = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const transactions = (txQ.data ?? []).filter((t) => {
    if (filter === "all") return true;
    if (filter === "pending") return t.status === "pending";
    return t.type === filter;
  });

  const togglePaid = useMutation({
    mutationFn: async (t: Transaction) => {
      const newStatus = t.status === "paid" ? "pending" : "paid";
      await updateTransactionPaidState(
        t.id,
        newStatus,
        newStatus === "paid" ? new Date().toISOString().slice(0, 10) : null,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await deleteTransaction(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Lançamento removido");
    },
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between gap-6 md:items-end">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Contas a pagar e receber
          </span>
          <h1 className="text-4xl font-display font-bold tracking-tight mt-1">Lançamentos</h1>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="bg-foreground text-background px-4 py-2.5 text-xs font-mono uppercase tracking-widest hover:opacity-90 transition self-start"
        >
          + Novo lançamento
        </button>
      </header>

      <div className="flex gap-1 border-b border-border">
        {[
          { v: "all", l: "Todos" },
          { v: "income", l: "A receber" },
          { v: "expense", l: "A pagar" },
          { v: "pending", l: "Pendentes" },
        ].map((f) => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v as Filter)}
            className={`px-4 py-2 text-xs font-mono uppercase tracking-widest transition ${
              filter === f.v ? "text-foreground border-b-2 border-accent -mb-px" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      <div className="bg-surface ring-1 ring-black/5 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              <Th>Vencimento</Th>
              <Th>Descrição</Th>
              <Th>Categoria</Th>
              <Th>Status</Th>
              <Th align="right">Valor</Th>
              <Th align="right">Ações</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Nenhum lançamento
                </td>
              </tr>
            )}
            {transactions.map((t) => {
              const cat = catQ.data?.find((c) => c.id === t.category_id);
              return (
                <tr key={t.id} className="hover:bg-muted/20">
                  <td className="px-6 py-3 font-mono text-sm tabular-nums">{formatDate(t.due_date)}</td>
                  <td className="px-6 py-3 text-sm font-medium">{t.description}</td>
                  <td className="px-6 py-3">
                    {cat ? (
                      <span className="inline-flex items-center gap-2 text-xs">
                        <span className="size-2" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => togglePaid.mutate(t)}
                      className={`px-2 py-1 text-[10px] font-mono uppercase tracking-widest transition ${
                        t.status === "paid"
                          ? "bg-positive/10 text-positive"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {t.status === "paid" ? "Pago" : "Pendente"}
                    </button>
                  </td>
                  <td className={`px-6 py-3 text-sm font-mono text-right tabular-nums font-medium ${
                    t.type === "income" ? "text-positive" : "text-negative"
                  }`}>
                    {t.type === "income" ? "+" : "-"} {formatBRL(t.amount)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm("Remover este lançamento?")) remove.mutate(t.id);
                      }}
                      className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-negative"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {open && user && (
        <NewTransactionModal
          categories={catQ.data ?? []}
          userId={user.id}
          onClose={() => setOpen(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["transactions"] });
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={`px-6 py-3 font-mono text-[10px] text-muted-foreground uppercase tracking-widest text-${align}`}>
      {children}
    </th>
  );
}

function NewTransactionModal({
  categories,
  userId,
  onClose,
  onSaved,
}: {
  categories: { id: string; name: string; type: "income" | "expense" }[];
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState<string>("");
  const [status, setStatus] = useState<"paid" | "pending">("pending");
  const [saving, setSaving] = useState(false);

  const filtered = categories.filter((c) => c.type === type);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await insertTransaction({
        user_id: userId,
        description,
        amount: Number(amount.replace(",", ".")),
        type,
        status,
        due_date: dueDate,
        paid_date: status === "paid" ? dueDate : null,
        category_id: categoryId || null,
      });
      toast.success("Lançamento adicionado");
      onSaved();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface w-full max-w-md p-8 space-y-5 ring-1 ring-black/10"
      >
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Novo</span>
          <h2 className="text-2xl font-display font-bold mt-1">Lançamento</h2>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setType("expense")} className={`py-2 text-xs font-mono uppercase tracking-widest border ${type === "expense" ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground"}`}>
            Despesa
          </button>
          <button type="button" onClick={() => setType("income")} className={`py-2 text-xs font-mono uppercase tracking-widest border ${type === "income" ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground"}`}>
            Receita
          </button>
        </div>

        <FormField label="Descrição">
          <input required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-transparent border-b border-border py-2 text-sm focus:border-accent outline-none" />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Valor (R$)">
            <input required type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-transparent border-b border-border py-2 text-sm font-mono tabular-nums focus:border-accent outline-none" />
          </FormField>
          <FormField label="Vencimento">
            <input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-transparent border-b border-border py-2 text-sm font-mono focus:border-accent outline-none" />
          </FormField>
        </div>

        <FormField label="Categoria">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full bg-transparent border-b border-border py-2 text-sm focus:border-accent outline-none">
            <option value="">— Sem categoria —</option>
            {filtered.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setStatus("pending")} className={`py-2 text-xs font-mono uppercase tracking-widest border ${status === "pending" ? "bg-warning/10 border-warning text-warning" : "border-border text-muted-foreground"}`}>
            Pendente
          </button>
          <button type="button" onClick={() => setStatus("paid")} className={`py-2 text-xs font-mono uppercase tracking-widest border ${status === "paid" ? "bg-positive/10 border-positive text-positive" : "border-border text-muted-foreground"}`}>
            {type === "income" ? "Recebido" : "Pago"}
          </button>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-3 text-xs font-mono uppercase tracking-widest border border-border hover:bg-muted/30">
            Cancelar
          </button>
          <button disabled={saving} type="submit" className="flex-1 py-3 bg-foreground text-background text-xs font-mono uppercase tracking-widest hover:opacity-90 disabled:opacity-50">
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}