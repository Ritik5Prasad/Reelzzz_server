const express = require("express");
const router = express.Router();
const replyController = require("../controllers/feed/reply");

router.post("/", replyController.createReply);
router.delete("/:replyId", replyController.deleteReply);
router.get("/", replyController.getPaginatedReplies);
module.exports = router;
