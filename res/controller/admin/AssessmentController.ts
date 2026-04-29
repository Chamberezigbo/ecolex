import type { Request, Response, NextFunction } from "express";
import { AssessmentService } from "../../Services/AssessmentService";

interface AuthenticatedRequest extends Request {
    schoolId?: string;
}

export class AssessmentController {
    private service = new AssessmentService();

    createCATemplate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.schoolId) throw new Error("Missing schoolId");

            const schoolId = Number(req.schoolId);
            const { classId, templates } = req.body;

            // templates must be a non-empty array
            if (!Array.isArray(templates) || templates.length === 0) {
                throw new Error("templates must be a non-empty array");
            }

            // each template must have name, maxScore, isExam
            for (const t of templates) {
                if (!t.name || t.maxScore === undefined || t.isExam === undefined) {
                    throw new Error("Each template must have name, maxScore and isExam");
                }
            }

            const result = await this.service.createCATemplate({
                schoolId,
                classId: classId ? Number(classId) : undefined,
                templates
            });

            const scope = classId ? `class ${classId}` : "school";

            return res.status(201).json({
                success: true,
                message: `CA template set for ${scope}`,
                data: result
            });
        } catch (err) {
            next(err);
        }
    };

    getCATemplates = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.schoolId) throw new Error("Missing schoolId");

            const classId = req.query.classId ? Number(req.query.classId) : undefined;

            const result = await this.service.getCATemplates(Number(req.schoolId), classId);

            return res.status(200).json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };


    assignSubjectsToClass = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.schoolId) throw new Error("Missing schoolId");

            const { classId, subjectIds } = req.body;
            const adminId = (req as any).user?.id;

            if (!classId || isNaN(Number(classId))) throw new Error("Invalid classId");
            if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
                throw new Error("subjectIds must be a non-empty array");
            }

            const result = await this.service.assignSubjectsToClass({
                classId: Number(classId),
                subjectIds: subjectIds.map(Number),
                schoolId: Number(req.schoolId),
                adminId: Number(adminId)
            });

            return res.status(201).json({
                success: true,
                message: `${result.assigned} subject(s) assigned. ${result.casCreated} CA(s) and ${result.examsCreated} exam(s) auto-generated.`,
                data: result
            });
        } catch (err) {
            next(err);
        }
    };

    getClassSubjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.schoolId) throw new Error("Missing schoolId");

            const classId = Number(req.params.classId);
            if (isNaN(classId)) throw new Error("Invalid classId");

            const result = await this.service.getClassSubjects(classId, Number(req.schoolId));

            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (err) {
            next(err);
        }
    };

    publishResults = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.schoolId) throw new Error("Missing schoolId");

            const { classId, subjectId, academicSessionId } = req.body;
            const adminId = (req as any).user?.id;

            if (!classId || !subjectId || !academicSessionId) {
                throw new Error("classId, subjectId and academicSessionId are all required");
            }

            const result = await this.service.publishResults({
                classId: Number(classId),
                subjectId: Number(subjectId),
                academicSessionId: Number(academicSessionId),
                schoolId: Number(req.schoolId),
                adminId: Number(adminId)
            });

            return res.status(201).json({
                success: true,
                message: "Results published successfully",
                data: result
            });
        } catch (err) {
            next(err);
        }
    };

    getPendingSubmissions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.schoolId) throw new Error("Missing schoolId");

            const result = await this.service.getPendingSubmissions(Number(req.schoolId));

            return res.status(200).json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    rejectSubmission = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.schoolId) throw new Error("Missing schoolId");

            const submissionId = Number(req.params.submissionId);
            if (isNaN(submissionId)) throw new Error("Invalid submissionId");

            const result = await this.service.rejectSubmission(submissionId, Number(req.schoolId));

            return res.status(200).json({
                success: true,
                message: "Submission rejected. Teacher can now re-enter scores.",
                data: result
            });
        } catch (err) {
            next(err);
        }
    };

    getAdminBroadsheet = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.schoolId) throw new Error("Missing schoolId");

            const classId = Number(req.query.classId);
            const academicSessionId = Number(req.query.academicSessionId);
            const classGroupId = req.query.classGroupId ? Number(req.query.classGroupId) : undefined;
            const termId = req.query.termId ? Number(req.query.termId) : undefined;

            if (isNaN(classId)) throw new Error("Invalid classId");
            if (isNaN(academicSessionId)) throw new Error("Invalid academicSessionId");

            const result = await this.service.getAdminBroadsheet({
                classId,
                academicSessionId,
                schoolId: Number(req.schoolId),
                classGroupId,
                termId
            });

            return res.status(200).json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    getStudentResult = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.schoolId) throw new Error("Missing schoolId");

            const studentId = Number(req.query.studentId);
            const classId = Number(req.query.classId);
            const academicSessionId = Number(req.query.academicSessionId);
            const termId = req.query.termId ? Number(req.query.termId) : undefined;

            if (!studentId || !classId || !academicSessionId) {
                return res.status(400).json({ message: "studentId, classId, and academicSessionId are required" });
            }

            const result = await this.service.getStudentResult({
                studentId,
                classId,
                schoolId: Number(req.schoolId),
                academicSessionId,
                termId
            });

            return res.status(200).json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    getTeacherResult = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.schoolId) throw new Error("Missing schoolId");

            const staffId = Number(req.query.staffId);
            const classId = Number(req.query.classId);
            const subjectId = Number(req.query.subjectId);
            const academicSessionId = Number(req.query.academicSessionId);
            const page = req.query.page ? Number(req.query.page) : 1;
            const termId = req.query.termId ? Number(req.query.termId) : undefined;

            if (!staffId || !classId || !subjectId || !academicSessionId) {
                return res.status(400).json({
                    message: "staffId, classId, subjectId and academicSessionId are required"
                });
            }

            const result = await this.service.getTeacherResult({
                staffId,
                classId,
                subjectId,
                schoolId: Number(req.schoolId),
                academicSessionId,
                page,
                termId
            });

            return res.status(200).json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    scheduleExam = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.schoolId) throw new Error("Missing schoolId");

            const examId = Number(req.params.examId);
            const { scheduledDate } = req.body;

            if (!scheduledDate) {
                return res.status(400).json({ message: "scheduledDate is required" });
            }

            const result = await this.service.scheduleExam({
                examId,
                schoolId: Number(req.schoolId),
                scheduledDate: new Date(scheduledDate)
            });

            return res.status(200).json({ success: true, message: "Exam scheduled", data: result });
        } catch (err) {
            next(err);
        }
    };


}
