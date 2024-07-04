require("dotenv").config();
require("express-async-errors");

const express = require("express");
const connectDB = require("./config/connect");
const notFoundMiddleware = require("./middleware/not-found");
const errorHandlerMiddleware = require("./middleware/error-handler");
const authMiddleware = require("./middleware/authentication");

const app = express();
app.use(express.json());

// Routers
const authRouter = require("./routes/auth");
const fileRouter = require("./routes/file");
const commentRouter = require("./routes/comment");
const likeRouter = require("./routes/like");
const reelRouter = require("./routes/reel");
const rewardRouter = require("./routes/reward");
const feedRouter = require("./routes/feed");
const user = require("./routes/user");
const replyRouter = require("./routes/reply");
const shareRouter = require("./routes/share");

app.use("/oauth", authRouter);
app.use("/file", fileRouter);
app.use("/share", shareRouter);
app.use("/user", authMiddleware, user);
app.use("/comment", authMiddleware, commentRouter);
app.use("/reply", authMiddleware, replyRouter);
app.use("/like", authMiddleware, likeRouter);
app.use("/reel", authMiddleware, reelRouter);
app.use("/reward", authMiddleware, rewardRouter);
app.use("/feed", authMiddleware, feedRouter);

// Middleware
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

// Start the server
const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(process.env.PORT || 3000, () =>
      console.log(`HTTP server is running on port ${process.env.PORT || 3000}`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();
