const jwt = require("jsonwebtoken");
const prisma = require("../util/prisma");

// Environment variables for JWT
const JWT_SECRET = process.env.JWT_SECRET;

// Generic authentication for any admin (super_admin or school_admin)
const authenticateAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: Missing token" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Ensure the admin exists and is still active in DB
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, schoolId: true }
    });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    req.user = admin; // Attach full admin basics
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

// middleware to authenticate and authorize super admin
const authenticateSuperAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== "super_admin") {
      return res.status(401).json({ message: "Forbidden: Only super_admins can access this route" });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// Middleware to attach schoolId for school_admin (or super_admin with school, if ever assigned)
const attachSchoolId = async (req, res, next) => {
  try {
    const adminId = req.user.id;

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { schoolId: true, role: true }
    });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (!admin.schoolId) {
      return res.status(403).json({ message: "School ID not found for this admin" });
    }
    req.schoolId = admin.schoolId;
    next();
  } catch (e) {
    next(e);
  }
};

module.exports = {
  authenticateAdmin,
  authenticateSuperAdmin,
  attachSchoolId
};
