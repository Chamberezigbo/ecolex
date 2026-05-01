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

    async getResults(studentId: number, schoolId: number, academicSessionId?: number, termId?: number) {
        // Get active/latest session if not provided
        let sessionId = academicSessionId;
        if (!sessionId) {
            const activeSession = await prisma.academicSession.findFirst({
                where: { schoolId, isActive: true },
                select: { id: true }
            });

            if (!activeSession) {
                const latestSession = await prisma.academicSession.findFirst({
                    where: { schoolId },
                    orderBy: { createdAt: "desc" },
                    select: { id: true }
                });
                if (!latestSession) throw new Error("No academic session found");
                sessionId = latestSession.id;
            } else {
                sessionId = activeSession.id;
            }
        }

        // Fetch student's CA results for this session
        const caResults = await prisma.cAResult.findMany({
            where: {
                studentId,
                academicSessionId: sessionId,
                ...(termId ? { termId } : {})
            },
            include: {
                ca: {
                    select: { name: true, maxScore: true }
                }
            },
            orderBy: { createdAt: "asc" }
        });

        // Fetch student's exam results for this session
        const examResults = await prisma.examResult.findMany({
            where: {
                studentId,
                academicSessionId: sessionId,
                ...(termId ? { termId } : {})
            },
            include: {
                exam: {
                    select: { name: true, maxScore: true }
                }
            },
            orderBy: { createdAt: "asc" }
        });

        return { caResults, examResults };
    }

}
