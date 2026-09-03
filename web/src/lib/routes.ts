import { parseRef, type EntityKind } from "./types";

export const routes = {
  landing: "/",
  overview: "/app",
  sources: "/app/sources",
  settlements: "/app/settlements",
  settlement: (id: string) => `/app/settlements/${id}`,
  exceptions: "/app/exceptions",
  exception: (id: string) => `/app/exceptions/${id}`,
  ask: "/app/ask",
  bank: "/app/bank",
  ledger: "/app/ledger",
  journal: "/app/journal",
  runs: "/app/runs",
  settings: "/app/settings",
  guide: "/app/guide",
} as const;

/** Where a "kind:id" entity reference should take the reader. */
export function entityHref(ref: string): string {
  const { kind, id } = parseRef(ref);
  switch (kind as EntityKind | "exception") {
    case "settlement":
      return routes.settlement(id);
    case "exception":
      return routes.exception(id);
    case "bank":
      return `${routes.bank}?focus=${encodeURIComponent(id)}`;
    case "ledger":
      return `${routes.ledger}?focus=${encodeURIComponent(id)}`;
    case "payment":
    case "refund":
    case "recon_line":
    case "dispute":
    case "adjustment":
      return `${routes.settlements}?q=${encodeURIComponent(id)}`;
    default:
      return routes.overview;
  }
}
