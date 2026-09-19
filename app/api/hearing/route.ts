/**
 * TRIBUNAL — SSE endpoint for a hearing.
 */

import { convene } from "@/lib/court/convene";
import { encodeEvent } from "@/lib/court/events";

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
      try {
        for await (const event of convene(incidentId)) {
          controller.enqueue(encoder.encode(encodeEvent(event)));
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
