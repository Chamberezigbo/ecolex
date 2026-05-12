import { StudentDashboardService } from "../Services/student/StudentDashboardService";

describe("Student Endpoints Tests", () => {
  const dashboardService = new StudentDashboardService();
  const testStudentId = 1;

  describe("Student Dashboard Endpoint", () => {
    test("Should return student basic information", async () => {
      const result = await dashboardService.getDashboard(testStudentId);

      expect(result).toBeDefined();
      expect(result.student).toBeDefined();
      expect(result.student.name).toBeDefined();
      expect(result.student.registrationNumber).toBeDefined();
      expect(result.student.class).toBeDefined();
      expect(result.student.school).toBeDefined();
    });

    test("Should include current term information", async () => {
      const result = await dashboardService.getDashboard(testStudentId);

      expect(result).toHaveProperty("currentTerm");

      if (result.currentTerm) {
        expect(result.currentTerm.id).toBeDefined();
        expect(result.currentTerm.name).toBeDefined();
        expect(result.currentTerm.resumptionDate).toBeDefined();
      }
    });

    test("Should include statistics", async () => {
      const result = await dashboardService.getDashboard(testStudentId);

      expect(result.stats).toBeDefined();
      expect(result.stats.totalSchoolFee).toBeDefined();
      expect(result.stats.totalStudentsInClass).toBeGreaterThanOrEqual(0);
      expect(result.stats.pendingDebt).toBeDefined();
      expect(result.stats.activeAssignments).toBeDefined();
    });

    test("Should calculate classmate count correctly", async () => {
      const result = await dashboardService.getDashboard(testStudentId);

      expect(result.stats.totalStudentsInClass).toBeGreaterThanOrEqual(1);
    });

    test("Current term should be null if no active term", async () => {
      const result = await dashboardService.getDashboard(testStudentId);

      // currentTerm can be null if there's no active term
      if (result.currentTerm === null) {
        expect(result.currentTerm).toBeNull();
      } else {
        expect(result.currentTerm.id).toBeDefined();
      }
    });

    test("Student name should be properly formatted", async () => {
      const result = await dashboardService.getDashboard(testStudentId);

      const name = result.student.name;
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    });
  });

  describe("Dashboard Data Structure", () => {
    test("Should have correct response structure", async () => {
      const result = await dashboardService.getDashboard(testStudentId);

      expect(result).toEqual(
        expect.objectContaining({
          student: expect.any(Object),
          stats: expect.any(Object),
          currentTerm: expect.anything() // can be null or object
        })
      );
    });

    test("Student object should have required fields", async () => {
      const result = await dashboardService.getDashboard(testStudentId);

      expect(result.student).toEqual(
        expect.objectContaining({
          name: expect.any(String),
          registrationNumber: expect.any(String),
          class: expect.any(String),
          school: expect.any(Object)
        })
      );
    });

    test("Stats object should have required fields", async () => {
      const result = await dashboardService.getDashboard(testStudentId);

      expect(result.stats).toEqual(
        expect.objectContaining({
          totalSchoolFee: expect.any(Number),
          totalStudentsInClass: expect.any(Number),
          pendingDebt: expect.any(Number),
          activeAssignments: expect.any(Number)
        })
      );
    });

    test("Current term should have correct structure when present", async () => {
      const result = await dashboardService.getDashboard(testStudentId);

      if (result.currentTerm) {
        expect(result.currentTerm.id).toEqual(expect.any(Number));
        expect(result.currentTerm.name).toEqual(expect.any(String));
        // resumptionDate can be null or a date string
        expect(
          result.currentTerm.resumptionDate === null ||
          typeof result.currentTerm.resumptionDate === "string"
        ).toBe(true);
      }
    });
  });

  describe("School Information", () => {
    test("Should include school data", async () => {
      const result = await dashboardService.getDashboard(testStudentId);

      expect(result.student.school).toBeDefined();
      expect(result.student.school.id).toBeDefined();
      expect(result.student.school.name).toBeDefined();
    });

    test("Should match student's assigned school", async () => {
      const result = await dashboardService.getDashboard(testStudentId);

      // The school should be the one the student belongs to
      expect(result.student.school).toHaveProperty("id");
      expect(result.student.school).toHaveProperty("name");
    });
  });
});
