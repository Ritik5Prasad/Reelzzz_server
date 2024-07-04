const express = require("express");
const router = express.Router();
const { share } = require("../controllers/share/share");

router.get("/:type/:id", share);

module.exports = router;
