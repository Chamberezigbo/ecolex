const express = require("express");

const {
  createAdmin,
  loginAdmin,
  getSchoolAdmins,
  updateAdmin,
  deleteAdmin,
  checkHealth,
} = require("../../controller/admin/admin");

const {
  getStudentDetails,createStudent,
  updateStudent,changeStudentClass
} = require("../../controller/admin/StudentController");

const validate = require("../../middleware/validator");

const {
  createAdminSchema,
  loginSchema,
  updateAdminSchema,
  studentSchema,
} = require("../../schemas/adminSchemas");

const auth = require("../../middleware/authenticateSuperAdmin");

const router = express.Router();

router.post("/create", validate(createAdminSchema), createAdmin);

// login route
router.post("/login", validate(loginSchema), loginAdmin);

// Get all admins for a school
router.get("/school-admins/:schoolId", auth.authenticateSuperAdmin, getSchoolAdmins);

// Update admin//
router.put("/:id", validate(updateAdminSchema), updateAdmin);

// Delete admin//
router.delete("/:id", auth.authenticateSuperAdmin, deleteAdmin);

// check health
router.get("/", checkHealth);

// Get student details
router.get("/students", auth.authenticateSuperAdmin, auth.attachSchoolId, getStudentDetails);
router.post("/student/create", validate(studentSchema), auth.authenticateSuperAdmin, auth.attachSchoolId, createStudent);
router.put("/student/:id", auth.authenticateSuperAdmin, updateStudent);
router.get("/student", auth.authenticateSuperAdmin, auth.attachSchoolId,getStudentDetails);
router.put("/student/change-class/:studentId", auth.authenticateSuperAdmin, changeStudentClass);

module.exports = router;
