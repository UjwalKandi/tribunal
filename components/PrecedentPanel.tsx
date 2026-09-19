"use client";

import { useEffect, useRef } from "react";
import type { PrecedentMatch } from "@/lib/schemas";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PrecedentPanelProps {
  precedents: PrecedentMatch[];
  count: number;
  loading: boolean;
  /** Citations an agent has invoked this hearing — drives the cross-highlight. */
  activeCitations: Set<string>;
}

function outcomeVariant(outcome: PrecedentMatch["outcome"]) {
  if (outcome === "REMEDIATION_WORSENED") return "worsened";
  if (outcome === "HOLD_CORRECT") return "held";
  return "neutral";
}

export function PrecedentPanel({
  precedents,
  count,
  loading,
  activeCitations,
}: PrecedentPanelProps) {
  const firstCited = useRef<HTMLLIElement | null>(null);
  const citedKey = [...activeCitations].sort().join(",");

  // Bring the first newly-cited authority into view: this is the only moment where the
  // "court cites itself" claim becomes visible rather than asserted.
  useEffect(() => {
    if (!citedKey) return;
    firstCited.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [citedKey]);

  let seenCited = false;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-tribunal-border px-5 py-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-tribunal-text">
          Precedent Registry
        </h2>
        <p className="mt-2 font-mono text-4xl font-medium leading-none tabular-nums text-tribunal-authority">
          {loading ? "—" : count.toLocaleString()}
        </p>
        <p className="mt-2 text-[9.5px] uppercase tracking-[0.18em] text-tribunal-muted">
          Binding precedents on record
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {precedents.length === 0 ? (
          <p className="px-5 py-4 font-serif text-[13px] leading-relaxed text-tribunal-muted">
            Retrieved authorities will appear when a hearing convenes.
          </p>
        ) : (
          <>
            <div className="rule-label px-5 py-3">
              <span>Retrieved — {precedents.length}</span>
            </div>

            <ul className="divide-y divide-tribunal-rule">
              {precedents.map((p) => {
                const cited = activeCitations.has(p.citation);
                const isFirstCited = cited && !seenCited;
                if (isFirstCited) seenCited = true;

                return (
                  <li
                    key={p.id}
                    ref={isFirstCited ? firstCited : undefined}
                    className={cn(
                      "relative px-5 py-3.5 transition-colors",
                      cited && "bg-tribunal-inset",
                    )}
                  >
                    {cited && (
                      <span className="absolute bottom-0 left-0 top-0 w-0.5 bg-tribunal-authority" />
                    )}

                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "font-mono text-[11px] tabular-nums tracking-tight",
                          cited ? "text-tribunal-authority" : "text-tribunal-muted",
                        )}
                      >
                        {p.citation}
                      </span>
                      {cited && (
                        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-tribunal-authority">
                          Cited
                        </span>
                      )}
                    </div>

                    <p
                      className={cn(
                        "font-serif text-[13px] leading-[1.5]",
                        cited ? "text-tribunal-text" : "text-[#B6B6BD]",
                      )}
                    >
                      {p.holding}
                    </p>

                    {/* Similarity as a rule rather than a bare percentage */}
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="h-px flex-1 bg-tribunal-rule">
                        <div
                          className={cn(
                            "h-px",
                            cited ? "bg-tribunal-authority" : "bg-[#4A4A52]",
                          )}
                          style={{ width: `${Math.round(p.similarity * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[9.5px] tabular-nums text-[#5E5E66]">
                        {(p.similarity * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <Badge variant={outcomeVariant(p.outcome)}>
                        {p.outcome.replace(/_/g, " ")}
                      </Badge>
                      {p.mttr_minutes !== null && (
                        <span className="font-mono text-[9.5px] tabular-nums text-[#5E5E66]">
                          MTTR {p.mttr_minutes}m
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
