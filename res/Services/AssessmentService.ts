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
        termId?: number;
    }) {
        const { classId, schoolId, academicSessionId, subjectIds, classGroupId, termId } = input;

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
                            where: { academicSessionId, ...(termId ? { termId } : {}) },
                            select: { studentId: true, score: true }
                        }
                    }
                },
                exams: {
                    where: { classId },
                    select: {
                        id: true,
                        examResults: {
                            where: { academicSessionId, ...(termId ? { termId } : {}) },
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
        termId?: number;
    }) {
        const { classId, schoolId, academicSessionId, classGroupId, termId } = input;

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

        const broadsheet = await this.computeBroadsheet({
            classId,
            schoolId,
            academicSessionId,
            subjectIds,
            classGroupId,
            termId
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
        termId?: number;
    }) {
        const { classId, subjectId, academicSessionId, schoolId, termId, adminId } = input;

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
                    termId: termId ?? null,
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

    async getStudentResult(input: {
        studentId: number;
        classId: number;
        schoolId: number;
        academicSessionId: number;
        termId?: number;
    }) {
        const { studentId, classId, schoolId, academicSessionId, termId } = input;

        // 1. Get student info
        const student = await prisma.student.findFirst({
            where: { id: studentId, classId, schoolId, academicSessionId },
            select: {
                id: true,
                name: true,
                surname: true,
                otherNames: true,
                registrationNumber: true,
                passportUrl: true,
                class: { select: { name: true, customName: true } },
                campus: { select: { name: true } },
                academicSession: { select: { name: true } }
            }
        });

        if (!student) throw new Error("Student not found");

        // 2. Get grading scheme for this class
        const schemeClass = await prisma.gradingSchemeClass.findUnique({
            where: { classId },
            include: { scheme: { include: { grades: true } } }
        });

        if (!schemeClass) throw new Error("No grading scheme assigned to this class");
        const rules = [...schemeClass.scheme.grades].sort((a, b) => b.minScore - a.minScore);

        // 3. Get subjects assigned to this class
        const classSubjects = await prisma.classSubject.findMany({
            where: { classId },
            select: { subjectId: true }
        });
        const subjectIds = classSubjects.map(cs => cs.subjectId);

        // 4. Get each subject's CAs and exam score for this student only
        const subjects = await prisma.subject.findMany({
            where: { id: { in: subjectIds } },
            select: {
                id: true,
                name: true,
                continuousAssessments: {
                    where: { classId },
                    orderBy: { createdAt: "asc" }, // ensures 1st CA, 2nd CA order
                    select: {
                        name: true,
                        caResults: {
                            where: { academicSessionId, studentId, ...(termId ? { termId } : {}) },
                            select: { score: true }
                        }
                    }
                },
                exams: {
                    where: { classId },
                    select: {
                        examResults: {
                            where: { academicSessionId, studentId, ...(termId ? { termId } : {}) },
                            select: { score: true }
                        }
                    }
                }
            }
        });

        // 5. Build per-subject scores
        let grandTotal = 0;

        const subjectScores = subjects.map(subject => {
            const cas = subject.continuousAssessments.map(ca => ({
                name: ca.name,                             // "1st CA", "2nd CA" etc.
                score: Number(ca.caResults[0]?.score ?? 0)
            }));

            const caTotal = cas.reduce((sum, ca) => sum + ca.score, 0);
            const examTotal = subject.exams.reduce((acc, exam) =>
                acc + Number(exam.examResults[0]?.score ?? 0), 0);

            const subjectTotal = caTotal + examTotal;
            const matched = rules.find(r => subjectTotal >= r.minScore && subjectTotal <= r.maxScore);

            grandTotal += subjectTotal;

            return {
                subjectName: subject.name,
                cas,          // individual CA breakdown
                caTotal,
                examTotal,
                subjectTotal,
                grade: matched?.grade ?? null,
                remark: matched?.remark ?? null
            };
        });

        // 6. Get class position by running the full broadsheet and finding this student's row
        const broadsheet = await this.computeBroadsheet({ classId, schoolId, academicSessionId, subjectIds, termId });
        const myRow = broadsheet.rows.find(r => r.studentId === studentId);
        const position = myRow?.position ?? null;
        const totalStudents = broadsheet.rows.length;

        // 7. Compute average and overall grade
        const avgScore = subjects.length > 0 ? grandTotal / subjects.length : 0;
        const overallMatched = rules.find(r => avgScore >= r.minScore && avgScore <= r.maxScore);

        return {
            student: {
                name: `${student.surname} ${student.name} ${student.otherNames ?? ""}`.trim(),
                registrationNumber: student.registrationNumber,
                passportUrl: student.passportUrl,
                class: student.class?.customName ?? student.class?.name ?? null,
                campus: student.campus?.name ?? null,
                session: student.academicSession?.name ?? null
            },
            subjects: subjectScores,
            performance: {
                totalScore: grandTotal,
                averageScore: Number(avgScore.toFixed(2)),
                position: position ? `${position} out of ${totalStudents}` : null,
                overallGrade: overallMatched?.grade ?? null
            }
        };
    }

    async getTeacherResult(input: {
        staffId: number;
        classId: number;
        subjectId: number;
        schoolId: number;
        academicSessionId: number;
        page?: number;
        termId?: number;
    }) {
        const { staffId, classId, subjectId, schoolId, academicSessionId, page = 1, termId } = input;
        const take = 8;
        const skip = (page - 1) * take;

        // 1. Teacher, class, subject, session info in parallel
        const [teacher, classRecord, subject, session, submission] = await Promise.all([
            prisma.staff.findFirst({
                where: { id: staffId, schoolId },
                select: { id: true, name: true, registrationNumber: true, campus: { select: { name: true } } }
            }),
            prisma.class.findFirst({
                where: { id: classId, schoolId },
                select: { name: true, customName: true }
            }),
            prisma.subject.findUnique({
                where: { id: subjectId },
                select: { name: true }
            }),
            prisma.academicSession.findUnique({
                where: { id: academicSessionId },
                select: { name: true }
            }),
            prisma.resultSubmission.findFirst({
                where: { staffId, classId, subjectId, academicSessionId },
                select: { id: true, status: true, submittedAt: true }
            })
        ]);

        if (!teacher) throw new Error("Teacher not found");
        if (!classRecord) throw new Error("Class not found");

        // 2. Grading scheme for this class
        const schemeClass = await prisma.gradingSchemeClass.findUnique({
            where: { classId },
            include: { scheme: { include: { grades: true } } }
        });

        if (!schemeClass) throw new Error("No grading scheme assigned to this class");
        const rules = [...schemeClass.scheme.grades].sort((a, b) => b.minScore - a.minScore);

        // 3. CAs and Exam for this subject+class (the structure, not results yet)
        const [cas, exams] = await Promise.all([
            prisma.continuousAssessment.findMany({
                where: { classId, subjectId },
                orderBy: { createdAt: "asc" },   // 1st CA, 2nd CA in order
                select: { id: true, name: true }
            }),
            prisma.exam.findMany({
                where: { classId, subjectId },
                select: { id: true, name: true }
            })
        ]);

        // 4. Students in this class — paginated
        const [students, total] = await Promise.all([
            prisma.student.findMany({
                where: { classId, schoolId, academicSessionId },
                select: { id: true, name: true, surname: true, registrationNumber: true },
                take,
                skip,
                orderBy: { surname: "asc" }
            }),
            prisma.student.count({ where: { classId, schoolId, academicSessionId } })
        ]);

        const studentIds = students.map(s => s.id);
        const caIds = cas.map(ca => ca.id);
        const examIds = exams.map(e => e.id);

        // 5. Fetch all CA results and exam results for these students in one query each
        const [caResults, examResults] = await Promise.all([
            prisma.cAResult.findMany({
                where: { caId: { in: caIds }, studentId: { in: studentIds }, academicSessionId, ...(termId ? { termId } : {}) },
                select: { caId: true, studentId: true, score: true }
            }),
            prisma.examResult.findMany({
                where: { examId: { in: examIds }, studentId: { in: studentIds }, academicSessionId, ...(termId ? { termId } : {}) },
                select: { examId: true, studentId: true, score: true }
            })
        ]);

        // 6. Build rows — one per student
        const rows = students.map(student => {
            // Individual CA scores in order
            const caScores = cas.map(ca => {
                const result = caResults.find(r => r.caId === ca.id && r.studentId === student.id);
                return { name: ca.name, score: Number(result?.score ?? 0) };
            });

            const caTotal = caScores.reduce((sum, ca) => sum + ca.score, 0);
            const examTotal = examResults
                .filter(r => r.studentId === student.id)
                .reduce((sum, r) => sum + Number(r.score), 0);

            const subjectTotal = caTotal + examTotal;
            const matched = rules.find(r => subjectTotal >= r.minScore && subjectTotal <= r.maxScore);

            return {
                registrationNumber: student.registrationNumber,
                studentName: `${student.surname} ${student.name}`.trim(),
                caScores,     // [{ name: "1st CA", score: 17 }, { name: "2nd CA", score: 13 }]
                caTotal,
                examTotal,
                subjectTotal,
                grade: matched?.grade ?? null,
                remark: matched?.remark ?? null
            };
        });

        return {
            teacher: {
                name: teacher.name,
                registrationNumber: teacher.registrationNumber,
                campus: teacher.campus?.name ?? null
            },
            subject: subject?.name ?? null,
            class: classRecord.customName ?? classRecord.name,
            session: session?.name ?? null,
            submission: submission
                ? { id: submission.id, status: submission.status, submittedAt: submission.submittedAt }
                : null,
            rows,
            meta: {
                total,
                page,
                pageSize: take,
                totalPages: Math.ceil(total / take)
            }
        };
    }

    async scheduleExam(input: { examId: number; schoolId: number; scheduledDate: Date }) {
        const { examId, schoolId, scheduledDate } = input;

        const exam = await prisma.exam.findFirst({
            where: { id: examId, class: { schoolId } },
            select: { id: true }
        });

        if (!exam) throw new Error("Exam not found or does not belong to your school");

        return prisma.exam.update({
            where: { id: examId },
            data: { scheduledDate },
            select: { id: true, name: true, scheduledDate: true, class: { select: { name: true } } }
        });
    }


}
