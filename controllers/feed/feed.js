const { StatusCodes } = require("http-status-codes");
const Like = require("../../models/Like");
const Reel = require("../../models/Reel");
const UserHistory = require("../../models/UserHistory");
const User = require("../../models/User");
const { NotFoundError, BadRequestError } = require("../../errors");
const jwt = require("jsonwebtoken");
const Comment = require("../../models/Comment");

const getLikedVideos = async (req, res) => {
  const { limit = 10, offset = 0 } = req.query;
  const userId = req.params.userId;
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  try {
    let likedVideos = await Like.find({
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

    likedVideos = likedVideos.filter((like) => like.reel !== null);
    if (!likedVideos || likedVideos.length === 0) {
      return res.status(StatusCodes.OK).json({ reelData: [] });
    }

    const reelIds = likedVideos.map((like) => like.reel._id);

    const [likesCounts, commentsCounts, likedReels] = await Promise.all([
      Like.aggregate([
        { $match: { reel: { $in: reelIds } } },
        { $group: { _id: "$reel", count: { $sum: 1 } } },
      ]),
      Comment.aggregate([
        { $match: { reel: { $in: reelIds } } },
        { $group: { _id: "$reel", count: { $sum: 1 } } },
      ]),
      Like.find({ user: userId, reel: { $in: reelIds } }).distinct("reel"),
    ]);

    const likesCountMap = new Map(
      likesCounts.map((item) => [item._id.toString(), item.count])
    );
    const commentsCountMap = new Map(
      commentsCounts.map((item) => [item._id.toString(), item.count])
    );
    const likedReelsSet = new Set(likedReels.map((id) => id.toString()));

    const likedVideosWithCounts = likedVideos.map((like) => {
      const reel = like.reel.toJSON();
      reel.likesCount = likesCountMap.get(reel._id.toString()) || 0;
      reel.commentsCount = commentsCountMap.get(reel._id.toString()) || 0;
      reel.isLiked = likedReelsSet.has(reel._id.toString());
      reel.user.isFollowing = user.following.includes(reel.user._id);
      return reel;
    });

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

    const reelIds = myReelPosts.map((reel) => reel._id);
    const [likesCounts, commentsCounts, likedReels] = await Promise.all([
      Like.aggregate([
        { $match: { reel: { $in: reelIds } } },
        { $group: { _id: "$reel", count: { $sum: 1 } } },
      ]),
      Comment.aggregate([
        { $match: { reel: { $in: reelIds } } },
        { $group: { _id: "$reel", count: { $sum: 1 } } },
      ]),
      Like.find({ user: userId, reel: { $in: reelIds } }).distinct("reel"),
    ]);

    const likesCountMap = new Map(
      likesCounts.map((item) => [item._id.toString(), item.count])
    );
    const commentsCountMap = new Map(
      commentsCounts.map((item) => [item._id.toString(), item.count])
    );
    const likedReelsSet = new Set(likedReels.map((id) => id.toString()));

    const myReelPostsWithCounts = myReelPosts.map((reel) => {
      const reelJSON = reel.toJSON();
      reelJSON.likesCount = likesCountMap.get(reel._id.toString()) || 0;
      reelJSON.commentsCount = commentsCountMap.get(reel._id.toString()) || 0;
      reelJSON.isLiked = likedReelsSet.has(reel._id.toString());
      reelJSON.user.isFollowing = user.following.includes(reel.user._id);
      return reelJSON;
    });

    res.status(StatusCodes.OK).json({ reelData: myReelPostsWithCounts });
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Internal Server Error" });
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

    const historyReelIds = userHistory.reels
      .reverse()
      .map((historyReel) => historyReel.reel);
    const reels = await Reel.find({ _id: { $in: historyReelIds } })
      .select("-comments -likes")
      .populate("user", "name userImage username id")
      .exec();

    const [likesCounts, commentsCounts, likedReels] = await Promise.all([
      Like.aggregate([
        { $match: { reel: { $in: historyReelIds } } },
        { $group: { _id: "$reel", count: { $sum: 1 } } },
      ]),
      Comment.aggregate([
        { $match: { reel: { $in: historyReelIds } } },
        { $group: { _id: "$reel", count: { $sum: 1 } } },
      ]),
      Like.find({ user: userId, reel: { $in: historyReelIds } }).distinct(
        "reel"
      ),
    ]);

    const likesCountMap = new Map(
      likesCounts.map((item) => [item._id.toString(), item.count])
    );
    const commentsCountMap = new Map(
      commentsCounts.map((item) => [item._id.toString(), item.count])
    );
    const likedReelsSet = new Set(likedReels.map((id) => id.toString()));

    const watchedReelsWithCounts = reels.map((reel) => {
      const reelJSON = reel.toJSON();
      reelJSON.likesCount = likesCountMap.get(reel._id.toString()) || 0;
      reelJSON.commentsCount = commentsCountMap.get(reel._id.toString()) || 0;
      reelJSON.isLiked = likedReelsSet.has(reel._id.toString());
      reelJSON.user.isFollowing = user.following.includes(reel.user._id);
      return reelJSON;
    });

    res.status(StatusCodes.OK).json({ reelData: watchedReelsWithCounts });
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Internal Server Error" });
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

    const uniqueReelsMap = new Map();
    let totalReels = 0;

    const addReelsToMap = async (reels) => {
      const reelIds = reels.map((reel) => reel._id);
      const [likesCounts, commentsCounts, likedReels] = await Promise.all([
        Like.aggregate([
          { $match: { reel: { $in: reelIds } } },
          { $group: { _id: "$reel", count: { $sum: 1 } } },
        ]),
        Comment.aggregate([
          { $match: { reel: { $in: reelIds } } },
          { $group: { _id: "$reel", count: { $sum: 1 } } },
        ]),
        Like.find({ user: userId, reel: { $in: reelIds } }).distinct("reel"),
      ]);

      const likesCountMap = new Map(
        likesCounts.map((item) => [item._id.toString(), item.count])
      );
      const commentsCountMap = new Map(
        commentsCounts.map((item) => [item._id.toString(), item.count])
      );
      const likedReelsSet = new Set(likedReels.map((id) => id.toString()));

      for (const reel of reels) {
        if (!uniqueReelsMap.has(reel._id.toString())) {
          reel.isLiked = likedReelsSet.has(reel._id.toString());
          reel.likesCount = likesCountMap.get(reel._id.toString()) || 0;
          reel.commentsCount = commentsCountMap.get(reel._id.toString()) || 0;
          uniqueReelsMap.set(reel._id.toString(), reel);
          totalReels += 1;
        }
      }
    };

    const fetchReels = async (query, options = {}) => {
      return Reel.find(query)
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || limit)
        .select("-likes -comments")
        .populate("user", "username name id userImage")
        .exec();
    };

    // Fetch reels from following
    const reelsFromFollowing = await fetchReels({
      user: { $in: following },
      _id: { $nin: watchedReelIds },
    });

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
      const latestReels = await fetchReels(
        {
          _id: { $nin: watchedReelIds },
        },
        { limit: remainingLimit }
      );

      await addReelsToMap(latestReels);
    }

    const uniqueReels = Array.from(uniqueReelsMap.values());

    if (offset >= uniqueReels.length) {
      return res.status(StatusCodes.OK).json({ reels: [] });
    }

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
    throw new BadRequestError(error.message);
  }
};

module.exports = {
  getLikedVideos,
  getReelPosts,
  getAllHistoryReels,
  markReelsWatched,
  getHomeFeed,
};
