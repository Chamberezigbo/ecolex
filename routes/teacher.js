const express = require("express");
const Joi = require("joi");
const { PrismaClient } = require("@prisma/client");

const auth = require("../middleware/authLogin");
const router = express.Router();
const prisma = new PrismaClient();

//Environment variables for JWT
const JWT_SECRET = process.env.JWT_SECRET;

//validation Schema//
const teacherSchema = Joi.object({
  school_id: Joi.number().required(),
  campus_id: Joi.number().required().optional(),
  class_id: Joi.number().required().optional(),
  name: Joi.string().max(255).required(),
  email: Joi.string().email().required(),
  phoneNumber: Joi.string().max(50).optional(),
});

// Validation schema to assign class to teacher//
const assignClassSchema = Joi.object({
  teacherId: Joi.number().required(),
  classId: Joi.number().required(),
});

router.use(auth);

router.post("/create", async (req, res, next) => {
  const { error } = teacherSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { school_id, campus_id, class_id, name, email, phoneNumber } = req.body;

  try {
    const newTeacher = await prisma.teacher.create({
      data: {
        school: {
          connect: { id: school_id }, // Link to existing school
        },
        campus: campus_id ? { connect: { id: campus_id } } : undefined, // Optional campus
        class: class_id ? { connect: { id: class_id } } : undefined, // Optional class
        name,
        email,
        phoneNumber,
      },
    });
    res
      .status(201)
      .json({ message: "Teacher created successfully", newTeacher });
  } catch (err) {
    next(err);
  }
});

// Route: Assign a class to a teacher
router.post("/assign-class", async (req, res, next) => {
  const { error } = assignClassSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { teacherId, classId } = req.body;

  try {
    // check if teachers exists//
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
    });
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    // check if class exists//
    const classData = await prisma.class.findUnique({
      where: { id: classId },
    });
    if (!classData) return res.status(404).json({ message: "Class not found" });

    //Assign class to teacher//
    const updateClass = await prisma.class.update({
      where: { id: classId },
      data: { teacher: { connect: { id: teacherId } } },
    });

    return res.status(200).json({
      message: "Class assigned to teacher successfully",
      class: updateClass,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
