const express = require("express");

const {
  createAdmin,
  loginAdmin,
  getSchoolAdmins,
  updateAdmin,
  deleteAdmin,
  checkHealth,
} = require("../controller/admin/admin");
const validate = require("../middleware/validator");
const {
  createAdminSchema,
  loginSchema,
  updateAdminSchema,
} = require("../schemas/adminSchemas");
const authenticateSuperAdmin = require("../middleware/authenticateSuperAdmin");

const router = express.Router();

router.post("/create", validate(createAdminSchema), createAdmin);

// login route
router.post("/login", validate(loginSchema), loginAdmin);

// Get all admins for a school
router.get("/school-admins/:schoolId", authenticateSuperAdmin, getSchoolAdmins);

// Update admin//
router.put("/:id", validate(updateAdminSchema), updateAdmin);

// Delete admin//
router.delete("/:id", authenticateSuperAdmin, deleteAdmin);

// check health
router.get("/", checkHealth);

module.exports = router;
