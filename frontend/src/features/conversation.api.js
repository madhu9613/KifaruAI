import api from "../utils/axios";


export const getConversations =async()=>{

 const response =await api.get( "/api/chat/get-conversations"
 );

 return response.data;

};
export const updateConversations =async(conversationId,title)=>{

 const response =await api.post( "/api/chat/update-conversation",{
    conversationId,title
 }
 );

 return response.data;

};

export const createConversation =async()=>{

 const response =await api.post("/api/chat/create-conversation",{});

 return response.data;

};

export const getFoldersWithConversations = async () => {
   const { data } = await api.get("/api/chat/folders-with-conversations");
   return data;
};

export const createFolder = async (name) => {
   const { data } = await api.post("/api/chat/folders", { name });
   return data;
};

export const renameFolder = async (folderId, name) => {
   const { data } = await api.put(`/api/chat/folders/${folderId}`, { name });
   return data;
};

export const deleteFolder = async (folderId) => {
   const { data } = await api.delete(`/api/chat/folders/${folderId}`);
   return data;
};

export const moveConversation = async (conversationId, folderId) => {
   const { data } = await api.post("/api/chat/conversations/move", {
      conversationId,
      folderId,
   });
   return data;
};

export const togglePinConversation = async (conversationId) => {
   const { data } = await api.patch(`/api/chat/conversations/${conversationId}/pin`);
   return data;
};

export const deleteConversation = async (conversationId) => {
   const { data } = await api.delete(`/api/chat/conversations/${conversationId}`);
   return data;
};