import { NextResponse } from "next/server";
import { executeRuling } from "@/lib/court/execute";
import { encodeEvent } from "@/lib/court/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as { rulingId?: string };
    if (!body.rulingId) {
      return NextResponse.json({ error: "rulingId required" }, { status: 400 });
    }

    const event = await executeRuling(body.rulingId);
    return NextResponse.json({ event, sse: encodeEvent(event) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "execution failed" },
      { status: 400 },
    );
  }
}
