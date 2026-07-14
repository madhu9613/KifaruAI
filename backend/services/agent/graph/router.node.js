import { getModel } from "../utils/model.js";
import { getUserMemories } from "../utils/getUserMemories.js";

const VALID_AGENTS = new Set([
    "chat",
    "search",
    "coding",
    "pdf",
    "ppt",
    "image",
    "vision",
]);

const normalizeAgent = (value) => {
    const cleaned = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z_]/g, "");

    if (VALID_AGENTS.has(cleaned)) {
        return cleaned;
    }

    return "chat";
};

export const routerNode = async (state) => {
    console.log("🔍 [Router] Received state:", {
        agent: state.agent,
        hasFile: !!state.file,
        fileType: state.file?.mimetype,
        prompt: state.prompt?.slice(0, 50),
        conversationId: state.conversationId,
    });

    // ─── 1. FILE DETECTION (HIGHEST PRIORITY) ──────────────────
    // If a file is present, we MUST use the appropriate agent
    if (state.file) {
        console.log(`📄 [Router] File detected: ${state.file.originalname}, type: ${state.file.mimetype}`);
        if (state.file.mimetype.startsWith("image/")) {
            console.log("🔍 [Router] → Routing to vision (forced by file)");
            return { ...state, agent: "vision" };
        }
        // For other file types, add more cases
    }

    // ─── 2. EXPLICIT AGENT OVERRIDE (only if no file) ──────────
    if (state.agent && state.agent !== "auto") {
        console.log(`🔍 [Router] Using explicit agent (no file): ${state.agent}`);
        return { ...state, agent: normalizeAgent(state.agent) };
    }

    // ─── 3. FETCH USER MEMORIES ────────────────────────────────
    const memories = await getUserMemories(state.userId);
    let memoryContext = "";
    if (memories.length > 0) {
        memoryContext = memories.map(m => `- [${m.category}] ${m.text}`).join("\n");
    }

    // ─── 4. LLM ROUTER (only if no file and agent is "auto") ──
    const llm = getModel("router");
    const result = await llm.invoke(`
You are an agent router.

Available agents:
- chat: General conversation, personal questions, greetings.
- search: Current events, news, internet lookup.
- coding: Generate code, debug, architecture.
- pdf: Generate a PDF (not for querying existing ones).
- ppt: Generate a presentation.
- image: Generate an image.

User known facts:
${memoryContext || "None"}

Rules:
- If the conversation is general/personal, choose "chat".
- For code, choose "coding".
- For web info, choose "search".

Return ONLY one word: chat, search, coding, pdf, ppt, image, or vision.

User Query:
${state.prompt}
`);

    const agent = normalizeAgent(result.content);
    console.log(`🔍 [Router] LLM chose: ${agent}`);
    return { ...state, agent };
};