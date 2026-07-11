import { getMemoriesFromCache, setMemoriesInCache } from "./memoryCache.js";
import Memory from "../models/memory.model.js";

export const getUserMemories = async (userId) => {
  let memories = await getMemoriesFromCache(userId);
  if (memories) {
    console.log(`📦 [Cache] Memories found in Redis for user ${userId}`);
    return memories;
  }

  console.log(`📦 [Cache] Miss for user ${userId}, fetching from MongoDB...`);
  const docs = await Memory.find({ userId })
    .sort({ importance: -1, updatedAt: -1 })
    .limit(20)
    .lean();

  if (docs.length > 0) {
    await setMemoriesInCache(userId, docs);
  }
  return docs;
};