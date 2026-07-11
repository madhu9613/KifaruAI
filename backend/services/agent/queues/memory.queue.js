import { Queue } from "bullmq";
import redis from "../../../shared/redis/redis.js";

export const memoryQueue = new Queue("memory-extraction", {
    connection: redis,
    prefix: "{Kifaruai}"   
});

export const enqueueMemoryExtraction = async (userId, message, conversationId) => {
    console.log(`🧠 [Memory] Enqueuing memory extraction for user ${userId}...`);
    await memoryQueue.add(
        "extract-memories",
        { userId, message, conversationId },
        {
            attempts: 2,
            backoff: { type: "exponential", delay: 2000 },
        }
    );
};