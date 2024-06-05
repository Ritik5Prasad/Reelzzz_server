const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reel: { type: mongoose.Schema.Types.ObjectId, ref: "Reel", required: true },
  comment: { type: String, maxlength: 500 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Like" }],
  isPinned: { type: Boolean, default: false },
  isLikedByAuthor: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
  hasGif: { type: Boolean, default: false },
  gifUrl: { type: String },
  mentionedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reply" }],
});

const Comment = mongoose.model("Comment", CommentSchema);

module.exports = Comment;
