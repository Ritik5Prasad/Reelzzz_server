const express = require("express");
const {
  getProfile,
  updateProfile,
  toggleFollowing,
  viewUserById,
  getFollowers,
  getFollowing,
} = require("../controllers/auth/user");

const router = express.Router();

router.route("/profile").get(getProfile).patch(updateProfile);
router.put("/follow/:userId", toggleFollowing);
router.get("/profile/:userId", viewUserById);
router.get("/followers/:userId", getFollowers);
router.get("/following/:userId", getFollowing);
module.exports = router;
