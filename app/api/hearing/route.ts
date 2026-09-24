/**
 * TRIBUNAL — SSE endpoint for a hearing.
 */

import { convene } from "@/lib/court/convene";
import { encodeEvent } from "@/lib/court/events";
import { publishHearingEvent } from "@/lib/stream/court";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const incidentId = new URL(request.url).searchParams.get("incidentId");

  if (!incidentId) {
    return new Response("incidentId required", { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let ctx = { hearingId: "", incidentId, precached: false };
      try {
        for await (const event of convene(incidentId)) {
          controller.enqueue(encoder.encode(encodeEvent(event)));

          // Mirror the hearing onto tribunal.hearing-events. The UI never waits on it.
          if (event.type === "hearing.convened") {
            ctx = { hearingId: event.hearingId, incidentId, precached: event.precached };
          }
          if (ctx.hearingId) void publishHearingEvent(event, ctx);
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            encodeEvent({
              type: "hearing.error",
              message: err instanceof Error ? err.message : "unknown error",
            }),
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
