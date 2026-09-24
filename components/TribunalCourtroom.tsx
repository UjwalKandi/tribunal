"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DefenseOutput,
  Incident,
  PrecedentMatch,
  ProsecutionOutput,
  RulingRecord,
} from "@/lib/schemas";
import type { HearingEvent } from "@/lib/court/events";
import { decodeEvent } from "@/lib/court/events";
import { DocketPanel } from "@/components/DocketPanel";
import { ArgumentBlock } from "@/components/ArgumentBlock";
import { DefenseDetail, ProsecutionDetail } from "@/components/ArgumentDetail";
import { RulingOpinion } from "@/components/RulingOpinion";
import { PrecedentPanel } from "@/components/PrecedentPanel";
import { VetoCountdown } from "@/components/VetoCountdown";
import { ExhibitLog } from "@/components/ExhibitLog";
import { Masthead } from "@/components/Masthead";
import { Seal } from "@/components/Seal";
import { useSpeech } from "@/hooks/useSpeech";

type Phase =
  | "idle"
  | "convening"
  | "prosecution"
  | "defense"
  | "judge"
  | "ruling"
  | "veto"
  | "executed"
  | "vetoed"
  | "error";

export function TribunalCourtroom() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [precedentCount, setPrecedentCount] = useState(1205);
  const [precedents, setPrecedents] = useState<PrecedentMatch[]>([]);
  const [docketLoading, setDocketLoading] = useState(true);
  const [docketError, setDocketError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [hearingError, setHearingError] = useState<string | null>(null);
  const [docketNumber, setDocketNumber] = useState<string | null>(null);
  const [prosecution, setProsecution] = useState<ProsecutionOutput | null>(null);
  const [defense, setDefense] = useState<DefenseOutput | null>(null);
  const [droppedCitations, setDroppedCitations] = useState<string[]>([]);
  const [ruling, setRuling] = useState<RulingRecord | null>(null);
  const [rulingId, setRulingId] = useState<string | null>(null);
  const [vetoOpensAt, setVetoOpensAt] = useState<string>("");
  const [vetoWindowSeconds, setVetoWindowSeconds] = useState(10);
  const [newPrecedent, setNewPrecedent] = useState<string | null>(null);
  const [recordLine, setRecordLine] = useState<string | null>(null);
  const [prosComplete, setProsComplete] = useState(false);
  const [defComplete, setDefComplete] = useState(false);
  const [rulingComplete, setRulingComplete] = useState(false);
  const eventQueue = useRef<HearingEvent[]>([]);
  const processing = useRef(false);
  const rulingIdRef = useRef<string | null>(null);
  const expireInFlight = useRef(false);
  const prosRef = useRef<HTMLDivElement | null>(null);
  const defRef = useRef<HTMLDivElement | null>(null);
  const rulingRef = useRef<HTMLDivElement | null>(null);
  const { speak, stop, muted, toggleMute } = useSpeech();

  const loadDocket = useCallback(async () => {
    setDocketLoading(true);
    setDocketError(null);
    try {
      const res = await fetch("/api/docket");
      const data = (await res.json()) as {
        docket?: Incident[];
        precedentCount?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load docket");
      setIncidents(data.docket ?? []);
      setPrecedentCount(data.precedentCount ?? 1205);
      // Select the top of the docket so the first frame shows a real case and its
      // traceback rather than an empty stage.
      setSelected((current) => current ?? data.docket?.[0] ?? null);
    } catch (err) {
      setDocketError(err instanceof Error ? err.message : "Failed to load docket");
    } finally {
      setDocketLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocket();
  }, [loadDocket]);

  // Each column scrolls on its own, so keep the party currently speaking in view.
  useEffect(() => {
    const target =
      phase === "prosecution"
        ? prosRef.current
        : phase === "defense"
          ? defRef.current
          : phase === "judge" || phase === "ruling"
            ? rulingRef.current
            : null;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [phase]);

  const activeCitations = useMemo(
    () =>
      new Set<string>([
        ...(defense?.cited_precedents ?? []).map((c) => c.citation),
        ...(ruling?.cited_precedent_ids ?? []),
      ]),
    [defense, ruling],
  );

  rulingIdRef.current = rulingId;

  const resetHearing = () => {
    setPhase("idle");
    setHearingError(null);
    setDocketNumber(null);
    setProsecution(null);
    setDefense(null);
    setDroppedCitations([]);
    setRuling(null);
    setRulingId(null);
    setVetoOpensAt("");
    setNewPrecedent(null);
    setRecordLine(null);
    setProsComplete(false);
    setDefComplete(false);
    setRulingComplete(false);
    setPrecedents([]);
    eventQueue.current = [];
    processing.current = false;
    expireInFlight.current = false;
    stop();
  };

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const typewriterDuration = (text: string) => text.length * 35 + 400;

  const processEvent = useCallback(
    async (event: HearingEvent) => {
      switch (event.type) {
        case "hearing.convened":
          setDocketNumber(event.docketNumber);
          setPhase("convening");
          break;
        case "precedents.retrieved":
          setPrecedents(event.precedents);
          break;
        case "hearing.degraded":
          break;
        case "argument.start":
          if (event.role === "PROSECUTION") setPhase("prosecution");
          if (event.role === "DEFENSE") setPhase("defense");
          if (event.role === "JUDGE") setPhase("judge");
          break;
        case "argument.complete":
          if (event.role === "PROSECUTION") {
            setProsecution(event.payload);
            await wait(typewriterDuration(event.payload.body));
            setProsComplete(true);
            setPhase("defense");
          }
          if (event.role === "DEFENSE") {
            setDefense(event.payload);
            setDroppedCitations(event.droppedCitations ?? []);
            await wait(typewriterDuration(event.payload.body));
            setDefComplete(true);
            setPhase("judge");
          }
          break;
        case "ruling.delivered":
          setRuling(event.ruling);
          setRulingId(event.ruling.id);
          setPhase("ruling");
          await wait(typewriterDuration(event.ruling.opinion));
          setRulingComplete(true);
          speak(event.ruling.opinion);
          break;
        case "veto.window.open": {
          try {
            const res = await fetch("/api/veto-window", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ rulingId: event.rulingId }),
            });
            const data = (await res.json()) as {
              opensAt?: string;
              windowSeconds?: number;
              error?: string;
            };
            if (!res.ok) throw new Error(data.error ?? "Failed to open veto window");
            setRulingId(event.rulingId);
            setVetoOpensAt(data.opensAt ?? new Date().toISOString());
            setVetoWindowSeconds(data.windowSeconds ?? event.windowSeconds);
            setPhase("veto");
          } catch (err) {
            setHearingError(err instanceof Error ? err.message : "Failed to open veto window");
            setPhase("error");
          }
          break;
        }
        case "hearing.error":
          setHearingError(event.message);
          setPhase("error");
          break;
        default:
          break;
      }
    },
    [speak],
  );

  const drainQueue = useCallback(async () => {
    if (processing.current) return;
    processing.current = true;
    while (eventQueue.current.length > 0) {
      const event = eventQueue.current.shift();
      if (event) await processEvent(event);
    }
    processing.current = false;
  }, [processEvent]);

  const handleConvene = () => {
    if (!selected) return;
    resetHearing();
    setPhase("convening");

    const source = new EventSource(`/api/hearing?incidentId=${selected.id}`);

    source.onmessage = (msg) => {
      const event = decodeEvent(msg.data);
      if (!event) return;
      eventQueue.current.push(event);
      void drainQueue();
    };

    source.onerror = () => {
      source.close();
    };

    source.addEventListener("close", () => source.close());

    const checkClosed = setInterval(() => {
      if (source.readyState === EventSource.CLOSED) {
        clearInterval(checkClosed);
      }
    }, 500);
  };

  const handleExpire = useCallback(async () => {
    const id = rulingIdRef.current;
    if (!id || expireInFlight.current) return;
    expireInFlight.current = true;
    setHearingError(null);
    setPhase("executed");
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rulingId: id }),
      });
      const data = (await res.json()) as {
        event?: { precedentNumber: number; citation: string };
        decidedBy?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Execution failed");
      if (data.event?.precedentNumber != null) {
        setPrecedentCount(data.event.precedentNumber);
        setNewPrecedent(`ENTERED AS PRECEDENT #${data.event.precedentNumber.toLocaleString()}`);
        setRecordLine(
          `${data.decidedBy?.startsWith("flink") ? "Window closed by Flink" : "Window closed by timer"}`
            + ` · ${data.event.citation} binds every hearing that follows`,
        );
      } else {
        setPrecedentCount((n) => n + 1);
      }
    } catch (err) {
      expireInFlight.current = false;
      setHearingError(err instanceof Error ? err.message : "Execution failed");
    }
  }, []);

  const handleVeto = async () => {
    if (!rulingId) return;
    const elapsed = (Date.now() - new Date(vetoOpensAt).getTime()) / 1000;
    const remaining = Math.max(0, Math.ceil(vetoWindowSeconds - elapsed));
    try {
      const res = await fetch("/api/veto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rulingId, secondsRemaining: remaining }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Veto failed");
      }
      setPhase("vetoed");
    } catch (err) {
      setHearingError(err instanceof Error ? err.message : "Veto failed");
    }
  };

  const hearingActive =
    phase !== "idle" &&
    phase !== "error" &&
    phase !== "executed" &&
    phase !== "vetoed";
  const inSession = phase !== "idle" || prosecution !== null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-tribunal-bg">
      <Masthead
        incident={selected}
        docketNumber={docketNumber}
        muted={muted}
        onToggleMute={toggleMute}
      />

      <main className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)_340px] divide-x divide-tribunal-border">
        <DocketPanel
          incidents={incidents}
          selectedId={selected?.id ?? null}
          loading={docketLoading}
          error={docketError}
          hearingActive={hearingActive}
          onSelect={setSelected}
          onConvene={handleConvene}
        />

        <section className="flex min-h-0 flex-col overflow-y-auto">
          <div className="flex-1 space-y-8 px-8 py-6">
            {selected && <ExhibitLog incident={selected} />}

            {!selected && !docketLoading && (
              <div className="flex flex-col items-center justify-center gap-4 py-28 text-center">
                <Seal size={96} className="text-tribunal-authority opacity-[0.08]" />
                <p className="font-mono text-[12px] uppercase tracking-[0.26em] text-tribunal-muted">
                  No hearing convened
                </p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#5E5E66]">
                  Select an incident from the docket
                </p>
              </div>
            )}

            {selected && !inSession && (
              <p className="border-t border-tribunal-rule pt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#5E5E66]">
                Court not in session — convene to hear argument
              </p>
            )}

            {phase === "convening" && (
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-tribunal-muted">
                Hearing convened — awaiting counsel
              </p>
            )}

            <div ref={prosRef} className="scroll-mt-6">
              <ArgumentBlock
                role="PROSECUTION"
                body={prosecution?.body ?? ""}
                active={phase === "prosecution" || prosComplete}
                deliberating={phase === "prosecution" && !prosComplete}
                complete={prosComplete}
              >
                {prosecution && <ProsecutionDetail output={prosecution} />}
              </ArgumentBlock>
            </div>

            <div ref={defRef} className="scroll-mt-6">
              <ArgumentBlock
                role="DEFENSE"
                body={defense?.body ?? ""}
                active={(phase === "defense" || defComplete) && prosComplete}
                deliberating={phase === "defense" && !defComplete}
                complete={defComplete}
              >
                {defense && (
                  <DefenseDetail output={defense} droppedCitations={droppedCitations} />
                )}
              </ArgumentBlock>
            </div>

            <div ref={rulingRef} className="scroll-mt-6">
              <RulingOpinion
                ruling={ruling}
                active={
                  (phase === "ruling" ||
                    phase === "veto" ||
                    phase === "executed" ||
                    phase === "vetoed") &&
                  defComplete
                }
                complete={rulingComplete}
              />
            </div>

            {hearingError && (
              <div className="border-l-2 border-tribunal-prosecution bg-[#150F0E] px-4 py-3 font-mono text-[12px] leading-relaxed text-tribunal-prosecution">
                {hearingError}
              </div>
            )}
          </div>

          {(phase === "veto" || phase === "executed" || phase === "vetoed") &&
            rulingComplete && (
              <VetoCountdown
                opensAt={vetoOpensAt}
                windowSeconds={vetoWindowSeconds}
                rulingId={rulingId}
                expired={phase === "executed"}
                executed={phase === "executed"}
                vetoed={phase === "vetoed"}
                precedentLine={newPrecedent}
                recordLine={recordLine}
                onExpire={() => void handleExpire()}
                onVeto={() => void handleVeto()}
              />
            )}
        </section>

        <PrecedentPanel
          precedents={precedents}
          count={precedentCount}
          loading={docketLoading}
          activeCitations={activeCitations}
        />
      </main>
    </div>
  );
}
