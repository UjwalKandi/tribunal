import { NextResponse } from "next/server";
import { getDocket, getPrecedentCount } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const [docket, precedentCount] = await Promise.all([getDocket(), getPrecedentCount()]);
    return NextResponse.json({ docket, precedentCount });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load docket" },
      { status: 500 },
    );
  }
}
