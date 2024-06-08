const express = require("express");
const router = express.Router();
const {
  signInWithOauth,
  refreshToken,
  checkUsernameAvailability,
  signUpWithOauth,
} = require("../controllers/auth/auth");

router.post("/check-username", checkUsernameAvailability);
router.post("/login", signInWithOauth);
router.post("/register", signUpWithOauth);
router.post("/refresh-token", refreshToken);

module.exports = router;
