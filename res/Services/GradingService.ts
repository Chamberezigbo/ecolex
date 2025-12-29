// src/services/grading/GradingService.ts
import prisma from "../util/prisma"
import { CreateGradingSchemeDTO } from "../dtos/grading.dto"

import { Prisma } from "@prisma/client";


export class GradingService {

    private validateGrades(grades: CreateGradingSchemeDTO["grades"]) {
        const sorted = [...grades].sort((a, b) => a.min - b.min);

        for (let i = 0; i < sorted.length; i++) {
            const g = sorted[i];

            if (g.min > g.max) {
                throw new Error(`Invalid range for grade ${g.grade}`);
            }

            if (i > 0 && g.min <= sorted[i - 1].max) {
                throw new Error("Grading ranges must not overlap");
            }
        }
    }

    async createScheme(schoolId: number, data: CreateGradingSchemeDTO) {
        this.validateGrades(data.grades);

        return prisma.$transaction(async (tx: Prisma.TransactionClient) => {

            const classes = await tx.class.findMany({
                where: { id: { in: data.classIds }, schoolId },
                select: { id: true }
            });

            if (classes.length !== data.classIds.length) {
                throw new Error("Invalid class selection for this school");
            }

            const existingAssignments = await tx.gradingSchemeClass.findMany({
                where: { classId: { in: data.classIds } }
            });

            if (existingAssignments.length > 0) {
                throw new Error("One or more classes already have a grading scheme assigned");
            }

            const scheme = await tx.gradingScheme.create({
                data: {
                    schoolId,
                    name: data.name,
                    usePosition: data.usePosition
                }
            });

            await tx.gradingRule.createMany({
                data: data.grades.map(g => ({
                    schemeId: scheme.id,
                    minScore: g.min,
                    maxScore: g.max,
                    grade: g.grade,
                    remark: g.remark
                }))
            });

            await tx.gradingSchemeClass.createMany({
                data: data.classIds.map(classId => ({
                    schemeId: scheme.id,
                    classId
                }))
            });

            return {
                scheme,
                classIds: data.classIds,
                grades: data.grades.length
            }
        });
    }
}

