import express from "express";
import dotenv from "dotenv";
import router from "./routes/chat.routes.js";
import connectDB from "./config/db.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 8002;

app.use(express.json());


// Health check endpoint (Render / Docker / Load balancer)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "chat",
    timestamp: new Date().toISOString()
  });
});


app.use("/", router);


const startServer = async () => {
  try {
    await connectDB();

    app.listen(port, () => {
      console.log(`Chat service running on port ${port}`);
    });

  } catch (error) {
    console.error("Failed to start chat service:", error);
    process.exit(1);
  }
};


startServer();