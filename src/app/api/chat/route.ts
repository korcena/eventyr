import { createClient } from "@/lib/supabase/server";
import { fetchContext, type ContextChunk } from "@/lib/rag";
import { chatStreamToSSE } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;

type RateBucket = { count: number; firstAt: number };
const rateBuckets = new Map<string, RateBucket>();

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = rateBuckets.get(userId);

  if (!bucket || now - bucket.firstAt > RATE_WINDOW_MS) {
    rateBuckets.set(userId, { count: 1, firstAt: now });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  if (bucket.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count += 1;
  return { allowed: true, remaining: RATE_LIMIT - bucket.count };
}

function buildSystemPrompt(chunks: ContextChunk[]): string {
  const context = chunks
    .map((c, i) => {
      return `[${i + 1}] (event: ${c.eventId}, source: ${c.sourceType}/${c.sourceId})\n${c.content}`;
    })
    .join("\n\n");

  return [
    "You are Eventyr's assistant. Answer questions about the user's events, todos, pages, and shortcuts.",
    "Answer based ONLY on the provided event data context below. If the context is empty or does not contain the answer, say you don't have enough information.",
    "When you use a piece of context, cite it by referring to the source type and source id (e.g. [page: <id>]).",
    "Be concise and helpful. Use markdown for structure when useful.",
    "",
    "Context from the user's events:",
    context || "(no relevant content found)",
  ].join("\n");
}

function buildCitationsSSE(chunks: ContextChunk[]): string {
  const payload = {
    citations: chunks.map((c) => ({
      sourceType: c.sourceType,
      sourceId: c.sourceId,
      eventId: c.eventId,
      snippet: c.content.slice(0, 160),
      similarity: 1,
    })),
  };
  return `event: citations\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { message?: string; eventId?: string; history?: { role: string; content: string }[] } = {};
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const message = body.message;
  if (!message || typeof message !== "string" || !message.trim()) {
    return new Response(JSON.stringify({ error: "message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rate = checkRateLimit(user.id);
  if (!rate.allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  const chunks = await fetchContext(
    user.id,
    message,
    body.eventId,
  );

  const systemPrompt = buildSystemPrompt(chunks);

  const history = (body.history ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const messages = [...history, { role: "user" as const, content: message }];

  const llmStream = chatStreamToSSE(messages, systemPrompt);

  const citationPrefix = new TextEncoder().encode(buildCitationsSSE(chunks));
  const rateFooter = new TextEncoder().encode(
    `event: rate\ndata: ${JSON.stringify({ remaining: rate.remaining, limit: RATE_LIMIT })}\n\n`,
  );

  const reader = llmStream.getReader();
  const combined = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(citationPrefix);
    },
    async pull(controller) {
      const { value, done } = await reader.read();
      if (done) {
        controller.enqueue(rateFooter);
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
    cancel() {
      reader.cancel();
    },
  });

  return new Response(combined, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-RateLimit-Remaining": String(rate.remaining),
      "X-RateLimit-Limit": String(RATE_LIMIT),
    },
  });
}