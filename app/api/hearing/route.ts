/**
 * TRIBUNAL — SSE endpoint for a hearing.
 *
 * OWNER: 🅰 wt-court
 * GET /api/hearing?incidentId=<uuid>
 *
 * Streams HearingEvents as Server-Sent Events. The client renders them.
 */

import { convene } from "@/lib/court/convene";
import { encodeEvent } from "@/lib/court/events";

export const runtime = "nodejs";
/** Do not cache. Every hearing is live. */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const incidentId = new URL(request.url).searchParams.get("incidentId");

  if (!incidentId) {
    return new Response("incidentId required", { status: 400 });
  }

  /*
   * TODO(🅰):
   *   const encoder = new TextEncoder();
   *   const stream = new ReadableStream({
   *     async start(controller) {
   *       try {
   *         for await (const event of convene(incidentId)) {
   *           controller.enqueue(encoder.encode(encodeEvent(event)));
   *         }
   *       } catch (err) {
   *         // NEVER die silently — the UI must be able to render the failure
   *         controller.enqueue(encoder.encode(encodeEvent({
   *           type: "hearing.error",
   *           message: err instanceof Error ? err.message : "unknown error",
   *         })));
   *       } finally {
   *         controller.close();
   *       }
   *     },
   *   });
   *
   *   return new Response(stream, {
   *     headers: {
   *       "Content-Type": "text/event-stream",
   *       "Cache-Control": "no-cache, no-transform",
   *       Connection: "keep-alive",
   *       // Vercel/nginx will buffer SSE without this and the arguments will
   *       // all appear at once, destroying the pacing. Do not omit it.
   *       "X-Accel-Buffering": "no",
   *     },
   *   });
   */

  throw new Error("NOT_IMPLEMENTED: /api/hearing");
}
