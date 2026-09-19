"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VetoCountdownProps {
  opensAt: string;
  windowSeconds: number;
  rulingId: string | null;
  expired: boolean;
  executed: boolean;
  vetoed: boolean;
  precedentLine: string | null;
  onExpire: () => void;
  onVeto: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function VetoCountdown({
  opensAt,
  windowSeconds,
  rulingId,
  expired,
  executed,
  vetoed,
  precedentLine,
  onExpire,
  onVeto,
}: VetoCountdownProps) {
  const [remaining, setRemaining] = useState(windowSeconds);

  useEffect(() => {
    if (!opensAt || expired || executed || vetoed) return;

    let fired = false;
    const tick = () => {
      const elapsed = (Date.now() - new Date(opensAt).getTime()) / 1000;
      const left = Math.max(0, Math.ceil(windowSeconds - elapsed));
      setRemaining(left);
      if (left <= 0 && !fired) {
        fired = true;
        onExpire();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [opensAt, windowSeconds, expired, executed, vetoed, onExpire]);

  if (!rulingId) return null;

  if (vetoed) {
    return (
      <Band accent="border-tribunal-defense">
        <p className="py-5 text-center font-mono text-[13px] uppercase tracking-[0.22em] text-tribunal-defense">
          Ruling vetoed — dissent recorded
        </p>
      </Band>
    );
  }

  if (executed || expired) {
    return (
      <Band accent="border-tribunal-authority">
        {/* No animation on this transition — 200-ui.mdc is explicit about that. */}
        <div className="py-5 text-center">
          <p className="font-mono text-[13px] uppercase leading-relaxed tracking-[0.22em] text-tribunal-authority">
            Veto window closed — ruling executed under autonomous authority
          </p>
          {precedentLine && (
            <p className="mt-3 animate-registry-flash font-mono text-[22px] tabular-nums tracking-[0.14em] text-tribunal-authority">
              {precedentLine}
            </p>
          )}
        </div>
      </Band>
    );
  }

  const fraction = Math.max(0, Math.min(1, remaining / windowSeconds));
  // Scales with the window: a shortened demo window shouldn't pulse for its whole length.
  const closing = remaining <= Math.min(10, Math.ceil(windowSeconds / 3));

  return (
    <Band accent="border-tribunal-authority">
      <div className="pb-5 pt-6 text-center">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-tribunal-muted">
          Human veto window
        </p>

        <p
          className={cn(
            "font-mono text-6xl font-medium leading-none tabular-nums tracking-[0.06em] text-tribunal-authority",
            closing && "animate-veto-pulse",
          )}
        >
          {formatTime(remaining)}
        </p>

        {/* Depletion rule */}
        <div className="mx-auto mt-5 h-px w-[min(420px,80%)] bg-tribunal-rule">
          <div
            className="h-px bg-tribunal-authority transition-[width] duration-1000 ease-linear"
            style={{ width: `${fraction * 100}%` }}
          />
        </div>

        {/* Small and understated on purpose: it should not look like something anyone
            would reach for in time. That restraint is the argument. */}
        <Button
          variant="veto"
          size="sm"
          className="mt-5 h-7 rounded-none px-5 font-mono text-[10px] uppercase tracking-[0.24em]"
          onClick={onVeto}
        >
          Veto
        </Button>
      </div>
    </Band>
  );
}

function Band({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 border-y bg-tribunal-bg/95 backdrop-blur-sm",
        accent,
      )}
    >
      {children}
    </div>
  );
}
