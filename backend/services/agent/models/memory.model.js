import mongoose from "mongoose";

const memorySchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, index: true },
        text: { type: String, required: true },                // "My name is Madhujya"
        category: { type: String, default: "general", index: true }, // "identity", "preference", etc.
        importance: { type: Number, default: 3, min: 1, max: 10 },
        sourceMessageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    },
    { timestamps: true }
);

memorySchema.index({ userId: 1, category: 1 });

export default mongoose.model("Memory", memorySchema);