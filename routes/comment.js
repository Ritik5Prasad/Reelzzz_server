const express = require("express");
const router = express.Router();
const commentController = require("../controllers/feed/comment");

router.post("/", commentController.createComment);
router.delete("/:commentId", commentController.deleteComment);
router.post("/pin", commentController.markPin);
router.get("/", commentController.getPaginatedComments);
module.exports = router;
