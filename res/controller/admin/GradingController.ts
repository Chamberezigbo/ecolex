// src/controllers/grading/GradingController.ts
import type { Request, Response, NextFunction } from "express"
import { GradingService } from "../../Services/GradingService"

interface AuthenticatedRequest extends Request {
    schoolId?: string
}

export class GradingController {
    private gradingService = new GradingService()

    create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (req.schoolId === undefined) {
                throw new Error("Missing schoolId")
            }
            const schoolId = Number(req.schoolId)
            if (Number.isNaN(schoolId)) {
                throw new Error("Invalid schoolId")
            }
            const scheme = await this.gradingService.createScheme(schoolId, req.body)

            res.status(201).json({
                success: true,
                message: "Grading scheme created successfully",
                data: scheme
            })
        } catch (err) {
            next(err)
        }
    }
}
