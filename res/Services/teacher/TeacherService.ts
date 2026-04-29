// src/services/teacher/TeacherService.ts
import prisma from "../../util/prisma";

type GetStudentsForGradingInput = {
    staffId: number;
    schoolId: number;
    classId?: number;
    subjectId?: number;
    academicSessionId?: number;
};

type CAScoreEntry = { studentId: number; caId: number; score: number };
type ExamScoreEntry = { studentId: number; examId: number; score: number };

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

    private async ensureTeacherCanTouchClass(staffId: number, classId: number, subjectId?: number) {
        const assignment = await prisma.teacherAssignment.findFirst({
            where: {
                staffId,
                classId,
                ...(subjectId ? { subjectId } : {})
            },
            select: { id: true }
        });
        if (!assignment) throw new Error("Forbidden: teacher not assigned to this class/subject");
    }

    async upsertCAScores(input: {
        staffId: number;
        schoolId: number;
        academicSessionId: number;
        termId?: number;
        entries: { studentId: number; caId: number; score: number }[];
    }) {
        const { staffId, schoolId, academicSessionId, termId, entries } = input;
        if (!Array.isArray(entries) || entries.length === 0) throw new Error("entries is required");

        const done = await prisma.$transaction(async (tx) => {
            let count = 0;

            for (const e of entries) {
                const ca = await tx.continuousAssessment.findUnique({
                    where: { id: e.caId },
                    select: { id: true, classId: true, subjectId: true, maxScore: true, class: { select: { schoolId: true } } }
                });
                if (!ca) throw new Error(`CA ${e.caId} not found`);
                if (ca.class.schoolId !== schoolId) throw new Error("CA does not belong to your school");

                if (ca.subjectId) {
                    // Check submission lock
                    const isSubmitted = await tx.resultSubmission.findFirst({
                        where: {
                            classId: ca.classId,
                            subjectId: ca.subjectId,
                            academicSessionId,
                            status: "PENDING"
                        },
                        select: { id: true }
                    });

                    if (isSubmitted) {
                        throw new Error("Results have been submitted for review. Scores are locked.");
                    }

                    // Check publication lock
                    const isPublished = await tx.publishedResult.findUnique({
                        where: {
                            classId_subjectId_academicSessionId: {
                                classId: ca.classId,
                                subjectId: ca.subjectId,
                                academicSessionId
                            }
                        },
                        select: { id: true }
                    });

                    if (isPublished) {
                        throw new Error("Results have been published and are permanently locked.");
                    }
                }


                await this.ensureTeacherCanTouchClass(staffId, ca.classId, ca.subjectId ?? undefined);

                if (e.score < 0 || e.score > Number(ca.maxScore)) {
                    throw new Error(`Score must be between 0 and ${ca.maxScore} for CA ${e.caId}`);
                }

                const existing = await tx.cAResult.findFirst({
                    where: { studentId: e.studentId, caId: e.caId, academicSessionId },
                    select: { id: true }
                });

                if (existing) {
                    await tx.cAResult.update({
                        where: { id: existing.id },
                        data: { score: e.score }
                    });
                } else {
                    await tx.cAResult.create({
                        data: { studentId: e.studentId, caId: e.caId, academicSessionId, score: e.score, termId: termId ?? null }
                    });
                }

                count++;
            }

            return count;
        });

        return { message: "CA scores saved", updated: done };
    }

    async upsertExamScores(input: {
        staffId: number;
        schoolId: number;
        academicSessionId: number;
        termId?: number;
        entries: ExamScoreEntry[];
    }) {
        const { staffId, schoolId, academicSessionId,termId, entries } = input;
        if (!Array.isArray(entries) || entries.length === 0) throw new Error("entries is required");

        const done = await prisma.$transaction(async (tx) => {
            let count = 0;

            for (const e of entries) {
                const exam = await tx.exam.findUnique({
                    where: { id: e.examId },
                    select: { id: true, classId: true, subjectId: true, maxScore: true, class: { select: { schoolId: true } } }
                });
                if (!exam) throw new Error(`Exam ${e.examId} not found`);
                if (exam.class.schoolId !== schoolId) throw new Error("Exam does not belong to your school");

                // Add this lock check:
                if (exam.subjectId) {
                    const isSubmitted = await tx.resultSubmission.findFirst({
                        where: {
                            classId: exam.classId,
                            subjectId: exam.subjectId,
                            academicSessionId,
                            status: "PENDING"
                        },
                        select: { id: true }
                    });

                    if (isSubmitted) {
                        throw new Error("Results have been submitted for review. Scores are locked.");
                    }

                    const isPublished = await tx.publishedResult.findUnique({
                        where: {
                            classId_subjectId_academicSessionId: {
                                classId: exam.classId,
                                subjectId: exam.subjectId,
                                academicSessionId
                            }
                        },
                        select: { id: true }
                    });

                    if (isPublished) {
                        throw new Error("Results have been published and are permanently locked.");
                    }
                }


                await this.ensureTeacherCanTouchClass(staffId, exam.classId, exam.subjectId ?? undefined);

                if (e.score < 0 || e.score > Number(exam.maxScore)) {
                    throw new Error(`Score must be between 0 and ${exam.maxScore} for Exam ${e.examId}`);
                }

                const existing = await tx.examResult.findFirst({
                    where: { studentId: e.studentId, examId: e.examId, academicSessionId },
                    select: { id: true }
                });

                if (existing) {
                    await tx.examResult.update({
                        where: { id: existing.id },
                        data: { score: e.score }
                    });
                } else {
                    await tx.examResult.create({
                        data: { studentId: e.studentId, examId: e.examId, academicSessionId, score: e.score, termId: termId ?? null }
                    });
                }

                count++;
            }

            return count;
        });

        return { message: "Exam scores saved", updated: done };
    }

    async getComputedResults(input: {
        staffId: number;
        schoolId: number;
        classId: number;
        subjectId?: number;
        academicSessionId: number;
        termId?: number;
    }) {
        const { staffId, schoolId, classId, subjectId, academicSessionId, termId } = input;

        await this.ensureTeacherCanTouchClass(staffId, classId, subjectId);

        const [students, cas, exams, schemeClass] = await Promise.all([
            prisma.student.findMany({
                where: { schoolId, classId, academicSessionId },
                select: { id: true, surname: true, name: true, otherNames: true, registrationNumber: true }
            }),
            prisma.continuousAssessment.findMany({
                where: { classId, ...(subjectId ? { subjectId } : {}) },
                select: { id: true, name: true, maxScore: true, caResults: { where: { academicSessionId, ...(termId ? { termId } : {}) }, select: { studentId: true, score: true } } }
            }),
            prisma.exam.findMany({
                where: { classId, ...(subjectId ? { subjectId } : {}) },
                select: { id: true, name: true, maxScore: true, examResults: { where: { academicSessionId, ...(termId ? { termId } : {}) }, select: { studentId: true, score: true } } }
            }),
            prisma.gradingSchemeClass.findUnique({
                where: { classId },
                include: { scheme: { include: { grades: true } } }
            })
        ]);

        if (!schemeClass) throw new Error("No grading scheme assigned to class");

        const rules = [...schemeClass.scheme.grades].sort((a, b) => b.minScore - a.minScore);

        const resultRows = students.map((s) => {
            const caTotal = cas.reduce((acc, ca) => {
                const r = ca.caResults.find((x) => x.studentId === s.id);
                return acc + Number(r?.score ?? 0);
            }, 0);

            const examTotal = exams.reduce((acc, ex) => {
                const r = ex.examResults.find((x) => x.studentId === s.id);
                return acc + Number(r?.score ?? 0);
            }, 0);

            const total = caTotal + examTotal;
            const matched = rules.find((r) => total >= r.minScore && total <= r.maxScore);

            return {
                studentId: s.id,
                studentName: `${s.surname} ${s.name} ${s.otherNames ?? ""}`.trim(),
                registrationNumber: s.registrationNumber,
                caTotal,
                examTotal,
                total,
                grade: matched?.grade ?? null,
                remark: matched?.remark ?? null
            };
        });

        return {
            classId,
            subjectId: subjectId ?? null,
            academicSessionId,
            rows: resultRows
        };
    }

    async getTeacherBroadsheet(input: {
        staffId: number;
        schoolId: number;
        classId: number;
        academicSessionId: number;
        termId?: number;
    }) {
        const { staffId, schoolId, classId, academicSessionId, termId } = input;

        // Get only subjects this teacher is assigned to in this class
        const assignments = await prisma.teacherAssignment.findMany({
            where: { staffId, classId },
            select: { subjectId: true }
        });

        const subjectIds = assignments
            .map((a) => a.subjectId)
            .filter((id): id is number => id !== null);

        if (subjectIds.length === 0) {
            throw new Error("You have no subject assignments for this class");
        }

        // Reuse the shared broadsheet logic from AssessmentService
        const assessmentService = new (await import("../AssessmentService")).AssessmentService();

        return assessmentService.computeBroadsheet({
            classId,
            schoolId,
            academicSessionId,
            subjectIds,
            termId
        });
    }

    async submitResults(input: {
        staffId: number;
        schoolId: number;
        classId: number;
        subjectId: number;
        termId?: number;
        academicSessionId: number;
    }) {
        const { staffId, schoolId, classId, subjectId, termId, academicSessionId } = input;

        // 1. Verify teacher is assigned to this class + subject
        await this.ensureTeacherCanTouchClass(staffId, classId, subjectId);

        // 2. Block if already submitted
        const existing = await prisma.resultSubmission.findFirst({
            where: { classId, subjectId, academicSessionId, staffId }
        });

        if (existing) {
            throw new Error("Results already submitted for this class and subject");
        }

        // 3. Block if already published
        const isPublished = await prisma.publishedResult.findUnique({
            where: {
                classId_subjectId_academicSessionId: {
                    classId, subjectId, academicSessionId
                }
            }
        });

        if (isPublished) {
            throw new Error("Results have already been published");
        }

        // 4. Create submission record
        const submission = await prisma.resultSubmission.create({
            data: { classId, subjectId, academicSessionId, staffId, termId: termId ?? null },
            select: {
                id: true,
                classId: true,
                subjectId: true,
                academicSessionId: true,
                status: true,
                termId: true,
                submittedAt: true
            }
        });

        return submission;
    }

    async getSubjectCAs(input: {
        staffId: number;
        schoolId: number;
        subjectId: number;
        classId: number;
    }) {
        const { staffId, schoolId, subjectId, classId } = input;

        // Confirm this teacher is actually assigned to this class + subject
        await this.ensureTeacherCanTouchClass(staffId, classId, subjectId);

        // Confirm subject belongs to this school
        const subject = await prisma.subject.findFirst({
            where: { id: subjectId, schoolId },
            select: { id: true, name: true }
        });
        if (!subject) throw new Error("Subject not found");

        // Confirm class belongs to this school
        const cls = await prisma.class.findFirst({
            where: { id: classId, schoolId },
            select: { id: true, name: true }
        });
        if (!cls) throw new Error("Class not found");

        // Fetch all CAs for this class + subject combination
        const cas = await prisma.continuousAssessment.findMany({
            where: {
                classId,
                subjectId  // narrows to only this subject's CAs
            },
            select: {
                id: true,
                name: true,     // e.g. "CA1", "CA2", "CA3"
                maxScore: true
            },
            orderBy: { name: "asc" }
        });

        return {
            subject,
            class: cls,
            cas  // teacher uses these caIds when saving scores
        };
    }

    async getSubjectExams(input: {
        staffId: number;
        schoolId: number;
        subjectId: number;
        classId: number;
    }) {
        const { staffId, schoolId, subjectId, classId } = input;

        // Step 1: confirm teacher is allowed to touch this class+subject
        await this.ensureTeacherCanTouchClass(staffId, classId, subjectId);

        // Step 2: confirm subject + class belong to this school
        const subject = await prisma.subject.findFirst({
            where: { id: subjectId, schoolId },
            select: { id: true, name: true }
        });
        if (!subject) throw new Error("Subject not found");

        const cls = await prisma.class.findFirst({
            where: { id: classId, schoolId },
            select: { id: true, name: true }
        });
        if (!cls) throw new Error("Class not found");

        // Step 3: fetch exams for this class+subject — teacher picks the examId from here
        const exams = await prisma.exam.findMany({
            where: { classId, subjectId },
            select: {
                id: true,
                name: true,      // e.g. "Midterm", "Final"
                maxScore: true
            },
            orderBy: { name: "asc" }
        });

        return { subject, class: cls, exams };
    }


}
