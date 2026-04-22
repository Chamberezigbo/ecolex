import prisma from "../../util/prisma";
import { AppError } from "../../util/AppError";

export class StudentResultService {

    // Populates the academic session dropdown
    async getSessions(schoolId: number) {
        return prisma.academicSession.findMany({
            where: { schoolId },
            select: { id: true, name: true, isActive: true },
            orderBy: { createdAt: "desc" }
        });
    }

    async getResults(studentId: number, academicSessionId: number) {
        // Get student + their class info
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: { class: { select: { id: true, name: true } } }
        });

        if (!student) throw new AppError("Student not found");

        // Check if this class has position ranking enabled
        const schemeClass = await prisma.gradingSchemeClass.findFirst({
            where: { classId: student.classId },
            include: { scheme: { select: { usePosition: true } } }
        });

        const usePosition = schemeClass?.scheme.usePosition ?? false;


        // Find all published result sheets for this class + session
        const publishedResults = await prisma.publishedResult.findMany({
            where: {
                classId: student.classId,
                academicSessionId
            },
            include: {
                subject: { select: { id: true, name: true } },
                rows: {
                    select: {
                        studentId: true,
                        caTotal: true,
                        examTotal: true,
                        total: true,
                        grade: true,
                        remark: true,
                        position: true
                    }
                }
            }
        });

        // Build one row per subject
        const resultSheet = await Promise.all(
            publishedResults.map(async (published) => {
                // This student's row in this subject's result
                const myRow = published.rows.find(r => r.studentId === studentId);

                if (!myRow) return null; // student not in this published result

                // Class average = mean of all students' totals for this subject
                const allTotals = published.rows.map(r => r.total);
                const classAvg = allTotals.reduce((sum, t) => sum + t, 0) / allTotals.length;

                // Individual CA scores for this student + subject
                const caResults = await prisma.cAResult.findMany({
                    where: {
                        studentId,
                        academicSessionId,
                        ca: { subjectId: published.subjectId }
                    },
                    include: {
                        ca: { select: { name: true, maxScore: true } }
                    },
                    orderBy: { ca: { name: "asc" } }
                });

                // Exam score for this student + subject
                const examResult = await prisma.examResult.findFirst({
                    where: {
                        studentId,
                        academicSessionId,
                        exam: { subjectId: published.subjectId }
                    },
                    include: {
                        exam: { select: { name: true, maxScore: true } }
                    }
                });

                return {
                    subject: published.subject.name,
                    caScores: caResults.map(r => ({
                        name: r.ca.name,       // e.g. "CA1"
                        maxScore: r.ca.maxScore, // e.g. 10
                        score: Number(r.score)
                    })),
                    caTotal: myRow.caTotal,
                    exam: examResult ? Number(examResult.score) : 0,
                    total: myRow.total,
                    grade: myRow.grade,
                    classAvg: Number(classAvg.toFixed(2)),
                };
            })
        );

        // Only compute ranking if usePosition is enabled on this class's grading scheme
        let overallPosition: number | null = null;

        if (usePosition) {
            const allRows = await prisma.publishedResultRow.findMany({
                where: {
                    publishedResult: {
                        classId: student.classId,
                        academicSessionId
                    }
                },
                select: { studentId: true, total: true }
            });

            const totalsByStudent = allRows.reduce((acc, row) => {
                acc[row.studentId] = (acc[row.studentId] || 0) + row.total;
                return acc;
            }, {} as Record<number, number>);

            const ranked = Object.entries(totalsByStudent)
                .sort(([, a], [, b]) => b - a)
                .map(([id], index) => ({ studentId: Number(id), position: index + 1 }));

            overallPosition = ranked.find(r => r.studentId === studentId)?.position ?? null;
        }

        return {
            student: {
                name: `${student.name} ${student.surname}`,
                class: student.class.name,
                position: overallPosition   // null if usePosition is false
            },
            results: resultSheet.filter(Boolean),
        };

    }
}
