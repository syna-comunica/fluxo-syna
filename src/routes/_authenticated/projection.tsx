import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchTransactions, fetchRecurrences } from "@/lib/finance-queries";
import { formatBRL } from "@/lib/format";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/projection")({
  component: ProjectionPage,
});

function ProjectionPage() {
  const { data: transactions = [] } = useQuery({ queryKey: ["transactions"], queryFn: fetchTransactions });
  const { data: recurrences = [] } = useQuery({ queryKey: ["recurrences"], queryFn: fetchRecurrences });

  const defaults = useMemo(() => {
    const now = new Date();
    let incomeSum = 0, expenseSum = 0, months = 0;
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ms = d.toISOString().slice(0, 10);
      const me = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
      const inMonth = transactions.filter((t) => t.status === "paid" && t.due_date >= ms && t.due_date <= me);
      if (inMonth.length > 0) {
        incomeSum += inMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
        expenseSum += inMonth.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
        months++;
      }
    }
    const activeRec = recurrences.filter((r) => r.status === "active");
    const recIncome = activeRec.filter((r) => r.type === "income").reduce((s, r) => s + r.value, 0);
    const recExpense = activeRec.filter((r) => r.type === "expense").reduce((s, r) => s + r.value, 0);

    const avgIncome = months > 0 ? incomeSum / months : 0;
    const avgExpense = months > 0 ? expenseSum / months : 0;

    return {
      income: Math.round(Math.max(avgIncome, recIncome)),
      expense: Math.round(Math.max(avgExpense, recExpense)),
    };
  }, [transactions, recurrences]);

  const [income, setIncome] = useState<number | null>(null);
  const [expense, setExpense] = useState<number | null>(null);

  const projIncome = income ?? defaults.income;
  const projExpense = expense ?? defaults.expense;

  const months = useMemo(() => {
    const now = new Date();
    const result: { label: string; income: number; expense: number; profit: number; cumulative: number }[] = [];
    let cumulative = 0;
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(d);
      const profit = projIncome - projExpense;
      cumulative += profit;
      result.push({ label, income: projIncome, expense: projExpense, profit, cumulative });
    }
    return result;
  }, [projIncome, projExpense]);

  const maxVal = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
  const cumMax = Math.max(1, ...months.map((m) => Math.abs(m.cumulative)));

  const annualProfit = months.reduce((s, m) => s + m.profit, 0);
  const margin = projIncome === 0 ? 0 : ((projIncome - projExpense) / projIncome) * 100;
  const breakEven = months.find((m) => m.cumulative >= 0);

  return (
    <div className="space-y-10">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <div className="size-3 bg-accent" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Simulador</span>
        </div>
        <h1 className="text-4xl font-display font-bold tracking-tight">Projeção 12 meses</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface ring-1 ring-black/5 p-6 animate-reveal space-y-5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block">Parâmetros mensais</span>
          <InputField
            label="Receita mensal esperada (R$)"
            value={projIncome}
            onChange={setIncome}
            hint={defaults.income > 0 ? `Média histórica: ${formatBRL(defaults.income)}` : undefined}
          />
          <InputField
            label="Despesa mensal esperada (R$)"
            value={projExpense}
            onChange={setExpense}
            hint={defaults.expense > 0 ? `Média histórica: ${formatBRL(defaults.expense)}` : undefined}
          />
          <button
            onClick={() => { setIncome(defaults.income); setExpense(defaults.expense); }}
            className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition"
          >
            ↺ Restaurar médias históricas
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Resultado mensal" value={formatBRL(projIncome - projExpense)} tone={projIncome >= projExpense ? "positive" : "negative"} />
          <StatCard label="Margem líquida" value={`${margin.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`} tone={margin >= 0 ? "positive" : "negative"} />
          <StatCard label="Resultado anual" value={formatBRL(annualProfit)} tone={annualProfit >= 0 ? "positive" : "negative"} />
          <StatCard label="Break-even" value={breakEven ? breakEven.label : "Não atingido"} />
        </div>
      </div>

      <div className="bg-surface ring-1 ring-black/5 p-6 lg:p-7 animate-reveal">
        <div className="flex justify-between items-center mb-6">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Receita vs Despesa por mês</span>
          <div className="flex gap-4">
            <Legend color="bg-positive" label="Receita" />
            <Legend color="bg-negative" label="Despesa" />
          </div>
        </div>
        <div className="h-40 flex items-end gap-1.5">
          {months.map((m) => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="w-full flex flex-col gap-px h-32 justify-end">
                <div className="w-full bg-positive transition-all" style={{ height: `${(m.income / maxVal) * 100}%` }} title={`+${formatBRL(m.income)}`} />
                <div className="w-full bg-negative transition-all" style={{ height: `${(m.expense / maxVal) * 100}%` }} title={`-${formatBRL(m.expense)}`} />
              </div>
              <span className="text-[9px] font-mono text-muted-foreground whitespace-nowrap">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface ring-1 ring-black/5 p-6 lg:p-7 animate-reveal">
        <div className="flex justify-between items-center mb-6">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Resultado acumulado</span>
        </div>
        <div className="h-32 flex items-center gap-1.5">
          {months.map((m) => {
            const isPositive = m.cumulative >= 0;
            const pct = (Math.abs(m.cumulative) / cumMax) * 45;
            return (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1 relative h-full">
                <div className="absolute inset-0 flex flex-col items-stretch justify-center">
                  {isPositive ? (
                    <>
                      <div className="flex-1" />
                      <div className={`bg-positive transition-all`} style={{ height: `${pct}%` }} title={formatBRL(m.cumulative)} />
                      <div className="flex-1" />
                    </>
                  ) : (
                    <>
                      <div className="flex-1" />
                      <div className={`bg-negative transition-all`} style={{ height: `${pct}%` }} title={formatBRL(m.cumulative)} />
                      <div className="flex-1" />
                    </>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 flex justify-center">
                  <span className="text-[9px] font-mono text-muted-foreground whitespace-nowrap">{m.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-surface ring-1 ring-black/5 overflow-x-auto animate-reveal">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border">
              <Th>Mês</Th>
              <Th>Receita</Th>
              <Th>Despesa</Th>
              <Th>Resultado</Th>
              <Th>Acumulado</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {months.map((m) => (
              <tr key={m.label} className="hover:bg-muted/30 transition">
                <td className="px-6 py-3 font-mono text-sm uppercase tracking-wider">{m.label}</td>
                <td className="px-6 py-3 font-mono text-sm tabular-nums text-positive">+ {formatBRL(m.income)}</td>
                <td className="px-6 py-3 font-mono text-sm tabular-nums text-negative">- {formatBRL(m.expense)}</td>
                <td className={`px-6 py-3 font-mono text-sm tabular-nums font-medium ${m.profit >= 0 ? "text-positive" : "text-negative"}`}>
                  {formatBRL(m.profit)}
                </td>
                <td className={`px-6 py-3 font-mono text-sm tabular-nums ${m.cumulative >= 0 ? "text-positive" : "text-negative"}`}>
                  {formatBRL(m.cumulative)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <div className="space-y-1">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type="number"
        min="0"
        step="100"
        className="w-full bg-transparent border-b border-border py-2 text-sm focus:border-accent outline-none tabular-nums"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <span className="text-[10px] text-muted-foreground font-mono">{hint}</span>}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <div className="bg-surface ring-1 ring-black/5 p-5 animate-reveal">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className={`mt-2 text-xl font-display font-bold tabular-nums ${tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-6 py-3 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{children}</th>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`size-2 ${color}`} />
      <span className="text-[10px] font-mono text-muted-foreground">{label}</span>
    </div>
  );
}
