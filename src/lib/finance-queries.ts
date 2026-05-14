import { supabase } from "@/integrations/supabase/client";
import { financeApiGet, financeApiSend, hasFinanceApi } from "@/lib/finance-remote";

export type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
};

export type Transaction = {
  id: string;
  category_id: string | null;
  description: string;
  amount: number;
  type: "income" | "expense";
  status: "paid" | "pending";
  due_date: string;
  paid_date: string | null;
  notes: string | null;
};

export type Budget = {
  id: string;
  category_id: string;
  month: string;
  planned_amount: number;
};

export async function fetchCategories(): Promise<Category[]> {
  if (hasFinanceApi()) {
    return financeApiGet<Category[]>("/api/categories");
  }
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function fetchTransactions(): Promise<Transaction[]> {
  if (hasFinanceApi()) {
    return financeApiGet<Transaction[]>("/api/transactions");
  }
  const { data, error } = await supabase.from("transactions").select("*").order("due_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((t: { amount: unknown }) => ({ ...t, amount: Number(t.amount) })) as Transaction[];
}

export async function fetchBudgets(month: string): Promise<Budget[]> {
  if (hasFinanceApi()) {
    const q = new URLSearchParams({ month });
    return financeApiGet<Budget[]>(`/api/budgets?${q}`);
  }
  const { data, error } = await supabase.from("budgets").select("*").eq("month", month);
  if (error) throw error;
  return (data ?? []).map((b: { planned_amount: unknown }) => ({ ...b, planned_amount: Number(b.planned_amount) })) as Budget[];
}

export async function insertTransaction(row: {
  user_id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  status: "paid" | "pending";
  due_date: string;
  paid_date: string | null;
  category_id: string | null;
}): Promise<void> {
  if (hasFinanceApi()) {
    await financeApiSend<unknown>("/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        description: row.description,
        amount: row.amount,
        type: row.type,
        status: row.status,
        due_date: row.due_date,
        paid_date: row.paid_date,
        category_id: row.category_id,
      }),
    });
    return;
  }
  const { error } = await supabase.from("transactions").insert(row);
  if (error) throw error;
}

export async function updateTransactionPaidState(
  id: string,
  status: "paid" | "pending",
  paid_date: string | null,
): Promise<void> {
  if (hasFinanceApi()) {
    await financeApiSend<unknown>(`/api/transactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, paid_date }),
    });
    return;
  }
  const { error } = await supabase.from("transactions").update({ status, paid_date }).eq("id", id);
  if (error) throw error;
}

export async function deleteTransaction(id: string): Promise<void> {
  if (hasFinanceApi()) {
    await financeApiSend<unknown>(`/api/transactions/${id}`, { method: "DELETE" });
    return;
  }
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

export async function insertCategory(row: { user_id: string; name: string; type: "income" | "expense"; color: string }): Promise<void> {
  if (hasFinanceApi()) {
    await financeApiSend<unknown>("/api/categories", {
      method: "POST",
      body: JSON.stringify({ name: row.name, type: row.type, color: row.color }),
    });
    return;
  }
  const { error } = await supabase.from("categories").insert(row);
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  if (hasFinanceApi()) {
    await financeApiSend<unknown>(`/api/categories/${id}`, { method: "DELETE" });
    return;
  }
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

export type Client = {
  id: string;
  name: string;
  monthly_value: number;
  contract_start: string | null;
  last_invoice_date: string | null;
  status: "active" | "inactive" | "churned";
  segment: string | null;
  ltv_manual: number | null;
  notes: string | null;
};

export type Recurrence = {
  id: string;
  name: string;
  description: string | null;
  value: number;
  due_day: number;
  type: "income" | "expense";
  status: "active" | "inactive";
  category_id: string | null;
};

export async function fetchClients(): Promise<Client[]> {
  if (hasFinanceApi()) {
    return financeApiGet<Client[]>("/api/clients");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from("clients").select("*").order("name");
  if (error) throw error;
  return (data ?? []).map((c: any) => ({
    ...c,
    monthly_value: Number(c.monthly_value),
    ltv_manual: c.ltv_manual !== null ? Number(c.ltv_manual) : null,
  })) as Client[];
}

export async function insertClient(row: {
  user_id: string;
  name: string;
  monthly_value: number;
  contract_start: string | null;
  last_invoice_date: string | null;
  status: "active" | "inactive" | "churned";
  segment: string | null;
  ltv_manual: number | null;
  notes: string | null;
}): Promise<void> {
  if (hasFinanceApi()) {
    const { user_id: _uid, ...rest } = row;
    await financeApiSend<unknown>("/api/clients", { method: "POST", body: JSON.stringify(rest) });
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("clients").insert(row);
  if (error) throw error;
}

export async function updateClient(id: string, patch: Partial<Omit<Client, "id">>): Promise<void> {
  if (hasFinanceApi()) {
    await financeApiSend<unknown>(`/api/clients/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("clients").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteClient(id: string): Promise<void> {
  if (hasFinanceApi()) {
    await financeApiSend<unknown>(`/api/clients/${id}`, { method: "DELETE" });
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("clients").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchRecurrences(): Promise<Recurrence[]> {
  if (hasFinanceApi()) {
    return financeApiGet<Recurrence[]>("/api/recurrences");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from("recurrences").select("*").order("name");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ ...r, value: Number(r.value) })) as Recurrence[];
}

export async function insertRecurrence(row: {
  user_id: string;
  name: string;
  description: string | null;
  value: number;
  due_day: number;
  type: "income" | "expense";
  status: "active" | "inactive";
  category_id: string | null;
}): Promise<void> {
  if (hasFinanceApi()) {
    const { user_id: _uid, ...rest } = row;
    await financeApiSend<unknown>("/api/recurrences", { method: "POST", body: JSON.stringify(rest) });
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("recurrences").insert(row);
  if (error) throw error;
}

export async function updateRecurrence(id: string, patch: Partial<Omit<Recurrence, "id">>): Promise<void> {
  if (hasFinanceApi()) {
    await financeApiSend<unknown>(`/api/recurrences/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("recurrences").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteRecurrence(id: string): Promise<void> {
  if (hasFinanceApi()) {
    await financeApiSend<unknown>(`/api/recurrences/${id}`, { method: "DELETE" });
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("recurrences").delete().eq("id", id);
  if (error) throw error;
}

export async function generateFromRecurrence(id: string, month: string): Promise<Transaction> {
  if (hasFinanceApi()) {
    return financeApiSend<Transaction>(`/api/recurrences/${id}/generate`, {
      method: "POST",
      body: JSON.stringify({ month }),
    });
  }
  throw new Error("Disponível apenas com Finance API");
}

export async function upsertBudget(row: {
  user_id: string;
  category_id: string;
  month: string;
  planned_amount: number;
}): Promise<void> {
  if (hasFinanceApi()) {
    await financeApiSend<unknown>("/api/budgets", {
      method: "POST",
      body: JSON.stringify({
        category_id: row.category_id,
        month: row.month,
        planned_amount: row.planned_amount,
      }),
    });
    return;
  }
  const { error } = await supabase.from("budgets").upsert(
    {
      user_id: row.user_id,
      category_id: row.category_id,
      month: row.month,
      planned_amount: row.planned_amount,
    },
    { onConflict: "user_id,category_id,month" },
  );
  if (error) throw error;
}
