const express = require("express");
const authenticateSuperAdmin = require("../middleware/authenticateSuperAdmin");
const authLogin = require("../middleware/authLogin");
const academicController = require("../controller/admin/setup");

const router = express.Router();

router.use(authLogin);

router.post("/class", authenticateSuperAdmin, academicController.createClasses);
router.post(
  "/campus",
  authenticateSuperAdmin,
  academicController.createCampuses
);
router.post("/ca", academicController.createAssessmentsAndExam);

module.exports = router;
