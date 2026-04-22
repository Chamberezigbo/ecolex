// src/controllers/teacher/TeacherController.ts
import { Response, NextFunction } from "express";
import { TeacherRequest } from "../../middleware/teacherMiddleware";
import { TeacherService } from "../../Services/teacher/TeacherService";
import { GradingService } from "../../Services/teacher/GradingService";

export class TeacherController {
    private service = new TeacherService();
    private gradingService = new GradingService();

    getStudentsForGrading = async (req: TeacherRequest, res: Response, next: NextFunction) => {
        try {
            const { classId, subjectId } = req.query;
            const { academicSessionId } = req.query;

            if (!req.staffId || !req.schoolId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const data = await this.service.getStudentsForGrading({
                staffId: req.staffId,
                schoolId: req.schoolId,
                classId: classId ? Number(classId) : undefined,
                subjectId: subjectId ? Number(subjectId) : undefined,
                academicSessionId: academicSessionId ? Number(academicSessionId) : undefined
            });

            return res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    };

    upsertCAScores = async (req: TeacherRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.staffId || !req.schoolId) return res.status(401).json({ message: "Unauthorized" });

            const data = await this.service.upsertCAScores({
                staffId: req.staffId,
                schoolId: req.schoolId,
                academicSessionId: Number(req.body.academicSessionId),
                entries: req.body.entries
            });

            return res.json({ success: true, ...data });
        } catch (err) {
            next(err);
        }
    };

    upsertExamScores = async (req: TeacherRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.staffId || !req.schoolId) return res.status(401).json({ message: "Unauthorized" });

            const data = await this.service.upsertExamScores({
                staffId: req.staffId,
                schoolId: req.schoolId,
                academicSessionId: Number(req.body.academicSessionId),
                entries: req.body.entries
            });

            return res.json({ success: true, ...data });
        } catch (err) {
            next(err);
        }
    };

    getComputedResults = async (req: TeacherRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.staffId || !req.schoolId) return res.status(401).json({ message: "Unauthorized" });

            const data = await this.service.getComputedResults({
                staffId: req.staffId,
                schoolId: req.schoolId,
                classId: Number(req.query.classId),
                subjectId: req.query.subjectId ? Number(req.query.subjectId) : undefined,
                academicSessionId: Number(req.query.academicSessionId)
            });

            return res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    };

    // Grading scheme related endpoints
    createGradingScheme = async (req: TeacherRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.schoolId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const schoolId = Number(req.schoolId);
            if (Number.isNaN(schoolId)) {
                return res.status(400).json({ success: false, message: "Invalid schoolId" });
            }

            const data = await this.gradingService.createScheme(schoolId, req.body);

            return res.status(201).json({
                success: true,
                message: "Grading scheme created successfully",
                data
            });
        } catch (err) {
            next(err);
        }
    };

    addApplicableClasses = async (req: TeacherRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.schoolId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const schoolId = Number(req.schoolId);
            const schemeId = Number(req.params.schemeId);
            const classIds = req.body.classIds;

            if (Number.isNaN(schoolId) || Number.isNaN(schemeId)) {
                return res.status(400).json({ success: false, message: "Invalid schoolId or schemeId" });
            }

            const data = await this.gradingService.addClassesToScheme(schoolId, schemeId, classIds);

            return res.status(200).json({
                success: true,
                message: "Applicable classes updated",
                data
            });
        } catch (err) {
            next(err);
        }
    };

    deleteRemark = async (req: TeacherRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.schoolId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const schoolId = Number(req.schoolId);
            const ruleId = Number(req.params.ruleId);

            if (Number.isNaN(schoolId) || Number.isNaN(ruleId)) {
                return res.status(400).json({ success: false, message: "Invalid schoolId or ruleId" });
            }

            const data = await this.gradingService.deleteRemarkRule(schoolId, ruleId);

            return res.status(200).json({
                success: true,
                message: "Remark deleted successfully",
                data
            });
        } catch (err) {
            next(err);
        }
    };

    getTeacherBroadsheet = async (req: TeacherRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.staffId || !req.schoolId) return res.status(401).json({ message: "Unauthorized" });

            const classId = Number(req.query.classId);
            const academicSessionId = Number(req.query.academicSessionId);

            if (isNaN(classId)) throw new Error("Invalid classId");
            if (isNaN(academicSessionId)) throw new Error("Invalid academicSessionId");

            const data = await this.service.getTeacherBroadsheet({
                staffId: req.staffId,
                schoolId: req.schoolId,
                classId,
                academicSessionId
            });

            return res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    };

    submitResults = async (req: TeacherRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.staffId || !req.schoolId) return res.status(401).json({ message: "Unauthorized" });

            const { classId, subjectId, academicSessionId } = req.body;

            if (!classId || !subjectId || !academicSessionId) {
                throw new Error("classId, subjectId and academicSessionId are required");
            }

            const result = await this.service.submitResults({
                staffId: req.staffId,
                schoolId: req.schoolId,
                classId: Number(classId),
                subjectId: Number(subjectId),
                academicSessionId: Number(academicSessionId)
            });

            return res.status(201).json({
                success: true,
                message: "Results submitted successfully. Scores are now locked pending admin review.",
                data: result
            });
        } catch (err) {
            next(err);
        }
    };

    getSubjectCAs = async (req: TeacherRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.staffId || !req.schoolId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const subjectId = Number(req.params.subjectId);
            const classId = Number(req.query.classId);

            if (!subjectId || !classId) {
                throw new Error("subjectId (param) and classId (query) are required");
            }

            const data = await this.service.getSubjectCAs({
                staffId: req.staffId,
                schoolId: req.schoolId,
                subjectId,
                classId
            });

            return res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    };

    getSubjectExams = async (req: TeacherRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.staffId || !req.schoolId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const subjectId = Number(req.params.subjectId);
            const classId = Number(req.query.classId);

            if (!subjectId || !classId) {
                throw new Error("subjectId (param) and classId (query) are required");
            }

            const data = await this.service.getSubjectExams({
                staffId: req.staffId,
                schoolId: req.schoolId,
                subjectId,
                classId
            });

            return res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    };


}
