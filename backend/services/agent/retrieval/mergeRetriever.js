export const mergeResults = (vectorResults, keywordResults) => {
    const merged = new Map();

    // Normalize scores (min‑max scaling across all results)
    const allScores = [...vectorResults, ...keywordResults].map(r => r.score);
    const maxScore = Math.max(...allScores, 1);
    const minScore = Math.min(...allScores, 0);

    const normalize = (score) => (maxScore === minScore ? 0.5 : (score - minScore) / (maxScore - minScore));

    // Add vector results
    vectorResults.forEach(r => {
        const key = `${r.fileId}-${r.chunkIndex}`;
        if (!merged.has(key)) {
            merged.set(key, { ...r, score: normalize(r.score) });
        }
    });

    // Add keyword results (update if higher normalized score)
    keywordResults.forEach(r => {
        const key = `${r.fileId}-${r.chunkIndex}`;
        const norm = normalize(r.score);
        if (!merged.has(key) || norm > merged.get(key).score) {
            merged.set(key, { ...r, score: norm });
        }
    });

    return Array.from(merged.values()).sort((a, b) => b.score - a.score);
};