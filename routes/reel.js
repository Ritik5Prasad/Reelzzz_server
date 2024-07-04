const express = require("express");
const {
  createReel,
  deleteReel,
  updateReelCaption,
  getReelById,
} = require("../controllers/feed/reel");
const router = express.Router();

router.post("/", createReel);
router.delete("/:reelId", deleteReel);
router.patch("/:reelId/caption", updateReelCaption);
router.get("/:reelId", getReelById);
module.exports = router;
