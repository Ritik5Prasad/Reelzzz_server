const express = require("express");
const {
  getLikedVideos,
  getAllHistoryReels,
  markReelsWatched,
  getHomeFeed,
  getReelPosts,
} = require("../controllers/feed/feed");
const router = express.Router();

router.get("/watchedreel/:userId", getAllHistoryReels);
router.get("/likedreel/:userId", getLikedVideos);
router.get("/reel/:userId", getReelPosts);
router.post("/markwatched", markReelsWatched);
router.get("/home", getHomeFeed);

module.exports = router;
