import api from "../utils/axios";

// Original (kept for reference)
export const sendPrompt = async (payload) => {
    const { data } = await api.post("/api/agent/chat", payload);
    return data;
};

// NEW: streaming version
export const sendPromptStream = async (payload, onToken, onEnd, onError) => {
    try {
        // Use fetch directly so we can read the stream
        const response = await fetch(
            `${api.defaults.baseURL}/api/agent/chat?stream=true`,
            {
                method: "POST",
                credentials: "include",
                body: payload, // payload is FormData
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "Network error");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split("\n\n");
            buffer = events.pop(); // keep incomplete event for next iteration

            for (const event of events) {
                if (!event.startsWith("data: ")) continue;
                const raw = event.slice(6);
                try {
                    const data = JSON.parse(raw);
                    switch (data.type) {
                        case "token":
                            onToken(data.token);
                            break;
                        case "end":
                            onEnd(data); // data.response, data.images, data.artifacts
                            break;
                        case "error":
                            onError(data.message);
                            break;
                    }
                } catch (parseErr) {
                    // ignore malformed events
                }
            }
        }
    } catch (error) {
        onError(error.message);
    }
};