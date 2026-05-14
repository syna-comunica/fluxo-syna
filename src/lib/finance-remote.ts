import { supabase } from "@/integrations/supabase/client";

/** Base URL do servidor em `backend/` (sem barra final). Se vazio, o app usa Supabase direto no browser. */
export const FINANCE_API_URL = (import.meta.env.VITE_FINANCE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export function hasFinanceApi(): boolean {
  return FINANCE_API_URL.length > 0;
}

const FINANCE_TOKEN_KEY = "finance_api_token";

export function getFinanceToken(): string | null {
  return localStorage.getItem(FINANCE_TOKEN_KEY);
}

export function setFinanceToken(token: string): void {
  localStorage.setItem(FINANCE_TOKEN_KEY, token);
}

export function clearFinanceToken(): void {
  localStorage.removeItem(FINANCE_TOKEN_KEY);
}

async function authHeaders(): Promise<HeadersInit> {
  if (hasFinanceApi()) {
    const token = getFinanceToken();
    if (!token) throw new Error("Sessão expirada ou ausente. Faça login novamente.");
    return { Authorization: `Bearer ${token}` };
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Sessão expirada ou ausente. Faça login novamente.");
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function authHeadersJson(): Promise<HeadersInit> {
  const h = await authHeaders();
  return { ...h, "Content-Type": "application/json" };
}

async function parseError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: unknown };
    if (typeof j.error === "string") return j.error;
    return JSON.stringify(j.error ?? j);
  } catch {
    return await res.text();
  }
}

export async function financeApiGet<T>(path: string): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${FINANCE_API_URL}${path}`, { headers });
  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function financeApiSend<T>(path: string, init: RequestInit): Promise<T> {
  const baseHeaders = await authHeadersJson();
  const res = await fetch(`${FINANCE_API_URL}${path}`, {
    ...init,
    headers: { ...baseHeaders, ...init.headers },
  });
  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
