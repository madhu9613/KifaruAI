import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import ProcessedFile from "../models/processedFile.model.js";
import { ingestPdfDocument, queryRagDocument } from "../utils/ragClient.js";

const cleanupTempFile = (filePath) => {
    if (!filePath) {
        return;
    }

    try {
        fs.unlinkSync(filePath);
    } catch (error) {
        console.log("Cleanup error:", error.message);
    }
};

export const knowledgeAgent = async (state) => {
    const { prompt, conversationId, userId, file, streaming } = state;
    let fileHash = null;

    console.log("🔍 [KnowledgeAgent] Received state:", {
        prompt: prompt?.slice(0, 50),
        conversationId,
        userId,
        hasFile: !!file,
        fileName: file?.originalname,
        filePath: file?.path,
        streaming,
    });

    // ─── 1. HANDLE FILE UPLOAD ──────────────────────────────────────
    if (file) {
        console.log("📄 [KnowledgeAgent] File detected, processing upload...");
        try {
            const buffer = fs.readFileSync(file.path);
            fileHash = crypto.createHash("md5").update(buffer).digest("hex");
            const existing = await ProcessedFile.findOne({ conversationId, fileHash });
            const fileId = existing?.fileId || uuidv4();

            console.log(`📄 [KnowledgeAgent] File hash: ${fileHash}, fileId: ${fileId}`);
            console.log(`📄 [KnowledgeAgent] Existing record:`, existing);

            if (existing?.status === "processing") {
                console.log(`📄 [KnowledgeAgent] File is still processing`);
                cleanupTempFile(file.path);
                return {
                    ...state,
                    response: `⏳ **${file.originalname}** is still processing. Please wait a moment.`,
                };
            }

            if (existing?.status === "ready") {
                console.log(`📄 [KnowledgeAgent] File already ready, cleaning up`);
                cleanupTempFile(file.path);

                if (prompt?.trim()) {
                    const answer = await queryRagDocument({
                        conversationId,
                        userId,
                        query: prompt,
                    });

                    return {
                        ...state,
                        response: answer.answer,
                    };
                }

                return {
                    ...state,
                    response: `📄 **${file.originalname}** is already indexed and ready for questions.`,
                };
            }

            await ProcessedFile.findOneAndUpdate(
                { conversationId, fileHash },
                {
                    conversationId,
                    userId,
                    fileId,
                    fileName: file.originalname,
                    fileHash,
                    sourceType: "pdf",
                    status: "processing",
                    chunkCount: 0,
                    error: null,
                },
                { upsert: true, setDefaultsOnInsert: true, returnDocument: "after" }
            );

            console.log(`📄 [KnowledgeAgent] ProcessedFile record ready`);

            const ingestResult = await ingestPdfDocument({
                conversationId,
                userId,
                fileId,
                fileName: file.originalname,
                fileBuffer: buffer.toString("base64"),
            });

            await ProcessedFile.findOneAndUpdate(
                { conversationId, fileHash },
                {
                    status: "ready",
                    chunkCount: ingestResult.chunk_count ?? ingestResult.chunkCount ?? 0,
                    error: null,
                },
                { returnDocument: "after" }
            );

            console.log(`📄 [KnowledgeAgent] PDF indexed in rag service`);

            cleanupTempFile(file.path);

            if (prompt?.trim()) {
                const answer = await queryRagDocument({
                    conversationId,
                    userId,
                    query: prompt,
                });

                return {
                    ...state,
                    response: answer.answer,
                };
            }

            return {
                ...state,
                response: `📄 **File uploaded: ${file.originalname}**\n\nI'm processing it in the background. You can ask questions once it's ready.`,
            };
        } catch (error) {
            console.error("❌ [KnowledgeAgent] File handling error:", error);
            cleanupTempFile(file?.path);

            if (fileHash) {
                await ProcessedFile.findOneAndUpdate(
                    { conversationId, fileHash },
                    { status: "failed", error: error.message || "Unknown error" }
                ).catch(() => {});
            }

            return {
                ...state,
                response: `❌ **Error uploading file:** ${error.message || "Unknown error"}`,
            };
        }
    }

    console.log(`🔍 [KnowledgeAgent] Checking for ready files in conversation ${conversationId}`);
    const processedFiles = await ProcessedFile.find({ conversationId, status: "ready" });
    console.log(`🔍 [KnowledgeAgent] Found ${processedFiles.length} ready files`);

    if (processedFiles.length === 0) {
        return {
            ...state,
            response: "You haven't uploaded any documents yet, or they are still processing. Please upload a PDF and try again later.",
        };
    }

    const response = await queryRagDocument({
        conversationId,
        userId,
        query: prompt,
    });

    return {
        ...state,
        response: response.answer,
    };
};