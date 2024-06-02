const express = require("express");
const router = express.Router();
const authenticateUser = require("../middleware/authentication");
const { getProfile } = require("../controllers/auth/user");
const { signInWithOauth } = require("../controllers/auth/auth");

router.post("/auth", signInWithOauth);
router.route("/profile").get(authenticateUser, getProfile);
router.post("/refresh-token", refreshToken);

module.exports = router;
