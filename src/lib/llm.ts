export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function getBaseURL() {
  const baseURL = process.env.OLLAMA_BASE_URL;
  if (!baseURL) {
    throw new Error("OLLAMA_BASE_URL is not configured");
  }
  return baseURL;
}

function getAuthHeaders(): Record<string, string> {
  const apiKey = process.env.OLLAMA_API_KEY;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

/**
 * Streams a chat completion from Ollama's native /api/chat endpoint.
 * Yields incremental content deltas as strings.
 */
export async function* chatStream(
  messages: ChatMessage[],
  systemPrompt: string,
): AsyncGenerator<string, void, unknown> {
  const model = process.env.OLLAMA_CHAT_MODEL ?? "gpt-oss:20b";
  const baseURL = getBaseURL();
  const headers = getAuthHeaders();

  const fullMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const response = await fetch(`${baseURL}/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: fullMessages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Ollama chat failed (${response.status}): ${text}`);
  }

  if (!response.body) {
    throw new Error("Ollama chat returned no body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Ollama streams newline-delimited JSON objects
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const json = JSON.parse(trimmed) as {
          message?: { content?: string };
          done?: boolean;
        };
        const delta = json.message?.content;
        if (delta) {
          yield delta;
        }
      } catch {
        // Partial JSON — wait for more data
      }
    }
  }

  // Flush remaining buffer
  const trimmed = buffer.trim();
  if (trimmed) {
    try {
      const json = JSON.parse(trimmed) as { message?: { content?: string } };
      const delta = json.message?.content;
      if (delta) {
        yield delta;
      }
    } catch {
      // ignore
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