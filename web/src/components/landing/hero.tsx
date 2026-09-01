import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { HeroCanvas } from "./hero-canvas";
import { LandingNav } from "./nav";
import { ProofTyper } from "./proof-typer";
import { HEADLINE_AMOUNT } from "./proof-figures";

/**
 * The hero is a question and its answer. Forced dark: the signal field only
 * reads on ink, and the answer below is the same monospace ledger the app renders.
 */
export function Hero() {
  return (
    <section className="dark relative isolate overflow-hidden bg-bg text-text" aria-labelledby="hero-title">
      <HeroCanvas />
      <LandingNav />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-12 px-5 pb-24 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-16 lg:pb-32 lg:pt-28">
        <div className="fade-up max-w-2xl">
          <p className="mb-5 text-[12px] font-medium uppercase tracking-[0.14em] text-faint">
            AI finance controller for Razorpay merchants
          </p>
          <h1
            id="hero-title"
            className="text-[clamp(40px,7vw,96px)] font-semibold leading-[0.98] tracking-[-0.04em] text-text"
          >
            Why did{" "}
            <span className="mono whitespace-nowrap font-medium tracking-[-0.02em]">
              {HEADLINE_AMOUNT}
            </span>{" "}
            land in my bank?
          </h1>
          <p className="mt-7 max-w-lg text-[16px] leading-relaxed text-muted sm:text-[17px]">
            Barabar reconciles Razorpay settlements, the bank statement and the sales ledger to
            the paise. Every link names the rule that made it. Every unmatched rupee gets a typed
            exception. Deterministic where money is decided, AI only on the tail.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild variant="primary" size="lg">
              <Link href={routes.overview}>
                Open the close pack
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <a href="#determinism">Read how matching works</a>
            </Button>
          </div>
          <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6 text-[12px] text-muted">
            <div>
              <dt className="text-faint">Money</dt>
              <dd className="mono mt-0.5 text-text">integer paise</dd>
            </div>
            <div>
              <dt className="text-faint">Matching</dt>
              <dd className="mono mt-0.5 text-text">3 tiers, no LLM</dd>
            </div>
            <div>
              <dt className="text-faint">Replay</dt>
              <dd className="mono mt-0.5 text-text">same hash</dd>
            </div>
          </dl>
        </div>
        <div className="fade-up [animation-delay:160ms]">
          <ProofTyper />
          <p className="mt-3 text-[12px] text-faint">
            This is the exact shape the app renders for every settlement. Nothing in it is estimated.
          </p>
        </div>
      </div>
    </section>
  );
}
