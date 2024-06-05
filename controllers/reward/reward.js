const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../../errors");
const Reward = require("../../models/Reward");
const User = require("../../models/User");
const jwt = require("jsonwebtoken");

const getRewards = async (req, res) => {
  const accessToken = req.headers.authorization?.split(" ")[1];

  const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
  const userId = decodedToken.userId;
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  try {
    const reward = await Reward.findOne({ user: userId }).populate(
      "user",
      "username userImage name"
    );
    if (!reward) {
      throw new NotFoundError("Reward not found");
    }

    res.status(StatusCodes.OK).json(reward);
  } catch (error) {
    console.error(error);
    if (error instanceof NotFoundError) {
      res.status(StatusCodes.NOT_FOUND).json({ error: error.message });
    } else {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "Internal Server Error" });
    }
  }
};

const redeemTokens = async (req, res) => {
  const { tokensToRedeem } = req.body;

  if (!tokensToRedeem) {
    throw new BadRequestError("Invalid Body");
  }
  const accessToken = req.headers.authorization?.split(" ")[1];

  const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
  const userId = decodedToken.userId;
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  try {
    const reward = await Reward.findOne({ user: userId });
    if (!reward) {
      throw new NotFoundError("Reward not found");
    }

    if (reward.tokens < tokensToRedeem) {
      throw new BadRequestError("Insufficient tokens");
    }

    reward.tokens -= tokensToRedeem;
    await reward.save();

    res
      .status(StatusCodes.OK)
      .json({ message: "Tokens redeemed successfully" });
  } catch (error) {
    console.error(error);
    if (error instanceof NotFoundError) {
      res.status(StatusCodes.NOT_FOUND).json({ error: error.message });
    } else if (error instanceof BadRequestError) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
    } else {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "Internal Server Error" });
    }
  }
};

const withdrawRupees = async (req, res) => {
  const { rupeesToWithdraw } = req.body;
  if (!rupeesToWithdraw) {
    throw new BadRequestError("Invalid Body");
  }
  const accessToken = req.headers.authorization?.split(" ")[1];

  const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
  const userId = decodedToken.userId;
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  try {
    const reward = await Reward.findOne({ user: userId });
    if (!reward) {
      throw new NotFoundError("Reward not found");
    }

    if (reward.rupees < rupeesToWithdraw) {
      throw new BadRequestError("Insufficient rupees");
    }

    reward.rupees -= rupeesToWithdraw;
    await reward.save();

    res
      .status(StatusCodes.OK)
      .json({ message: "Rupees withdrawn successfully" });
  } catch (error) {
    console.error(error);
    if (error instanceof NotFoundError) {
      res.status(StatusCodes.NOT_FOUND).json({ error: error.message });
    } else if (error instanceof BadRequestError) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
    } else {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "Internal Server Error" });
    }
  }
};

module.exports = { redeemTokens, withdrawRupees, getRewards };
