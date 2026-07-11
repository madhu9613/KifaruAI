// agent-service/utils/memoryCache.js
import redis from "../../../shared/redis/redis.js";


const MEMORY_TTL = 60 * 60 * 24 * 7; 
const MEMORY_PREFIX = "mem:user";


export const getMemoriesFromCache = async (userId) => {
    const key = `${MEMORY_PREFIX}:${userId}`;
    const data = await redis.get(key);
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch {
        return null;
    }
};

export const setMemoriesInCache = async (userId, memories) => {
    const key = `${MEMORY_PREFIX}:${userId}`;
    const simplified = memories.map(m => ({
        text: m.text,
        category: m.category || "general",
        importance: m.importance || 3,
    }));
    await redis.setex(key, MEMORY_TTL, JSON.stringify(simplified));
};


export const clearMemoryCache = async (userId) => {
    const key = `${MEMORY_PREFIX}:${userId}`;
    await redis.del(key);
};

export const invalidateMemoryCache = async (userId) => {
    await clearMemoryCache(userId);
};