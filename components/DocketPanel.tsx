"use client";

import type { Incident } from "@/lib/schemas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DocketPanelProps {
  incidents: Incident[];
  selectedId: string | null;
  loading: boolean;
  error: string | null;
  hearingActive: boolean;
  onSelect: (incident: Incident) => void;
  onConvene: () => void;
}

function severityVariant(severity: Incident["severity"]) {
  if (severity === "P1") return "p1";
  if (severity === "P2") return "p2";
  return "p3";
}

export function DocketPanel({
  incidents,
  selectedId,
  loading,
  error,
  hearingActive,
  onSelect,
  onConvene,
}: DocketPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-tribunal-border px-5 py-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-tribunal-text">
            Docket
          </h2>
          <span className="font-mono text-[11px] tabular-nums text-tribunal-muted">
            {loading ? "—" : String(incidents.length).padStart(2, "0")}
          </span>
        </div>
        <p className="mt-1 text-[9.5px] uppercase tracking-[0.18em] text-tribunal-muted">
          Awaiting hearing
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && (
          <p className="px-5 py-4 font-mono text-[11px] uppercase tracking-[0.16em] text-tribunal-muted">
            Loading docket…
          </p>
        )}

        {error && (
          <p className="m-4 border-l-2 border-tribunal-prosecution bg-[#150F0E] px-3 py-2 font-mono text-[11px] leading-relaxed text-tribunal-prosecution">
            {error}
          </p>
        )}

        {!loading && !error && incidents.length === 0 && (
          <p className="px-5 py-4 font-mono text-[11px] uppercase tracking-[0.16em] text-tribunal-muted">
            No incidents awaiting hearing
          </p>
        )}

        <div className="divide-y divide-tribunal-rule">
          {incidents.map((incident) => {
            const selected = selectedId === incident.id;
            return (
              <button
                key={incident.id}
                type="button"
                disabled={hearingActive}
                onClick={() => onSelect(incident)}
                className={cn(
                  "relative block w-full px-5 py-3.5 text-left transition-colors",
                  selected ? "bg-tribunal-inset" : "hover:bg-tribunal-raised",
                  hearingActive && "cursor-not-allowed opacity-60",
                )}
              >
                {selected && (
                  <span className="absolute bottom-0 left-0 top-0 w-0.5 bg-tribunal-authority" />
                )}

                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "font-mono text-[11px] tabular-nums tracking-tight",
                      selected ? "text-tribunal-authority" : "text-tribunal-muted",
                    )}
                  >
                    {incident.case_number}
                  </span>
                  <Badge variant={severityVariant(incident.severity)}>
                    {incident.severity}
                  </Badge>
                </div>

                <p
                  className={cn(
                    "line-clamp-2 font-serif text-[13.5px] leading-[1.45]",
                    selected ? "text-tribunal-text" : "text-[#B6B6BD]",
                  )}
                >
                  {incident.title}
                </p>

                <p className="mt-1.5 truncate font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#5E5E66]">
                  {incident.service}
                  {incident.dag_id ? ` · ${incident.dag_id}` : ""}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 border-t border-tribunal-border p-4">
        <Button
          variant="authority"
          className="h-11 w-full rounded-none font-mono text-[11px] uppercase tracking-[0.2em]"
          disabled={!selectedId || hearingActive}
          onClick={onConvene}
        >
          {hearingActive
            ? "Hearing in session"
            : "Convene Hearing"}
        </Button>
      </div>
    </div>
  );
}
