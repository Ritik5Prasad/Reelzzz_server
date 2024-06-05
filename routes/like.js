const express = require("express");
const router = express.Router();
const likeController = require("../controllers/feed/like");

router.post("/comment/:commentId", likeController.likeComment);
router.post("/reply/:replyId", likeController.likeReply);
router.post("/reel/:reelId", likeController.likeReel);
router.get("/", likeController.listLikes);
module.exports = router;
