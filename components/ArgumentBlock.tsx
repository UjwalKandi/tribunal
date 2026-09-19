"use client";

import type { Role } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { useTypewriter } from "@/hooks/useTypewriter";
import { CitedText } from "@/components/CitedText";

interface ArgumentBlockProps {
  role: Role;
  body: string;
  active: boolean;
  deliberating: boolean;
  complete: boolean;
  /** Role-specific detail rendered under the body once the typewriter finishes. */
  children?: React.ReactNode;
}

const roleStyles: Record<Role, { label: string; rule: string; caret: string }> = {
  PROSECUTION: {
    label: "Office of the Prosecution",
    rule: "bg-tribunal-prosecution",
    caret: "bg-tribunal-prosecution",
  },
  DEFENSE: {
    label: "Office of the Defense",
    rule: "bg-tribunal-defense",
    caret: "bg-tribunal-defense",
  },
  JUDGE: {
    label: "Presiding Judge",
    rule: "bg-tribunal-authority",
    caret: "bg-tribunal-authority",
  },
};

export function ArgumentBlock({
  role,
  body,
  active,
  deliberating,
  complete,
  children,
}: ArgumentBlockProps) {
  const { displayed, done } = useTypewriter(body, active && !complete, 35);
  const text = complete ? body : displayed;
  const style = roleStyles[role];

  if (!active && !complete) return null;

  return (
    <section className="relative pl-5">
      {/* Full-height accent rule rather than a boxed card */}
      <span className={cn("absolute bottom-0 left-0 top-0 w-0.5", style.rule)} />

      <div className="rule-label mb-3">
        <span>{style.label}</span>
      </div>

      {deliberating && !complete && text.length === 0 && (
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-tribunal-muted">
          Deliberating
          <span className="animate-pulse">…</span>
        </p>
      )}

      <p className="max-w-[72ch] whitespace-pre-wrap font-serif text-[15px] leading-[1.65] text-tribunal-text">
        <CitedText text={text} />
        {active && !done && !complete && (
          <span
            className={cn("ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.15em] animate-pulse", style.caret)}
          />
        )}
      </p>

      {complete && children}
    </section>
  );
}
