import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import { ChatOpenRouter } from "@langchain/openrouter";
import dotenv from "dotenv";
dotenv.config();

export const getModel = (agent, options = {}) => {
  const { streaming = false } = options;

  // Common parameters for all models
  const commonParams = {
    temperature: 0,
    streaming, // <-- this enables token streaming
  };

  switch (agent) {
    case "coding":
      return new ChatOpenRouter({
        model: "deepseek/deepseek-chat",
        ...commonParams,
        maxTokens: 2500,
      });

    case "image":
      return new ChatGroq({
        model: "llama-3.3-70b-versatile",
        ...commonParams,
        maxRetries: 2,
      });

    case "search":
      return new ChatGroq({
        model: "llama-3.3-70b-versatile",
        ...commonParams,
        maxRetries: 2,
      });

    case "chat":
      return new ChatGroq({
        model: "llama-3.3-70b-versatile",
        ...commonParams,
        maxRetries: 2,
      });

    case "vision":
      return new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey: process.env.GOOGLE_API_KEY,
        ...commonParams,
      });

    case "pdf-rag":    // same
      return new ChatGroq({
        model: "llama-3.3-70b-versatile",
        ...commonParams,
        maxRetries: 2,
      });

    case "memory":     // router should NOT stream – we'll pass streaming: false
      return new ChatGroq({
        model: "llama-3.3-70b-versatile",
        ...commonParams,
        maxRetries: 2,
      });

    default:
      return new ChatGroq({
        model: "llama-3.3-70b-versatile",
        ...commonParams,
        maxRetries: 2,
      });
  }
};