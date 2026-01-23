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

router.get("/:id", teacherAuthMiddleware, teacherController.getStudentsForGrading);

module.exports = router;
