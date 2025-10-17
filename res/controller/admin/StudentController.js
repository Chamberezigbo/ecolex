const { log } = require("winston");
const prisma = require("../../util/prisma");
const { response } = require("express");

const { generateUniqueIdentifier } = require("../../Models/generateUniqueIdentifier");

exports.getStudentDetails = async (req, res, next) => {
       try {
              const {page =1,campusId, name, gender, classId, classGroupId } = req.query;
              const take = 9;
              const skip = (page - 1) * take;
       

              if(!req.schoolId) {
                     return res.status(400).json({ message: "School ID is required" });
              }
               
               

              const filter ={schoolId: req.schoolId};

              if (campusId) filter.campusId = parseInt(campusId);
              if (name) filter.name = { contains: name,};
              if(gender) filter.gender=gender;
              if(classId) filter.classId = parseInt(classId);
              if(classGroupId) filter.classGroupId = parseInt(classGroupId);

              const students = await prisma.student.findMany({
                     where: filter,
                     take,
                     skip,
                     orderBy: { createdAt: "desc" },
                     include: {class: {include: {classGroups: true}}, campus: true},
              })

              const total = await prisma.student.count({where: filter});

              res.status(200).json({
                     students,meta: {
                            total,
                            page: parseInt(page),
                            pageSize: take,
                            totalPages: Math.ceil(total / take),
                     },
              });

       } catch (error) {
              next(error);
       }
}

exports.createStudent = async (req, res, next) => {
  try {
    const {
      name,
      campusId,
      classId,
      groupId, // ✅ Accept groupId from request body
      surname,
      otherNames,
      gender,
      dateOfBirth,
      guardianName,
      guardianNumber,
      lifestyle,
      session,
      email,
    } = req.body;

    const schoolId = req.schoolId;

    // Get the school prefix
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { prefix: true },
    });
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    const uniqueId = generateUniqueIdentifier(school.prefix, "STD");

    // 1️⃣ Validate class existence
    const classExist = await prisma.class.findUnique({
      where: { id: parseInt(classId) },
      include: { classGroups: true },
    });
    if (!classExist) {
      return res.status(404).json({ message: "Class not found" });
    }

    // 2️⃣ Validate group if provided
    let groupData = {};
    if (groupId) {
      const groupExist = await prisma.classGroup.findUnique({
        where: { id: parseInt(groupId) },
      });
      if (!groupExist) {
        return res.status(404).json({ message: "Class group not found" });
      }
      if (groupExist.classId !== classExist.id) {
        return res.status(400).json({
          message: "This group does not belong to the specified class",
        });
      }

      groupData = { classGroupId: parseInt(groupId) };
    }

    // 3️⃣ Create student
    const createdStudent = await prisma.student.create({
      data: {
        name,
        schoolId,
        campusId,
        classId,
        surname,
        otherNames,
        gender,
        dateOfBirth,
        guardianName,
        guardianNumber,
        lifestyle,
        session,
        email,
        registrationNumber: uniqueId,
        ...groupData, // ✅ Attach group if provided
      },
      include: {
        class: { include: { classGroups: true } },
        classGroup: true, // ✅ Return group data if exists
      },
    });

    res.status(201).json({
      success: true,
      message: `Student created successfully${groupId ? " and added to group" : ""}`,
      student: createdStudent,
    });
  } catch (error) {
    next(error);
  }
};
     

exports.updateStudent = async (req, res, next) => {
  try{
    const { id } = req.params;
    const data = req.body;

    const studentExist = await prisma.student.findUnique({
      where: { id: parseInt(id) },
    });

    if (!studentExist) {
      return res.status(404).json({ message: "Student not found" });
    }

    const updatedStudent = await prisma.student.update({
      where: { id: parseInt(id) },
      data,
    });

    res.status(200).json({
      success: true,
      message: "Student updated successfully",
      student: updatedStudent,
    });
  }catch(error){
        next(error);
  }
}

exports.getSingleStudent = async (req, res, next) => {
       try{
              const { id } = req.params;

              const studentExist = await prisma.student.findUnique({
                     where: { id: parseInt(id) },
              });

              if (!studentExist) {
                     return res.status(404).json({ message: "Student not found" });
              }

              res.status(200).json({
                     success: true,
                     message: "Student updated successfully",
                     data: studentExist,
              });
       }catch(error){
              next(error);
       }
}

exports.changeStudentClass = async (req, res, next) => {
  try {
    const { studentIds } = req.body; // Array of student IDs
    const { classId, groupId, campusId } = req.body;

    // Validate class ID
    if (!classId) {
      return res.status(400).json({ success: false, message: "Class ID is required" });
    }

    // Validate student IDs
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: "At least one student ID is required" });
    }

    // 1️⃣ Validate class existence
    const classExist = await prisma.class.findUnique({
      where: { id: parseInt(classId) },
      include: { classGroups: true },
    });

    if (!classExist) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    // ✅ Optional: Validate campus if provided
    if (campusId) {
      const campusExist = await prisma.campus.findUnique({
        where: { id: parseInt(campusId) },
      });
      if (!campusExist) {
        return res.status(404).json({ success: false, message: "Campus not found" });
      }
      if (campusExist.schoolId !== classExist.schoolId) {
        return res.status(400).json({
          success: false,
          message: "This campus does not belong to the same school as the class",
        });
      }
    }

    // 2️⃣ Validate group if provided
    let groupData = {};
    if (groupId) {
      const groupExist = await prisma.classGroup.findUnique({
        where: { id: parseInt(groupId) },
      });
      if (!groupExist) {
        return res.status(404).json({ success: false, message: "Class group not found" });
      }
      if (groupExist.classId !== classExist.id) {
        return res.status(400).json({
          success: false,
          message: "This group does not belong to the specified class",
        });
      }

      groupData = { classGroupId: parseInt(groupId) };
    }

    // 3️⃣ Update students (class + optional group + optional campus)
    const updatedStudents = [];
    const errors = [];

    
    for (const studentId of studentIds) {
      
      try {
        const studentExist = await prisma.student.findUnique({
          where: { id: parseInt(studentId) },
        });

        if (!studentExist) {
          errors.push({ studentId, message: `Student with ID ${studentId} not found` });
          continue;
        }

        const updatedStudent = await prisma.student.update({
          where: { id: parseInt(studentId) },
          data: {
            classId: parseInt(classId),
            ...(campusId && { campusId: parseInt(campusId) }),
            ...groupData,
          },
          include: {
            class: { include: { classGroups: true, campus: true } },
            campus: true,
          },
        });

        updatedStudents.push(updatedStudent);
      } catch (error) {
        errors.push({ studentId, message: error.message });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some students could not be updated",
        errors,
      });
    }

    res.status(200).json({
      success: true,
      message: `Students moved to class ${classExist.name}${
        groupId ? " and added to group" : ""
      }${campusId ? " in the selected campus" : ""} successfully`,
      students: updatedStudents,
    });
  } catch (error) {
    next(error);
  }
};