const Reward = require("../../models/Reward");

const updateReward = async (userId, type, amount) => {
  try {
    let reward = await Reward.findOne({ user: userId });

    if (!reward) {
      reward = new Reward({ user: userId });
    }

    if (type === "tokens") {
      reward.tokens += amount;
    } else if (type === "rupees") {
      reward.rupees += amount;
    }

    await reward.save();
  } catch (error) {
    console.error("Error updating reward:", error);
  }
};

module.exports = { updateReward };
