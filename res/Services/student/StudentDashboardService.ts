import prisma from "../../util/prisma";

export class StudentDashboardService {

    async getDashboard(studentId: number) {
        // Get the student + their class + school info in one query
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: {
                school: { select: { id: true, name: true } },
                campus: { select: { id: true, name: true } },
                class:  { select: { id: true, name: true } }
            }
        });

        if (!student) throw new Error("Student not found");

        // Count how many students share the same class
        const classmateCount = await prisma.student.count({
            where: { classId: student.classId }
        });

        return {
            student: {
                name: `${student.name} ${student.surname}`,
                registrationNumber: student.registrationNumber,
                class: student.class.name,
                school: student.school
            },
            stats: {
                totalSchoolFee: 0,       // static — fees not yet implemented
                totalStudentsInClass: classmateCount,
                pendingDebt: 0,          // static — fees not yet implemented
                activeAssignments: 0     // static — assignments not yet implemented
            }
        };
    }
}
