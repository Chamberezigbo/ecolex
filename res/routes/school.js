const express = require("express");
const multer = require("multer");

const upload = require("../middleware/upload");
const authenticateSuperAdmin = require("../middleware/authenticateSuperAdmin");
const validate = require("../middleware/validator");
const { schoolValidationSchema } = require("../schemas/index");

const { setupSchool } = require("../controller/school/schoolController");

const router = express.Router();

router.post(
  "/setup",
  validate(schoolValidationSchema),
  authenticateSuperAdmin,
  upload.fields([{ name: "logoUrl" }, { name: "stampUrl" }]),
  setupSchool
);

// Error handling middleware for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
});

module.exports = router;
