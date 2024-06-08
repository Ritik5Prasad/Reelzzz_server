const { StatusCodes } = require("http-status-codes");
const { NotFoundError, BadRequestError } = require("../../errors");
const Like = require("../../models/Like");
const { updateReward } = require("./rewardHelper");
const User = require("../../models/User");
const jwt = require("jsonwebtoken");
const Reel = require("../../models/Reel");
const Comment = require("../../models/Comment");
const Reply = require("../../models/Reply");
const { default: mongoose } = require("mongoose");

const likeComment = async (req, res) => {
  const commentId = req.params.commentId;
  if (!commentId) {
    throw new BadRequestError("Comment Id not available");
  }

  const userId = req.user.userId;

  try {
    const comment = await Comment.findById(commentId).populate("reel");
    if (!comment) {
      throw new NotFoundError("Comment not found");
    }

    const existingLike = await Like.findOne({
      user: userId,
      comment: commentId,
    });
    if (existingLike) {
      await Like.findByIdAndDelete(existingLike.id);
      if (comment.reel.user.toString() === userId) {
        comment.isLikedByAuthor = false;
        await comment.save();
      }
      res.status(StatusCodes.OK).json({ msg: "Unliked", data: existingLike });
    } else {
      const newLike = new Like({ user: userId, comment: commentId });
      await newLike.save();

      if (comment.reel.user.toString() === userId) {
        comment.isLikedByAuthor = true;
        await comment.save();
      }

      await updateReward(userId, "tokens", 0.1);
      res.status(StatusCodes.OK).json({ msg: "Liked", data: newLike });
    }
  } catch (error) {
    console.error(error);
    if (error instanceof NotFoundError) {
      res.status(StatusCodes.NOT_FOUND).json({ error: error.msg });
    } else {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "Internal Server Error" });
    }
  }
};

const likeReply = async (req, res) => {
  const replyId = req.params.replyId;
  if (!replyId) {
    throw new BadRequestError("Reply Id not available");
  }

  const userId = req.user.userId;

  try {
    const reply = await Reply.findById(replyId).populate("comment");
    if (!reply) {
      throw new NotFoundError("reply not found");
    }

    const existingLike = await Like.findOne({
      user: userId,
      reply: replyId,
    });
    const comment = await Comment.findById(reply.comment._id).populate("reel");
    if (existingLike) {
      await Like.findByIdAndDelete(existingLike.id);
      if (comment.reel.user.toString() === userId) {
        reply.isLikedByAuthor = false;
        await reply.save();
      }
      res.status(StatusCodes.OK).json({ msg: "Unliked", data: existingLike });
    } else {
      const newLike = new Like({ user: userId, reply: replyId });
      await newLike.save();

      if (comment.reel.user.toString() === userId) {
        reply.isLikedByAuthor = true;
        await reply.save();
      }

      await updateReward(userId, "tokens", 0.1);
      res.status(StatusCodes.OK).json({ msg: "Liked", data: newLike });
    }
  } catch (error) {
    console.error(error);
    throw new BadRequestError(error);
  }
};

const likeReel = async (req, res) => {
  const reelId = req.params.reelId;
  if (!reelId) {
    throw new BadRequestError("Reel Id not available");
  }

  const userId = req.user.userId;

  const reel = await Reel.findById(reelId);
  if (!reel) {
    throw new NotFoundError("reel not found");
  }

  try {
    const existingLike = await Like.findOne({ user: userId, reel: reel.id });
    if (existingLike) {
      await Like.findByIdAndDelete(existingLike.id);
      res.status(StatusCodes.OK).json({ msg: "Unliked", data: existingLike });
    } else {
      const newLike = new Like({ user: userId, reel: reel.id });
      await newLike.save();
      await updateReward(userId, "tokens", 0.1);
      res.status(StatusCodes.OK).json({ msg: "Liked", data: newLike });
    }
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Internal Server Error" });
  }
};

const listLikes = async (req, res) => {
  const { type, entityId, searchQuery, page = 1, limit = 15 } = req.query;
  const userId = req.user.userId;

  try {
    let likes;
    let query = {};
    let populateQuery = {
      path: "user",
      select: "username userImage name id",
    };

    if (type === "reel") {
      query.reel = entityId;
    } else if (type === "comment") {
      query.comment = entityId;
    } else if (type === "reply") {
      query.reply = entityId;
    } else {
      throw new BadRequestError("Invalid type");
    }

    if (searchQuery) {
      populateQuery.match = {
        $or: [
          { username: { $regex: searchQuery, $options: "i" } },
          { name: { $regex: searchQuery, $options: "i" } },
        ],
      };
    }

    likes = await Like.find(query).populate(populateQuery).lean();

    likes = likes.filter((like) => like.user);

    const userFollowing = await User.findById(userId)
      .select("following")
      .lean();
    const followingIds = new Set(
      userFollowing.following.map((id) => id.toString())
    );

    likes = likes.map((like) => {
      return {
        ...like.user,
        isFollowing: followingIds.has(like.user._id.toString()),
      };
    });

    likes.sort((a, b) => {
      const aFollow = a.isFollowing;
      const bFollow = b.isFollowing;
      return aFollow === bFollow ? 0 : aFollow ? -1 : 1;
    });

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedLikes = likes.slice(startIndex, endIndex);

    res.status(StatusCodes.OK).json(paginatedLikes);
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Internal Server Error" });
  }
};

module.exports = { likeComment, likeReply, listLikes, likeReel };
