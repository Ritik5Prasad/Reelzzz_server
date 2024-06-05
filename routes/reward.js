const express = require("express");
const router = express.Router();
const rewardController = require("../controllers/reward/reward");

router.post("/redeem", rewardController.redeemTokens);
router.post("/withdraw", rewardController.withdrawRupees);
router.get("/", rewardController.getRewards);

module.exports = router;
