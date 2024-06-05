const mongoose = require("mongoose");

const UserHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reels: [
    {
      reel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reel",
        required: true,
      },
      watchedAt: { type: Date, default: Date.now },
    },
  ],
});

const UserHistory = mongoose.model("UserHistory", UserHistorySchema);

module.exports = UserHistory;
