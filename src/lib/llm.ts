import OpenAI from "openai";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function getChatClient() {
  const baseURL = process.env.OLLAMA_BASE_URL;
  const apiKey = process.env.OLLAMA_API_KEY ?? "ollama";
  if (!baseURL) {
    throw new Error("OLLAMA_BASE_URL is not configured");
  }
  return new OpenAI({ baseURL, apiKey });
}

/**
 * Streams a chat completion from Ollama Cloud (OpenAI-compatible endpoint).
 * Yields incremental content deltas as strings.
 */
export async function* chatStream(
  messages: ChatMessage[],
  systemPrompt: string,
): AsyncGenerator<string, void, unknown> {
  const model = process.env.OLLAMA_CHAT_MODEL ?? "llama3.1";
  const client = getChatClient();

  const fullMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const stream = await client.chat.completions.create({
    model,
    messages: fullMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) {
      yield delta;
    }
  }
}

/**
 * Converts the async generator into a ReadableStream of bytes suitable for
 * Server-Sent Events (SSE) responses.
 */
export function chatStreamToSSE(
  messages: ChatMessage[],
  systemPrompt: string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  const generator = chatStream(messages, systemPrompt);

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await generator.next();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } else {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ delta: value })}\n\n`),
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Stream error";
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ error: message })}\n\n`,
          ),
        );
        controller.close();
      }
    },
    cancel() {
      generator.return(undefined);
    },
  });
}