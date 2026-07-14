import api from "../utils/axios";

const RAG_BASE_URL = import.meta.env.VITE_RAG_URL || api.defaults.baseURL || "";
const RAG_SESSION_PREFIX = "kifaru-rag-session:";

const getSessionStorageKey = (conversationId) =>
  `${RAG_SESSION_PREFIX}${conversationId || "default"}`;

export const getOrCreateRagSessionId = (conversationId) => {
  const storageKey = getSessionStorageKey(conversationId);
  const existing = localStorage.getItem(storageKey);
  if (existing) return existing;

  const sessionId = crypto.randomUUID();
  localStorage.setItem(storageKey, sessionId);
  return sessionId;
};

const getRagHeaders = (conversationId) => ({
  "X-Chat-Session-Id": getOrCreateRagSessionId(conversationId),
});

const parseSseEvents = (buffer) => {
  const chunks = buffer.split("\n\n");
  const leftover = buffer.endsWith("\n\n") ? "" : chunks.pop() || "";
  const events = chunks
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const event = { type: "message", data: "" };
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) {
          event.type = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          event.data += `${line.slice(5).trim()}\n`;
        }
      }
      event.data = event.data.trim();
      return event;
    });

  return { events, leftover };
};

export const getRagStatus = async (conversationId) => {
  const response = await fetch(`${RAG_BASE_URL}/api/rag/status`, {
    method: "GET",
    credentials: "include",
    headers: getRagHeaders(conversationId),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to check PDF status");
  }

  return response.json();
};

export const uploadPdfDocument = async (conversationId, file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${RAG_BASE_URL}/api/rag/upload`, {
    method: "POST",
    credentials: "include",
    headers: getRagHeaders(conversationId),
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to upload PDF");
  }

  return response.json();
};

export const askPdfStream = async ({ conversationId, question, onToken, onEnd, onError }) => {
  try {
    const response = await fetch(`${RAG_BASE_URL}/api/rag/ask/stream`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...getRagHeaders(conversationId),
      },
      body: JSON.stringify({ question, include_sources: false }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Network error");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let answer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseEvents(buffer);
      buffer = parsed.leftover;

      for (const event of parsed.events) {
        if (!event.data) continue;

        try {
          const payload = JSON.parse(event.data);

          if (event.type === "token") {
            const token = payload.content || "";
            answer += token;
            onToken(token);
          } else if (event.type === "done") {
            onEnd({
              response: answer,
              model_used: payload.model_used,
              processing_time: payload.processing_time,
              sources: payload.sources || [],
            });
          } else if (event.type === "error") {
            onError(payload.message || "Something went wrong while streaming.");
          }
        } catch {
          // Ignore malformed SSE payloads.
        }
      }
    }
  } catch (error) {
    onError(error.message);
  }
};