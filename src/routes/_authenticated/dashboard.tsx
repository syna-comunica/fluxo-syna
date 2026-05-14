import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchTransactions, fetchBudgets, fetchCategories, fetchClients, fetchRecurrences } from "@/lib/finance-queries";
import { formatBRL, formatDate, monthStart, monthLabel } from "@/lib/format";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const month = monthStart();
  const txQ = useQuery({ queryKey: ["transactions"], queryFn: fetchTransactions });
  const catQ = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const budQ = useQuery({ queryKey: ["budgets", month], queryFn: () => fetchBudgets(month) });
  const clientQ = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const recQ = useQuery({ queryKey: ["recurrences"], queryFn: fetchRecurrences });

  const transactions = txQ.data ?? [];
  const categories = catQ.data ?? [];
  const budgets = budQ.data ?? [];
  const clients = clientQ.data ?? [];
  const recurrences = recQ.data ?? [];

  const stats = useMemo(() => {
    const now = new Date();
    const ms = monthStart(now);
    const me = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    const inMonth = transactions.filter((t) => t.due_date >= ms && t.due_date <= me);
    const incomePaid = inMonth.filter((t) => t.type === "income" && t.status === "paid").reduce((s, t) => s + t.amount, 0);
    const expensePaid = inMonth.filter((t) => t.type === "expense" && t.status === "paid").reduce((s, t) => s + t.amount, 0);
    const incomePending = inMonth.filter((t) => t.type === "income" && t.status === "pending").reduce((s, t) => s + t.amount, 0);
    const expensePending = inMonth.filter((t) => t.type === "expense" && t.status === "pending").reduce((s, t) => s + t.amount, 0);
    const balance = incomePaid - expensePaid;
    const projected = balance + incomePending - expensePending;

    const totalIn = incomePaid + incomePending;
    const totalOut = expensePaid + expensePending;
    // Receita líquida projetada (sobra do mês) como % do faturamento total: (projeção / total a receber) × 100.
    const projectedNetPctOfRevenue =
      totalIn < 1e-6 ? null : (projected / totalIn) * 100;

    // health
    const ratio = totalIn === 0 ? 0 : (totalIn - totalOut) / totalIn;
    let health: { label: string; level: number; tone: string };
    if (totalIn === 0) health = { label: "Sem dados", level: 0, tone: "muted" };
    else if (ratio >= 0.3) health = { label: "Excelente", level: 5, tone: "positive" };
    else if (ratio >= 0.15) health = { label: "Saudável", level: 4, tone: "positive" };
    else if (ratio >= 0) health = { label: "Atenção", level: 3, tone: "warning" };
    else if (ratio >= -0.15) health = { label: "Crítico", level: 2, tone: "negative" };
    else health = { label: "Risco alto", level: 1, tone: "negative" };

    return {
      incomePaid,
      expensePaid,
      incomePending,
      expensePending,
      balance,
      projected,
      projectedNetPctOfRevenue,
      health,
    };
  }, [transactions]);

  // Daily cash flow last 14 days
  const cashflow = useMemo(() => {
    const days: { date: string; income: number; expense: number }[] = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayTx = transactions.filter((t) => (t.paid_date ?? t.due_date) === key);
      days.push({
        date: key,
        income: dayTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
        expense: dayTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      });
    }
    const max = Math.max(1, ...days.flatMap((d) => [d.income, d.expense]));
    return { days, max };
  }, [transactions]);

  // Budget vs Actual
  const budgetRows = useMemo(() => {
    const ms = month;
    const me = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);
    return budgets.map((b) => {
      const cat = categories.find((c) => c.id === b.category_id);
      const actual = transactions
        .filter((t) => t.category_id === b.category_id && t.due_date >= ms && t.due_date <= me)
        .reduce((s, t) => s + t.amount, 0);
      const pct = b.planned_amount === 0 ? 0 : (actual / b.planned_amount) * 100;
      return { id: b.id, name: cat?.name ?? "—", type: cat?.type, planned: b.planned_amount, actual, pct };
    });
  }, [budgets, categories, transactions, month]);

  // Expense distribution
  const distribution = useMemo(() => {
    const ms = month;
    const me = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);
    const totals = new Map<string, number>();
    let total = 0;
    transactions
      .filter((t) => t.type === "expense" && t.due_date >= ms && t.due_date <= me)
      .forEach((t) => {
        const key = t.category_id ?? "outros";
        totals.set(key, (totals.get(key) ?? 0) + t.amount);
        total += t.amount;
      });
    return Array.from(totals.entries())
      .map(([id, value]) => {
        const cat = categories.find((c) => c.id === id);
        return {
          id,
          name: cat?.name ?? "Sem categoria",
          color: cat?.color ?? "#94a3b8",
          value,
          pct: total === 0 ? 0 : (value / total) * 100,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories, month]);

  // Upcoming bills
  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return transactions
      .filter((t) => t.status === "pending" && t.due_date >= today)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 6);
  }, [transactions]);

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-3 bg-accent" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {monthLabel()}
            </span>
          </div>
          <h1 className="text-4xl font-display font-bold tracking-tight">Visão geral</h1>
        </div>
        <HealthIndicator level={stats.health.level} label={stats.health.label} tone={stats.health.tone} />
      </header>

      <section className="grid grid-cols-12 gap-6">
        <Card className="col-span-12 lg:col-span-4">
          <Label>Saldo do mês (realizado)</Label>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-display font-bold tabular-nums ${stats.balance < 0 ? "text-negative" : ""}`}>
              {formatBRL(stats.balance)}
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
            <div>
              <Label>Recebido</Label>
              <div className="text-positive font-mono font-medium tabular-nums text-sm mt-1">
                + {formatBRL(stats.incomePaid)}
              </div>
            </div>
            <div className="text-right">
              <Label>Pago</Label>
              <div className="text-negative font-mono font-medium tabular-nums text-sm mt-1">
                - {formatBRL(stats.expensePaid)}
              </div>
            </div>
            <div>
              <Label>A receber</Label>
              <div className="text-positive/80 font-mono font-medium tabular-nums text-sm mt-1">
                {formatBRL(stats.incomePending)}
              </div>
            </div>
            <div className="text-right">
              <Label>A pagar</Label>
              <div className="text-negative/80 font-mono font-medium tabular-nums text-sm mt-1">
                {formatBRL(stats.expensePending)}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
            <div>
              <Label>Total a receber</Label>
              <div className="text-positive font-display font-semibold tabular-nums text-lg mt-1">
                {formatBRL(stats.incomePaid + stats.incomePending)}
              </div>
            </div>
            <div className="text-right">
              <Label>Total a pagar</Label>
              <div className="text-negative font-display font-semibold tabular-nums text-lg mt-1">
                {formatBRL(stats.expensePaid + stats.expensePending)}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <Label>Projeção (com pendentes)</Label>
            <div
              className={`mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-lg font-display font-semibold tabular-nums ${stats.projected < 0 ? "text-negative" : "text-foreground"}`}
              title="Receita líquida projetada (projeção com pendentes) em relação ao faturamento total do mês: (projeção ÷ total a receber) × 100."
            >
              <span>{formatBRL(stats.projected)}</span>
              {stats.projectedNetPctOfRevenue != null && (
                <span className="text-sm font-medium text-muted-foreground font-sans tracking-normal">
                  ({stats.projectedNetPctOfRevenue.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 0 })}%)
                </span>
              )}
            </div>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-8">
          <div className="flex justify-between items-center mb-6">
            <Label>Fluxo de caixa — últimos 14 dias</Label>
            <div className="flex gap-4">
              <Legend color="bg-positive" label="Entradas" />
              <Legend color="bg-negative" label="Saídas" />
            </div>
          </div>
          <div className="h-40 flex items-end gap-1.5">
            {cashflow.days.map((d, i) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="w-full flex flex-col gap-px h-32 justify-end">
                  <div
                    className="w-full bg-positive transition-all"
                    style={{ height: `${(d.income / cashflow.max) * 100}%` }}
                    title={`+${formatBRL(d.income)}`}
                  />
                  <div
                    className="w-full bg-negative transition-all"
                    style={{ height: `${(d.expense / cashflow.max) * 100}%` }}
                    title={`-${formatBRL(d.expense)}`}
                  />
                </div>
                {i % 2 === 0 && (
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {new Date(d.date).getDate()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-7">
          <div className="flex justify-between items-center mb-6">
            <Label>Orçamento previsto vs real</Label>
            <span className="font-mono text-[10px] text-muted-foreground">{budgetRows.length} categorias</span>
          </div>
          {budgetRows.length === 0 ? (
            <Empty msg="Defina orçamentos em Orçamento" />
          ) : (
            <div className="space-y-5">
              {budgetRows.map((b) => {
                const overBudget = b.pct > 100;
                const barColor =
                  b.type === "income"
                    ? "bg-positive"
                    : overBudget
                    ? "bg-negative"
                    : b.pct > 85
                    ? "bg-warning"
                    : "bg-accent";
                return (
                  <div key={b.id} className="space-y-2">
                    <div className="flex justify-between text-xs font-mono uppercase tracking-wider">
                      <span className="text-foreground">{b.name}</span>
                      <span className={overBudget ? "text-negative" : "text-muted-foreground"}>
                        {Math.round(b.pct)}% consumido
                      </span>
                    </div>
                    <div className="h-3 bg-muted relative overflow-hidden">
                      <div className={`absolute inset-y-0 left-0 ${barColor}`} style={{ width: `${Math.min(b.pct, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground tabular-nums">
                      <span>Real: {formatBRL(b.actual)}</span>
                      <span>Previsto: {formatBRL(b.planned)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="col-span-12 lg:col-span-5">
          <Label>Despesas por categoria</Label>
          {distribution.length === 0 ? (
            <div className="mt-6"><Empty msg="Sem despesas no mês" /></div>
          ) : (
            <ul className="mt-6 space-y-3">
              {distribution.slice(0, 6).map((d) => (
                <li key={d.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="size-2.5" style={{ backgroundColor: d.color }} />
                      <span>{d.name}</span>
                    </div>
                    <span className="font-mono tabular-nums">{Math.round(d.pct)}%</span>
                  </div>
                  <div className="h-1 bg-muted relative">
                    <div className="absolute inset-y-0 left-0" style={{ width: `${d.pct}%`, backgroundColor: d.color }} />
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground tabular-nums">
                    {formatBRL(d.value)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <AlertsCard clients={clients} recurrences={recurrences} />

        <Card className="col-span-12">
          <div className="flex justify-between items-center mb-6">
            <Label>Próximos vencimentos</Label>
            <a href="/transactions" className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground">
              Ver todos →
            </a>
          </div>
          {upcoming.length === 0 ? (
            <Empty msg="Nenhuma conta pendente" />
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Vencimento</th>
                  <th className="py-2 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Descrição</th>
                  <th className="py-2 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Status</th>
                  <th className="py-2 font-mono text-[10px] text-muted-foreground uppercase tracking-widest text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {upcoming.map((t) => (
                  <tr key={t.id}>
                    <td className="py-3 font-mono text-sm tabular-nums">{formatDate(t.due_date)}</td>
                    <td className="py-3 text-sm font-medium">{t.description}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-[10px] font-mono uppercase tracking-widest ${
                        t.type === "income" ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
                      }`}>
                        {t.type === "income" ? "Receber" : "Pagar"}
                      </span>
                    </td>
                    <td className={`py-3 font-mono text-sm text-right tabular-nums font-medium ${
                      t.type === "income" ? "text-positive" : "text-negative"
                    }`}>
                      {t.type === "income" ? "+" : "-"} {formatBRL(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-surface ring-1 ring-black/5 p-6 lg:p-7 animate-reveal ${className}`}>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
      {children}
    </span>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`size-2 ${color}`} />
      <span className="text-[10px] font-mono text-muted-foreground">{label}</span>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="py-8 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
      {msg}
    </div>
  );
}

function AlertsCard({ clients, recurrences }: { clients: import("@/lib/finance-queries").Client[]; recurrences: import("@/lib/finance-queries").Recurrence[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const overdueClients = clients.filter(
    (c) => c.status === "active" && c.last_invoice_date && c.last_invoice_date < today
  );
  const activeRec = recurrences.filter((r) => r.status === "active");
  const recIncome = activeRec.filter((r) => r.type === "income").reduce((s, r) => s + r.value, 0);
  const recExpense = activeRec.filter((r) => r.type === "expense").reduce((s, r) => s + r.value, 0);

  const hasAlerts = overdueClients.length > 0;
  if (!hasAlerts && activeRec.length === 0) return null;

  return (
    <section className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
      {hasAlerts && (
        <div className="bg-surface ring-1 ring-negative/30 p-6 animate-reveal">
          <div className="flex items-start gap-3">
            <div className="size-2 bg-negative mt-1.5 shrink-0" />
            <div className="flex-1">
              <Label>Alertas de faturamento</Label>
              <p className="mt-2 text-sm font-medium">
                {overdueClients.length} {overdueClients.length === 1 ? "cliente com fatura vencida" : "clientes com faturas vencidas"}
              </p>
              <ul className="mt-2 space-y-1">
                {overdueClients.slice(0, 4).map((c) => (
                  <li key={c.id} className="text-xs text-muted-foreground font-mono flex justify-between">
                    <span>{c.name}</span>
                    <span className="text-negative">{c.last_invoice_date ? formatDate(c.last_invoice_date) : "—"}</span>
                  </li>
                ))}
                {overdueClients.length > 4 && (
                  <li className="text-xs text-muted-foreground font-mono">+ {overdueClients.length - 4} mais</li>
                )}
              </ul>
              <Link to="/clients" className="mt-3 inline-block text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition">
                Ver clientes →
              </Link>
            </div>
          </div>
        </div>
      )}
      {activeRec.length > 0 && (
        <div className="bg-surface ring-1 ring-black/5 p-6 animate-reveal">
          <Label>Recorrências ativas</Label>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Receita fixa</span>
              <div className="text-positive font-mono font-medium tabular-nums text-sm mt-1">+ {formatBRL(recIncome)}</div>
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Despesa fixa</span>
              <div className="text-negative font-mono font-medium tabular-nums text-sm mt-1">- {formatBRL(recExpense)}</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{activeRec.length} recorrências</span>
            <Link to="/recurrences" className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition">
              Gerenciar →
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

function HealthIndicator({ level, label, tone }: { level: number; label: string; tone: string }) {
  const toneClass =
    tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : tone === "warning" ? "text-warning" : "text-muted-foreground";
  const barClass =
    tone === "positive" ? "bg-positive" : tone === "negative" ? "bg-negative" : tone === "warning" ? "bg-warning" : "bg-muted-foreground";
  return (
    <div className="flex flex-col items-end gap-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Saúde financeira
      </span>
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`h-6 w-1.5 ${i <= level ? barClass : "bg-border"}`} />
          ))}
        </div>
        <span className={`text-xl font-display font-bold ${toneClass}`}>{label}</span>
      </div>
    </div>
  );
}