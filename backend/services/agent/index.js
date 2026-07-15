import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import router from "./routes/agent.route.js";
dotenv.config();
const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
const port=process.env.PORT

app.use("/",router);


app.use((err, req, res, next) => {

  console.error(err);

  if (err.status) {

    return res
      .status(err.status)
      .json(err.data);

  }

  return res
    .status(500)
    .json({

      success: false,

      message: err.message || "Internal Server Error"

    });

});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "agent"
  });
});

app.listen(port, () => {
    connectDB()
  console.log(
    `agent service running on ${port}`
  );
});
