export const buildContext = (documents, webResults = null) => {
    let context = "";
    if (documents.length > 0) {
        context += `\n=========================\nKNOWLEDGE BASE (${documents.length} relevant excerpts):\n`;
        context += documents
            .map(
                (doc, i) =>
                    `Excerpt ${i + 1} (relevance: ${doc.rerankScore?.toFixed(3) || doc.score?.toFixed(3)}):\n${doc.pageContent}`
            )
            .join("\n\n-------------------------\n\n");
    }
    if (webResults && webResults.length > 0) {
        context += `\n=========================\nWEB SEARCH RESULTS:\n`;
        context += webResults
            .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}\nSource: ${r.url}`)
            .join("\n\n");
    }
    return context;
};