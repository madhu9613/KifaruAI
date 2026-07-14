import axios from "axios";

const ragBaseUrl = process.env.RAG_SERVICE_URL || "http://localhost:8010";

const ragClient = axios.create({
    baseURL: ragBaseUrl,
    timeout: 120000,
});

export const ingestPdfDocument = async ({ conversationId, userId, fileId, fileName, fileBuffer }) => {
    const { data } = await ragClient.post("/ingest", {
        conversation_id: conversationId,
        user_id: userId,
        file_id: fileId,
        file_name: fileName,
        file_base64: fileBuffer,
        source_type: "pdf",
    });

    return data;
};

export const queryRagDocument = async ({ conversationId, userId, query, topK = 8 }) => {
    const { data } = await ragClient.post("/query", {
        conversation_id: conversationId,
        user_id: userId,
        query,
        top_k: topK,
    });

    return data;
};
