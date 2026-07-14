// import { createSlice } from '@reduxjs/toolkit'


// const initialState = {
//    conversations:[],
//   selectedConversation:null
// }

// export const conversationSlice = createSlice({
//   name: 'conversation',
//   initialState,
//   reducers: {
//      setConversations:(state,action)=>{
//    state.conversations=action.payload;

//   },

//   addConversation:(state,action)=>{

//    state.conversations.unshift(action.payload);

//   },

//   setSelectedConversation: (state,action)=>{

//    state.selectedConversation =action.payload;

//   },
// setConvTitle:(state,action)=>{

//  const {
//   conversationId,
//   title
//  } = action.payload;

//  state.conversations =
//  state.conversations.map((conv)=>
//   conv._id === conversationId
//    ? {
//       ...conv,
//       title
//      }
//    : conv
//  );

//  if(
//   state.selectedConversation?._id ===
//   conversationId
//  ){

//   state.selectedConversation = {
//    ...state.selectedConversation,
//    title
//   };

//  }

// }

 
//   },
// })

// // Action creators are generated for each case reducer function
// export const {setConversations,addConversation,setSelectedConversation,setConvTitle} = conversationSlice.actions

// export default conversationSlice.reducer

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  conversations: [],       // flat list (kept for backward compatibility)
  folders: [],             // array of folder objects with nested conversations
  selectedConversation: null,
};

export const conversationSlice = createSlice({
  name: "conversation",
  initialState,
  reducers: {
    setConversations: (state, action) => {
      state.conversations = action.payload;
    },
    setFoldersWithConversations: (state, action) => {
      // payload is the array from backend
      state.folders = action.payload;
      // also update flat conversations list for convenience
      const allConvs = [];
      action.payload.forEach((folder) => {
        folder.conversations?.forEach((conv) => allConvs.push(conv));
      });
      state.conversations = allConvs;
    },
    addConversation: (state, action) => {
      state.conversations.unshift(action.payload);
      // also add to the appropriate folder (or uncategorized)
      const conv = action.payload;
      const folderId = conv.folderId?.toString();
      if (folderId) {
        const folder = state.folders.find((f) => f._id === folderId);
        if (folder) {
          folder.conversations.unshift(conv);
        }
      } else {
        // find uncategorized folder (the one with _id: null)
        const uncat = state.folders.find((f) => f._id === null);
        if (uncat) {
          uncat.conversations.unshift(conv);
        }
      }
    },
    setSelectedConversation: (state, action) => {
      state.selectedConversation = action.payload;
    },
    setConvTitle: (state, action) => {
      const { conversationId, title } = action.payload;
      state.conversations = state.conversations.map((conv) =>
        conv._id === conversationId ? { ...conv, title } : conv
      );
      // also update in folders
      state.folders.forEach((folder) => {
        folder.conversations = folder.conversations.map((conv) =>
          conv._id === conversationId ? { ...conv, title } : conv
        );
      });
      if (state.selectedConversation?._id === conversationId) {
        state.selectedConversation.title = title;
      }
    },
    // move conversation between folders
    moveConversationLocal: (state, action) => {
      const { conversationId, folderId } = action.payload;
      // find the conversation in all folders and move it
      let convToMove = null;
      // remove from old folder
      state.folders.forEach((folder) => {
        const index = folder.conversations.findIndex((c) => c._id === conversationId);
        if (index !== -1) {
          convToMove = folder.conversations.splice(index, 1)[0];
        }
      });
      if (!convToMove) {
        // maybe it's in the flat list but not in folders? fallback
        convToMove = state.conversations.find((c) => c._id === conversationId);
        if (convToMove) {
          // remove from flat list? we'll keep it
        }
      }
      if (convToMove) {
        // add to new folder
        if (folderId) {
          const targetFolder = state.folders.find((f) => f._id === folderId);
          if (targetFolder) {
            targetFolder.conversations.unshift(convToMove);
          }
        } else {
          // uncategorized
          const uncat = state.folders.find((f) => f._id === null);
          if (uncat) {
            uncat.conversations.unshift(convToMove);
          }
        }
        // update the conversation's folderId in the flat list
        state.conversations = state.conversations.map((c) =>
          c._id === conversationId ? { ...c, folderId } : c
        );
        if (state.selectedConversation?._id === conversationId) {
          state.selectedConversation.folderId = folderId;
        }
      }
    },

    togglePinConversationLocal: (state, action) => {
      const { conversationId, pinned } = action.payload;
      // update in flat list
      state.conversations = state.conversations.map((c) =>
        c._id === conversationId ? { ...c, pinned } : c
      );
      // update in folders
      state.folders.forEach((folder) => {
        folder.conversations = folder.conversations.map((c) =>
          c._id === conversationId ? { ...c, pinned } : c
        );
      });
      // if selected conversation, update it
      if (state.selectedConversation?._id === conversationId) {
        state.selectedConversation.pinned = pinned;
      }
    },
    deleteConversationLocal: (state, action) => {
      const { conversationId } = action.payload;
      // remove from flat list
      state.conversations = state.conversations.filter((c) => c._id !== conversationId);
      // remove from folders
      state.folders.forEach((folder) => {
        folder.conversations = folder.conversations.filter((c) => c._id !== conversationId);
      });
      // if it was selected, clear selection
      if (state.selectedConversation?._id === conversationId) {
        state.selectedConversation = null;
      }
    }
  },
});

export const {
  setConversations,
  setFoldersWithConversations,
  addConversation,
  setSelectedConversation,
  setConvTitle,
  moveConversationLocal,
  togglePinConversationLocal,
  deleteConversationLocal
} = conversationSlice.actions;

export default conversationSlice.reducer;