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
  updateStudent,changeStudentClass,
  getSingleStudent,
} = require("../../controller/admin/StudentController");

const{
  createClass,
  getAllClasses,
  deleteClass,
  createClassGroup,
  getClassGroups,
  updateClass,
  updateClassGroup
} = require("../../controller/admin/ClassController");

const{
  createCampus,
  updateCampus,
  getCampuses,
} = require("../../controller/admin/campusController")

const {
  createStaff,updateStaff,
  getStaffDetails,assignTeacher,
  getAllStaff,deleteStaff
} = require("../../controller/admin/StaffController")

const {
  createSubject,
  getAllSubjects,
  editSubject,
  deleteSubject
} = require("../../controller/admin/SubjectController");

const validate = require("../../middleware/validator");

const {
  createAdminSchema,
  loginSchema,
  updateAdminSchema,
  studentSchema,
  staffSchema,
  editStaffSchema,
  assignTeacherSchema,
  classSchema,
  classGroupSchema
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
router.patch("/student/change-class", auth.authenticateSuperAdmin, changeStudentClass);
router.get("/student/:id", auth.authenticateSuperAdmin, getSingleStudent);

// routes/admin/staffRoutes.js
router.post("/staff/create",validate(staffSchema), auth.authenticateSuperAdmin, auth.attachSchoolId, createStaff);
router.patch("/staff/:staffId",validate(editStaffSchema), auth.authenticateSuperAdmin, updateStaff); 
router.get("/staff/:staffId", auth.authenticateSuperAdmin, getStaffDetails);
router.post('/staff/assign-teacher', validate(assignTeacherSchema), auth.authenticateSuperAdmin, assignTeacher);
router.get("/staff", auth.authenticateSuperAdmin, auth.attachSchoolId, getAllStaff);
router.delete("/staff/:staffId", auth.authenticateSuperAdmin, deleteStaff);

// routes/admin/classRoutes.js
router.post("/classes/create", validate(classSchema), auth.authenticateSuperAdmin,auth.attachSchoolId, createClass);
router.get("/classes", auth.authenticateSuperAdmin, auth.attachSchoolId, getAllClasses);
router.delete("/classes/:classId", auth.authenticateSuperAdmin, deleteClass);
router.post("/class-groups/create", validate(classGroupSchema), auth.authenticateSuperAdmin, auth.attachSchoolId, createClassGroup);
router.get("/class-groups", auth.authenticateSuperAdmin, auth.attachSchoolId, getClassGroups);
router.patch("/class/update/:classId", auth.authenticateSuperAdmin, updateClass);
router.patch("/class-group/update/:groupId", auth.authenticateSuperAdmin, updateClassGroup);

// routes/admin/campus.js//
router.post("/campus/create", auth.authenticateSuperAdmin,auth.attachSchoolId,createCampus);
router.patch("/campus/update/:campusId", auth.authenticateSuperAdmin,updateCampus);
router.get("/campuses", auth.authenticateSuperAdmin,auth.attachSchoolId,getCampuses);

// routes/admin/subject.js//
router.post("/subject/create", auth.authenticateSuperAdmin,auth.attachSchoolId,createSubject);
router.get("/subjects", auth.authenticateSuperAdmin,auth.attachSchoolId,getAllSubjects);
router.put("/subject/:subjectId", auth.authenticateSuperAdmin,auth.attachSchoolId,editSubject);
router.delete("/subject/:subjectId", auth.authenticateSuperAdmin,deleteSubject);

module.exports = router;
