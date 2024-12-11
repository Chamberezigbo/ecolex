const express = require("express");
const Joi = require("joi");
const { PrismaClient } = require("@prisma/client");

const upload = require("../middleware/upload");
const processImage = require("../res/compress");
const multer = require("multer");

const router = express.Router();
const prisma = new PrismaClient();

// Validation schema
const schoolValidationSchema = Joi.object({
  name: Joi.string().max(255).required(),
  prefix: Joi.string().max(3).required(),
  email: Joi.string().email().required(),
  phoneNumber: Joi.string().max(50).optional(),
  address: Joi.string().optional(),
});

router.post(
  "/setup",
  upload.fields([{ name: "logoUrl" }, { name: "stampUrl" }]),
  async (req, res) => {
    // Validate JSON body with Joi
    const { error } = schoolValidationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, prefix, email, phoneNumber, address } = req.body;

    try {
      // Check if school name already exists
      const existingSchool = await prisma.school.findUnique({
        where: { name },
      });
      if (existingSchool) {
        return res.status(409).json({ message: "School already exists" });
      }

      // Check for uploaded files
      const files = req.files;
      if (!files || !files.logoUrl || !files.stampUrl) {
        return res
          .status(400)
          .json({ message: "Please upload both logo and stamp" });
      }

      // Process the logo image
      const processedLogoUrl = await processImage(
        files.logoUrl[0].buffer,
        "logos",
        `${prefix}-logo.jpeg`
      );

      // Process the stamp image
      const processedStampUrl = await processImage(
        files.stampUrl[0].buffer,
        "stamps",
        `${prefix}-stamp.jpeg`
      );

      console.log(processedStampUrl);

      // Create new school in the database
      const newSchool = await prisma.school.create({
        data: {
          name,
          prefix,
          logoUrl: processedLogoUrl,
          stampUrl: processedStampUrl,
          email,
          phoneNumber,
          address,
        },
      });

      res.status(201).json({
        message: "School created successfully",
        school: newSchool,
      });
    } catch (error) {
      console.error("Error:", error.message);
      res
        .status(500)
        .json({ message: "An error occurred while creating the school" });
    }
  }
);

// Error handling middleware for Malter
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
});

module.exports = router;
