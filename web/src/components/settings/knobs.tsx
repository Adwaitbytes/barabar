import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Hash } from "@/components/domain/chips";
import { fmtDate, weekday } from "@/lib/format";
import {
  CALENDAR_DEFAULTS,
  GST_ON_FEE_BPS,
  KNOB_GROUPS,
  RATE_CARD,
  RBI_HOLIDAYS_2026,
  ROUNDING_POLICY,
  type Knob,
} from "./rules";

function knobValue(k: Knob): string {
  switch (k.unit) {
    case "paise":
      return k.value === 0 ? "exact" : `${k.value} p`;
    case "ratio":
      return k.value.toFixed(2);
    case "working_days":
      return `${k.value} working day${k.value === 1 ? "" : "s"}`;
    case "days":
      return `${k.value} day${k.value === 1 ? "" : "s"}`;
    case "count":
      return String(k.value);
    case "chars":
      return `${k.value} chars`;
    case "score":
      return `≥ ${k.value}`;
  }
}

export function KnobGroups({ configHash }: { configHash: string }) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {KNOB_GROUPS.map((g) => (
        <Card key={g.title}>
          <CardHeader>
            <div>
              <CardTitle className="text-text">{g.title}</CardTitle>
              <p className="mt-0.5 text-[12px] text-faint">{g.blurb}</p>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <dl className="divide-y divide-line">
              {g.knobs.map((k, i) => (
                <div
                  key={k.key}
                  style={{ "--i": i } as React.CSSProperties}
                  className="cascade grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-1 py-3"
                >
                  <dt className="text-[13px] font-medium text-text">
                    {k.label}
                    <code className="ml-2 text-[11px] text-faint">{k.key}</code>
                  </dt>
                  <dd className="mono text-right text-[13.5px] text-text">{knobValue(k)}</dd>
                  <p className="col-span-2 text-[12.5px] text-muted">{k.meaning}</p>
                </div>
              ))}
            </dl>
            <p className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-faint">
              Part of config_hash <Hash value={configHash} />
            </p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export function RateCardView({ configHash }: { configHash: string }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-text">Rate card</CardTitle>
          <p className="mt-0.5 text-[12px] text-faint">
            Per method, never a single number. Fee = amount × rate, GST = fee × {GST_ON_FEE_BPS / 100}%, {ROUNDING_POLICY.replace(/_/g, " ").toLowerCase()}.
          </p>
        </div>
      </CardHeader>
      <CardBody className="pt-0">
        <dl className="divide-y divide-line">
          {RATE_CARD.map((r) => (
            <div key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 py-2.5">
              <dt className="text-[13px] text-text">
                {r.label}
                {r.note && <span className="ml-2 text-[11.5px] text-faint">{r.note}</span>}
              </dt>
              <dd className="mono text-right text-[13.5px]">
                <span className={cn(r.bps === 0 ? "text-settled-fg" : "text-text")}>{(r.bps / 100).toFixed(2)}%</span>
                <span className="ml-1.5 text-[11px] text-faint">{r.bps} bps</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-faint">
          Part of config_hash <Hash value={configHash} />
        </p>
      </CardBody>
    </Card>
  );
}

export function CalendarView({ configHash, asOf }: { configHash: string; asOf: string }) {
  const nationwide = RBI_HOLIDAYS_2026.filter((h) => h.scope === "nationwide").length;
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-text">Settlement calendar</CardTitle>
          <p className="mt-0.5 text-[12px] text-faint">
            T+{CALENDAR_DEFAULTS.cycle_working_days} working days from capture, IST cutoff {CALENDAR_DEFAULTS.cutoff_ist}, all weekends closed.
            {" "}{nationwide} nationwide RBI closures in 2026; state closures are opt-in and off.
          </p>
        </div>
      </CardHeader>
      <CardBody className="pt-0">
        <ol className="divide-y divide-line">
          {RBI_HOLIDAYS_2026.map((h) => {
            const past = h.date < asOf;
            return (
              <li
                key={h.date}
                className={cn(
                  "grid grid-cols-[92px_36px_minmax(0,1fr)_auto] items-center gap-x-3 py-2 text-[13px]",
                  past && "text-muted",
                )}
              >
                <span className="mono text-[12.5px]">{fmtDate(h.date)}</span>
                <span className="text-[11.5px] text-faint">{weekday(h.date)}</span>
                <span className={cn("truncate", h.scope === "state" && "text-muted")} title={h.name}>
                  {h.name}
                </span>
                <Badge tone={h.scope === "nationwide" ? "signal" : "neutral"}>{h.scope}</Badge>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-faint">
          Part of config_hash <Hash value={configHash} />
        </p>
      </CardBody>
    </Card>
  );
}
