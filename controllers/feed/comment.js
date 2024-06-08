const { StatusCodes } = require("http-status-codes");
const { NotFoundError } = require("../../errors");
const User = require("../../models/User");
const Reel = require("../../models/Reel");
const Reward = require("../../models/Reward");

const Like = require("../../models/Like");
const Comment = require("../../models/Comment");
const Reply = require("../../models/Reply");

const getPaginatedComments = async (req, res) => {
  const { reelId, limit = 10, offset = 0 } = req.query;
  const userId = req.user.userId;
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  try {
    // Fetch comments and sort them based on the defined criteria
    const comments = await Comment.find({ reel: reelId })
      .limit(limit)
      .skip(offset)
      .select("-likes")
      .populate("user", "username userImage id name")
      .populate("replies.user", "username userImage id  name")
      .exec();

    // Sort comments based on the defined priorities
    const sortedComments = comments.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (a.isLikedByAuthor && !b.isLikedByAuthor) return -1;
      if (!a.isLikedByAuthor && b.isLikedByAuthor) return 1;

      const aHasUserReply = a.replies.some(
        (reply) => reply.user._id.toString() === userId
      );
      const bHasUserReply = b.replies.some(
        (reply) => reply.user._id.toString() === userId
      );

      if (aHasUserReply && !bHasUserReply) return -1;
      if (!aHasUserReply && bHasUserReply) return 1;

      if (a.likes > b.likes) return -1;
      if (a.likes < b.likes) return 1;

      const aUserFollowing =
        a.user.followers && a.user.followers.includes(userId);
      const bUserFollowing =
        b.user.followers && b.user.followers.includes(userId);

      if (aUserFollowing && !bUserFollowing) return -1;
      if (!aUserFollowing && bUserFollowing) return 1;

      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    const finalComments = await Promise.all(
      sortedComments.map(async (comment) => {
        const likesCount = await Like.countDocuments({ comment: comment._id });
        const isLiked = await Like.countDocuments({
          comment: comment._id,
          user: userId,
        });
        const repliesCount = await Reply.countDocuments({
          comment: comment._id,
        });

        return {
          ...comment.toJSON(),
          likesCount,
          repliesCount,
          isLiked: isLiked == 0 ? false : true,
        };
      })
    );

    res.status(StatusCodes.OK).json(finalComments);
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Internal Server Error" });
  }
};

const createComment = async (req, res) => {
  const { comment, mentionedUsers, gifUrl, reelId } = req.body;
  if ((!comment || !gifUrl) && !reelId) {
  }
  const { userId } = req.user;
  try {
    const reel = await Reel.findById(reelId);
    if (!reel) {
      throw new NotFoundError("Reel not found");
    }

    const newComment = new Comment({
      user: userId,
      comment: comment ? comment : null,
      mentionedUsers: mentionedUsers ? mentionedUsers : null,
      hasGif: gifUrl ? true : false,
      gifUrl: gifUrl ? gifUrl : null,
      reel: reelId,
    });
    await newComment.save();

    // Reward the creator of the reel
    await Reward.findOneAndUpdate(
      { user: reel.user },
      { $inc: { rupees: 0.02 } },
      { upsert: true, new: true }
    );

    // Reward the commenter (viewer)
    await Reward.findOneAndUpdate(
      { user: userId },
      { $inc: { tokens: 0.1 } },
      { upsert: true, new: true }
    );

    res
      .status(StatusCodes.CREATED)
      .json({ _id: newComment.id, ...newComment.toJSON() });
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

const deleteComment = async (req, res) => {
  const { commentId } = req.params;

  try {
    const comment = await Comment.findByIdAndDelete(commentId);

    res
      .status(StatusCodes.OK)
      .json({ msg: "Comment deleted successfully", comment });
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

const markPin = async (req, res) => {
  const { commentId } = req.body;
  try {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw new NotFoundError("Comment not found");
    }
    comment.isPinned = !comment.isPinned;
    await comment.save();
    res.status(StatusCodes.OK).json(comment);
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

module.exports = {
  getPaginatedComments,
  createComment,
  deleteComment,
  markPin,
};
