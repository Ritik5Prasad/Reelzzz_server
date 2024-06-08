const mongoose = require("mongoose");

const ReplySchema = new mongoose.Schema({
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
    required: true,
  },
  reel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Reel",
    required: true,
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reply: { type: String, maxlength: 500 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Like" }],
  mentionedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  hasGif: { type: Boolean, default: false },
  isLikedByAuthor: { type: Boolean, default: false },
  gifUrl: { type: String },
  timestamp: { type: Date, default: Date.now },
});

ReplySchema.index({ comment: 1 });
ReplySchema.index({ user: 1 });
ReplySchema.index({ likes: 1 });

const Reply = mongoose.model("Reply", ReplySchema);
module.exports = Reply;
