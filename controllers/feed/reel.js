const Reel = require("../../models/Reel");
const User = require("../../models/User");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../../errors");
const jwt = require("jsonwebtoken");

const createReel = async (req, res) => {
  const { videoUri, thumbUri, caption } = req.body;
  if (!videoUri || !thumbUri || !caption) {
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
    const newReel = new Reel({ user: userId, videoUri, caption, thumbUri });
    await newReel.save();

    res.status(StatusCodes.CREATED).json(newReel);
  } catch (error) {
    throw new BadRequestError(error);
  }
};

const deleteReel = async (req, res) => {
  const { reelId } = req.params;
  const accessToken = req.headers.authorization?.split(" ")[1];

  try {
    const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    const userId = decodedToken.userId;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      throw new NotFoundError("Reel not found");
    }

    // Check if the authenticated user is the owner of the reel
    if (reel.user.toString() !== userId) {
      throw new BadRequestError("Unauthorized: You are not the owner of this reel");
    }

    await reel.remove();

    res.status(StatusCodes.OK).json({ msg: "Reel deleted successfully" });
  } catch (error) {
    console.error(error);
    throw new BadRequestError(error);
  }
};

const updateReelCaption = async (req, res) => {
  const { reelId } = req.params;
  const { caption } = req.body;
  const accessToken = req.headers.authorization?.split(" ")[1];

  try {
    const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    const userId = decodedToken.userId;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      throw new NotFoundError("Reel not found");
    }

    // Check if the authenticated user is the owner of the reel
    if (reel.user.toString() !== userId) {
      throw new BadRequestError("Unauthorized: You are not the owner of this reel");
    }

    reel.caption = caption;
    await reel.save();

    res.status(StatusCodes.OK).json(reel);
  } catch (error) {
    throw new BadRequestError(error);
  }
};

module.exports = { createReel, deleteReel, updateReelCaption };
