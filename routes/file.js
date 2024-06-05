const express = require("express");
const { uploadMedia } = require("../controllers/file/upload");
const upload = require("../config/multer");
const router = express.Router();
router.post("/upload", upload.single("image"), uploadMedia);

module.exports = router;
