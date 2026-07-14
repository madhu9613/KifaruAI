import mongoose from "mongoose";

const processedFileSchema = new mongoose.Schema(
    {
        conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
        userId: { type: String, required: true, index: true },
        fileId: { type: String, unique: true, required: true },
        fileName: { type: String, required: true },
        fileHash: { type: String, required: true, index: true },
        sourceType: { type: String, default: "pdf" },
        status: { type: String, enum: ["processing", "ready", "failed"], default: "processing" },
        chunkCount: { type: Number, default: 0 },
        error: { type: String },
    },
    { timestamps: true }
);

processedFileSchema.index({ conversationId: 1, fileHash: 1 });

export default mongoose.model("ProcessedFile", processedFileSchema);