import { Queue } from "bullmq";
import redis from "../../../shared/redis/redis.js";

export const pdfQueue = new Queue("pdf-processing", {
    connection: redis,
    prefix: "{Kifaruai}",
});

export const enqueuePDFProcessing = async (
    filePath,
    fileName,
    conversationId,
    userId,
    fileId,
    fileBuffer
) => {
    console.log(`📄 [PDF Queue] Enqueuing ${fileName} for conversation ${conversationId}`);
    await pdfQueue.add(
        "process-pdf",
        {
            filePath,
            fileName,
            conversationId,
            userId,
            fileId,
            fileBuffer: fileBuffer.toString("base64"),
        },
        {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
        }
    );
};