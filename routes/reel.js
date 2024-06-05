const express = require("express");
const {
  createReel,
  deleteReel,
  updateReelCaption,
} = require("../controllers/feed/reel");
const router = express.Router();

router.post("/", createReel);
router.delete("/:reelId", deleteReel);
router.patch("/:reelId/caption", updateReelCaption);

module.exports = router;
