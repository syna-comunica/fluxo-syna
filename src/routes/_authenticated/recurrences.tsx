import { createFileRoute } from "@tanstack/react-router";
import { hasFinanceApi } from "@/lib/finance-remote";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchRecurrences, insertRecurrence, updateRecurrence, deleteRecurrence, generateFromRecurrence,
  fetchCategories, type Recurrence,
} from "@/lib/finance-queries";
import { useAuth } from "@/hooks/use-auth";
import { formatBRL } from "@/lib/format";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/recurrences")({
  component: RecurrencesPage,
});

const EMPTY = {
  user_id: "",
  name: "",
  description: null as string | null,
  value: 0,
  due_day: 1,
  type: "expense" as "income" | "expense",
  status: "active" as "active" | "inactive",
  category_id: null as string | null,
};

function RecurrencesPage() {
  if (!hasFinanceApi()) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="size-3 bg-warning mx-auto" />
        <h2 className="text-xl font-display font-semibold">Backend não configurado</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          A gestão de recorrências requer o backend MySQL. Defina a variável{" "}
          <code className="font-mono text-xs bg-muted px-1 py-0.5">VITE_FINANCE_API_URL</code>{" "}
          no painel da Vercel apontando para a URL do seu app.
        </p>
      </div>
    );
  }

  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: recurrences = [], isLoading } = useQuery({ queryKey: ["recurrences"], queryFn: fetchRecurrences });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Recurrence | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const insertMut = useMutation({
    mutationFn: insertRecurrence,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recurrences"] }); closeModal(); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Omit<Recurrence, "id">> }) => updateRecurrence(id, patch),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recurrences"] }); closeModal(); },
  });
  const deleteMut = useMutation({
    mutationFn: deleteRecurrence,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recurrences"] }); setDeleteId(null); },
  });
  const generateMut = useMutation({
    mutationFn: ({ id, month }: { id: string; month: string }) => generateFromRecurrence(id, month),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Lançamento gerado com sucesso");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const active = recurrences.filter((r) => r.status === "active");
    const income = active.filter((r) => r.type === "income").reduce((s, r) => s + r.value, 0);
    const expense = active.filter((r) => r.type === "expense").reduce((s, r) => s + r.value, 0);
    return { total: active.length, income, expense };
  }, [recurrences]);

  const currentMonth = new Date().toISOString().slice(0, 7);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY, user_id: user?.id ?? "" });
    setOpen(true);
  }
  function openEdit(r: Recurrence) {
    setEditing(r);
    setForm({ ...EMPTY, ...r, user_id: user?.id ?? "" });
    setOpen(true);
  }
  function closeModal() { setOpen(false); setEditing(null); }

  function save() {
    if (!form.name.trim()) return;
    if (editing) {
      const { user_id: _uid, ...patch } = form;
      updateMut.mutate({ id: editing.id, patch });
    } else {
      insertMut.mutate({ ...form, user_id: user?.id ?? "" });
    }
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="size-3 bg-accent" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Contratos</span>
          </div>
          <h1 className="text-4xl font-display font-bold tracking-tight">Recorrências</h1>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-foreground text-background px-4 py-2.5 text-xs font-mono uppercase tracking-widest hover:opacity-90 transition">
          <Plus size={13} /> Nova recorrência
        </button>
      </header>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Recorrências ativas" value={String(stats.total)} />
        <StatCard label="Receita mensal" value={formatBRL(stats.income)} color="positive" />
        <StatCard label="Despesa mensal" value={formatBRL(stats.expense)} color="negative" />
      </div>

      <div className="bg-surface ring-1 ring-black/5 overflow-x-auto animate-reveal">
        {isLoading ? (
          <div className="py-16 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Carregando...</div>
        ) : recurrences.length === 0 ? (
          <div className="py-16 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Nenhuma recorrência cadastrada</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <Th>Nome</Th>
                <Th>Tipo</Th>
                <Th>Valor</Th>
                <Th>Vencimento</Th>
                <Th>Categoria</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recurrences.map((r) => {
                const cat = categories.find((c) => c.id === r.category_id);
                return (
                  <tr key={r.id} className="hover:bg-muted/30 transition">
                    <td className="px-6 py-4 text-sm font-medium">
                      <div>{r.name}</div>
                      {r.description && <div className="text-xs text-muted-foreground mt-0.5">{r.description}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[10px] font-mono uppercase tracking-widest ${r.type === "income" ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"}`}>
                        {r.type === "income" ? "Receita" : "Despesa"}
                      </span>
                    </td>
                    <td className={`px-6 py-4 font-mono text-sm tabular-nums font-medium ${r.type === "income" ? "text-positive" : "text-negative"}`}>
                      {r.type === "income" ? "+" : "-"} {formatBRL(r.value)}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm tabular-nums text-muted-foreground">
                      Dia {r.due_day}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{cat?.name ?? "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[10px] font-mono uppercase tracking-widest ${r.status === "active" ? "bg-positive/10 text-positive" : "bg-muted text-muted-foreground"}`}>
                        {r.status === "active" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 justify-end">
                        {r.status === "active" && (
                          <button
                            onClick={() => generateMut.mutate({ id: r.id, month: currentMonth })}
                            disabled={generateMut.isPending}
                            title="Gerar lançamento do mês atual"
                            className="text-muted-foreground hover:text-accent transition"
                          >
                            <Zap size={13} />
                          </button>
                        )}
                        <button onClick={() => openEdit(r)} className="text-muted-foreground hover:text-foreground transition">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setDeleteId(r.id)} className="text-muted-foreground hover:text-negative transition">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <Modal title={editing ? "Editar recorrência" : "Nova recorrência"} onClose={closeModal}>
          <FormField label="Nome *">
            <input className={INPUT_CLS} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Retainer Cliente X" />
          </FormField>
          <FormField label="Descrição">
            <input className={INPUT_CLS} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value || null })} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Tipo">
              <select className={INPUT_CLS} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "income" | "expense" })}>
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </FormField>
            <FormField label="Valor (R$) *">
              <input type="number" min="0" step="0.01" className={INPUT_CLS} value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Dia do vencimento">
              <input type="number" min="1" max="31" className={INPUT_CLS} value={form.due_day} onChange={(e) => setForm({ ...form, due_day: Number(e.target.value) })} />
            </FormField>
            <FormField label="Categoria">
              <select className={INPUT_CLS} value={form.category_id ?? ""} onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}>
                <option value="">Sem categoria</option>
                {categories.filter((c) => c.type === form.type).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="Status">
            <select className={INPUT_CLS} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "inactive" })}>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={closeModal} className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition">Cancelar</button>
            <button
              onClick={save}
              disabled={insertMut.isPending || updateMut.isPending}
              className="bg-foreground text-background px-4 py-2.5 text-xs font-mono uppercase tracking-widest hover:opacity-90 transition disabled:opacity-50"
            >
              {editing ? "Salvar" : "Criar"}
            </button>
          </div>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Excluir recorrência?" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-muted-foreground mb-6">Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteId(null)} className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition">Cancelar</button>
            <button
              onClick={() => deleteMut.mutate(deleteId)}
              disabled={deleteMut.isPending}
              className="bg-negative text-negative-foreground px-4 py-2.5 text-xs font-mono uppercase tracking-widest hover:opacity-90 transition disabled:opacity-50"
            >
              Excluir
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const INPUT_CLS = "w-full bg-transparent border-b border-border py-2 text-sm focus:border-accent outline-none";

function StatCard({ label, value, color }: { label: string; value: string; color?: "positive" | "negative" }) {
  return (
    <div className="bg-surface ring-1 ring-black/5 p-5 animate-reveal">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className={`mt-2 text-2xl font-display font-bold tabular-nums ${color === "positive" ? "text-positive" : color === "negative" ? "text-negative" : ""}`}>{value}</div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-6 py-3 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{children}</th>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface w-full max-w-lg p-8 space-y-5 shadow-xl">
        <h2 className="text-lg font-display font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
