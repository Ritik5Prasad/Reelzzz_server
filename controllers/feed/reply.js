const { StatusCodes } = require("http-status-codes");
const { NotFoundError, BadRequestError } = require("../../errors");
const Reward = require("../../models/Reward");
const Like = require("../../models/Like");
const Comment = require("../../models/Comment");
const Reply = require("../../models/Reply");

const createReply = async (req, res) => {
  const { reply, mentionedUsers, gifUrl, commentId } = req.body;
  if ((!commentId || !gifUrl) && !reply) {
  }
  const { userId } = req.user;
  try {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw new NotFoundError("comment not found");
    }

    const newReply = new Reply({
      user: userId,
      reply: reply ? reply : null,
      mentionedUsers: mentionedUsers ? mentionedUsers : null,
      hasGif: gifUrl ? true : false,
      gifUrl: gifUrl ? gifUrl : null,
      comment: commentId,
      reel: comment.reel._id,
    });
    await newReply.save();

    // Reward the creator of the reel
    await Reward.findOneAndUpdate(
      { user: comment.user },
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
      .json({ _id: newReply.id, ...newReply.toJSON() });
  } catch (error) {
    console.error(error);
    throw new BadRequestError(error);
  }
};

const deleteReply = async (req, res) => {
  const { replyId } = req.params;
  try {
    const reply = await Reply.findByIdAndDelete(replyId);

    res
      .status(StatusCodes.OK)
      .json({ msg: "Reply deleted successfully", reply });
  } catch (error) {
    console.error(error);
    throw new BadRequestError(error);
  }
};

const getPaginatedReplies = async (req, res) => {
  const { commentId, limit = 10, offset = 0 } = req.query;
  const userId = req.user.userId;
  try {
    // Fetch comments and sort them based on the defined criteria
    const replies = await Reply.find({ comment: commentId })
      .limit(limit)
      .skip(offset)
      .select("-likes")
      .populate("user", "username userImage")
      .exec();

    const finalReplies = await Promise.all(
      replies.map(async (reply) => {
        const likesCount = await Like.countDocuments({ reply: reply._id });
        const isLiked = await Like.countDocuments({
          reply: reply.id,
          user: userId,
          reel: reply.reel,
        });
        return {
          ...reply.toJSON(),
          likesCount,
          isLiked: isLiked == 0 ? false : true,
        };
      })
    );

    res.status(StatusCodes.OK).json(finalReplies);
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Internal Server Error" });
  }
};

module.exports = {
  createReply,
  deleteReply,
  getPaginatedReplies,
};
