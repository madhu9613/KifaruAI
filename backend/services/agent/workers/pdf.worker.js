import dotenv from "dotenv";
dotenv.config();

import { Worker } from "bullmq";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { batchUpsertKnowledge } from "../utils/qdrant.js";
import ProcessedFile from "../models/processedFile.model.js";
import connectDB from "../config/db.js";
import redis from "../../../shared/redis/redis.js";
import { PDFParse } from "pdf-parse";

connectDB();

console.log("📄 [PDF Worker] Starting...");

const worker = new Worker(
    "pdf-processing",
    async (job) => {
        const { filePath, fileName, conversationId, userId, fileId, fileBuffer } = job.data;
        console.log(`📄 [PDF Worker] Processing ${fileName} for conversation ${conversationId}`);

        try {
            const buffer = Buffer.from(fileBuffer, "base64");

            if (!buffer.length) {
                throw new Error("Uploaded PDF buffer is empty.");
            }

            const parser = new PDFParse({ data: buffer });
            const data = await parser.getText();
            const text = data.text;

            await parser.destroy();

            if (!text || !text.trim()) {
                throw new Error("No readable text in PDF.");
            }

            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200,
                separators: ["\n\n", "\n", ".", " "],
            });

            const docs = await splitter.createDocuments([text]);

            const chunkCount = await batchUpsertKnowledge(
                docs,
                conversationId,
                userId,
                fileId,
                fileName,
                "pdf",
                { pageCount: data.numpages || data.numPages || 1, title: fileName }
            );

            await ProcessedFile.findOneAndUpdate(
                { fileId },
                { status: "ready", chunkCount, error: null },
                { new: true }
            );

            console.log(`✅ [PDF Worker] ${fileName} processed (${chunkCount} chunks)`);
            return { success: true, chunkCount };
        } catch (error) {
            console.error(`❌ [PDF Worker] Failed:`, error);
            await ProcessedFile.findOneAndUpdate(
                { fileId },
                { status: "failed", error: error.message }
            );
            throw error;
        }
    },
    {
        connection: redis,
        concurrency: 3,
        prefix: "{Kifaruai}",
    }
);

worker.on("completed", (job) => console.log(`✅ [PDF Worker] Job ${job.id} done`));
worker.on("failed", (job, err) => console.error(`❌ [PDF Worker] Job ${job.id} failed:`, err));

export default worker;