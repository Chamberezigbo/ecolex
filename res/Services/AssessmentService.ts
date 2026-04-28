import prisma from "../util/prisma";

export class AssessmentService {

    async createCATemplate(data: {
        schoolId: number;
        classId?: number;
        templates: { name: string; maxScore: number; isExam: boolean }[];
    }) {
        const { schoolId, classId, templates } = data;

        // 1. Verify school exists
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { id: true }
        });

        if (!school) throw new Error("School not found");

        // 2. If classId provided, verify class belongs to this school
        if (classId) {
            const classRecord = await prisma.class.findFirst({
                where: { id: classId, schoolId },
                select: { id: true }
            });

            if (!classRecord) throw new Error("Class not found or does not belong to your school");
        }

        // 3. Delete existing templates for this school+class combo before replacing
        // This allows admin to redefine the template cleanly
        await prisma.cATemplate.deleteMany({
            where: {
                schoolId,
                classId: classId ?? null
            }
        });

        // 4. Create all new templates in one go
        await prisma.cATemplate.createMany({
            data: templates.map((t) => ({
                schoolId,
                classId: classId ?? null,
                name: t.name,
                maxScore: t.maxScore,
                isExam: t.isExam
            }))
        });

        // 5. Return what was saved
        const saved = await prisma.cATemplate.findMany({
            where: { schoolId, classId: classId ?? null },
            select: { id: true, name: true, maxScore: true, isExam: true, classId: true }
        });

        return saved;
    }

    async getCATemplates(schoolId: number, classId?: number) {
        // School-wide template (classId = null)
        const schoolWide = await prisma.cATemplate.findMany({
            where: { schoolId, classId: null },
            select: { id: true, name: true, maxScore: true, isExam: true }
        });

        // Class-specific template only if classId was provided

        let classSpecific: {
            classId: number;
            className: string;
            templates: { name: string; id: number; maxScore: number; isExam: boolean }[];
        } | null = null;


        if (classId) {
            const classRecord = await prisma.class.findFirst({
                where: { id: classId, schoolId },
                select: { id: true, name: true }
            });
            if (!classRecord) throw new Error("Class not found or does not belong to your school");

            const templates = await prisma.cATemplate.findMany({
                where: { schoolId, classId },
                select: { id: true, name: true, maxScore: true, isExam: true }
            });

            classSpecific = {
                classId,
                className: classRecord.name,
                templates  // empty array means class uses school-wide
            };
        }

        return { schoolWide, classSpecific };
    }


    async assignSubjectsToClass(data: {
        classId: number;
        subjectIds: number[];
        schoolId: number;
        adminId: number;
    }) {
        const { classId, subjectIds, schoolId, adminId } = data;

        // 1. Verify class belongs to this school
        const classRecord = await prisma.class.findFirst({
            where: { id: classId, schoolId },
            select: { id: true }
        });

        if (!classRecord) throw new Error("Class not found or does not belong to your school");

        // 2. Verify all subjects belong to this school
        const subjects = await prisma.subject.findMany({
            where: { id: { in: subjectIds }, schoolId },
            select: { id: true }
        });

        if (subjects.length !== subjectIds.length) {
            throw new Error("One or more subjects not found or do not belong to your school");
        }

        // 3. Find which subjects are already assigned to this class — skip them
        const existing = await prisma.classSubject.findMany({
            where: { classId, subjectId: { in: subjectIds } },
            select: { subjectId: true }
        });

        const alreadyAssigned = new Set(existing.map((e) => e.subjectId));
        const newSubjectIds = subjectIds.filter((id) => !alreadyAssigned.has(id));

        if (newSubjectIds.length === 0) {
            return { assigned: 0, skipped: subjectIds.length, casCreated: 0, examsCreated: 0 };
        }

        // 4. Find the CA template — class-specific first, fall back to school-wide
        let templates = await prisma.cATemplate.findMany({
            where: { schoolId, classId }  // class-specific
        });

        if (templates.length === 0) {
            templates = await prisma.cATemplate.findMany({
                where: { schoolId, classId: null }  // school-wide fallback
            });
        }

        if (templates.length === 0) {
            throw new Error(
                "No CA template found. Please define a CA template for this school or class before assigning subjects."
            );
        }

        // 5. Separate CAs from Exams
        const caTemplates = templates.filter((t) => !t.isExam);
        const examTemplates = templates.filter((t) => t.isExam);

        // 6. Run everything in a transaction — all or nothing
        return prisma.$transaction(async (tx) => {
            let totalCAs = 0;
            let totalExams = 0;

            for (const subjectId of newSubjectIds) {

                // Create ClassSubject link
                await tx.classSubject.create({
                    data: { classId, subjectId }
                });

                // Auto-generate CAs for this subject using template
                if (caTemplates.length > 0) {
                    await tx.continuousAssessment.createMany({
                        data: caTemplates.map((t) => ({
                            classId,
                            subjectId,
                            name: t.name,
                            maxScore: t.maxScore,
                            createdByAdminId: adminId
                        }))
                    });
                    totalCAs += caTemplates.length;
                }

                // Auto-generate Exams for this subject using template
                if (examTemplates.length > 0) {
                    await tx.exam.createMany({
                        data: examTemplates.map((t) => ({
                            classId,
                            subjectId,
                            name: t.name,
                            maxScore: t.maxScore,
                            createdByAdminId: adminId
                        }))
                    });
                    totalExams += examTemplates.length;
                }
            }

            return {
                assigned: newSubjectIds.length,
                skipped: alreadyAssigned.size,
                casCreated: totalCAs,
                examsCreated: totalExams
            };
        });
    }

    async getClassSubjects(classId: number, schoolId: number) {

        // Verify class belongs to this school
        const classRecord = await prisma.class.findFirst({
            where: { id: classId, schoolId },
            select: { id: true, name: true }
        });

        if (!classRecord) throw new Error("Class not found or does not belong to your school");

        // Fetch all subjects linked to this class
        const classSubjects = await prisma.classSubject.findMany({
            where: { classId },
            select: {
                id: true,
                subject: {
                    select: { id: true, name: true, code: true }
                }
            }
        });

        return {
            classId,
            className: classRecord.name,
            subjects: classSubjects.map((cs) => cs.subject)
        };
    }

    async computeBroadsheet(input: {
        classId: number;
        schoolId: number;
        academicSessionId: number;
        subjectIds: number[];  // admin passes all, teacher passes only theirs
        classGroupId?: number;
    }) {
        const { classId, schoolId, academicSessionId, subjectIds, classGroupId } = input;

        // 1. Get students in this class for this session
        const students = await prisma.student.findMany({
            where: { classId, schoolId, academicSessionId, ...(classGroupId ? { classGroupId } : {}) },
            select: {
                id: true,
                surname: true,
                name: true,
                otherNames: true,
                registrationNumber: true
            }
        });

        // 2. Get grading scheme for this class
        const schemeClass = await prisma.gradingSchemeClass.findUnique({
            where: { classId },
            include: { scheme: { include: { grades: true } } }
        });

        if (!schemeClass) throw new Error("No grading scheme assigned to this class");

        const rules = [...schemeClass.scheme.grades].sort((a, b) => b.minScore - a.minScore);

        // 3. Get all subjects with their CAs and Exams
        const subjects = await prisma.subject.findMany({
            where: { id: { in: subjectIds } },
            select: {
                id: true,
                name: true,
                continuousAssessments: {
                    where: { classId },
                    select: {
                        id: true,
                        caResults: {
                            where: { academicSessionId },
                            select: { studentId: true, score: true }
                        }
                    }
                },
                exams: {
                    where: { classId },
                    select: {
                        id: true,
                        examResults: {
                            where: { academicSessionId },
                            select: { studentId: true, score: true }
                        }
                    }
                }
            }
        });

        // 4. Build rows — one row per student
        const rows = students.map((student) => {
            let grandTotal = 0;

            // For each subject compute caTotal + examTotal + grade
            const scores: Record<string, {
                caTotal: number;
                examTotal: number;
                subjectTotal: number;
                grade: string | null;
                remark: string | null;
            }> = {};

            for (const subject of subjects) {
                const caTotal = subject.continuousAssessments.reduce((acc, ca) => {
                    const result = ca.caResults.find((r) => r.studentId === student.id);
                    return acc + Number(result?.score ?? 0);
                }, 0);

                const examTotal = subject.exams.reduce((acc, exam) => {
                    const result = exam.examResults.find((r) => r.studentId === student.id);
                    return acc + Number(result?.score ?? 0);
                }, 0);

                const subjectTotal = caTotal + examTotal;
                const matched = rules.find((r) => subjectTotal >= r.minScore && subjectTotal <= r.maxScore);

                grandTotal += subjectTotal;

                scores[subject.name] = {
                    caTotal,
                    examTotal,
                    subjectTotal,
                    grade: matched?.grade ?? null,
                    remark: matched?.remark ?? null
                };
            }

            return {
                studentId: student.id,
                studentName: `${student.surname} ${student.name} ${student.otherNames ?? ""}`.trim(),
                registrationNumber: student.registrationNumber,
                scores,       // keyed by subject name
                grandTotal
            };
        });

        // 5. Add position — sort by grandTotal descending
        const usePosition = schemeClass.scheme.usePosition;

        const sorted = [...rows].sort((a, b) => b.grandTotal - a.grandTotal);

        const finalRows = sorted.map((row, index) => ({
            ...row,
            position: usePosition ? index + 1 : null
        }));

        return {
            classId,
            academicSessionId,
            subjects: subjects.map((s) => s.name),
            usePosition,
            rows: finalRows
        };
    }

    async getAdminBroadsheet(input: {
        classId: number;
        schoolId: number;
        academicSessionId: number;
        classGroupId?: number;
    }) {
        const { classId, schoolId, academicSessionId, classGroupId } = input;

        // Verify class belongs to school
        const classRecord = await prisma.class.findFirst({
            where: { id: classId, schoolId },
            select: {
                id: true,
                name: true,
                customName: true,
                staff: { select: { name: true } },
            }
        });

        if (!classRecord) throw new Error("Class not found or does not belong to your school");

        // get session name
        const session = await prisma.academicSession.findUnique({
            where: { id: academicSessionId },
            select: { name: true }
        });

        // Get ALL subjects assigned to this class
        const classSubjects = await prisma.classSubject.findMany({
            where: { classId },
            select: { subjectId: true }
        });

        if (classSubjects.length === 0) {
            throw new Error("No subjects assigned to this class yet");
        }


        const subjectIds = classSubjects.map((cs) => cs.subjectId);

        // pass classGroupId down
        const broadsheet = await this.computeBroadsheet({
            classId,
            schoolId,
            academicSessionId,
            subjectIds,
            classGroupId   // ← new
        });


        return {
            ...broadsheet,
            className: classRecord.customName ?? classRecord.name,
            classTeacher: classRecord.staff?.name ?? null,
            sessionName: session?.name ?? null
        };

    }

    async publishResults(input: {
        classId: number;
        subjectId: number;
        academicSessionId: number;
        schoolId: number;
        adminId: number;
    }) {
        const { classId, subjectId, academicSessionId, schoolId, adminId } = input;

        // 1. Verify class and subject belong to this school
        const classRecord = await prisma.class.findFirst({
            where: { id: classId, schoolId },
            select: { id: true }
        });
        if (!classRecord) throw new Error("Class not found or does not belong to your school");

        const subject = await prisma.subject.findFirst({
            where: { id: subjectId, schoolId },
            select: { id: true }
        });
        if (!subject) throw new Error("Subject not found or does not belong to your school");

        // 2. Block re-publication — results already published for this class/subject/session
        const alreadyPublished = await prisma.publishedResult.findUnique({
            where: { classId_subjectId_academicSessionId: { classId, subjectId, academicSessionId } }
        });
        if (alreadyPublished) {
            throw new Error("Results for this class and subject have already been published");
        }

        // 3. Compute live results using existing broadsheet logic
        const computed = await this.computeBroadsheet({
            classId,
            schoolId,
            academicSessionId,
            subjectIds: [subjectId]
        });

        // 4. Save snapshot in a transaction
        return prisma.$transaction(async (tx) => {

            // Create the publication record
            const publication = await tx.publishedResult.create({
                data: {
                    classId,
                    subjectId,
                    academicSessionId,
                    publishedByAdminId: adminId
                }
            });

            // Save each student's row as a frozen snapshot
            await tx.publishedResultRow.createMany({
                data: computed.rows.map((row) => {
                    const subjectScores = Object.values(row.scores)[0]; // only one subject

                    return {
                        publishedResultId: publication.id,
                        studentId: row.studentId,
                        caTotal: subjectScores.caTotal,
                        examTotal: subjectScores.examTotal,
                        total: subjectScores.subjectTotal,
                        grade: subjectScores.grade,
                        position: row.position
                    };
                })
            });

            return {
                publicationId: publication.id,
                classId,
                subjectId,
                academicSessionId,
                publishedAt: publication.publishedAt,
                totalStudents: computed.rows.length
            };
        });
    }

    // Admin gets all pending submissions for their school
    async getPendingSubmissions(schoolId: number) {
        return prisma.resultSubmission.findMany({
            where: {
                status: "PENDING",
                class: { schoolId }
            },
            select: {
                id: true,
                status: true,
                submittedAt: true,
                class: { select: { id: true, name: true } },
                subject: { select: { id: true, name: true } },
                academicSession: { select: { id: true, name: true } },
                staff: { select: { id: true, name: true } }
            },
            orderBy: { submittedAt: "desc" }
        });
    }

    // Admin rejects a submission — unlocks scores for teacher
    async rejectSubmission(submissionId: number, schoolId: number) {
        const submission = await prisma.resultSubmission.findFirst({
            where: { id: submissionId, class: { schoolId } },
            select: { id: true, status: true }
        });

        if (!submission) throw new Error("Submission not found");

        if (submission.status !== "PENDING") {
            throw new Error("Only pending submissions can be rejected");
        }

        // Delete the submission — this unlocks scores for the teacher
        await prisma.resultSubmission.delete({ where: { id: submissionId } });

        return { rejected: true, submissionId };
    }


}
