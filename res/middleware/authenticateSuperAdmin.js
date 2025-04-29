const jwt = require("jsonwebtoken");

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

module.exports = authenticateSuperAdmin;
