"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileJson2, FileSpreadsheet, FileText, Play, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { routes } from "@/lib/routes";
import { createRunAction, uploadRunAction } from "@/app/app/actions";
import { ActionNotice } from "@/components/exceptions/demo-notice";
import { SourceArt } from "./source-art";

const RAZORPAY_FILES = [
  "razorpay_payments.json",
  "razorpay_refunds.json",
  "razorpay_disputes.json",
  "razorpay_adjustments.json",
  "razorpay_settlements.json",
  "razorpay_settlement_recon.json",
];
const BANKS = ["HDFC", "ICICI", "SBI", "Axis", "Kotak", "RazorpayX"];
const PROFILES = [
  { value: "d2c_fashion", label: "D2C fashion (UPI-heavy, refunds, partial paise)" },
  { value: "saas", label: "SaaS (cards, larger tickets, few refunds)" },
];

type Slot = "razorpay" | "bank" | "ledger";

interface SourceSpec {
  slot: Slot;
  title: string;
  role: string;
  accept: string;
  multiple: boolean;
  icon: React.ElementType;
  art: "layers" | "nodes" | "flow";
  note: React.ReactNode;
}

const SOURCES: SourceSpec[] = [
  {
    slot: "razorpay",
    title: "Razorpay exports",
    role: "What Razorpay says it settled: payments, refunds, disputes, adjustments, settlements and the recon lines.",
    accept: ".json",
    multiple: true,
    icon: FileJson2,
    art: "layers",
    note: (
      <>
        Name each file like the API entity so it is recognised:{" "}
        {RAZORPAY_FILES.map((f) => (
          <code key={f} className="mr-1 text-[11px] text-muted">
            {f}
          </code>
        ))}
      </>
    ),
  },
  {
    slot: "bank",
    title: "Bank statement",
    role: "What actually landed. One CSV or XLSX export; the narration grammar per bank recovers UTRs, even when the export truncated them.",
    accept: ".csv,.xlsx,.xlsm",
    multiple: false,
    icon: FileSpreadsheet,
    art: "nodes",
    note: (
      <>
        Grammars for {BANKS.join(", ")}. A truncated UTR still matches on a ≥10-character prefix plus exact amount and date window, at reduced confidence.
      </>
    ),
  },
  {
    slot: "ledger",
    title: "Sales ledger",
    role: "What you invoiced. Tally or Zoho CSV with invoice number, receipt, date and gross.",
    accept: ".csv",
    multiple: false,
    icon: FileText,
    art: "flow",
    note: <>Matched to payments by receipt, then by amount and date. Orphans and duplicates become typed exceptions, never silent.</>,
  },
];

function defaultAsOf(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SourcesClient({ live }: { live: boolean }) {
  const router = useRouter();
  const [files, setFiles] = React.useState<Record<Slot, File[]>>({ razorpay: [], bank: [], ledger: [] });
  const [asOf, setAsOf] = React.useState(defaultAsOf);
  const [name, setName] = React.useState("");
  const [notice, setNotice] = React.useState<{ status?: number; message: string } | null>(null);
  const [pending, start] = React.useTransition();

  const [profile, setProfile] = React.useState("d2c_fashion");
  const [nOrders, setNOrders] = React.useState(600);
  const [seed, setSeed] = React.useState(42);
  const [synthNotice, setSynthNotice] = React.useState<{ status?: number; message: string } | null>(null);
  const [synthPending, startSynth] = React.useTransition();

  const total = files.razorpay.length + files.bank.length + files.ledger.length;

  function add(slot: Slot, list: FileList | null, multiple: boolean) {
    if (!list) return;
    const arr = Array.from(list);
    setFiles((f) => ({ ...f, [slot]: multiple ? [...f[slot], ...arr] : arr.slice(0, 1) }));
  }

  function remove(slot: Slot, i: number) {
    setFiles((f) => ({ ...f, [slot]: f[slot].filter((_, j) => j !== i) }));
  }

  function submit() {
    setNotice(null);
    const form = new FormData();
    form.set("as_of", asOf);
    if (name.trim()) form.set("name", name.trim());
    for (const f of files.razorpay) form.append("razorpay", f, f.name);
    if (files.bank[0]) form.set("bank", files.bank[0], files.bank[0].name);
    if (files.ledger[0]) form.set("ledger", files.ledger[0], files.ledger[0].name);
    start(async () => {
      const res = await uploadRunAction(form);
      if (!res.ok) setNotice({ status: res.status, message: res.error });
      else router.push(routes.overview);
    });
  }

  function generate() {
    setSynthNotice(null);
    startSynth(async () => {
      const res = await createRunAction({
        source: "synthetic",
        profile,
        n_orders: nOrders,
        seed,
        name: name.trim() || undefined,
      });
      if (!res.ok) setSynthNotice({ status: res.status, message: res.error });
      else router.push(routes.overview);
    });
  }

  return (
    <div className="space-y-8">
      {!live && (
        <ActionNotice
          status={0}
          message=""
        />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {SOURCES.map((s) => (
          <DropCard
            key={s.slot}
            spec={s}
            files={files[s.slot]}
            onAdd={(list) => add(s.slot, list, s.multiple)}
            onRemove={(i) => remove(s.slot, i)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg bg-surface p-4 hairline shadow-1">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="as_of" className="text-[12px] font-medium text-muted">
            As of
          </label>
          <Input id="as_of" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-44" />
        </div>
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <label htmlFor="run_name" className="text-[12px] font-medium text-muted">
            Run name
          </label>
          <Input id="run_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="August 2026 close" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12.5px] text-muted">
            {total === 0 ? "No files yet" : `${total} file${total > 1 ? "s" : ""} staged`}
          </span>
          <Button variant="primary" disabled={pending || total === 0 || !asOf} onClick={submit}>
            <Play /> {pending ? "Reconciling…" : "Run reconciliation"}
          </Button>
        </div>
        {notice && <ActionNotice status={notice.status} message={notice.message} className="w-full" />}
      </div>

      <div className="rounded-lg bg-surface p-5 hairline shadow-1">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-[14px] font-semibold">Or generate a synthetic month</h2>
          <Badge tone="outline">seeded, deterministic</Badge>
        </div>
        <p className="mb-4 text-[12.5px] text-muted">
          Same seed, same month, same outputs hash. Useful for demos and for proving a rule change moved exactly the exceptions you meant.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex min-w-64 flex-col gap-1.5">
            <label htmlFor="profile" className="text-[12px] font-medium text-muted">
              Merchant profile
            </label>
            <NativeSelect id="profile" value={profile} onChange={(e) => setProfile(e.target.value)}>
              {PROFILES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="n_orders" className="text-[12px] font-medium text-muted">
              Orders
            </label>
            <Input
              id="n_orders"
              type="number"
              min={10}
              max={20000}
              value={nOrders}
              onChange={(e) => setNOrders(Math.max(10, Number(e.target.value) || 0))}
              className="w-28 mono"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="seed" className="text-[12px] font-medium text-muted">
              Seed
            </label>
            <Input id="seed" type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value) || 0)} className="w-28 mono" />
          </div>
          <Button disabled={synthPending} onClick={generate}>
            {synthPending ? "Generating…" : "Generate and reconcile"}
          </Button>
        </div>
        {synthNotice && <ActionNotice status={synthNotice.status} message={synthNotice.message} className="mt-4" />}
      </div>
    </div>
  );
}

function DropCard({
  spec,
  files,
  onAdd,
  onRemove,
}: {
  spec: SourceSpec;
  files: File[];
  onAdd: (list: FileList | null) => void;
  onRemove: (i: number) => void;
}) {
  const [over, setOver] = React.useState(false);
  const inputId = `file-${spec.slot}`;
  return (
    <section className="card-lift flex flex-col rounded-lg bg-surface p-4 hairline shadow-1">
      <SourceArt variant={spec.art} />
      <div className="mt-3 flex items-center gap-2">
        <spec.icon className="size-4 text-faint" strokeWidth={1.75} />
        <h2 className="text-[14px] font-semibold">{spec.title}</h2>
        {files.length > 0 && <Badge tone="settled">{files.length}</Badge>}
      </div>
      <p className="mt-1 text-[12.5px] text-muted">{spec.role}</p>

      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          onAdd(e.dataTransfer.files);
        }}
        className={cn(
          "mt-3 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed px-3 py-5 text-center transition-colors",
          over
            ? "border-signal bg-signal-dim/40 shadow-[0_0_0_4px_color-mix(in_oklab,var(--signal)_22%,transparent),0_0_32px_-6px_var(--signal)] scale-[1.01]"
            : "border-line-strong hover:bg-raised",
        )}
      >
        <UploadCloud className="size-5 text-faint" strokeWidth={1.5} />
        <span className="text-[12.5px] text-text">Drop {spec.multiple ? "files" : "a file"} or click to choose</span>
        <span className="text-[11px] text-faint">{spec.accept.replace(/\./g, "").replace(/,/g, " · ")}</span>
        <input
          id={inputId}
          type="file"
          accept={spec.accept}
          multiple={spec.multiple}
          className="sr-only"
          onChange={(e) => {
            onAdd(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-md bg-raised px-2 py-1 text-[12px]">
              <code className="truncate">{f.name}</code>
              <span className="ml-auto shrink-0 text-faint">{(f.size / 1024).toFixed(0)} KB</span>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onRemove(i)} className="text-faint hover:text-text">
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11.5px] leading-relaxed text-faint">{spec.note}</p>
    </section>
  );
}
