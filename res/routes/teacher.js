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
router.get("/subjects/:subjectId/cas", teacherAuthMiddleware, teacherController.getSubjectCAs);
router.get("/subjects/:subjectId/exams", teacherAuthMiddleware, teacherController.getSubjectExams);


// Broadsheet
router.get("/broadsheet", teacherAuthMiddleware, teacherController.getTeacherBroadsheet);

// Teacher submits results for admin review (locks scores)
router.post("/results/submit", teacherAuthMiddleware, teacherController.submitResults);

router.get("/active-term", teacherAuthMiddleware, teacherController.getActiveTerm);






module.exports = router;
