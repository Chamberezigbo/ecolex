const jwt = require("jsonwebtoken");
const prisma = require("../util/prisma");

// Environment variables for JWT
const JWT_SECRET = process.env.JWT_SECRET;

// middleware to authenticate and authorize super admin

const authenticateSuperAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    //check if the admin is super admin
    if (decoded.role !== "super_admin") {
      return res.status(401).json({
        message: "Forbidden: Only super_admins can access this route",
      });
    }
    // Attach the authenticated user's info to the request object
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// Middleware to attach schoolId to the request
const attachSchoolId = async (req, res, next) => {
  try {
    const adminId = req.user.id;

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { schoolId: true, role: true },
    });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

      // School admin must always be tied to their assigned school
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
  authenticateSuperAdmin,
  attachSchoolId
};
