// src/services/grading/GradingService.ts
import prisma from "../../util/prisma"
import { CreateGradingSchemeDTO } from "../../dtos/grading.dto"

import { Prisma } from "@prisma/client";


export class GradingService {
    static createScheme(schoolId: number, body: any) {
        throw new Error("Method not implemented.");
    }

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
                where: {
                    id: { in: data.classIds },
                    schoolId,
                    ...(data.campusId ? { campusId: data.campusId } : {})
                },
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
                    campusId: data.campusId ?? null,
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

    async addClassesToScheme(schoolId: number, schemeId: number, classIds: number[]) {
        if (!Array.isArray(classIds) || classIds.length === 0) {
            throw new Error("classIds is required");
        }

        return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const scheme = await tx.gradingScheme.findFirst({
                where: { id: schemeId, schoolId },
                select: { id: true }
            });

            if (!scheme) throw new Error("Grading scheme not found for this school");

            const classes = await tx.class.findMany({
                where: { id: { in: classIds }, schoolId },
                select: { id: true }
            });

            if (classes.length !== classIds.length) {
                throw new Error("One or more classIds are invalid for this school");
            }

            const existing = await tx.gradingSchemeClass.findMany({
                where: { classId: { in: classIds } },
                select: { classId: true }
            });

            const taken = new Set(existing.map((x) => x.classId));
            const newClassIds = classIds.filter((id) => !taken.has(id));

            if (newClassIds.length === 0) {
                return { added: 0, skipped: classIds.length };
            }

            await tx.gradingSchemeClass.createMany({
                data: newClassIds.map((classId) => ({
                    schemeId,
                    classId
                }))
            });

            return { added: newClassIds.length, skipped: classIds.length - newClassIds.length };
        });
    }

    async deleteRemarkRule(schoolId: number, ruleId: number) {
        const rule = await prisma.gradingRule.findFirst({
            where: {
                id: ruleId,
                scheme: { schoolId }
            },
            select: { id: true }
        });

        if (!rule) {
            throw new Error("Remark rule not found for this school");
        }

        await prisma.gradingRule.delete({
            where: { id: ruleId }
        });

        return { deleted: true, ruleId };
    }
}

