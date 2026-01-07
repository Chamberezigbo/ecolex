import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

export interface TeacherJwtPayload {
    staffId: number;
    schoolId: number;
    campusId?: number;
    role: "teacher";
}

export const signTeacherToken = (payload: TeacherJwtPayload) => {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: "1d"
    });
};
