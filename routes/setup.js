const express = require("express");
const Joi = require("joi");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const authenticateSuperAdmin = require("../middleware/authenticateSuperAdmin");
const auth = require("../middleware/authLogin");

const router = express.Router();
const prisma = new PrismaClient();

// Environment variables for JWT
const JWT_SECRET = process.env.JWT_SECRET;

// Validation Schema//
const classSchema = Joi.object({
  campus_id: Joi.number().required(),
  name: Joi.string().max(255).required(),
});

// Validation Schema for Campus
const campusSchema = Joi.object({
  name: Joi.string().max(255).required(),
  address: Joi.string().optional(),
  phoneNumber: Joi.string().max(50).optional(),
  email: Joi.string().email().max(255).optional(),
});

// Validation Schema for Continuous Assessments (CA)
const continuousAssessmentSchema = Joi.array().items(
  Joi.object({
    class_id: Joi.number().required(),
    name: Joi.string().max(50).required(),
    weightage: Joi.number().precision(2).optional(),
    max_score: Joi.number().integer().positive().required(),
  })
);

// Validation Schema for Exam
const examSchema = Joi.object({
  class_id: Joi.number().required(),
  name: Joi.string().max(50).required(),
  weightage: Joi.number().precision(2).optional(),
  max_score: Joi.number().required(),
});

// Combined Schema to Validate Entire Request
const requestSchema = Joi.object({
  assessments: continuousAssessmentSchema.required(), // Ensure assessments is an array
  exam: examSchema.optional(), // Exam is optional
});

router.use(auth);

router.post("/class", authenticateSuperAdmin, async (req, res) => {
  const { school_id, classes } = req.body;

  if (!school_id || typeof school_id !== "number") {
    return res.status(400).json({ message: "A valid school_id is required." });
  }

  if (!Array.isArray(classes) || classes.length === 0) {
    return res
      .status(400)
      .json({ message: "Expected a non-empty array of classes." });
  }

  //validate classes//
  for (const classData of classes) {
    const { error } = classSchema.validate(classData);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
  }

  try {
    // Step 1: Check if schoolId exists
    const existingSchool = await prisma.school.findUnique({
      where: { id: school_id },
    });

    if (!existingSchool) {
      return res
        .status(400)
        .json({ message: "Invalid school_id. No such school exists." });
    }

    // Prepare data for batch insertion//
    const classDataToInsert = classes.map(({ campus_id, name }) => ({
      schoolId: school_id,
      campusId: campus_id,
      name,
    }));

    const result = await prisma.class.createMany({
      data: classDataToInsert,
    });

    res.status(201).json({
      message: `${result.count} classes created successfully`,
      count: result.count,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "An error occurred while creating classes" });
  }
});

router.post("/campus", authenticateSuperAdmin, async (req, res) => {
  const { school_id, campuses } = req.body;

  // Step 1: Validate Input
  if (!school_id || typeof school_id !== "number") {
    return res.status(400).json({ message: "A valid school_id is required." });
  }

  if (!Array.isArray(campuses) || campuses.length === 0) {
    return res
      .status(400)
      .json({ message: "Expected a non-empty array of campuses." });
  }

  try {
    // Step 2: Check if the school exists
    const existingSchool = await prisma.school.findUnique({
      where: { id: school_id },
    });

    if (!existingSchool) {
      return res
        .status(400)
        .json({ message: "Invalid school_id. No such school exists." });
    }

    // Step 3: Validate each campus and prepare data
    const campusDataToInsert = [];

    for (const campus of campuses) {
      const { error } = campusSchema.validate(campus);
      if (error) {
        return res.status(400).json({ message: error.details[0].message });
      }

      campusDataToInsert.push({
        schoolId: school_id, // Ensure all campuses belong to the same school
        name: campus.name,
        address: campus.address || null,
        phoneNumber: campus.phoneNumber || null,
        email: campus.email || null,
      });
    }

    // Step 4: Insert campuses in bulk
    const result = await prisma.campus.createMany({
      data: campusDataToInsert,
      skipDuplicates: true, // Avoid inserting duplicates
    });

    res.status(201).json({
      message: `${result.count} campuses created successfully`,
      count: result.count,
    });
  } catch (err) {
    console.error("Error:", err);
    res
      .status(500)
      .json({ message: "An error occurred while creating campuses." });
  }
});

// Route to create Continuous Assessments and Exam
router.post("/ca", async (req, res) => {
  const { error } = requestSchema.validate(req.body);

  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    // Map assessments to match Prisma field names
    const assessmentsData = req.body.assessments.map((ca) => ({
      classId: ca.class_id, // Convert snake_case to camelCase
      name: ca.name,
      weightage: ca.weightage,
      maxScore: ca.max_score,
    }));

    // Save assessments to DB
    await prisma.continuousAssessment.createMany({ data: assessmentsData });

    if (req.body.exam) {
      const examData = {
        classId: req.body.exam.class_id, // Convert to camelCase
        name: req.body.exam.name,
        weightage: req.body.exam.weightage,
        maxScore: req.body.exam.max_score,
      };

      await prisma.exam.create({ data: examData });
    }

    res
      .status(201)
      .json({ message: "Assessments and exam created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
    console.log(error);
  }
});

module.exports = router;
