import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  messages: [],
  isLoading: false,
  artifacts: [],
};

export const messageSlice = createSlice({
  name: "message",
  initialState,
  reducers: {
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    setIsLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setArtifacts: (state, action) => {
      state.artifacts = action.payload;
    },

    // NEW: update the content of the last assistant message (for streaming)
    updateLastAssistantContent: (state, action) => {
      const { content } = action.payload;
      // Find the last assistant message in the array
      for (let i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].role === "assistant") {
          state.messages[i].content = content;
          break;
        }
      }
    },

    // NEW: update the images of the last assistant message (for streaming end)
    updateLastAssistantImages: (state, action) => {
      const { images } = action.payload;
      for (let i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].role === "assistant") {
          state.messages[i].images = images;
          break;
        }
      }
    },
  },
});

// Export all action creators
export const {
  setMessages,
  addMessage,
  setIsLoading,
  setArtifacts,
  updateLastAssistantContent,
  updateLastAssistantImages,
} = messageSlice.actions;

export default messageSlice.reducer;