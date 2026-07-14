import mongoose from "mongoose";

const knowledgeChunkSchema = new mongoose.Schema(
    {
        conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
        userId: { type: String, required: true, index: true },
        fileId: { type: String, required: true },
        fileName: { type: String },
        text: { type: String, required: true },
        metadata: {
            pageNumber: Number,
            chunkIndex: Number,
            totalChunks: Number,
            sourceType: { type: String, default: "pdf" },
            section: String,
            tags: [String],
            language: String,
            title: String,
        },
    },
    { timestamps: true }
);

// Text index for MongoDB full‑text search
knowledgeChunkSchema.index({ text: "text" }, { weights: { text: 10 } });
knowledgeChunkSchema.index({ conversationId: 1, fileId: 1 });

const KnowledgeChunk = mongoose.model("KnowledgeChunk", knowledgeChunkSchema);
export default KnowledgeChunk;