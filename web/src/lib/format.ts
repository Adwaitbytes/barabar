const IST = "Asia/Kolkata";

export function fmtDate(iso: string | null | undefined, opts?: { withYear?: boolean }): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00+05:30` : iso);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: opts?.withYear ? "numeric" : undefined,
    timeZone: IST,
  }).format(d);
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: IST,
  }).format(d);
}

export function fmtMonth(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00+05:30` : iso);
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: IST }).format(d);
}

export function weekday(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00+05:30`);
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: IST }).format(d);
}

export function relTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const diff = (now - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function shortHash(hash: string | null | undefined, n = 8): string {
  if (!hash) return "—";
  return hash.slice(0, n);
}

export function fmtInt(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

export function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
