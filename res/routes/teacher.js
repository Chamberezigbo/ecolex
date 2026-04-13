const express = require("express");

const { TeacherAuthController } = require("../controller/auth/TeacherAuthController");
const { TeacherOverviewController } = require("../controller/teacher/TeacherOverviewController");
const { TeacherController } = require("../controller/teacher/TeacherController");
const { teacherAuthMiddleware } = require("../middleware/teacherMiddleware");

const router = express.Router();

const teacherAuthController = new TeacherAuthController();
const teacherOverviewController = new TeacherOverviewController();
const teacherController = new TeacherController();

router.post("/login", teacherAuthController.login);
router.get("/overview", teacherAuthMiddleware, teacherOverviewController.getOverview);

// existing read
router.get("/students", teacherAuthMiddleware, teacherController.getStudentsForGrading);

// new: write/edit scores
router.post("/scores/ca", teacherAuthMiddleware, teacherController.upsertCAScores);
router.post("/scores/exam", teacherAuthMiddleware, teacherController.upsertExamScores);

// new: computed result sheet
router.get("/results", teacherAuthMiddleware, teacherController.getComputedResults);

// new: grading scheme
router.post("/grading/create", teacherAuthMiddleware, teacherController.createGradingScheme);
router.post("/grading/:schemeId/classes", teacherAuthMiddleware, teacherController.addApplicableClasses);
router.delete("/grading/remark/:ruleId", teacherAuthMiddleware, teacherController.deleteRemark);

// Broadsheet
router.get("/broadsheet", teacherAuthMiddleware, teacherController.getTeacherBroadsheet);

router.get("/results/submissions", auth.authenticateSuperAdmin, auth.attachSchoolId, assessmentController.getPendingSubmissions);
router.delete("/results/submissions/:submissionId/reject", auth.authenticateSuperAdmin, auth.attachSchoolId, assessmentController.rejectSubmission);




module.exports = router;
