
import { getModel } from "./model.js";

console.log("🧠 [Memory] Memory extractor initialized.");
export const extractMemories = async (userId, message) => {
    const llm = getModel("memory", { streaming: false, temperature: 0 });

    const prompt = `
You are a personal memory extractor for an AI assistant.

Analyze the user's latest message and decide if they are sharing **new, personal, or factual information** about themselves that the AI should remember.

Categories to use:
- identity: name, age, gender, location, etc.
- education: school, college, major, etc.
- career: job title, company, skills, etc.
- preference: likes, dislikes, preferences (e.g., "I prefer short responses")
- project: current projects, side projects
- goal: short-term/long-term goals
- relationship: family, friends, partner (if mentioned)
- custom: any other relevant information

Return a JSON array of memory objects. Each object has:
{
  "text": string,        // the full natural‑language memory (e.g., "My name is Madhujya")
  "category": string,    // one of the categories above, or "general"
  "importance": number   // 1-10, where 10 is very important
}

If no new memory, return an empty array [].

User message:
${message}
`;

    try {
        const response = await llm.invoke(prompt);
        const text = response.content.trim();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed) && parsed.every(item => item.text)) {
                return parsed.map(item => ({
                    text: item.text,
                    category: item.category || "general",
                    importance: item.importance || 3,
                }));
            }
        }
        return [];
    } catch (error) {
        console.error("Memory extraction error:", error);
        return [];
    }
};