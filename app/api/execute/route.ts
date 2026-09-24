import { NextResponse } from "next/server";
import { executeRuling } from "@/lib/court/execute";
import { encodeEvent } from "@/lib/court/events";
import { getHearingIncidentId, getRuling, hasVeto } from "@/lib/db/queries";
import { publishPrecedent } from "@/lib/stream/court";
import { awaitExecution, flinkExecutor, streamingEnabled } from "@/lib/stream/kafka";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Flink emits ~1-3s after the window closes; past this the stream is presumed down. */
const FLINK_DECISION_TIMEOUT_MS = 12_000;

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as { rulingId?: string };
    if (!body.rulingId) {
      return NextResponse.json({ error: "rulingId required" }, { status: 400 });
    }

    // With TRIBUNAL_EXECUTOR=flink the client's timer only asks; the execution
    // order comes from confluent/flink/02_veto_window.sql on tribunal.executions.
    let decidedBy = "client";
    if (flinkExecutor()) {
      const ruling = await getRuling(body.rulingId);
      if (await hasVeto(body.rulingId)) {
        return NextResponse.json({ error: "Ruling was vetoed" }, { status: 400 });
      }
      const order = await awaitExecution(
        body.rulingId,
        ruling.veto_opens_at,
        FLINK_DECISION_TIMEOUT_MS,
      );
      if (order) {
        decidedBy = order.decided_by;
      } else {
        console.warn(`[execute] no Flink decision for ${body.rulingId}; falling back to client timer`);
        decidedBy = "client-fallback";
      }
    }

    const event = await executeRuling(body.rulingId);

    if (streamingEnabled()) {
      const ruling = await getRuling(body.rulingId);
      void publishPrecedent(event, ruling, await getHearingIncidentId(ruling.hearing_id));
    }

    return NextResponse.json({ event, sse: encodeEvent(event), decidedBy });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "execution failed" },
      { status: 400 },
    );
  }
}
