"use client";

import type { Incident } from "@/lib/schemas";
import { Seal } from "@/components/Seal";
import { Button } from "@/components/ui/button";

/**
 * Two-tier institutional masthead: wordmark over a case caption, separated from the
 * body by a brass double rule. Replaces the generic app bar.
 */

interface MastheadProps {
  incident: Incident | null;
  docketNumber: string | null;
  muted: boolean;
  onToggleMute: () => void;
}

function formatOccurred(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}Z`;
}

export function Masthead({ incident, docketNumber, muted, onToggleMute }: MastheadProps) {
  return (
    <header className="double-rule shrink-0 bg-tribunal-bg">
      <div className="flex items-center justify-between px-6 pb-3 pt-4">
        <div className="flex items-center gap-3">
          <Seal size={22} className="text-tribunal-authority" />
          <div>
            <h1 className="text-[15px] font-semibold uppercase leading-none tracking-[0.34em] text-tribunal-text">
              Tribunal
            </h1>
            <p className="mt-1.5 text-[9.5px] uppercase tracking-[0.2em] text-tribunal-muted">
              Machine Court · Production Incidents
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 rounded-none border border-tribunal-border px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-tribunal-muted hover:text-tribunal-text"
          onClick={onToggleMute}
        >
          {muted ? "Voice Off" : "Voice On"}
        </Button>
      </div>

      {/* Case caption */}
      <div className="flex items-center justify-between gap-6 border-t border-tribunal-rule px-6 py-2">
        <p className="truncate font-mono text-[11px] uppercase tracking-[0.14em] text-tribunal-muted">
          {incident ? (
            <>
              <span className="text-[#5E5E66]">In re:</span>{" "}
              <span className="text-tribunal-text">{incident.service}</span>
            </>
          ) : (
            <span className="text-[#5E5E66]">No case called</span>
          )}
        </p>

        {incident && (
          <div className="flex shrink-0 items-center gap-3 font-mono text-[11px] tabular-nums text-tribunal-muted">
            <span className="text-tribunal-authority">
              {docketNumber ?? incident.case_number}
            </span>
            <span className="text-tribunal-rule">·</span>
            <span
              className={
                incident.severity === "P1"
                  ? "text-tribunal-prosecution"
                  : "text-tribunal-muted"
              }
            >
              {incident.severity}
            </span>
            <span className="text-tribunal-rule">·</span>
            <span>{formatOccurred(incident.occurred_at)}</span>
          </div>
        )}
      </div>
    </header>
  );
}
