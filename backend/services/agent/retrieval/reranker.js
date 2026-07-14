import { pipeline } from "@xenova/transformers";

let rerankPipeline = null;

const getReranker = async () => {
    if (!rerankPipeline) {
        rerankPipeline = await pipeline("text-classification", "Xenova/ms-marco-MiniLM-L-6-v2");
    }
    return rerankPipeline;
};

export const rerank = async (query, documents, topK = 8) => {
    const reranker = await getReranker();
    const pairs = documents.map(doc => ({ text: query, text_pair: doc.pageContent }));
    const results = await reranker(pairs, { top_k: documents.length });

    const scored = documents.map((doc, i) => ({
        ...doc,
        rerankScore: results[i]?.score || 0,
    }));

    scored.sort((a, b) => b.rerankScore - a.rerankScore);
    return scored.slice(0, topK);
};