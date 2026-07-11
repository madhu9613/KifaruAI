import express from "express";
import {
    createConversation,
    getConversations,
    getMessages,
    saveMessage,
    updateConversation,
} from "../controllers/chat.controller.js";

import {
    getFolders,
    getFoldersWithConversations,
    createFolder,
    updateFolder,
    deleteFolder,
    moveConversation,
    togglePinConversation,
    deleteConversation
} from "../controllers/folder.controller.js";

const router = express.Router();

router.post("/create-conversation", createConversation);
router.get("/get-conversations", getConversations);
router.post("/update-conversation", updateConversation);
router.post("/save-message", saveMessage);
router.get("/get-messages/:id", getMessages);
router.delete("/conversations/:conversationId", deleteConversation);

router.get("/folders", getFolders);
router.get("/folders-with-conversations", getFoldersWithConversations);
router.post("/folders", createFolder);
router.put("/folders/:id", updateFolder);
router.delete("/folders/:id", deleteFolder);
router.post("/conversations/move", moveConversation);
router.patch("/conversations/:conversationId/pin", togglePinConversation);
export default router;