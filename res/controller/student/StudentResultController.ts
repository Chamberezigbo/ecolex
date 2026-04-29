import { Response, NextFunction } from "express";
import { StudentRequest } from "../../middleware/studentMiddleware";
import { StudentResultService } from "../../Services/student/StudentResultService";

export class StudentResultController {
    private resultService = new StudentResultService();

    getSessions = async (req: StudentRequest, res: Response, next: NextFunction) => {
        try {
            const sessions = await this.resultService.getSessions(req.schoolId!);
            res.status(200).json({ success: true, data: sessions });
        } catch (err) {
            next(err);
        }
    };

    getResults = async (req: StudentRequest, res: Response, next: NextFunction) => {
        try {
            const academicSessionId = Number(req.query.academicSessionId);
            const termId = req.query.termId ? Number(req.query.termId) : undefined;

            if (!academicSessionId) {
                throw new Error("academicSessionId is required");
            }

            const data = await this.resultService.getResults(req.studentId!, academicSessionId, termId);
            res.status(200).json({ success: true, data });
        } catch (err) {
            next(err);
        }
    };
}
