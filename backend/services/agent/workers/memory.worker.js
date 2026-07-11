
import { Worker } from "bullmq";
import redis from "../../../shared/redis/redis.js";
import { extractMemories } from "../utils/memoryExtractor.js";
import Memory from "../models/memory.model.js";
import { invalidateMemoryCache } from "../utils/memoryCache.js";
import connectDB from "../config/db.js";   // 👈 import


connectDB();

const worker = new Worker(
    "memory-extraction",
    async (job) => {
        const { userId, message, conversationId } = job.data;


     console.log(`🧠 [Memory] Extracting for user ${userId}...`);
        console.log(`🧠 [Memory] Extracting for user ${userId}...`);

        const memories = await extractMemories(userId, message);

        if (!memories || memories.length === 0) {
            console.log(`🧠 [Memory] No new memories for user ${userId}.`);
            return;
        }

        // Save each memory (insert new documents; we don't upsert by key anymore)
        for (const mem of memories) {
            await Memory.create({
                userId,
                text: mem.text,
                category: mem.category,
                importance: mem.importance,
                sourceMessageId: conversationId,
            });
        }

        // 🔥 Invalidate Redis cache so next read gets fresh data
        await invalidateMemoryCache(userId);

        console.log(`🧠 [Memory] Saved ${memories.length} memories for user ${userId}`);
    },
    {
        connection: redis,
        concurrency: 5,
        prefix: "{Kifaruai}",
    }
);
worker.on("failed", (job, err) => {
    console.error(`❌ Memory extraction job ${job.id} failed:`, err);
});

export default worker;