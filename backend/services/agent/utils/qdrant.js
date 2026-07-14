import { QdrantClient } from "@qdrant/js-client-rest";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { v4 as uuidv4 } from "uuid";
import KnowledgeChunk from "../models/knowledgeChunk.model.js";
import { TaskType } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();
const COLLECTION_NAME = "knowledge_collection";
const EMBEDDING_MODEL = "gemini-embedding-001";
const client = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    checkCompatibility: false,
});

// 🧠 Use Google Gemini embeddings with explicit retrieval task types.
const documentEmbeddings = new GoogleGenerativeAIEmbeddings({
    modelName: EMBEDDING_MODEL,
    taskType: TaskType.RETRIEVAL_DOCUMENT,
    title: "Kifaru uploaded PDF chunk",
    apiKey: process.env.GOOGLE_API_KEY,
});

const queryEmbeddings = new GoogleGenerativeAIEmbeddings({
    modelName: EMBEDDING_MODEL,
    taskType: TaskType.RETRIEVAL_QUERY,
    apiKey: process.env.GOOGLE_API_KEY,
});

const ensurePayloadIndex = async (fieldName) => {
    try {
        await client.createPayloadIndex(COLLECTION_NAME, {
            field_name: fieldName,
            field_schema: "keyword",
            wait: true,
        });
    } catch (error) {
        if (error?.status !== 409) {
            throw error;
        }
    }
};

const ensureCollection = async () => {
    try {
        await client.getCollection(COLLECTION_NAME);
    } catch (error) {
        if (error.status === 404) {
            await client.createCollection(COLLECTION_NAME, {
                vectors: { size: 768, distance: "Cosine" }, // Gemini embeddings are 768‑dim
                optimizers_config: { default_segment_number: 2 },
            });
        } else throw error;
    }

    await ensurePayloadIndex("conversationId");
    await ensurePayloadIndex("fileId");
};

const assertValidVectors = (vectors, expectedCount) => {
    if (!Array.isArray(vectors) || vectors.length !== expectedCount) {
        throw new Error("Embedding service returned an unexpected number of vectors.");
    }

    const invalidIndex = vectors.findIndex(vector => !Array.isArray(vector) || vector.length === 0);
    if (invalidIndex !== -1) {
        throw new Error(`Embedding service returned an empty vector for chunk ${invalidIndex + 1}.`);
    }
};

// ─── BATCH UPSERT ──────────────────────────────────
export const batchUpsertKnowledge = async (
    chunks,
    conversationId,
    userId,
    fileId,
    fileName,
    sourceType = "pdf",
    metadata = {}
) => {
    await ensureCollection();

    // Replace any previous chunks for the same upload so retries don't duplicate data.
    await client.delete(COLLECTION_NAME, {
        wait: true,
        filter: {
            must: [
                { key: "conversationId", match: { value: conversationId.toString() } },
                { key: "fileId", match: { value: fileId } },
            ],
        },
    });

    await KnowledgeChunk.deleteMany({ conversationId, fileId });

    const texts = chunks.map(c => c.pageContent?.trim()).filter(Boolean);
    if (!texts.length) {
        throw new Error("No readable text found in the uploaded PDF.");
    }

    // Batch embed with Gemini
    const vectors = await documentEmbeddings.embedDocuments(texts);
    assertValidVectors(vectors, texts.length);

    const points = texts.map((text, i) => ({
        id: uuidv4(),
        vector: vectors[i],
        payload: {
            conversationId: conversationId.toString(),
            userId,
            fileId,
            fileName,
            sourceType,
            text,
            pageNumber: chunks[i]?.metadata?.loc?.pageNumber || metadata.pageNumber || 1,
            chunkIndex: i,
            totalChunks: texts.length,
            uploadedAt: new Date().toISOString(),
            title: metadata.title || fileName,
            section: metadata.section || null,
            tags: metadata.tags || [],
            language: metadata.language || "en",
        },
    }));

    if (points.length) {
        await client.upsert(COLLECTION_NAME, { points });
    }

    // Store in MongoDB for keyword search
    const mongoChunks = texts.map((text, i) => ({
        conversationId,
        userId,
        fileId,
        fileName,
        text,
        metadata: {
            pageNumber: chunks[i]?.metadata?.loc?.pageNumber || metadata.pageNumber || 1,
            chunkIndex: i,
            totalChunks: texts.length,
            sourceType,
            section: metadata.section || null,
            tags: metadata.tags || [],
            language: metadata.language || "en",
            title: metadata.title || fileName,
        },
    }));

    await KnowledgeChunk.insertMany(mongoChunks, { ordered: false });
    return points.length;
};

// ─── VECTOR SEARCH ──────────────────────────────────
export const vectorSearch = async (query, conversationId, topK = 20) => {
    await ensureCollection();
    const queryVector = await queryEmbeddings.embedQuery(query);
    if (!Array.isArray(queryVector) || queryVector.length === 0) {
        throw new Error("Embedding service returned an empty query vector.");
    }
    const results = await client.search(COLLECTION_NAME, {
        vector: queryVector,
        limit: topK,
        filter: {
            must: [{ key: "conversationId", match: { value: conversationId.toString() } }],
        },
    });

    return results.map(hit => ({
        pageContent: hit.payload.text,
        metadata: hit.payload,
        score: hit.score,
        source: "qdrant",
        fileId: hit.payload.fileId,
        chunkIndex: hit.payload.chunkIndex,
    }));
};