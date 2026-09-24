import { NextResponse } from "next/server";
import { armVetoWindow, getHearingIncidentId } from "@/lib/db/queries";
import { publishRulingOpened } from "@/lib/stream/court";
import { flinkExecutor, heartbeatFor, streamingEnabled, watchExecutions } from "@/lib/stream/kafka";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as { rulingId?: string };
    if (!body.rulingId) {
      return NextResponse.json({ error: "rulingId required" }, { status: 400 });
    }

    const ruling = await armVetoWindow(body.rulingId);

    // Flink's veto window (confluent/flink/02_veto_window.sql) starts its clock
    // on this record. Awaited so the clock never starts after the UI's does.
    if (streamingEnabled()) {
      await publishRulingOpened(ruling, await getHearingIncidentId(ruling.hearing_id));
    }
    if (flinkExecutor()) {
      watchExecutions();
      heartbeatFor(ruling.veto_window_seconds + 15);
    }
    return NextResponse.json({
      rulingId: ruling.id,
      opensAt: ruling.veto_opens_at,
      windowSeconds: ruling.veto_window_seconds,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to open veto window" },
      { status: 400 },
    );
  }
}
