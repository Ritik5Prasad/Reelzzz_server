const { StatusCodes } = require("http-status-codes");
const jwt = require("jsonwebtoken");

const { BadRequestError, NotFoundError } = require("../../errors");
const User = require("../../models/User");
const Reel = require("../../models/Reel");

// Get user profile
const getProfile = async (req, res) => {
  const accessToken = req.headers.authorization?.split(" ")[1];

  const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
  const userId = decodedToken.userId;

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  try {
    const followersCount = await User.countDocuments({ following: user._id });
    const followingCount = await User.countDocuments({ followers: user._id });
    const reelsCount = await Reel.countDocuments({ user: user._id });

    res.status(StatusCodes.OK).json({
      user: {
        name: user.name,
        id: user.id,
        username: user.username,
        userImage: user.userImage,
        email: user.email,
        bio: user.bio,
        followersCount,
        followingCount,
        reelsCount,
      },
    });
  } catch (error) {
    throw new BadRequestError(error);
  }
};

const viewUserById = async (req, res) => {
  const userId = req.params.userId;

  if (!userId) {
    throw new BadRequestError("Missing user ID in path parameter");
  }

  const user = await User.findById(userId).select('-followers -following');
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const followersCount = await User.countDocuments({ following: user._id });
  const followingCount = await User.countDocuments({ followers: user._id });
  const reelsCount = await Reel.countDocuments({ user: user._id });

  res.status(StatusCodes.OK).json({
    user: {
      ...user._doc, // Include all user properties
      followersCount,
      followingCount,
      reelsCount,
    },
  });
};

// Update user profile
const updateProfile = async (req, res) => {
  const accessToken = req.headers.authorization?.split(" ")[1];

  const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
  const userId = decodedToken.userId;

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const { name, bio, userImage } = req.body;

  if (!name && !bio && !userImage) {
    throw new BadRequestError("No Update Fields provided");
  }

  try {
    if (name) user.name = name;
    if (bio) user.bio = bio;
    if (userImage) user.userImage = userImage;

    await user.save();

    res.status(StatusCodes.OK).json({ msg: "Profile updated successfully" });
  } catch (error) {
    throw new BadRequestError(error);
  }
};

const toggleFollowing = async (req, res) => {
  const accessToken = req.headers.authorization?.split(" ")[1];
  const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
  const userId = decodedToken.userId;

  const targetUserId = req.params.userId;

  if (!targetUserId) {
    throw new BadRequestError("Missing target user ID");
  }

  // Check if the target user exists
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw new NotFoundError("User not found");
  }

  const currentUser = await User.findById(userId);
  if (!currentUser) {
    throw new NotFoundError("User not found");
  }

  try {
    const isFollowing = currentUser.following.includes(targetUserId); // Check if already following

    if (isFollowing) {
      // Unfollow
      currentUser.following.pull(targetUserId);
      targetUser.followers.pull(userId);
    } else {
      // Follow
      currentUser.following.push(targetUserId);
      targetUser.followers.push(userId);
    }

    await currentUser.save();
    await targetUser.save();

    res
      .status(StatusCodes.OK)
      .json({ msg: isFollowing ? "Unfollowed" : "Followed" });
  } catch (error) {
    throw new BadRequestError(error);
  }
};

const getFollowers = async (req, res) => {
  const userId = req.params.userId;

  if (!userId) {
    throw new BadRequestError("Missing user ID in query parameter");
  }

  const user = await User.findById(userId).populate("followers", "name username userImage");
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const followers = user.followers;
  res.status(StatusCodes.OK).json({ followers });
};

// Get following list
const getFollowing = async (req, res) => {
  const userId = req.params.userId;

  if (!userId) {
    throw new BadRequestError("Missing user ID in query parameter");
  }

  const user = await User.findById(userId).populate("following", "name username userImage");
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const following = user.following;
  res.status(StatusCodes.OK).json({ following });
};

module.exports = {
  getProfile,
  updateProfile,
  toggleFollowing,
  getFollowers,
  getFollowing,
  viewUserById,
};
