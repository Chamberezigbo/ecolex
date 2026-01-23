// src/services/teacher/TeacherService.ts
import prisma from "../../util/prisma";

interface GetStudentsForGradingInput {
    staffId: number;
    schoolId: number;
    classId?: number;
    subjectId?: number;
    academicSessionId?: number;
}

export class TeacherService {
    async getStudentsForGrading(input: GetStudentsForGradingInput) {
        const {
            staffId,
            schoolId,
            classId,
            subjectId,
            academicSessionId
        } = input;

        // 1️⃣ Get active academic session if none selected
        const session =
            academicSessionId
                ? await prisma.academicSession.findUnique({
                    where: { id: academicSessionId }
                })
                : await prisma.academicSession.findFirst({
                    where: { schoolId, isActive: true }
                });

        if (!session) {
            throw new Error("No active academic session found");
        }

        // 2️⃣ Fetch teacher's assigned classes
        const assignments = await prisma.teacherAssignment.findMany({
            where: {
                staffId,
                ...(classId && { classId }),
                ...(subjectId && { subjectId })
            },
            include: {
                class: true,
                subject: true
            }
        });

        // 3️⃣ Get unique class IDs from assignments
        const assignedClassIds = assignments
            .filter(a => a.classId)
            .map(a => a.classId!);

        // 4️⃣ Fetch students from assigned classes
        const students = await prisma.student.findMany({
            where: {
                schoolId,
                classId: classId || { in: assignedClassIds },
                academicSessionId: session.id
            },
            select: {
                id: true,
                name: true,
                surname: true,
                otherNames: true,
                registrationNumber: true,
                classId: true,
                class: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                surname: 'asc'
            }
        });

        // 5️⃣ Fetch grading scheme for the class(es)
        const gradingSchemes = await prisma.gradingScheme.findMany({
            where: {
                schoolId,
                classes: {
                    some: {
                        classId: classId || { in: assignedClassIds }
                    }
                }
            },
            include: {
                grades: {
                    orderBy: { minScore: "desc" }
                }
            }
        });

        return {
            academicSession: session,
            assignments,
            students,
            gradingSchemes
        };
    }
}
