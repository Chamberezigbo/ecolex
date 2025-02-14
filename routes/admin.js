const express = require("express");
const Joi = require("joi");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const authenticateSuperAdmin = require("../middleware/authenticateSuperAdmin");

const router = express.Router();
const prisma = new PrismaClient();

// Environment variables for JWT
const JWT_SECRET = process.env.JWT_SECRET;

// Validation schema//
const adminSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().required(),
  role: Joi.string().valid("super_admin", "school_admin").required(),
  schoolId: Joi.number().optional(),
  campusId: Joi.number().required(),
  uniqueKey: Joi.string().optional(),
});

// Validation schema for admin update
const updateAdminSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional(),
  role: Joi.string().valid("super_admin", "school_admin").optional(),
  campusId: Joi.number().optional(),
  steps: Joi.number().optional(),
});

// Validate schema for admin login
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

router.post("/create", async (req, res) => {
  const { error } = adminSchema.validate(req.body);

  if (error) return res.status(400).json({ message: error.details[0].message });

  const { name, email, password, role, schoolId, campusId, uniqueKey } =
    req.body;

  try {
    // For super_admin, ensure schoolId is not provided
    if (role === "super_admin" && schoolId) {
      return res.status(400).json({
        message: "School ID should not be provided for super admin",
      });
    }

    // Check if email already in use//
    const existingAdmin = await prisma.admin.findUnique({ where: { email } });
    if (existingAdmin) {
      return res.status(409).json({ message: "Email already exists" });
    }

    //for super admin,validate the uniqueKey
    if (role == "super_admin") {
      if (!uniqueKey) {
        return res.status(400).json({
          message: "Unique key is required for super admin",
        });
      }

      const tokenRecord = await prisma.token.findUnique({
        where: { email },
      });

      //check if token exist
      if (!tokenRecord) {
        return res
          .status(404)
          .json({ message: "Token not found for the provided email" });
      }

      // validate unique key and email match
      if (tokenRecord.uniqueKey !== uniqueKey || tokenRecord.email !== email) {
        return res.status(400).json({
          message:
            "Invalid unique key or Email does not match the token record.",
        });
      }

      // After successfully validation,update token status to'inactive'
      await prisma.token.update({
        where: { email },
        data: {
          status: "inactive",
        },
      });
    }

    //Hash password//
    const hashPassword = await bcrypt.hash(password, 12);

    const admin = await prisma.admin.create({
      data: {
        name,
        email,
        password: hashPassword,
        role,
        schoolId,
        campusId,
        steps: 0, // Default steps value is 0
      },
    });

    res.status(201).json({ message: "Admin created successfully", admin });
  } catch (error) {
    res.status(500).json({ message: "An error occurred while creating admin" });
  }
});

// login route
router.post("/login", async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { email, password } = req.body;

  try {
    // Check if email exists//
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) return res.status(401).json({ message: "Admin not found" });

    // Check if password is correct//
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid)
      return res.status(401).json({ message: "Invalid password" });

    // Generate JWT token//
    const token = jwt.sign(
      { id: admin.id, role: admin.role }, // { id: admin.id, role: admin.role, schoolId: admin.schoolId },
      JWT_SECRET,
      { expiresIn: "1d" }
    );
    res
      .status(200)
      .json({
        message: "Admin logged in successfully",
        data: { token, admin },
      });
  } catch (error) {
    res.status(500).json({ message: "An error occurred while logging in" });
  }
});

// Get all admins for a school
router.get(
  "/school-admins/:schoolId",
  authenticateSuperAdmin,
  async (req, res) => {
    const { schoolId } = req.params;
    if (!schoolId) {
      return res.status(400).json({ message: "School ID is required" });
    }

    try {
      const admins = await prisma.admin.findMany({
        where: { schoolId: parseInt(schoolId) },
      });
      res.status(200).json({ message: "Admins fetched successfully", admins });
    } catch (error) {
      res
        .status(500)
        .json({ message: "An error occurred while fetching admins" });
    }
  }
);

// Update admin//
router.put("/:id", async (req, res) => {
  const { error } = updateAdminSchema.validate(req.body);

  if (error) return res.status(400).json({ message: error.details[0].message });

  const { id } = req.params;
  const { name, email, password, role, campusId } = req.body;

  try {
    // find admin to update
    const admin = await prisma.admin.findUnique({
      where: { id: parseInt(id) },
    });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    // prepare data to update
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (role) updateData.role = role;
    if (campusId) updateData.campusId = campusId;
    if (steps) updateData.steps = steps;

    // update admin
    const updatedAdmin = await prisma.admin.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
    res
      .status(200)
      .json({ message: "Admin updated successfully", updatedAdmin });
  } catch (error) {
    res.status(500).json({ message: "An error occurred while updating admin" });
  }
});

// Delete admin//
router.delete("/:id", authenticateSuperAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // Find and delete the admin
    const admin = await prisma.admin.findUnique({
      where: { id: parseInt(id) },
    });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    await prisma.admin.delete({ where: { id: parseInt(id) } });
    res.status(200).json({ message: "Admin deleted successfully", admin });
  } catch (error) {
    res.status(500).json({ message: "An error occurred while deleting admin" });
  }
});

module.exports = router;
