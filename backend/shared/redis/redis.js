import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

console.log(process.env.REDIS_URL);

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis.on("connect", () => {
  console.log("✅ Redis Connected");
});

redis.on("error", (err) => {
  console.error(err);
});

export default redis;