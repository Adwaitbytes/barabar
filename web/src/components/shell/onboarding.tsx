"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "./wordmark";
import { ThemeToggle } from "./theme-toggle";
import { routes } from "@/lib/routes";
import { createRunAction } from "@/app/app/actions";

/**
 * Shown when the API is reachable but holds no runs (the hosted store is
 * ephemeral). One click loads the same synthetic month the fixtures came from.
 */
export function Onboarding() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    start(async () => {
      setError(null);
      const res = await createRunAction({
        source: "synthetic",
        n_orders: 600,
        seed: 42,
        profile: "d2c_fashion",
        name: "Demo month · d2c_fashion",
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(routes.overview);
      router.refresh();
    });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between px-6">
        <Link href={routes.landing} aria-label="Barabar home">
          <Wordmark />
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-6 pb-20">
        <div className="w-full max-w-xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">No runs yet</p>
          <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            Bring a month, or borrow one.
          </h1>
          <p className="mt-2 text-[14px] text-muted">
            A run reconciles Razorpay settlements, your bank statement and the sales ledger to the paise.
            Load the demo month to see a full close pack in under a second, or start from your own files.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="primary" size="lg" onClick={load} disabled={pending}>
              {pending ? "Reconciling…" : "Load demo month"}
              {!pending && <ArrowRight />}
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <Link href={routes.sources}>
                <Upload />
                Upload my files
              </Link>
            </Button>
          </div>
          {error && (
            <p role="alert" className="mt-4 rounded-md bg-critical-dim px-3 py-2 text-[13px] text-critical-fg">
              {error}
            </p>
          )}
          <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-line pt-6 text-[12.5px]">
            <div>
              <dt className="text-faint">Demo month</dt>
              <dd className="mono mt-0.5 text-text">600 orders · seed 42</dd>
            </div>
            <div>
              <dt className="text-faint">Deterministic</dt>
              <dd className="mono mt-0.5 text-text">same inputs → same hash</dd>
            </div>
            <div>
              <dt className="text-faint">Typed exceptions</dt>
              <dd className="mono mt-0.5 text-text">25 kinds, 5 auto-resolve</dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  );
}
