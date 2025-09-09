const prisma = require('../../util/prisma');

/**
 * Register a new staff
 */
exports.createStaff = async (req, res, next) => {
       try {
              const schoolId = req.schoolId;   // set by your auth middleware

              const {
              name,
              email,
              phoneNumber,
              address,
              duty,       // e.g. "Teacher", "Accountant"
              nextOfKin,
              dateEmployed,
              payroll,
              campusId,
              } = req.body;


              // ✅ Check duplicate email
              const existingStaff = await prisma.staff.findUnique({
                     where: { email },
              });
              if (existingStaff) {
                     return res.status(409).json({
                            success: false,
                            message: "A staff with this email already exists.",
                     });
              }

              // ✅ Create staff
              const newStaff = await prisma.staff.create({
                     data: {
                            schoolId,
                            campusId,
                            name,
                            email,
                            phoneNumber,
                            address,
                            duty,
                            nextOfKin,
                            dateEmployed: dateEmployed ? new Date(dateEmployed) : null,
                            payroll,
                     },
              });

              res.status(201).json({
                     success: true,
                     message: "Staff registered successfully",
                     staff: newStaff,
              });
       } catch (error) {
              next(error);
       }
};

exports.updateStaff = async (req, res, next) => {
       try {     
         const { staffId } = req.params;
         const value = req.body;
     
         // Ensure staff exists
         const existingStaff = await prisma.staff.findUnique({
           where: { id: Number(staffId) },
         });
     
         if (!existingStaff) {
           return res.status(404).json({
             success: false,
             message: "Staff not found",
           });
         }

         // ✅ Check duplicate email if email is being updated
         if (value.email) {
              const duplicateEmail = await prisma.staff.findFirst({
              where: {
                     email: value.email,
                     NOT: { id: Number(staffId) }, // exclude the current staff
              },
              });
       
              if (duplicateEmail) {
              return res.status(409).json({
                     success: false,
                     message: "A staff with this email already exists.",
              });
              }
       }
     
         // Update staff
         const updatedStaff = await prisma.staff.update({
           where: { id: Number(staffId) },
           data: value,
         });
     
         res.status(200).json({
           success: true,
           message: "Staff updated successfully",
           staff: updatedStaff,
         });
       } catch (err) {
         next(err);
       }
};

exports.getStaffDetails = async (req, res, next) => {
       try {
              const { staffId } = req.params;
              const staff = await prisma.staff.findUnique({
                     where: { id: Number(staffId) },
              });

              if (!staff) {
                     return res.status(404).json({
                            success: false,
                            message: "Staff not found",
                     });
              }

              res.status(200).json({
                     success: true,
                     staff,
              });

       } catch (error) {
              next(error);
       }
}


exports.assignTeacher = async (req, res, next) => {
       try {
         const { staffId, classId, subjectId } = req.body;
     
         // Ensure staff exists
         const staff = await prisma.staff.findUnique({ where: { id: staffId } });
         if (!staff) return res.status(404).json({ success: false, message: "Staff not found" });
     
         // Ensure class exists
         const classRecord = await prisma.class.findUnique({ where: { id: classId } });
         if (!classRecord) return res.status(404).json({ success: false, message: "Class not found" });
     
         // Ensure subject exists
         const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
         if (!subject) return res.status(404).json({ success: false, message: "Subject not found" });
     
         // Create assignment (prevent duplicates)
         const assignment = await prisma.teacherAssignment.upsert({
           where: {
             staffId_classId_subjectId: { staffId, classId, subjectId },
           },
           update: {}, // nothing to update if exists
           create: { staffId, classId, subjectId },
         });
     
         res.status(200).json({
           success: true,
           message: "Teacher assigned successfully",
           assignment,
         });
       } catch (err) {
         next(err);
       }
}

// GET /staff?name=John&campusId=1&duty=Teacher&classId=2&subjectId=3&page=1&pageSize=7
exports.getAllStaff = async (req, res, next) => {
       try {
         const schoolId = req.schoolId; // ✅ injected by middleware (auth)
     
         let {
           name,
           campusId,
           duty,
           classId,
           subjectId,
           page = 1,
           pageSize = 7,
         } = req.query;
     
         page = parseInt(page);
         pageSize = parseInt(pageSize);
     
         const filters = {
           schoolId, // ✅ ensures only staff of this school
           AND: [],
         };
     
         if (name) {
           filters.AND.push({
             name: { contains: name, },
           });
         }
     
         if (campusId) {
           filters.AND.push({ campusId: Number(campusId) });
         }
     
         if (duty) {
           filters.AND.push({ duty: { equals: duty } });
         }
     
         if (classId) {
           filters.AND.push({
             assignments: {
               some: {
                 classId: Number(classId),
               },
             },
           });
         }
     
         if (subjectId) {
           filters.AND.push({
             assignments: {
               some: {
                 subjectId: Number(subjectId),
               },
             },
           });
         }
     
         const total = await prisma.staff.count({
           where: filters,
         });
     
         const staff = await prisma.staff.findMany({
           where: filters,
           skip: (page - 1) * pageSize,
           take: pageSize,
           include: {
             campus: true,
             assignments: {
               include: {
                 class: true,
                 subject: true,
                 campus: true,
               },
             },
           },
           orderBy: { createdAt: "desc" },
         });
     
         res.status(200).json({
           success: true,
           pagination: {
             total,
             page,
             pageSize,
             totalPages: Math.ceil(total / pageSize),
           },
           staff,
         });
       } catch (err) {
         next(err);
       }
};

// StaffController.js
exports.deleteStaff = async (req, res, next) => {
       try {
         const { staffId } = req.params;
     
         // ✅ Ensure staff exists
         const existingStaff = await prisma.staff.findUnique({
           where: { id: Number(staffId) },
         });
     
         if (!existingStaff) {
           return res.status(404).json({
             success: false,
             message: "Staff not found",
           });
         }
     
         // ✅ Delete all teacher assignments linked to staff
         await prisma.teacherAssignment.deleteMany({
           where: { staffId: Number(staffId) },
         });
     
         // ✅ Finally, delete staff
         await prisma.staff.delete({
           where: { id: Number(staffId) },
         });
     
         res.status(200).json({
           success: true,
           message: "Staff and related assignments deleted successfully",
         });
       } catch (err) {
         next(err);
       }
};
     