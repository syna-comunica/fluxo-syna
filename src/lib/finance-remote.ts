/** Base URL do servidor (sem barra final).
 *  Deixe vazio no Vercel — o frontend e a API ficam no mesmo domínio.
 *  Em desenvolvimento local defina VITE_FINANCE_API_URL=http://localhost:8787 */
export const FINANCE_API_URL =
  (import.meta.env.VITE_FINANCE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export function hasFinanceApi(): boolean {
  return true; // Único banco: MySQL. Sempre usa o backend.
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
  const token = getFinanceToken();
  if (!token) throw new Error("Sessão expirada ou ausente. Faça login novamente.");
  return { Authorization: `Bearer ${token}` };
}

async function authHeadersJson(): Promise<HeadersInit> {
  const h = await authHeaders();
  return { ...h, "Content-Type": "application/json" };
}

async function parseError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return `HTTP ${res.status}`;
    try {
      const j = JSON.parse(text) as { error?: unknown };
      if (typeof j.error === "string") return j.error;
      return JSON.stringify(j.error ?? j);
    } catch {
      return text;
    }
  } catch {
    return `HTTP ${res.status}`;
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
