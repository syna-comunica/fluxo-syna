import { financeApiGet, financeApiSend } from "@/lib/finance-remote";

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

// ─── Categories ─────────────────────────────────────────────────────────────

export async function fetchCategories(): Promise<Category[]> {
  return financeApiGet<Category[]>("/api/categories");
}

export async function insertCategory(row: { user_id: string; name: string; type: "income" | "expense"; color: string }): Promise<void> {
  await financeApiSend<unknown>("/api/categories", {
    method: "POST",
    body: JSON.stringify({ name: row.name, type: row.type, color: row.color }),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await financeApiSend<unknown>(`/api/categories/${id}`, { method: "DELETE" });
}

// ─── Transactions ────────────────────────────────────────────────────────────

export async function fetchTransactions(): Promise<Transaction[]> {
  return financeApiGet<Transaction[]>("/api/transactions");
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
}

export async function updateTransactionPaidState(
  id: string,
  status: "paid" | "pending",
  paid_date: string | null,
): Promise<void> {
  await financeApiSend<unknown>(`/api/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, paid_date }),
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  await financeApiSend<unknown>(`/api/transactions/${id}`, { method: "DELETE" });
}

// ─── Budgets ─────────────────────────────────────────────────────────────────

export async function fetchBudgets(month: string): Promise<Budget[]> {
  const q = new URLSearchParams({ month });
  return financeApiGet<Budget[]>(`/api/budgets?${q}`);
}

export async function upsertBudget(row: {
  user_id: string;
  category_id: string;
  month: string;
  planned_amount: number;
}): Promise<void> {
  await financeApiSend<unknown>("/api/budgets", {
    method: "POST",
    body: JSON.stringify({
      category_id: row.category_id,
      month: row.month,
      planned_amount: row.planned_amount,
    }),
  });
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export async function fetchClients(): Promise<Client[]> {
  return financeApiGet<Client[]>("/api/clients");
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
  const { user_id: _uid, ...rest } = row;
  await financeApiSend<unknown>("/api/clients", { method: "POST", body: JSON.stringify(rest) });
}

export async function updateClient(id: string, patch: Partial<Omit<Client, "id">>): Promise<void> {
  await financeApiSend<unknown>(`/api/clients/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function deleteClient(id: string): Promise<void> {
  await financeApiSend<unknown>(`/api/clients/${id}`, { method: "DELETE" });
}

// ─── Recurrences ──────────────────────────────────────────────────────────────

export async function fetchRecurrences(): Promise<Recurrence[]> {
  return financeApiGet<Recurrence[]>("/api/recurrences");
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
  const { user_id: _uid, ...rest } = row;
  await financeApiSend<unknown>("/api/recurrences", { method: "POST", body: JSON.stringify(rest) });
}

export async function updateRecurrence(id: string, patch: Partial<Omit<Recurrence, "id">>): Promise<void> {
  await financeApiSend<unknown>(`/api/recurrences/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function deleteRecurrence(id: string): Promise<void> {
  await financeApiSend<unknown>(`/api/recurrences/${id}`, { method: "DELETE" });
}

export async function generateFromRecurrence(id: string, month: string): Promise<Transaction> {
  return financeApiSend<Transaction>(`/api/recurrences/${id}/generate`, {
    method: "POST",
    body: JSON.stringify({ month }),
  });
}
