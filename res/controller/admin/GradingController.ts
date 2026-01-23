// src/controllers/grading/GradingController.ts
import type { Request, Response, NextFunction } from "express"
import { GradingService } from "../../Services/GradingService"

interface AuthenticatedRequest extends Request {
    schoolId?: string
}

export class GradingController {
    private gradingService: GradingService;

    public create: (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ) => Promise<void>;

    constructor() {
        this.gradingService = new GradingService();

        this.create = async (req, res, next) => {
            try {
                if (req.schoolId === undefined) throw new Error("Missing schoolId");

                const schoolId = Number(req.schoolId);
                if (isNaN(schoolId)) throw new Error("Invalid schoolId");

                const schema = await this.gradingService.createScheme(schoolId, req.body);
                
                res.status(201).json({
                    success: true,
                    message: "Grading scheme created successfully",
                    data: schema
                });
            } catch (error) {
                next(error as Error);    
            }
        }
    }
}
