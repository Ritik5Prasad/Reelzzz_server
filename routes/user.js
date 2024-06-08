const express = require("express");
const {
  getProfile,
  updateProfile,
  toggleFollowing,
  viewUserByHandle,
  getFollowers,
  getFollowing,
  getUsersBySearch,
} = require("../controllers/auth/user");

const router = express.Router();

router.route("/profile").get(getProfile).patch(updateProfile);
router.put("/follow/:userId", toggleFollowing);
router.get("/profile/:username", viewUserByHandle);
router.get("/followers/:userId", getFollowers);
router.get("/following/:userId", getFollowing);
router.get("/search", getUsersBySearch);
module.exports = router;
