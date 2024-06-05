const mongoose = require("mongoose");

const LikeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reel: { type: mongoose.Schema.Types.ObjectId, ref: "Reel" },
    comment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" },
    reply: { type: mongoose.Schema.Types.ObjectId, ref: "Reply" },
  },
  { timestamps: true }
);

const Like = mongoose.model("Like", LikeSchema);

module.exports = Like;
