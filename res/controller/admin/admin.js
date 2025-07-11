const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const prisma = require("../../util/prisma");

const JWT_SECRET = process.env.JWT_SECRET;

exports.createAdmin = async (req, res, next) => {
  try {
    // For super_admin, ensure schoolId is not provided
    const { email, password, role, uniqueKey, schoolId, name } = req.body;
    if (role === "super_admin" && schoolId) {
      return res.status(400).json({
        message: "School ID should not be provided for super admin",
      });
    }

    if (role === "school_admin" && !schoolId) {
      return res.status(400).json({
        message: "School ID is required for school admin",
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

    // Create admin with dynamic steps assignment
    const adminData = {
      name,
      email,
      password: hashPassword,
      role,
      schoolId: role === "super_admin" ? null : schoolId,
      campusId: role === "super_admin" ? null : campusId,
    };

    // Set steps only for super_admin
    if (role === "super_admin") {
      adminData.steps = 0;
    }


    const admin = await prisma.admin.create({
      data: adminData,
    });

    // Generate JWT token//
    const token = jwt.sign(
      { id: admin.id, role: admin.role }, // { id: admin.id, role: admin.role, schoolId: admin.schoolId },
      JWT_SECRET,
      { expiresIn: "1d" }
    );
    

    res.status(201).json({ message: "Admin created successfully", data: { token, admin } });
  } catch (error) {
    next(error);
  }
};

exports.loginAdmin = async (req, res, next) => {
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
    res.status(200).json({
      message: "Admin logged in successfully",
      data: { token, admin },
    });
  } catch (error) {
    next(error);
  }
};

exports.getSchoolAdmins = async (req, res, next) => {
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
    next(error);
  }
};

exports.updateAdmin = async (req, res, next) => {
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
    next(error);
  }
};

exports.deleteAdmin = async (req, res, next) => {
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
    next(error);
  }
};

exports.checkHealth = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: "This server is up and runing",
    });
  } catch (error) {
    next(error);
  }
};
