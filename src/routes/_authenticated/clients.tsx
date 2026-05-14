import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchClients, insertClient, updateClient, deleteClient, type Client } from "@/lib/finance-queries";
import { useAuth } from "@/hooks/use-auth";
import { hasFinanceApi } from "@/lib/finance-remote";
import { formatBRL, formatDate } from "@/lib/format";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clients")({
  component: ClientsPage,
});

const EMPTY: Omit<Client, "id"> & { user_id: string } = {
  user_id: "",
  name: "",
  monthly_value: 0,
  contract_start: null,
  last_invoice_date: null,
  status: "active",
  segment: null,
  ltv_manual: null,
  notes: null,
};

function ClientsPage() {
  if (!hasFinanceApi()) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="size-3 bg-warning mx-auto" />
        <h2 className="text-xl font-display font-semibold">Backend não configurado</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          A gestão de clientes requer o backend MySQL. Defina a variável{" "}
          <code className="font-mono text-xs bg-muted px-1 py-0.5">VITE_FINANCE_API_URL</code>{" "}
          no painel da Vercel apontando para a URL do seu app.
        </p>
      </div>
    );
  }

  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: clients = [], isLoading } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const insertMut = useMutation({
    mutationFn: insertClient,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); closeModal(); toast.success("Cliente criado com sucesso"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Omit<Client, "id">> }) => updateClient(id, patch),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); closeModal(); toast.success("Cliente atualizado"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); setDeleteId(null); toast.success("Cliente excluído"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const active = clients.filter((c) => c.status === "active");
    const mrr = active.reduce((s, c) => s + c.monthly_value, 0);
    const avg = active.length > 0 ? mrr / active.length : 0;
    const today = new Date().toISOString().slice(0, 10);
    const overdue = clients.filter(
      (c) => c.status === "active" && c.last_invoice_date && c.last_invoice_date < today
    ).length;
    return { total: active.length, mrr, avg, overdue };
  }, [clients]);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY, user_id: user?.id ?? "" });
    setOpen(true);
  }
  function openEdit(c: Client) {
    setEditing(c);
    setForm({ ...EMPTY, ...c, user_id: user?.id ?? "" });
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

  function ltv(c: Client): number {
    if (c.ltv_manual !== null) return c.ltv_manual;
    if (!c.contract_start) return c.monthly_value * 12;
    const months = Math.max(
      1,
      Math.round((Date.now() - new Date(c.contract_start).getTime()) / (1000 * 60 * 60 * 24 * 30))
    );
    return c.monthly_value * months;
  }

  const STATUS_LABEL: Record<Client["status"], string> = {
    active: "Ativo",
    inactive: "Inativo",
    churned: "Churned",
  };
  const STATUS_CLASS: Record<Client["status"], string> = {
    active: "bg-positive/10 text-positive",
    inactive: "bg-muted text-muted-foreground",
    churned: "bg-negative/10 text-negative",
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="size-3 bg-accent" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Gestão</span>
          </div>
          <h1 className="text-4xl font-display font-bold tracking-tight">Clientes</h1>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-foreground text-background px-4 py-2.5 text-xs font-mono uppercase tracking-widest hover:opacity-90 transition">
          <Plus size={13} /> Novo cliente
        </button>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Clientes ativos" value={String(stats.total)} />
        <StatCard label="MRR" value={formatBRL(stats.mrr)} />
        <StatCard label="Ticket médio" value={formatBRL(stats.avg)} />
        <StatCard label="Faturas vencidas" value={String(stats.overdue)} alert={stats.overdue > 0} />
      </div>

      <div className="bg-surface ring-1 ring-black/5 overflow-x-auto animate-reveal">
        {isLoading ? (
          <div className="py-16 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Carregando...</div>
        ) : clients.length === 0 ? (
          <div className="py-16 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Nenhum cliente cadastrado</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <Th>Nome</Th>
                <Th>Segmento</Th>
                <Th>Mensalidade</Th>
                <Th>LTV</Th>
                <Th>Último faturamento</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition">
                  <td className="px-6 py-4 text-sm font-medium">{c.name}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{c.segment ?? "—"}</td>
                  <td className="px-6 py-4 font-mono text-sm tabular-nums">{formatBRL(c.monthly_value)}</td>
                  <td className="px-6 py-4 font-mono text-sm tabular-nums text-muted-foreground">{formatBRL(ltv(c))}</td>
                  <td className="px-6 py-4 font-mono text-sm tabular-nums">
                    {c.last_invoice_date ? formatDate(c.last_invoice_date) : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-[10px] font-mono uppercase tracking-widest ${STATUS_CLASS[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 justify-end">
                      <button onClick={() => openEdit(c)} className="text-muted-foreground hover:text-foreground transition">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteId(c.id)} className="text-muted-foreground hover:text-negative transition">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <Modal title={editing ? "Editar cliente" : "Novo cliente"} onClose={closeModal}>
          <FormField label="Nome *">
            <input className={INPUT_CLS} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do cliente" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Mensalidade (R$)">
              <input type="number" min="0" step="0.01" className={INPUT_CLS} value={form.monthly_value} onChange={(e) => setForm({ ...form, monthly_value: Number(e.target.value) })} />
            </FormField>
            <FormField label="Status">
              <select className={INPUT_CLS} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Client["status"] })}>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="churned">Churned</option>
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Início do contrato">
              <input type="date" className={INPUT_CLS} value={form.contract_start ?? ""} onChange={(e) => setForm({ ...form, contract_start: e.target.value || null })} />
            </FormField>
            <FormField label="Último faturamento">
              <input type="date" className={INPUT_CLS} value={form.last_invoice_date ?? ""} onChange={(e) => setForm({ ...form, last_invoice_date: e.target.value || null })} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Segmento">
              <input className={INPUT_CLS} value={form.segment ?? ""} onChange={(e) => setForm({ ...form, segment: e.target.value || null })} placeholder="Ex: E-commerce" />
            </FormField>
            <FormField label="LTV manual (R$)">
              <input type="number" min="0" step="0.01" className={INPUT_CLS} value={form.ltv_manual ?? ""} onChange={(e) => setForm({ ...form, ltv_manual: e.target.value ? Number(e.target.value) : null })} placeholder="Calculado auto" />
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea className={`${INPUT_CLS} resize-none`} rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} />
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
        <Modal title="Excluir cliente?" onClose={() => setDeleteId(null)}>
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

function StatCard({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="bg-surface ring-1 ring-black/5 p-5 animate-reveal">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className={`mt-2 text-2xl font-display font-bold tabular-nums ${alert ? "text-negative" : ""}`}>{value}</div>
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
