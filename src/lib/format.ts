export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

export function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
}

export function monthStart(d = new Date()): string {
  const date = new Date(d.getFullYear(), d.getMonth(), 1);
  return date.toISOString().slice(0, 10);
}

export function monthEnd(d = new Date()): string {
  const date = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return date.toISOString().slice(0, 10);
}

export function monthLabel(d = new Date()): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d);
}