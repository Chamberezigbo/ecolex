const { log } = require("winston");
const prisma = require("../../util/prisma");
const { response } = require("express");

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
              const{
                     name, campusId, classId,
                     surname,otherNames,gender,dateOfBirth,
                     guardianName,guardianNumber,lifestyle,session,
                     email,
              } = req.body;

              const schoolId = req.schoolId;

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
                     },
              });

              res.status(201).json({
                     success: true,
                     message: "Student created successfully",
                     student: createdStudent,
              });


       } catch (error) {
              next(error);
       }
}

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
         const { studentId } = req.params;
         const { classId, groupId, campusId } = req.body;
     
         if (!classId)
           return res.status(400).json({ message: "Class ID is required" });
     
         // 1️⃣ Validate class existence
         const classExist = await prisma.class.findUnique({
           where: { id: parseInt(classId) },
           include: { classGroups: true },
         });
     
         if (!classExist) {
           return res.status(404).json({ message: "Class not found" });
         }
     
         // ✅ Optional: Validate campus if provided
         if (campusId) {
           const campusExist = await prisma.campus.findUnique({
             where: { id: parseInt(campusId) },
           });
           if (!campusExist) {
             return res.status(404).json({ message: "Campus not found" });
           }
           if (campusExist.schoolId !== classExist.schoolId) {
             return res.status(400).json({
               message: "This campus does not belong to the same school as the class",
             });
           }
         }
     
         // 2️⃣ Validate student existence
         const student = await prisma.student.findUnique({
           where: { id: parseInt(studentId) },
         });
     
         if (!student) {
           return res.status(404).json({ message: "Student not found" });
         }
     
         // 3️⃣ Validate group if provided
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
     
         // 4️⃣ Update student (class + optional group + optional campus)
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
     
         res.status(200).json({
           success: true,
           message: `Student moved to class ${classExist.name}${
             groupId ? " and added to group" : ""
           }${campusId ? " in the selected campus" : ""} successfully`,
           student: updatedStudent,
         });
       } catch (error) {
         next(error);
       }
};
     
