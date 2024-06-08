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

LikeSchema.index({ user: 1, reel: 1 });
LikeSchema.index({ user: 1, comment: 1 });
LikeSchema.index({ user: 1, reply: 1 });

const Like = mongoose.model("Like", LikeSchema);

module.exports = Like;
