import { NextResponse } from "next/server";
import { armVetoWindow } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as { rulingId?: string };
    if (!body.rulingId) {
      return NextResponse.json({ error: "rulingId required" }, { status: 400 });
    }

    const ruling = await armVetoWindow(body.rulingId);
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
