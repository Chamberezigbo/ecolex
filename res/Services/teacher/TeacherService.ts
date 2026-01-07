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

        // 2️⃣ Fetch grading scheme
        const gradingScheme = await prisma.gradingScheme.findMany({
            where: {
                schoolId,
                ...(session && { academicSessionId: session.id })
            },
            orderBy: { minScore: "desc" }
        });

        // 3️⃣ Fetch students
        const students = await prisma.student.findMany({
            where: {
                schoolId,
                ...(classId && { classId }),
                class: {
                    teachers: {
                        some: { staffId }
                    }
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                admissionNumber: true
            }
        });

        return {
            academicSession: session,
            gradingScheme,
            students
        };
    }
}
