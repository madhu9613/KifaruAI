import Folder from "../models/folder.model.js";
import Conversation from "../models/conversation.model.js";

export const getFolders = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const folders = await Folder.find({ userId }).sort({ order: 1, name: 1 });
        res.json(folders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getFoldersWithConversations = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const folders = await Folder.find({ userId }).sort({ order: 1, name: 1 });

        const conversations = await Conversation.find({ userId })
            .sort({ pinned: -1, updatedAt: -1 }) // pinned first
            .lean();

        const folderMap = {};
        folders.forEach((f) => {
            folderMap[f._id.toString()] = { ...f.toObject(), conversations: [] };
        });

        const uncategorized = { _id: null, name: "Uncategorized", conversations: [] };

        conversations.forEach((conv) => {
            const folderId = conv.folderId?.toString();
            if (folderId && folderMap[folderId]) {
                folderMap[folderId].conversations.push(conv);
            } else {
                uncategorized.conversations.push(conv);
            }
        });

        const result = Object.values(folderMap);
        if (uncategorized.conversations.length > 0) {
            result.push(uncategorized);
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createFolder = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: "Folder name is required" });
        }
        const folder = await Folder.create({ userId, name });
        res.status(201).json(folder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateFolder = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const { id } = req.params;
        const { name } = req.body;
        const folder = await Folder.findOneAndUpdate(
            { _id: id, userId },
            { name },
            { new: true }
        );
        if (!folder) {
            return res.status(404).json({ message: "Folder not found" });
        }
        res.json(folder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteFolder = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const { id } = req.params;
        const folder = await Folder.findOneAndDelete({ _id: id, userId });
        if (!folder) {
            return res.status(404).json({ message: "Folder not found" });
        }
        // Move all conversations in this folder to uncategorized (folderId = null)
        await Conversation.updateMany(
            { folderId: id, userId },
            { folderId: null }
        );
        res.json({ message: "Folder deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const moveConversation = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const { conversationId, folderId } = req.body; // folderId can be null
        const conversation = await Conversation.findOneAndUpdate(
            { _id: conversationId, userId },
            { folderId },
            { new: true }
        );
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }
        res.json(conversation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const togglePinConversation = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const { conversationId } = req.params;
        const conversation = await Conversation.findOne({ _id: conversationId, userId });
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }
        conversation.pinned = !conversation.pinned;
        await conversation.save();
        res.json(conversation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteConversation = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const { conversationId } = req.params;
        const conversation = await Conversation.findOneAndDelete({ _id: conversationId, userId });
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }
        res.json({ message: "Conversation deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};