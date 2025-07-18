const prisma = require("../../util/prisma");
const {
  classSchema,
  campusSchema,
  continuousAssessmentSchema,
  requestSchema,
} = require("../../schemas/setupSchema");

const validate = require("../../middleware/validator");
const { date } = require("joi");

exports.createClasses = async (req, res, next) => {
  const { school_id, classes } = req.body;

  if (!school_id || typeof school_id !== "number") {
    return res.status(400).json({ message: "A valid school_id is required." });
  }

  if (!Array.isArray(classes) || classes.length === 0) {
    return res
      .status(400)
      .json({ message: "Expected a non-empty array of classes." });
  }

  for (const classData of classes) {
    const { error } = classSchema.validate(classData);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
  }

  try {
    // Step 1: Confirm school exists
    const existingSchool = await prisma.school.findUnique({
      where: { id: school_id },
    });

    if (!existingSchool) {
      return res
        .status(400)
        .json({ message: "Invalid school_id. No such school exists." });
    }

    // Step 2: Check if any class already assigned to the school
    const existingClasses = await prisma.class.findFirst({
      where: { schoolId: school_id },
    });

    if (existingClasses) {
      return res.status(400).json({
        message: "Classes have already been assigned to this school.",
      });
    }

    // Step 3: Fetch all campuses under this school
    const campuses = await prisma.campus.findMany({
      where: { schoolId: school_id },
      select: { id: true },
    });

    if (!campuses.length) {
      return res.status(400).json({
        message: "No campuses found for this school to assign classes to.",
      });
    }

    // Step 4: Prepare the classes to assign across campuses
    const classDataToInsert = [];

    for (const campus of campuses) {
      for (const classItem of classes) {
        classDataToInsert.push({
          schoolId: school_id,
          campusId: campus.id,
          name: classItem.name,
        });
      }
    }

    // Step 5: Bulk insert
    const result = await prisma.class.createMany({
      data: classDataToInsert,
    });

    // Fetch all classes for this school (across campuses)
    const savedClasses = await prisma.class.findMany({
      where: { schoolId: school_id },
    });

    res.status(201).json({
      message: `${result.count} classes created successfully across campuses.`,
      count: result.count,
      data: {savedClasses}
    });
  } catch (error) {
    next(error);
  }
};

exports.createCampuses = async (req, res, next) => {
  const { school_id, campuses } = req.body;

  if (!school_id || typeof school_id !== "number") {
    return res.status(400).json({ message: "A valid school_id is required." });
  }

  if (!Array.isArray(campuses) || campuses.length === 0) {
    return res
      .status(400)
      .json({ message: "Expected a non-empty array of campuses." });
  }

  try {
    const existingSchool = await prisma.school.findUnique({
      where: { id: school_id },
    });

    if (!existingSchool) {
      return res
        .status(400)
        .json({ message: "Invalid school_id. No such school exists." });
    }

    // 2. Check for duplicate names within the request
    const seenNames = new Set();
    for (const campus of campuses) {
      if (seenNames.has(campus.name.toLowerCase())) {
        return res.status(400).json({
          message: `Duplicate campus name '${campus.name}' found in request.`,
        });
      }
      seenNames.add(campus.name.toLowerCase());
    }

    // 3. Get existing campus names from DB for that school
    const existingCampusNames = await prisma.campus.findMany({
      where: { schoolId: school_id },
      select: { name: true },
    });

    const existingNamesSet = new Set(
      existingCampusNames.map((c) => c.name.toLowerCase())
    );

    // 4. Filter out campus names that already exist in the DB
    const filteredCampuses = campuses.filter(
      (c) => !existingNamesSet.has(c.name.toLowerCase())
    );

    if (filteredCampuses.length === 0) {
      return res.status(400).json({
        message: "All provided campus names already exist for this school.",
      });
    }

    const campusDataToInsert = [];

    for (const campus of filteredCampuses) {
      const { error } = campusSchema.validate(campus);
      if (error) {
        return res.status(400).json({ message: error.details[0].message });
      }

      campusDataToInsert.push({
        schoolId: school_id,
        name: campus.name,
        address: campus.address || null,
        phoneNumber: campus.phoneNumber || null,
        email: campus.email || null,
      });
    }

    // 6. Insert
    const result = await prisma.campus.createMany({
      data: campusDataToInsert,
    });

    // Fetch all campuses for this school
    const savedCampuses = await prisma.campus.findMany({
      where: { schoolId: school_id },
    });

    res.status(201).json({
      message: `${result.count} campuses created successfully.`,
      count: result.count,
      date:{savedCampuses}
    });
  } catch (err) {
    next(err);
  }
};

exports.createAssessmentsAndExam = async (req, res, next) => {
  try {
    const { assessments, exam } = req.body;

    // Validate that assessments array exists and is not empty
    if (!Array.isArray(assessments) || assessments.length === 0) {
      return res
        .status(400)
        .json({ message: "Expected a non-empty array of assessments (CAs)." });
    }

    // Validate each assessment item
    for (const ca of assessments) {
      if (
        !ca.class_id ||
        typeof ca.class_id !== "number" ||
        !ca.name ||
        typeof ca.name !== "string" ||
        !ca.weightage ||
        typeof ca.weightage !== "number" ||
        !ca.max_score ||
        typeof ca.max_score !== "number"
      ) {
        return res
          .status(400)
          .json({ message: "Invalid assessment data provided." });
      }

      // Check if class exists
      const existingClass = await prisma.class.findUnique({
        where: { id: ca.class_id },
      });

      if (!existingClass) {
        return res.status(400).json({
          message: `Class with ID ${ca.class_id} not found.`,
        });
      }
    }

    // Validate exam if provided
    if (exam) {
      if (
        !exam.class_id ||
        typeof exam.class_id !== "number" ||
        !exam.name ||
        typeof exam.name !== "string" ||
        !exam.weightage ||
        typeof exam.weightage !== "number" ||
        !exam.max_score ||
        typeof exam.max_score !== "number"
      ) {
        return res.status(400).json({ message: "Invalid exam data provided." });
      }

      // Check if class exists for exam
      const existingClassForExam = await prisma.class.findUnique({
        where: { id: exam.class_id },
      });

      if (!existingClassForExam) {
        return res.status(400).json({
          message: `Class with ID ${exam.class_id} not found for exam.`,
        });
      }
    }

    // If all validations pass, prepare data
    const assessmentsData = assessments.map((ca) => ({
      classId: ca.class_id,
      name: ca.name,
      weightage: ca.weightage,
      maxScore: ca.max_score,
    }));

    await prisma.continuousAssessment.createMany({
      data: assessmentsData,
      skipDuplicates: true,
    });

    if (exam) {
      const examData = {
        classId: exam.class_id,
        name: exam.name,
        weightage: exam.weightage,
        maxScore: exam.max_score,
      };

      await prisma.exam.create({ data: examData });
    }

    res.status(201).json({
      message: "Assessments and exam created successfully.",
    });
  } catch (error) {
    next(error);
  }
};
