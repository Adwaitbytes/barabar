import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight, ExternalLink } from "lucide-react";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { PageHeader, SectionTitle } from "@/components/shell/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, Th, Td, TdNum } from "@/components/ui/table";

export const metadata: Metadata = { title: "How Barabar works" };

const REPO = "https://github.com/Adwaitbytes/barabar";
const API_DOCS = "https://barabar-api.vercel.app/docs";

/* ---------- small building blocks, all on the app's tokens ---------- */

function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("max-w-[68ch] text-[14px] leading-[1.65] text-text [&_p]:mb-3", className)}>{children}</div>;
}

function Box({ title, body, tone = "neutral", className }: { title: string; body?: string; tone?: "neutral" | "settled" | "open" | "signal" | "critical"; className?: string }) {
  const border = {
    neutral: "border-line",
    settled: "border-settled/50",
    open: "border-open/50",
    signal: "border-signal/50",
    critical: "border-critical/50",
  }[tone];
  return (
    <div className={cn("rounded-md border bg-surface px-3 py-2.5 text-[12.5px] leading-snug", border, className)}>
      <div className="font-medium text-text">{title}</div>
      {body && <div className="mt-0.5 text-muted">{body}</div>}
    </div>
  );
}

function Arrow({ down = false }: { down?: boolean }) {
  const Icon = down ? ArrowDown : ArrowRight;
  return (
    <div className="flex items-center justify-center text-faint" aria-hidden>
      <Icon className="size-4" />
    </div>
  );
}

function Term({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] gap-3 border-b border-line py-2.5 last:border-0">
      <dt className="text-[13px] font-medium text-text">{k}</dt>
      <dd className="text-[13.5px] text-muted">{children}</dd>
    </div>
  );
}

function Step({ n, title, where, children }: { n: number; title: string; where: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[40px_minmax(0,1fr)] gap-4 border-t border-line py-5 first:border-0">
      <div className="mono flex size-9 items-center justify-center rounded-full border border-line bg-surface text-[13px] font-medium text-signal-fg">
        {n}
      </div>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-text">{title}</h3>
        <div className="mt-1 max-w-[70ch] text-[13.5px] leading-relaxed text-muted [&_b]:font-medium [&_b]:text-text">{children}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-faint">{where}</div>
      </div>
    </li>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-surface px-4 py-3 hairline">
      <div className="mono text-[20px] font-medium tabular-nums text-text">{value}</div>
      <div className="mt-0.5 text-[12px] text-muted">{label}</div>
    </div>
  );
}

/* ---------- the page ---------- */

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        eyebrow="Learn"
        title="How Barabar works, explained from zero"
        description="What this product is, the problem it solves, how a run flows through it, where the AI is and is not, and a guided tour of every screen. Written for someone who has never seen Razorpay or a reconciliation."
        actions={
          <div className="flex items-center gap-2">
            <Link href={API_DOCS} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-[12.5px] text-text hover:bg-raised">
              API docs <ExternalLink className="size-3 text-faint" />
            </Link>
            <Link href={REPO} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-[12.5px] text-text hover:bg-raised">
              Source <ExternalLink className="size-3 text-faint" />
            </Link>
          </div>
        }
      />

      {/* contents */}
      <nav aria-label="On this page" className="mb-8 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
        {[
          ["what", "What it is"],
          ["problem", "The problem"],
          ["words", "Words to know"],
          ["arch", "Architecture"],
          ["flow", "How a run works"],
          ["trust", "Where AI is and is not"],
          ["tour", "Guided tour"],
          ["useful", "Why it matters"],
          ["numbers", "Numbers"],
          ["run", "Run it yourself"],
          ["script", "5-minute demo"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="hover:text-text">
            {label}
          </a>
        ))}
      </nav>

      <div className="space-y-12">
        {/* WHAT */}
        <section id="what">
          <SectionTitle>What it is</SectionTitle>
          <Prose>
            <p className="text-[16px] leading-[1.55] text-text">
              Barabar is an <b>AI finance controller for businesses that collect money through Razorpay</b>. It takes three things a merchant already has, Razorpay&apos;s settlement records, the bank statement and the sales ledger, matches every rupee across all three, explains every rupee it cannot match, and drafts the accounting entries.
            </p>
            <p>
              It answers the question every founder asks at month end: <b>&ldquo;I sold ₹2,10,000 this week. Why did ₹1,83,412 land in my bank?&rdquo;</b>, to the paise, with a proof. <i>Barabar</i> (बराबर) means &ldquo;exactly equal&rdquo;. When the residual is ₹0.00, the books are barabar.
            </p>
          </Prose>
          <div className="mt-4 rounded-lg border-l-2 border-signal bg-signal-dim/60 px-4 py-3 text-[13.5px] text-text">
            Built for Razorpay&apos;s AI Buildathon, Track 04 (AI Finance Controller). The brief asks for an agent that &ldquo;closes one finance-ops loop across a 50+ record batch, reporting its match rate and the exceptions it could not resolve.&rdquo; Barabar&apos;s match rates are measured against known ground truth, not asserted.
          </div>
        </section>

        {/* PROBLEM */}
        <section id="problem">
          <SectionTitle>The problem, in one story</SectionTitle>
          <Prose>
            <p>
              A clothing brand&apos;s customers pay ₹2,10,000 through Razorpay in a week. Razorpay does not send that money order by order. Every working day it bundles hundreds of payments into one <b>settlement</b> and sends one lump bank transfer. Before it lands, several things are quietly subtracted or shifted:
            </p>
          </Prose>
          <div className="overflow-hidden rounded-lg bg-surface hairline">
            <Table>
              <THead>
                <tr>
                  <Th>What happens</Th>
                  <Th>Why</Th>
                  <Th className="text-right">Effect</Th>
                </tr>
              </THead>
              <tbody className="[&_tr]:border-b [&_tr]:border-line [&_tr:last-child]:border-0">
                <tr><Td>Gateway fee (MDR)</Td><Td className="whitespace-normal text-muted">About 2% on cards and net-banking, 0% on UPI</Td><TdNum>−₹3,420.00</TdNum></tr>
                <tr><Td>18% GST on that fee</Td><Td className="whitespace-normal text-muted">Tax on the fee, not on the sale. Claimable back as input credit</Td><TdNum>−₹615.60</TdNum></tr>
                <tr><Td>Refunds netted</Td><Td className="whitespace-normal text-muted">Refunds are deducted from a later settlement, never paid separately</Td><TdNum>−₹18,452.40</TdNum></tr>
                <tr><Td>A chargeback</Td><Td className="whitespace-normal text-muted">A customer disputed a payment; the bank pulled the money back</Td><TdNum>−₹4,200.00</TdNum></tr>
                <tr><Td>A manual adjustment</Td><Td className="whitespace-normal text-muted">Razorpay credited ₹100 for a fee waiver</Td><TdNum>+₹100.00</TdNum></tr>
                <tr><Td className="font-medium">Lands in the bank</Td><Td className="whitespace-normal text-muted">One NEFT credit, two working days later, with a 16-character reference (UTR)</Td><TdNum className="font-medium text-text">₹1,83,412.00</TdNum></tr>
              </tbody>
            </Table>
          </div>
          <Prose className="mt-4">
            <p>
              Now multiply by 22 settlement days a month, a bank export that cuts the reference number off after 50 characters, refunds that appear a week after the sale, a public holiday that shifts a payout, and a Tally ledger edited by hand. A finance person spends days every month on this and still carries a line called &ldquo;unexplained&rdquo;. <b>Barabar deletes that line.</b>
            </p>
          </Prose>
        </section>

        {/* WORDS */}
        <section id="words">
          <SectionTitle>Words you need (and nothing more)</SectionTitle>
          <Card interactive={false}>
            <CardBody className="pt-2">
              <dl>
                <Term k="Razorpay">The payment gateway. Customers pay through it; it pays the merchant later.</Term>
                <Term k="Settlement">One batch payout from Razorpay to the merchant&apos;s bank, covering many payments net of fees, refunds and chargebacks.</Term>
                <Term k="UTR">The bank&apos;s reference for a transfer (16 characters NEFT, 22 RTGS, 12 digits IMPS). The strongest key for matching a settlement to a bank credit.</Term>
                <Term k="Recon line">Razorpay&apos;s per-payment breakdown inside a settlement: gross, fee, tax and the net credited.</Term>
                <Term k="Ledger">The merchant&apos;s own sales book (Tally, Zoho, a spreadsheet): invoices and credit notes.</Term>
                <Term k="Reconciliation">Proving that what Razorpay says, what the bank shows and what the books record are the same money.</Term>
                <Term k="Exception">Anything that did not match cleanly. Each gets a type (23 of them), an amount, a confidence and a suggested action.</Term>
                <Term k="Proof tree">The chain from one bank credit down to every payment, fee, refund and chargeback inside it, with the rule that made each link.</Term>
                <Term k="Tiers A / B / C / D">The four matching strategies: exact keys (A), derived netting (B), fuzzy proposals (C), the AI investigator (D). Only A and B link automatically.</Term>
              </dl>
            </CardBody>
          </Card>
        </section>

        {/* ARCHITECTURE */}
        <section id="arch">
          <SectionTitle>Architecture</SectionTitle>
          <Prose>
            <p>Three sources go in. Deterministic code does all the matching and money arithmetic. The AI only reads the leftovers and drafts words. Everything that comes out is replayable: same inputs and settings always give the same result, and the result carries a hash to prove it.</p>
          </Prose>
          <Card interactive={false} className="overflow-x-auto">
            <CardBody className="pt-5">
              <div className="min-w-[860px]">
                {/* row 1: sources → ingest */}
                <div className="grid grid-cols-[1fr_32px_1fr] items-center gap-2">
                  <div className="grid gap-2">
                    <Box title="Razorpay" body="payments · refunds · disputes · settlements (API, webhooks or recon JSON)" />
                    <Box title="Bank statement" body="HDFC · ICICI · SBI · Axis · Kotak, CSV or XLSX, layout auto-detected" />
                    <Box title="Sales ledger" body="CSV in a documented schema, or a Tally Day Book XML export" />
                  </div>
                  <Arrow />
                  <Box tone="signal" title="Ingest + normalise" body="Every amount becomes integer paise; every timestamp UTC; duplicates removed; inputs hashed." />
                </div>
                <div className="my-2 grid grid-cols-[1fr_32px_1fr]"><div /><div /><Arrow down /></div>
                {/* row 2: tiers */}
                <div className="grid grid-cols-[1fr_32px_1fr_32px_1fr] items-stretch gap-2">
                  <Box tone="settled" title="Tier A · exact keys" body="UTR = settlement UTR · settlement id in narration · payment id or receipt in ledger. Confidence 1.0." />
                  <Arrow />
                  <Box tone="settled" title="Tier B · derived" body="Batch net = bank credit · gross − fee − 18% GST · refund netting · split UTRs · partial batches · holiday shifts · failed-and-retried." />
                  <Arrow />
                  <Box tone="open" title="Tier C · fuzzy" body="UTR prefix, amount + date + narration similarity, ledger tolerance. Capped at 0.85: proposals only, never auto-linked." />
                </div>
                <div className="my-2 grid grid-cols-[1fr_32px_1fr_32px_1fr]"><div /><div /><div /><div /><Arrow down /></div>
                {/* row 3: exceptions → investigator; proof + outputs */}
                <div className="grid grid-cols-[1fr_32px_1fr_32px_1fr] items-stretch gap-2">
                  <Box tone="settled" title="Proof trees + hashes" body="bank credit ← settlement ← lines, every node tagged with its rule id. outputs_hash stamped." />
                  <div />
                  <Box tone="critical" title="Typed exceptions" body="23 types, each with amount, confidence, reason and suggested action. Unexplained = open items below the threshold." />
                  <Arrow />
                  <Box tone="signal" title="Tier D · AI investigator" body="Reads through read-only tools, proposes a hypothesis with cited evidence, names the alternative it rejected. Cannot write." />
                </div>
                <div className="my-2 grid grid-cols-[1fr_32px_1fr_32px_1fr]"><Arrow down /><div /><Arrow down /><div /><div /></div>
                <div className="grid grid-cols-[1fr_32px_1fr_32px_1fr] gap-2">
                  <Box title="This web app" body="close pack · settlements · proof viewer · exception inbox · ask the books · runs & audit" />
                  <div />
                  <Box title="Exports" body="journal CSV · Tally Prime XML · controller's memo · exceptions CSV · evals report" />
                  <div />
                  <Box title="Evals" body="a synthetic-month generator injects every exception type with ground truth; make evals scores the run against it" />
                </div>
              </div>
            </CardBody>
          </Card>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Card interactive={false}><CardHeader><CardTitle>Backend</CardTitle></CardHeader><CardBody className="text-[13px] text-muted">Python 3.12 + FastAPI. Matching, money math, calendar and exceptions live in a pure <span className="mono text-text">core</span> package with no other dependencies. Postgres in production, SQLite on a laptop.</CardBody></Card>
            <Card interactive={false}><CardHeader><CardTitle>Frontend</CardTitle></CardHeader><CardBody className="text-[13px] text-muted">This Next.js app. If the API is unreachable it falls back to a captured demo month so the product still demos.</CardBody></Card>
            <Card interactive={false}><CardHeader><CardTitle>AI</CardTitle></CardHeader><CardBody className="text-[13px] text-muted">Claude through tool calls. A strong model for investigation and answers; a cheap model only extracts fields from unusual bank text, and the grammar re-checks it.</CardBody></Card>
            <Card interactive={false}><CardHeader><CardTitle>Simulator</CardTitle></CardHeader><CardBody className="text-[13px] text-muted">Razorpay&apos;s test mode does not generate settlements, so Barabar applies Razorpay&apos;s documented rules to real test-mode entities and says so in the docs.</CardBody></Card>
          </div>
        </section>

        {/* FLOW */}
        <section id="flow">
          <SectionTitle>How one run works</SectionTitle>
          <Card interactive={false}>
            <CardBody className="pt-4">
              <ol className="grid gap-2 md:grid-cols-2">
                {[
                  ["Load a month", "Razorpay entities, the bank statement and the ledger are read, normalised and hashed (inputs_hash)."],
                  ["Tier A", "Exact keys: UTR, settlement id, payment id, receipt. These links are certain."],
                  ["Tier B", "Derived facts: a batch's lines net to its bank credit; each payment decomposes as gross − fee − GST; refunds and chargebacks net; split and partial batches are chained; holiday shifts are recognised."],
                  ["Tier C", "Fuzzy candidates for what is left, a truncated UTR prefix, an exact amount on the expected day. Proposals only."],
                  ["Classify", "Every residual becomes one of 23 typed exceptions with a confidence and a suggested action."],
                  ["Prove + hash", "A proof tree per settlement; metrics; the outputs_hash. Re-running gives the same hash."],
                  ["Investigate (on demand)", "The AI reads an open exception through read-only tools and returns a hypothesis card. A person accepts or resolves; the click is audited."],
                  ["Close", "Journal entries, Tally XML, the controller's memo and the exceptions list are exported."],
                ].map(([t, b], i) => (
                  <li key={t} className="flex gap-3 rounded-md bg-raised/60 px-3 py-2.5">
                    <span className="mono mt-0.5 text-[12px] text-signal-fg">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <div className="text-[13px] font-medium text-text">{t}</div>
                      <div className="text-[12.5px] text-muted">{b}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
          <Prose className="mt-4">
            <p>A finished proof for one bank credit looks like this. Every line names the rule that produced it:</p>
          </Prose>
          <pre className="mono overflow-x-auto rounded-lg bg-sunken px-4 py-3 text-[12px] leading-[1.6] text-text hairline">
{`Bank credit  ₹1,83,412.00  HDFC  14-Aug-2026  UTR HDFCN26226004471           [A1-UTR-EXACT]
└─ Settlement setl_Q1x…  net ₹1,83,412.00  processed 14-Aug 06:12          [B1-BATCH-NET ✓ residual ₹0]
   ├─ 287 payments  gross ₹2,10,000.00  fee ₹3,420.00  GST ₹615.60          [B2-GROSS-FEE-TAX-DECOMP ✓]
   ├─ 6 refunds     −₹18,452.40                                             [B3-REFUND-NET]
   ├─ 1 dispute     −₹4,200.00  (opened 09-Aug, respond by 23-Aug)          [DISPUTE_DEBIT]
   ├─ 1 adjustment  +₹100.00  "manual credit"                               [ADJUSTMENT]
   └─ Σ = ₹1,83,412.00`}
          </pre>
        </section>

        {/* TRUST */}
        <section id="trust">
          <SectionTitle>Where AI is, and where it is not</SectionTitle>
          <Prose>
            <p>Most &ldquo;AI finance&rdquo; tools let a language model decide what matches what. Barabar never does. Money decisions are code with tests; the AI works only on the tail, and every number it writes is checked against the tool results it actually received (<b>NumberGuard</b>). If it tries to round ₹1,83,412.37 to ₹1,83,412, the message is blocked.</p>
          </Prose>
          <div className="overflow-hidden rounded-lg bg-surface hairline">
            <Table>
              <THead>
                <tr><Th>Task</Th><Th>Deterministic code</Th><Th>AI</Th></tr>
              </THead>
              <tbody className="[&_tr]:border-b [&_tr]:border-line [&_tr:last-child]:border-0">
                <tr><Td className="whitespace-normal">Deciding two records match</Td><Td><Badge tone="settled">always</Badge></Td><Td><Badge tone="critical">never</Badge></Td></tr>
                <tr><Td className="whitespace-normal">Fee, GST and net arithmetic; calendar and cut-offs</Td><Td><Badge tone="settled">always</Badge></Td><Td><Badge tone="critical">never</Badge></Td></tr>
                <tr><Td className="whitespace-normal">Reading bank narration in known layouts</Td><Td><Badge tone="settled">grammar per bank</Badge></Td><Td className="whitespace-normal text-muted">unknown layouts only, then re-validated by the grammar</Td></tr>
                <tr><Td className="whitespace-normal">Classifying an exception into one of 23 types</Td><Td><Badge tone="settled">always</Badge></Td><Td><Badge tone="critical">never</Badge></Td></tr>
                <tr><Td className="whitespace-normal">Investigating an open exception</Td><Td><Badge tone="neutral">, </Badge></Td><Td className="whitespace-normal text-muted">read-only tools, no writes; a human accepts</Td></tr>
                <tr><Td className="whitespace-normal">Explaining a proof in words; drafting the memo</Td><Td className="text-muted">the facts</Td><Td className="whitespace-normal text-muted">the prose, every number guarded</Td></tr>
              </tbody>
            </Table>
          </div>
          <div className="mt-4 rounded-lg border-l-2 border-open bg-open-dim/60 px-4 py-3 text-[13.5px] text-text">
            Three rules: money math is deterministic; the LLM works the tail and never mutates a match; every run is replayable. An honest failure log (<span className="mono">docs/FAILURES.md</span>, ten real entries) records what broke and what changed.
          </div>
        </section>

        {/* TOUR */}
        <section id="tour">
          <SectionTitle>Guided tour: every screen, in order</SectionTitle>
          <Prose>
            <p>Use the sidebar or the links below. If the app shows no runs yet, the first step creates one.</p>
          </Prose>
          <ol className="list-none p-0">
            <Step n={1} title="Load a month" where={<><Link className="mono text-signal-fg hover:underline" href={routes.overview}>/app</Link><span>·</span><Link className="mono text-signal-fg hover:underline" href={routes.sources}>/app/sources</Link> to upload your own Razorpay JSON, bank CSV/XLSX and ledger CSV</>}>
              Click <b>Load demo month</b>. It builds a realistic 600-payment August for a fashion brand with 23 kinds of problems deliberately injected, and reconciles it in well under a second.
            </Step>
            <Step n={2} title="Read the Close Pack" where={<Link className="mono text-signal-fg hover:underline" href={routes.overview}>/app</Link>}>
              Three numbers at the top: <b>Gross captured</b>, <b>Explained</b>, <b>Unexplained</b>. Then the settlement calendar (expected credit per day versus what the bank shows), the settlement table with a status chip per batch, and the exception queue. The four hashes under the title prove the run is replayable. 92.5% explained on the demo month is honest: it contains a missing bank credit and manual adjustments that no rule can explain without a person.
            </Step>
            <Step n={3} title="Open a settlement's proof" where={<><Link className="mono text-signal-fg hover:underline" href={routes.settlements}>/app/settlements</Link><span>→ click a row</span></>}>
              The bank credit on top, the settlement under it, then groups: payments (gross, fee, GST, net), refunds, disputes, adjustments. Every node carries a rule badge such as <Badge tone="settled">A1-UTR-EXACT</Badge> or <Badge tone="settled">B1-BATCH-NET</Badge>, and the residual reads ₹0.00 when the batch foots. Try a <Badge tone="open">Proposed</Badge> row: the bank cut the reference number, so the match is a proposal at 0.72, not an automatic link.
            </Step>
            <Step n={4} title="Work the exception inbox" where={<Link className="mono text-signal-fg hover:underline" href={routes.exceptions}>/app/exceptions</Link>}>
              Each item has a type, an amount, a confidence, a one-line reason and a suggested action. Open one to see its evidence and the candidate link if there is one. Statuses: open, investigating, accepted, resolved, auto-resolved. Types you will meet: <span className="mono text-[12px]">NARRATION_TRUNCATED_UTR · MISSING_BANK_CREDIT · REFUND_NETTED · DISPUTE_DEBIT · TIMING_NOT_YET_SETTLED</span>.
            </Step>
            <Step n={5} title="Ask Barabar to investigate" where={<span>exception detail → Investigate</span>}>
              The AI reads through tools (the settlement, its recon lines, a bank search, the calendar, a calculator) and returns a hypothesis card: the type it proposes, its confidence, the evidence it cited (each hashed), a suggested action, and the alternative it rejected. It cannot change anything; you click <b>Accept</b> or <b>Resolve</b> with a note, and that click is logged. On the demo month it was right on 24 of 24 cases.
            </Step>
            <Step n={6} title="Ask the books" where={<Link className="mono text-signal-fg hover:underline" href={routes.ask}>/app/ask</Link>}>
              Ask &ldquo;How much GST input credit can I claim on Razorpay fees this month?&rdquo; The answer comes only from tool results, cites the settlements it used, and shows how many figures NumberGuard verified. If a figure cannot be verified, the answer is withheld and says so. Demo answer: ₹1,468.85 of ITC against ₹8,159.97 of fees.
            </Step>
            <Step n={7} title="Close the month" where={<Link className="mono text-signal-fg hover:underline" href={routes.journal}>/app/journal</Link>}>
              Download the journal entries (CSV, or Tally Prime XML that imports as vouchers), the controller&apos;s memo, the exceptions CSV and the HTML close pack. Bank, gateway charges, GST input, refunds and chargebacks are already split into the right ledgers.
            </Step>
            <Step n={8} title="Re-run and audit" where={<Link className="mono text-signal-fg hover:underline" href={routes.runs}>/app/runs</Link>}>
              <b>Re-run</b> reconciles the same inputs again and shows &ldquo;outputs identical&rdquo; with a diff of exceptions closed or opened. The audit trail is hash-chained: every link, exception, AI proposal and human click, in order, verifiable.
            </Step>
          </ol>
        </section>

        {/* USEFUL */}
        <section id="useful">
          <SectionTitle>Why it matters</SectionTitle>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[
              ["For the founder", "“Why is this credit smaller than I expected?” gets an answer in one click, with the arithmetic shown, instead of an hour with three spreadsheets."],
              ["For the accountant", "A close pack with only what still needs a human: matched items are done, exceptions are typed and prioritised, journal entries are drafted, the GST-on-fees credit is computed for GSTR-3B."],
              ["For the business", "Reconciliation is 40-50% of a small finance team's close cycle. Days of matching become seconds, and “unexplained” becomes a short, honest list."],
              ["For a judge", "Every metric is regenerable with one command against known ground truth. The AI is fenced to where it belongs. The failure log is real."],
            ].map(([t, b]) => (
              <Card key={t} interactive={false}>
                <CardHeader><CardTitle>{t}</CardTitle></CardHeader>
                <CardBody className="text-[13.5px] text-text">{b}</CardBody>
              </Card>
            ))}
          </div>
        </section>

        {/* NUMBERS */}
        <section id="numbers">
          <SectionTitle aside={<span className="text-[12px] text-faint">from <span className="mono">make evals</span>, against generator ground truth</span>}>Numbers you can quote</SectionTitle>
          <div className="overflow-hidden rounded-lg bg-surface hairline">
            <Table>
              <THead>
                <tr><Th>Month size</Th><Th className="text-right">Auto-match</Th><Th className="text-right">Precision (tiers A/B)</Th><Th className="text-right">Classification</Th><Th className="text-right">Wall clock</Th></tr>
              </THead>
              <tbody className="[&_tr]:border-b [&_tr]:border-line [&_tr:last-child]:border-0">
                <tr><Td>60 payments</Td><TdNum>100.0%</TdNum><TdNum>100%</TdNum><TdNum>100%</TdNum><TdNum>0.005 s</TdNum></tr>
                <tr><Td>600 payments (the demo)</Td><TdNum>99.94%</TdNum><TdNum>100%</TdNum><TdNum>100%</TdNum><TdNum>0.03 s</TdNum></tr>
                <tr><Td>6,000 payments</Td><TdNum>99.99%</TdNum><TdNum>100%</TdNum><TdNum>100%</TdNum><TdNum>0.55 s</TdNum></tr>
                <tr><Td>60,000 payments</Td><TdNum className="text-faint">, </TdNum><TdNum className="text-faint">, </TdNum><TdNum className="text-faint">, </TdNum><TdNum>5.4 s</TdNum></tr>
              </tbody>
            </Table>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat value="₹0" label="money wrongly auto-linked at tiers A/B, at every size" />
            <Stat value="24 / 24" label="investigator hypotheses correct on the demo month" />
            <Stat value="23" label="exception types, all injected and all detected" />
            <Stat value="171" label="automated tests, including property tests over random months" />
          </div>
        </section>

        {/* RUN */}
        <section id="run">
          <SectionTitle>Run it yourself</SectionTitle>
          <Prose>
            <p>Everything runs on a laptop with Python 3.12 and Node. No keys are needed for the deterministic parts; the AI features need an API key in <span className="mono">.env</span>.</p>
          </Prose>
          <pre className="mono overflow-x-auto rounded-lg bg-sunken px-4 py-3 text-[12.5px] leading-[1.7] text-text hairline">
{`git clone ${REPO} && cd barabar
make install          # uv venv + Python deps; pnpm install in web/
make demo             # reconcile a 600-payment month; prints the four hashes and the close pack
make evals            # regenerate every number above
make api              # FastAPI on :8000
cd web && BARABAR_API_URL=http://localhost:8000 pnpm dev   # this app on :3000`}
          </pre>
        </section>

        {/* SCRIPT */}
        <section id="script">
          <SectionTitle>A 5-minute demo script</SectionTitle>
          <Card interactive={false}>
            <CardBody className="pt-4">
              <ol className="space-y-3 text-[13.5px] text-text">
                {[
                  ["0:00", "The question", "Open the landing page. Read the headline aloud: “Why did ₹1,83,412 land in my bank?” Point at the proof tree in the hero: this is the answer, with the rules that produced it."],
                  ["0:40", "Load the month", "Open the app, click Load demo month. 600 payments, 22 settlements, three data sources, reconciled in a fraction of a second. Point at the four hashes: same inputs, same hash, every time."],
                  ["1:20", "One proof", "Click a matched settlement. Walk down: bank credit by exact UTR, batch nets to zero, payments minus 2% fee minus 18% GST on the fee, refunds netted, a chargeback. Every node names its rule."],
                  ["2:20", "Where AI is not", "Show the boundary table above. “No language model has ever decided a match here.” Open the Proposed settlement: the bank cut the reference number; the system proposed at 0.72 and refused to auto-link."],
                  ["3:00", "Where AI is", "Click Investigate on that exception: two pieces of cited evidence, the alternative it rejected, the human Accept button. Then Ask the books: “How much GST on fees can I claim this month?” and point at “2 figures verified”."],
                  ["4:00", "Close", "Download the Tally XML and the memo. Open Runs & audit: the chain of every decision, including the click you just made."],
                  ["4:40", "Honesty", "Show the open exceptions and name them: a missing bank credit, an unknown credit, adjustments to verify. Explained is 92.5% because those are genuinely unexplained until a person acts. Close on the failure log."],
                ].map(([t, h, b]) => (
                  <li key={t} className="grid grid-cols-[48px_minmax(0,1fr)] gap-3">
                    <span className="mono pt-0.5 text-[12px] text-signal-fg">{t}</span>
                    <div><span className="font-medium">{h}.</span> <span className="text-muted">{b}</span></div>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </section>
      </div>
    </div>
  );
}
