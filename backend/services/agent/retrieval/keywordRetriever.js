import KnowledgeChunk from "../models/knowledgeChunk.model.js";

export const keywordSearch = async (query, conversationId, topK = 20) => {
    const results = await KnowledgeChunk.find(
        {
            conversationId,
            $text: { $search: query },
        },
        { score: { $meta: "textScore" } }
    )
        .sort({ score: { $meta: "textScore" } })
        .limit(topK)
        .lean();

    return results.map(doc => ({
        pageContent: doc.text,
        metadata: doc.metadata,
        score: doc.score || 0,
        source: "mongodb",
        fileId: doc.fileId,
        chunkIndex: doc.metadata?.chunkIndex ?? 0,
    }));
};