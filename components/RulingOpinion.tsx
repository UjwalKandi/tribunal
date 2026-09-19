"use client";

import type { RulingRecord } from "@/lib/schemas";
import { useTypewriter } from "@/hooks/useTypewriter";
import { CitedText } from "@/components/CitedText";
import { Seal } from "@/components/Seal";
import { cn } from "@/lib/utils";

interface RulingOpinionProps {
  ruling: RulingRecord | null;
  active: boolean;
  complete: boolean;
}

export function RulingOpinion({ ruling, active, complete }: RulingOpinionProps) {
  const { displayed, done } = useTypewriter(ruling?.opinion ?? "", active && !complete, 35);

  if (!ruling || (!active && !complete)) return null;

  const text = complete ? ruling.opinion : displayed;
  const lowConfidence = ruling.confidence < 0.7;

  return (
    <section className="relative pl-5">
      <span className="absolute bottom-0 left-0 top-0 w-0.5 bg-tribunal-authority" />

      {/* Faint seal behind the opinion — a document cue, not decoration. */}
      <Seal
        size={190}
        className="pointer-events-none absolute right-6 top-10 text-tribunal-authority opacity-[0.035]"
      />

      <div className="rule-label mb-3">
        <span>Ruling of the Tribunal</span>
      </div>

      <div className="mb-4 flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <span className="font-mono text-[13px] uppercase tracking-[0.2em] text-tribunal-authority">
          {ruling.verdict}
        </span>
        <span
          className={cn(
            "font-mono text-[11px] tabular-nums",
            lowConfidence ? "text-tribunal-prosecution" : "text-tribunal-muted",
          )}
        >
          Confidence {(ruling.confidence * 100).toFixed(0)}%
          {lowConfidence && " — below threshold"}
        </span>
      </div>

      <div className="relative max-w-[68ch]">
        <p className="drop-cap whitespace-pre-wrap font-serif text-[19px] leading-[1.7] text-tribunal-text">
          <CitedText text={text} />
          {active && !done && !complete && (
            <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.15em] animate-pulse bg-tribunal-authority" />
          )}
        </p>
      </div>

      {complete && (
        <div className="mt-7 max-w-[72ch]">
          <div className="rule-label mb-3">
            <span>Remediation Order</span>
          </div>

          <ol className="space-y-3">
            {ruling.remediation_order.map((step) => (
              <li key={step.step} className="flex gap-3">
                <span className="w-6 shrink-0 font-mono text-[13px] tabular-nums text-tribunal-authority">
                  {String(step.step).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-[14.5px] leading-[1.55] text-tribunal-text">
                    {step.action}
                  </p>
                  {step.rationale && (
                    <p className="mt-0.5 font-serif text-[13px] italic leading-[1.5] text-tribunal-muted">
                      {step.rationale}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {/* The holding is the single most important string in the system: it is what
              becomes precedent and binds every future hearing. Set it accordingly. */}
          <div className="mt-7 border-y border-tribunal-authority/45 bg-tribunal-inset px-5 py-4">
            <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-tribunal-authority">
              Holding — entered as binding precedent
            </p>
            <p className="font-serif text-[16px] leading-[1.6] text-tribunal-text">
              {ruling.holding}
            </p>
          </div>

          {ruling.cited_precedent_ids.length > 0 && (
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6E6E77]">
              Authorities addressed:{" "}
              <span className="text-tribunal-authority">
                {ruling.cited_precedent_ids.join("  ·  ")}
              </span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
