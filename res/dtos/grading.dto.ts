// src/dtos/grading.dto.ts
export interface GradeInput {
    min: number
    max: number
    grade: string
    remark: string
}

export interface CreateGradingSchemeDTO {
    name: string
    usePosition: boolean
    classIds: number[]
    grades: GradeInput[]
}
