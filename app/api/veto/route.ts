import { NextResponse } from "next/server";
import { vetoRuling } from "@/lib/court/execute";
import { encodeEvent } from "@/lib/court/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as {
      rulingId?: string;
      secondsRemaining?: number;
      reason?: string;
    };
    if (!body.rulingId || body.secondsRemaining === undefined) {
      return NextResponse.json(
        { error: "rulingId and secondsRemaining required" },
        { status: 400 },
      );
    }

    const event = await vetoRuling(body.rulingId, body.secondsRemaining, body.reason);
    return NextResponse.json({ event, sse: encodeEvent(event) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "veto failed" },
      { status: 400 },
    );
  }
}
