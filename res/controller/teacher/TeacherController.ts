// src/controllers/teacher/TeacherController.ts
import { Response, NextFunction } from "express";
import { TeacherRequest } from "../../middleware/teacherMiddleware";
import { TeacherService } from "../../Services/teacher/TeacherService";

export class TeacherController {
    private service = new TeacherService();

    getStudentsForGrading = async (
        req: TeacherRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { classId, subjectId } = req.params;
            const { academicSessionId } = req.query;

            if (!req.staffId || !req.schoolId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const data = await this.service.getStudentsForGrading({
                staffId: req.staffId,
                schoolId: req.schoolId,
                classId: classId ? Number(classId) : undefined,
                subjectId: subjectId ? Number(subjectId) : undefined,
                academicSessionId: academicSessionId
                    ? Number(academicSessionId)
                    : undefined
            });

            res.json({
                success: true,
                data
            });
        } catch (err) {
            next(err);
        }
    };
}
