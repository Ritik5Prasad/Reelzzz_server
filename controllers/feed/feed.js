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
        populate: { path: "user", select: "username userImage name id" },
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
        const reelJSON = reel.toJSON();
        reelJSON.user.isFollowing = user.following.includes(reel.user._id);

        return {
          ...reelJSON,
          likesCount,
          commentsCount,
          isLiked: true,
        };
      })
    );

    res.status(StatusCodes.OK).json({ reelData: likedVideosWithCounts });
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
      .populate("user", "name userImage username id")
      .select("-comments -likes")
      .exec();

    const myReelPostsWithCounts = await Promise.all(
      myReelPosts.map(async (reelPost) => {
        const likesCount = await Like.countDocuments({ reel: reelPost._id });
        const commentsCount = await Comment.countDocuments({
          reel: reelPost._id,
        });
        const reelPostJSON = reelPost.toJSON();
        reelPostJSON.user.isFollowing = user.following.includes(
          reelPost.user._id
        );
        const isLiked = await Like.exists({ user: userId, reel: reelPost._id });
        return {
          ...reelPostJSON,
          likesCount,
          commentsCount,
          isLiked: !!isLiked,
        };
      })
    );

    res.status(StatusCodes.OK).json({ reelData: myReelPostsWithCounts });
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
          .populate("user", "name userImage username id")
          .exec();
        const likesCount = await Like.countDocuments({ reel: reel._id });
        const commentsCount = await Comment.countDocuments({
          reel: reel._id,
        });
        const reelJSON = reel.toJSON();
        reelJSON.user.isFollowing = user.following.includes(reel.user._id);
        const isLiked = await Like.exists({ user: userId, reel: reelPost._id });
        return {
          ...reelJSON,
          likesCount,
          isLiked: !!isLiked,
          commentsCount,
        };
      })
    );

    res.status(StatusCodes.OK).json({ reelData: watchedReelsWithCounts });
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

    const userHistory = await UserHistory.findOne({ user: userId }).populate(
      "user",
      "name id username userImage"
    );
    const watchedReelIds = userHistory
      ? userHistory.reels.map((r) => r.reel)
      : [];

    const uniqueReelsMap = new Map();
    let totalReels = 0;

    // Helper function to add reels to the unique map and count
    const addReelsToMap = async (reels) => {
      for (const reel of reels) {
        if (!uniqueReelsMap.has(reel._id.toString())) {
          const likesCount = await Like.countDocuments({ reel: reel._id });
          const commentsCount = await Comment.countDocuments({
            reel: reel._id,
          });
          const isLiked = await Like.exists({ user: userId, reel: reel._id });
          reel.isLiked = !!isLiked;
          reel.likesCount = likesCount;
          reel.commentsCount = commentsCount;
          uniqueReelsMap.set(reel._id.toString(), reel);
          totalReels += 1;
        }
      }
    };

    // Fetch reels from following
    const reelsFromFollowing = await Reel.find({
      user: { $in: following },
      _id: { $nin: watchedReelIds },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("-likes -comments")
      .populate("user", "username name id userImage")
      .exec();

    await addReelsToMap(reelsFromFollowing);

    // Fetch most liked reels
    if (totalReels < limit + offset) {
      const remainingLimit = limit + offset - totalReels;
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
        { $limit: remainingLimit },
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
              id: "$user._id",
              userImage: "$user.userImage",
            },
          },
        },
      ]);

      await addReelsToMap(mostLikedReels);
    }

    // Fetch latest reels
    if (totalReels < limit + offset) {
      const remainingLimit = limit + offset - totalReels;
      const latestReels = await Reel.find({ _id: { $nin: watchedReelIds } })
        .sort({ createdAt: -1 })
        .limit(remainingLimit)
        .populate("user", "username name id userImage")
        .exec();

      await addReelsToMap(latestReels);
    }

    const uniqueReels = Array.from(uniqueReelsMap.values());

    if (offset >= uniqueReels.length) {
      return res.status(StatusCodes.OK).json({ reels: [] });
    }

    // Slice the result based on offset and limit
    const response = uniqueReels.slice(offset, offset + limit).map((reel) => ({
      _id: reel._id,
      videoUri: reel.videoUri,
      thumbUri: reel.thumbUri,
      caption: reel.caption,
      createdAt: reel.createdAt,
      user: {
        _id: reel.user.id,
        username: reel.user.username,
        name: reel.user.name,
        userImage: reel.user.userImage,
        isFollowing: user.following.includes(reel.user.id),
      },
      likesCount: reel.likesCount,
      commentsCount: reel.commentsCount,
      isLiked: !!reel.isLiked,
    }));

    res.status(StatusCodes.OK).json({ reels: response });
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
