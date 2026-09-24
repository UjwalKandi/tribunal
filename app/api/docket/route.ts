import { NextResponse } from "next/server";
import { getDocket, getPrecedentCount } from "@/lib/db/queries";
import { restoreFromLog } from "@/lib/stream/memory";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    // Rebuild precedent history and connector intake from Kafka before reading either.
    await restoreFromLog();
    const [docket, precedentCount] = await Promise.all([getDocket(), getPrecedentCount()]);
    return NextResponse.json({ docket, precedentCount });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load docket" },
      { status: 500 },
    );
  }
}
