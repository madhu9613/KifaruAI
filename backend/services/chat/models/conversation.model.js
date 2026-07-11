import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        title: { type: String, default: "New Chat" },
        folderId: {                           
            type: mongoose.Schema.Types.ObjectId,
            ref: "Folder",
            default: null,
        },
        pinned: { type: Boolean, default: false }, 

    },
    { timestamps: true }
);

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;