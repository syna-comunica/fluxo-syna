import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchTransactions, fetchCategories } from "@/lib/finance-queries";
import { formatBRL, monthLabel } from "@/lib/format";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dre")({
  component: DrePage,
});

function DrePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: transactions = [] } = useQuery({ queryKey: ["transactions"], queryFn: fetchTransactions });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const monthStart = `${monthStr}-01`;
  const monthEnd = new Date(year, month, 0).toISOString().slice(0, 10);
  const monthName = monthLabel(new Date(year, month - 1, 1));

  const dre = useMemo(() => {
    const inMonth = transactions.filter((t) => t.due_date >= monthStart && t.due_date <= monthEnd);

    const incomeRows = categories
      .filter((c) => c.type === "income")
      .map((c) => {
        const paid = inMonth.filter((t) => t.category_id === c.id && t.type === "income" && t.status === "paid").reduce((s, t) => s + t.amount, 0);
        const pending = inMonth.filter((t) => t.category_id === c.id && t.type === "income" && t.status === "pending").reduce((s, t) => s + t.amount, 0);
        return { id: c.id, name: c.name, color: c.color, paid, pending, total: paid + pending };
      })
      .filter((r) => r.total > 0);

    const uncatIncome = inMonth
      .filter((t) => !t.category_id && t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    if (uncatIncome > 0) incomeRows.push({ id: "_", name: "Sem categoria", color: "#94a3b8", paid: uncatIncome, pending: 0, total: uncatIncome });

    const expenseRows = categories
      .filter((c) => c.type === "expense")
      .map((c) => {
        const paid = inMonth.filter((t) => t.category_id === c.id && t.type === "expense" && t.status === "paid").reduce((s, t) => s + t.amount, 0);
        const pending = inMonth.filter((t) => t.category_id === c.id && t.type === "expense" && t.status === "pending").reduce((s, t) => s + t.amount, 0);
        return { id: c.id, name: c.name, color: c.color, paid, pending, total: paid + pending };
      })
      .filter((r) => r.total > 0);

    const uncatExpense = inMonth
      .filter((t) => !t.category_id && t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    if (uncatExpense > 0) expenseRows.push({ id: "_", name: "Sem categoria", color: "#94a3b8", paid: uncatExpense, pending: 0, total: uncatExpense });

    const totalIncome = incomeRows.reduce((s, r) => s + r.total, 0);
    const totalExpense = expenseRows.reduce((s, r) => s + r.total, 0);
    const result = totalIncome - totalExpense;
    const margin = totalIncome === 0 ? null : (result / totalIncome) * 100;

    const totalIncomePaid = incomeRows.reduce((s, r) => s + r.paid, 0);
    const totalExpensePaid = expenseRows.reduce((s, r) => s + r.paid, 0);
    const resultPaid = totalIncomePaid - totalExpensePaid;

    return { incomeRows, expenseRows, totalIncome, totalExpense, result, margin, totalIncomePaid, totalExpensePaid, resultPaid };
  }, [transactions, categories, monthStart, monthEnd]);

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="size-3 bg-accent" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Demonstrativo</span>
          </div>
          <h1 className="text-4xl font-display font-bold tracking-tight">DRE</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="text-muted-foreground hover:text-foreground transition p-1">
            <ChevronLeft size={16} />
          </button>
          <span className="font-mono text-sm uppercase tracking-widest w-40 text-center">{monthName}</span>
          <button onClick={nextMonth} className="text-muted-foreground hover:text-foreground transition p-1">
            <ChevronRight size={16} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniCard label="Receita total" value={formatBRL(dre.totalIncome)} />
        <MiniCard label="Despesa total" value={formatBRL(dre.totalExpense)} />
        <MiniCard label="Resultado" value={formatBRL(dre.result)} highlight={dre.result >= 0 ? "positive" : "negative"} />
        <MiniCard
          label="Margem líquida"
          value={dre.margin !== null ? `${dre.margin.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—"}
          highlight={dre.margin !== null ? (dre.margin >= 0 ? "positive" : "negative") : undefined}
        />
      </div>

      <div className="bg-surface ring-1 ring-black/5 animate-reveal">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="px-6 py-3 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Item</th>
              <th className="px-6 py-3 font-mono text-[10px] text-muted-foreground uppercase tracking-widest text-right">Realizado</th>
              <th className="px-6 py-3 font-mono text-[10px] text-muted-foreground uppercase tracking-widest text-right">Pendente</th>
              <th className="px-6 py-3 font-mono text-[10px] text-muted-foreground uppercase tracking-widest text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <SectionHeader label="Receitas" />
            {dre.incomeRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-3 text-xs text-muted-foreground italic">Sem receitas no período</td>
              </tr>
            ) : (
              dre.incomeRows.map((r) => (
                <DreRow key={r.id} name={r.name} color={r.color} paid={r.paid} pending={r.pending} total={r.total} tone="positive" />
              ))
            )}
            <TotalRow label="Total Receitas" value={dre.totalIncome} tone="positive" />

            <SectionHeader label="Despesas" />
            {dre.expenseRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-3 text-xs text-muted-foreground italic">Sem despesas no período</td>
              </tr>
            ) : (
              dre.expenseRows.map((r) => (
                <DreRow key={r.id} name={r.name} color={r.color} paid={r.paid} pending={r.pending} total={r.total} tone="negative" />
              ))
            )}
            <TotalRow label="Total Despesas" value={dre.totalExpense} tone="negative" />

            <ResultRow label="Resultado do Período" value={dre.result} />
          </tbody>
        </table>
      </div>

      <div className="bg-surface ring-1 ring-black/5 p-6 animate-reveal">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Resultado realizado (somente pagos)</span>
        <div className={`mt-2 text-3xl font-display font-bold tabular-nums ${dre.resultPaid >= 0 ? "text-positive" : "text-negative"}`}>
          {formatBRL(dre.resultPaid)}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-6 text-sm">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Recebido</span>
            <div className="text-positive font-mono tabular-nums mt-1">+ {formatBRL(dre.totalIncomePaid)}</div>
          </div>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Pago</span>
            <div className="text-negative font-mono tabular-nums mt-1">- {formatBRL(dre.totalExpensePaid)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniCard({ label, value, highlight }: { label: string; value: string; highlight?: "positive" | "negative" }) {
  return (
    <div className="bg-surface ring-1 ring-black/5 p-5 animate-reveal">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className={`mt-2 text-xl font-display font-bold tabular-nums ${highlight === "positive" ? "text-positive" : highlight === "negative" ? "text-negative" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <tr className="bg-muted/40">
      <td colSpan={4} className="px-6 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
        {label}
      </td>
    </tr>
  );
}

function DreRow({ name, color, paid, pending, total, tone }: { name: string; color: string; paid: number; pending: number; total: number; tone: "positive" | "negative" }) {
  return (
    <tr className="border-b border-border/50 hover:bg-muted/20 transition">
      <td className="px-6 py-3 text-sm">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full" style={{ backgroundColor: color }} />
          {name}
        </div>
      </td>
      <td className={`px-6 py-3 font-mono text-sm text-right tabular-nums ${tone === "positive" ? "text-positive" : "text-negative"}`}>
        {formatBRL(paid)}
      </td>
      <td className="px-6 py-3 font-mono text-sm text-right tabular-nums text-muted-foreground">
        {pending > 0 ? formatBRL(pending) : "—"}
      </td>
      <td className={`px-6 py-3 font-mono text-sm text-right tabular-nums font-medium ${tone === "positive" ? "text-positive" : "text-negative"}`}>
        {formatBRL(total)}
      </td>
    </tr>
  );
}

function TotalRow({ label, value, tone }: { label: string; value: number; tone: "positive" | "negative" }) {
  return (
    <tr className="border-b-2 border-border">
      <td className="px-6 py-3 font-mono text-xs uppercase tracking-widest font-semibold">{label}</td>
      <td colSpan={2} />
      <td className={`px-6 py-3 font-mono text-sm text-right tabular-nums font-bold ${tone === "positive" ? "text-positive" : "text-negative"}`}>
        {formatBRL(value)}
      </td>
    </tr>
  );
}

function ResultRow({ label, value }: { label: string; value: number }) {
  return (
    <tr className="bg-muted/20">
      <td className="px-6 py-4 font-display font-semibold text-sm">{label}</td>
      <td colSpan={2} />
      <td className={`px-6 py-4 font-display font-bold text-lg text-right tabular-nums ${value >= 0 ? "text-positive" : "text-negative"}`}>
        {formatBRL(value)}
      </td>
    </tr>
  );
}
