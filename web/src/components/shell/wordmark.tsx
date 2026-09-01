import { cn } from "@/lib/utils";

/** Two equal bars: "barabar" is Hindi for "equal". The mark is the thesis. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-6", className)}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
    >
      <path d="M4 9.5h16" />
      <path d="M4 14.5h16" />
    </svg>
  );
}

export function Wordmark({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-text", className)}>
      <Mark className={size === "lg" ? "size-7" : "size-5"} />
      <span
        className={cn(
          "font-semibold tracking-[-0.02em]",
          size === "lg" ? "text-xl" : "text-[15px]",
        )}
      >
        barabar
      </span>
    </span>
  );
}
