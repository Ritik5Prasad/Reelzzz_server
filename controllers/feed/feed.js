const { StatusCodes } = require("http-status-codes");
const Like = require("../../models/Like");
const Reel = require("../../models/Reel");
const UserHistory = require("../../models/UserHistory");
const User = require("../../models/User");
const { NotFoundError, BadRequestError } = require("../../errors");
const jwt = require("jsonwebtoken");
const Comment = require("../../models/Comment");

// Get liked videos with counts
const getLikedVideos = async (req, res) => {
  const { limit = 10, offset = 0 } = req.query;
  const userId = req.params.userId;
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  try {
    const likedVideos = await Like.find({
      user: userId,
      reel: { $exists: true },
    })
      .populate({
        path: "reel",
        populate: { path: "user", select: "username userImage name" },
        select: "-likes -comments",
      })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const likedVideosWithCounts = await Promise.all(
      likedVideos.map(async (like) => {
        const reel = like.reel;
        const likesCount = await Like.countDocuments({ reel: reel._id });
        const commentsCount = await Comment.countDocuments({
          reel: reel._id,
        });

        return {
          ...reel.toJSON(),
          likesCount,
          commentsCount,
        };
      })
    );

    res.status(StatusCodes.OK).json({ likedVideos: likedVideosWithCounts });
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Internal Server Error" });
  }
};

// Get user's reel posts with counts
const getReelPosts = async (req, res) => {
  const { limit = 10, offset = 0 } = req.query;
  const userId = req.params.userId;
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  try {
    const myReelPosts = await Reel.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .populate("user", "name userImage username")
      .select("-comments -likes")
      .exec();

    const myReelPostsWithCounts = await Promise.all(
      myReelPosts.map(async (reelPost) => {
        const likesCount = await Like.countDocuments({ reel: reelPost._id });
        const commentsCount = await Comment.countDocuments({
          reel: reelPost._id,
        });

        return {
          ...reelPost.toJSON(),
          likesCount,
          commentsCount,
        };
      })
    );

    res.status(StatusCodes.OK).json({ myReelPosts: myReelPostsWithCounts });
  } catch (error) {
    console.error(error);
    throw new BadRequestError(error);
  }
};

// Get all history reels with counts
const getAllHistoryReels = async (req, res) => {
  const { limit = 10, offset = 0 } = req.query;
  const userId = req.params.userId;
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  try {
    const userHistory = await UserHistory.findOne({ user: userId })
      .limit(limit)
      .skip(offset);
    if (!userHistory) {
      return res.status(StatusCodes.OK).json({ watchedReels: [] });
    }

    const allHistoryReels = userHistory.reels.reverse();

    const watchedReelsWithCounts = await Promise.all(
      allHistoryReels.map(async (historyReel) => {
        const reel = await Reel.findById(historyReel.reel)
          .select("-comments -likes")
          .populate("user", "name userImage username")
          .exec();
        const likesCount = await Like.countDocuments({ reel: reel._id });
        const commentsCount = await Comment.countDocuments({
          reel: reel._id,
        });

        return {
          ...reel.toJSON(),
          likesCount,
          commentsCount,
        };
      })
    );

    res.status(StatusCodes.OK).json({ watchedReels: watchedReelsWithCounts });
  } catch (error) {
    console.error(error);
    throw new BadRequestError(error);
  }
};

// Mark reels as watched
const markReelsWatched = async (req, res) => {
  const { reelIds } = req.body;
  const accessToken = req.headers.authorization?.split(" ")[1];
  const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
  const userId = decodedToken.userId;

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  try {
    let userHistory = await UserHistory.findOne({ user: userId });
    if (!userHistory) {
      userHistory = new UserHistory({ user: userId, reels: [] });
    }

    for (const reelId of reelIds) {
      if (!userHistory.reels.some((r) => r.reel.toString() === reelId)) {
        userHistory.reels.push({ reel: reelId });

        // Increment view count for the reel
        await Reel.findByIdAndUpdate(reelId, { $inc: { viewCount: 1 } });
      }
    }

    await userHistory.save();

    res
      .status(StatusCodes.OK)
      .json({ message: "Reels marked as watched successfully" });
  } catch (error) {
    console.error(error);
    throw new BadRequestError(error);
  }
};

const getHomeFeed = async (req, res) => {
  let { limit = 50, offset = 0 } = req.query;
  limit = parseInt(limit);
  offset = parseInt(offset);

  const accessToken = req.headers.authorization?.split(" ")[1];
  const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
  const userId = decodedToken.userId;

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  try {
    const following = user.following;

    const userHistory = await UserHistory.findOne({ user: userId });
    const watchedReelIds = userHistory
      ? userHistory.reels.map((r) => r.reel)
      : [];

    const reelsFromFollowing = await Reel.find({
      user: { $in: following },
      _id: { $nin: watchedReelIds },
    })
      .sort({ createdAt: -1 })
      .limit(Math.round(limit * 0.5))
      .populate("user", "username name userImage")
      .exec();

    const mostLikedReels = await Reel.aggregate([
      { $match: { _id: { $nin: watchedReelIds } } },
      {
        $project: {
          user: 1,
          videoUri: 1,
          thumbUri: 1,
          caption: 1,
          likesCount: { $size: "$likes" },
          commentsCount: { $size: "$comments" },
          createdAt: 1,
        },
      },
      { $sort: { likesCount: -1, commentsCount: -1, createdAt: -1 } },
      { $limit: Math.round(limit * 0.3) },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          videoUri: 1,
          thumbUri: 1,
          caption: 1,
          createdAt: 1,
          likesCount: 1,
          commentsCount: 1,
          user: {
            username: "$user.username",
            name: "$user.name",
            userImage: "$user.userImage",
          },
        },
      },
    ]);

    const latestReels = await Reel.find({ _id: { $nin: watchedReelIds } })
      .sort({ createdAt: -1 })
      .limit(Math.round(limit * 0.2))
      .populate("user", "username name userImage")
      .exec();

    const allReels = [...reelsFromFollowing, ...mostLikedReels, ...latestReels];
    const uniqueReelsMap = new Map();

    allReels.forEach((reel) => {
      if (!uniqueReelsMap.has(reel._id.toString())) {
        uniqueReelsMap.set(reel._id.toString(), reel);
      }
    });

    const uniqueReels = Array.from(uniqueReelsMap.values());

    const response = uniqueReels.map((reel) => ({
      _id: reel._id,
      videoUri: reel.videoUri,
      thumbUri: reel.thumbUri,
      caption: reel.caption,
      createdAt: reel.createdAt,
      user: {
        username: reel.user.username,
        name: reel.user.name,
        userImage: reel.user.userImage,
      },
      likesCount: reel.likesCount,
      commentsCount: reel.commentsCount,
    }));

    res
      .status(StatusCodes.OK)
      .json({ reels: response.slice(offset, offset + limit) });
  } catch (error) {
    console.error(error);
    throw new BadRequestError(error);
  }
};

module.exports = {
  getLikedVideos,
  getReelPosts,
  getAllHistoryReels,
  markReelsWatched,
  getHomeFeed,
};
