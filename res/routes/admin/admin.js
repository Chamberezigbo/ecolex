const express = require("express");

const {
  createAdmin,
  loginAdmin,
  getSchoolAdmins,
  updateAdmin,
  deleteAdmin,
  checkHealth,
  getMySchool,
  getSchoolAssessments
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
  getAllStaff,deleteStaff,
  reassignTeacher
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
router.post("/login", validate(loginSchema), loginAdmin);

router.get("/school-admins", auth.authenticateSuperAdmin, auth.attachSchoolId, getSchoolAdmins);
router.put("/:id", validate(updateAdminSchema), updateAdmin);
router.delete("/:id", auth.authenticateSuperAdmin, deleteAdmin);
router.get("/", checkHealth);

// My school info for any authenticated admin
router.get("/my-school", auth.authenticateAdmin, getMySchool);

// Student routes
router.get("/students", auth.authenticateSuperAdmin, auth.attachSchoolId, getStudentDetails);
router.post("/student/create", validate(studentSchema), auth.authenticateSuperAdmin, auth.attachSchoolId, createStudent);
router.put("/student/:id", auth.authenticateSuperAdmin, updateStudent);
router.patch("/student/change-class", auth.authenticateSuperAdmin, changeStudentClass);
router.get("/student/:id", auth.authenticateSuperAdmin, getSingleStudent);
// Staff routes
router.post("/staff/create",validate(staffSchema), auth.authenticateSuperAdmin, auth.attachSchoolId, createStaff);
router.patch("/staff/:staffId",validate(editStaffSchema), auth.authenticateSuperAdmin, updateStaff); 
router.get("/staff/:staffId", auth.authenticateSuperAdmin, getStaffDetails);
router.post('/staff/assign-teacher', validate(assignTeacherSchema), auth.authenticateSuperAdmin, assignTeacher);
router.get("/staff", auth.authenticateSuperAdmin, auth.attachSchoolId, getAllStaff);
router.delete("/staff/:staffId", auth.authenticateSuperAdmin, deleteStaff);
router.patch("/staff/reassign-teacher/:assignmentId", auth.authenticateSuperAdmin,auth.attachSchoolId, reassignTeacher);

// Class routes
router.post("/classes/create", validate(classSchema), auth.authenticateSuperAdmin,auth.attachSchoolId, createClass);
router.get("/classes", auth.authenticateSuperAdmin, auth.attachSchoolId, getAllClasses);
router.delete("/classes/:classId", auth.authenticateSuperAdmin, deleteClass);
router.post("/class-groups/create", validate(classGroupSchema), auth.authenticateSuperAdmin, auth.attachSchoolId, createClassGroup);
router.get("/class-groups", auth.authenticateSuperAdmin, auth.attachSchoolId, getClassGroups);
router.patch("/class/update/:classId", auth.authenticateSuperAdmin, updateClass);
router.patch("/class-group/update/:groupId", auth.authenticateSuperAdmin, updateClassGroup);

// Campus routes
router.post("/campus/create", auth.authenticateSuperAdmin,auth.attachSchoolId,createCampus);
router.patch("/campus/update/:campusId", auth.authenticateSuperAdmin,updateCampus);
router.get("/campuses", auth.authenticateSuperAdmin,auth.attachSchoolId,getCampuses);

// Subject routes
router.post("/subject/create", auth.authenticateSuperAdmin,auth.attachSchoolId,createSubject);
router.get("/subjects", auth.authenticateSuperAdmin,auth.attachSchoolId,getAllSubjects);
router.put("/subject/:subjectId", auth.authenticateSuperAdmin,auth.attachSchoolId,editSubject);
router.delete("/subject/:subjectId", auth.authenticateSuperAdmin,deleteSubject);


// List all CA for the authenticated admin’s school
// Optional filters: classId, subjectId, campusId, name; pagination: page, pageSize
router.get('/assessments', auth.authenticateAdmin, auth.attachSchoolId, getSchoolAssessments);

module.exports = router;
