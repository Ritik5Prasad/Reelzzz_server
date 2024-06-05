const mongoose = require("mongoose");

const RewardSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tokens: { type: Number, default: 0 },
  rupees: { type: Number, default: 0 },
});

const Reward = mongoose.model("Reward", RewardSchema);

module.exports = Reward;
