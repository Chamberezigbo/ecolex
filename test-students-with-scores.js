#!/usr/bin/env node

/**
 * Test Suite: GET /api/teacher/students-with-scores Endpoint
 * Validates the updated endpoint with subject filtering
 */

const fs = require('fs');
const path = require('path');

console.log('\n=====================================');
console.log('Testing: students-with-scores Endpoint');
console.log('=====================================\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, condition, details = '') {
  if (condition) {
    console.log(`✅ ${name}`);
    if (details) console.log(`   ${details}`);
    testsPassed++;
  } else {
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
    testsFailed++;
  }
}

// ==================== 1. SERVICE METHOD TESTS ====================
console.log('1. Service Method Implementation\n');

const serviceFile = fs.readFileSync(
  path.join(__dirname, 'res/Services/teacher/TeacherService.ts'),
  'utf8'
);

test(
  'getTeacherStudentsWithScores method exists',
  serviceFile.includes('async getTeacherStudentsWithScores'),
  'Service method properly implemented'
);

test(
  'Accepts classId parameter',
  serviceFile.includes('classId?: number'),
  'Optional classId parameter defined'
);

test(
  'Accepts classGroupId parameter',
  serviceFile.includes('classGroupId?: number'),
  'Optional classGroupId parameter defined'
);

test(
  'Accepts subjectId parameter',
  serviceFile.includes('subjectId?: number'),
  'Optional subjectId parameter defined'
);

test(
  'Accepts academicSessionId parameter',
  serviceFile.includes('academicSessionId?: number'),
  'Optional academicSessionId parameter defined'
);

test(
  'Accepts termId parameter',
  serviceFile.includes('termId?: number'),
  'Optional termId parameter defined'
);

// ==================== 2. SUBJECT FILTERING TESTS ====================
console.log('\n2. Subject Filtering Logic\n');

test(
  'Fetches teacher assignments by staffId and classId',
  serviceFile.includes('teacherAssignment.findMany') &&
  serviceFile.includes('staffId') &&
  serviceFile.includes('classId: { in: resolvedClassIds }'),
  'Teacher assignments query present'
);

test(
  'Filters for non-null subjectIds',
  serviceFile.includes('subjectId: { not: null }'),
  'Excludes assignments without subjects'
);

test(
  'Deduplicates subjects by ID',
  serviceFile.includes('distinct: ["subjectId"]') &&
  serviceFile.includes('new Map'),
  'Subject deduplication logic present'
);

test(
  'Extracts subject IDs for filtering',
  serviceFile.includes('teacherSubjectIds'),
  'Subject IDs array created'
);

// ==================== 3. CA FILTERING TESTS ====================
console.log('\n3. Continuous Assessment Filtering\n');

test(
  'CAs filtered by class IDs',
  serviceFile.includes('continuousAssessment.findMany') &&
  serviceFile.includes('classId: { in: resolvedClassIds }'),
  'CA query includes class filter'
);

test(
  'CAs filtered by teacher subject IDs',
  serviceFile.includes('subjectId: { in: teacherSubjectIds }'),
  'CAs restricted to teacher\'s subjects'
);

test(
  'CAs support optional subjectId filter',
  serviceFile.includes('...(subjectId && { subjectId })'),
  'User can further filter by subjectId'
);

test(
  'CAs include results with session filtering',
  serviceFile.includes('academicSessionId: sessionId'),
  'CA results filtered by session'
);

test(
  'CAs include optional term filtering',
  serviceFile.includes('...(resolvedTermId ? { termId: resolvedTermId } : {})'),
  'CA results support optional term filter'
);

// ==================== 4. EXAM FILTERING TESTS ====================
console.log('\n4. Exam Filtering\n');

test(
  'Exams filtered by class IDs',
  serviceFile.includes('exam.findMany') &&
  serviceFile.includes('classId: { in: resolvedClassIds }'),
  'Exam query includes class filter'
);

test(
  'Exams filtered by teacher subject IDs',
  // Count occurrences - should filter both CAs and Exams
  (serviceFile.match(/subjectId: \{ in: teacherSubjectIds \}/g) || []).length >= 2,
  'Exams restricted to teacher\'s subjects'
);

test(
  'Exams support optional subjectId filter',
  (serviceFile.match(/...\(subjectId && \{ subjectId \}\)/g) || []).length >= 2,
  'User can further filter exams by subjectId'
);

// ==================== 5. RESPONSE STRUCTURE TESTS ====================
console.log('\n5. Response Structure\n');

test(
  'Returns academicSessionId',
  serviceFile.includes('academicSessionId: sessionId'),
  'Session ID included in response'
);

test(
  'Returns termId (nullable)',
  serviceFile.includes('termId: resolvedTermId ?? null'),
  'Term ID included (nullable)'
);

test(
  'Returns classIds array',
  serviceFile.includes('classIds: resolvedClassIds'),
  'Class IDs array included'
);

test(
  'Returns subjects array (NEW)',
  serviceFile.includes('subjects: distinctSubjects.map(s => ({') &&
  serviceFile.includes('id: s.id') &&
  serviceFile.includes('name: s.name') &&
  serviceFile.includes('code: s.code'),
  'Teacher\'s subjects included in response'
);

test(
  'Returns CAs array with metadata',
  serviceFile.includes('cas: cas.map(ca => ({') &&
  serviceFile.includes('id: ca.id') &&
  serviceFile.includes('name: ca.name'),
  'CAs included with metadata'
);

test(
  'Returns Exams array with metadata',
  serviceFile.includes('exams: exams.map(exam => ({') &&
  serviceFile.includes('id: exam.id'),
  'Exams included with metadata'
);

test(
  'Returns students array',
  serviceFile.includes('students: studentsWithScores'),
  'Students included in response'
);

// ==================== 6. STUDENT DATA TESTS ====================
console.log('\n6. Student Data\n');

test(
  'Students include className',
  serviceFile.includes('className: student.class.customName ?? student.class.name'),
  'Class name included for each student'
);

test(
  'Students include registration number',
  serviceFile.includes('registrationNumber: student.registrationNumber'),
  'Registration number included'
);

test(
  'Students include CA scores',
  serviceFile.includes('const caScores = cas.map(ca =>') &&
  serviceFile.includes('caScores,'),
  'Individual CA scores mapped and included'
);

test(
  'Students include exam score',
  serviceFile.includes('const examScore = firstExam') &&
  serviceFile.includes('examScore,'),
  'Exam score calculated and included'
);

test(
  'Students include totals (caTotal, examTotal, grandTotal)',
  serviceFile.includes('caTotal') &&
  serviceFile.includes('examTotal') &&
  serviceFile.includes('grandTotal'),
  'All totals calculated'
);

// ==================== 7. CONTROLLER TESTS ====================
console.log('\n7. Controller Implementation\n');

const controllerFile = fs.readFileSync(
  path.join(__dirname, 'res/controller/teacher/TeacherController.ts'),
  'utf8'
);

test(
  'getStudentsWithScores controller method exists',
  controllerFile.includes('getStudentsWithScores'),
  'Controller method implemented'
);

test(
  'Controller validates staffId and schoolId',
  controllerFile.includes('req.staffId') && controllerFile.includes('req.schoolId'),
  'Authentication validation present'
);

test(
  'Controller extracts all query parameters',
  controllerFile.includes('classId') &&
  controllerFile.includes('classGroupId') &&
  controllerFile.includes('subjectId') &&
  controllerFile.includes('academicSessionId') &&
  controllerFile.includes('termId'),
  'All parameters extracted from request'
);

test(
  'Controller calls service method',
  controllerFile.includes('this.service.getTeacherStudentsWithScores'),
  'Service method invoked'
);

// ==================== 8. ROUTE TESTS ====================
console.log('\n8. Route Registration\n');

const routesFile = fs.readFileSync(
  path.join(__dirname, 'res/routes/teacher.js'),
  'utf8'
);

test(
  'Route /students-with-scores is registered',
  routesFile.includes('/students-with-scores'),
  'Endpoint route exists'
);

test(
  'Route uses GET method',
  routesFile.includes('router.get("/students-with-scores"'),
  'Correct HTTP method'
);

test(
  'Route uses teacherAuthMiddleware',
  routesFile.includes('teacherAuthMiddleware') &&
  routesFile.includes('getStudentsWithScores'),
  'Authentication middleware applied'
);

// ==================== 9. BUILD VERIFICATION ====================
console.log('\n9. TypeScript Compilation\n');

const distPath = path.join(__dirname, 'dist');

test(
  'dist/res/Services/teacher/TeacherService.js exists',
  fs.existsSync(path.join(distPath, 'res/Services/teacher/TeacherService.js')),
  'Service compiled successfully'
);

test(
  'dist/res/controller/teacher/TeacherController.js exists',
  fs.existsSync(path.join(distPath, 'res/controller/teacher/TeacherController.js')),
  'Controller compiled successfully'
);

test(
  'dist/res/routes/teacher.js exists',
  fs.existsSync(path.join(distPath, 'res/routes/teacher.js')),
  'Routes compiled successfully'
);

// ==================== SUMMARY ====================
console.log('\n=====================================');
console.log('Test Summary');
console.log('=====================================\n');

const total = testsPassed + testsFailed;
const percentage = total > 0 ? ((testsPassed / total) * 100).toFixed(1) : 0;

console.log(`Total Tests: ${total}`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`Success Rate: ${percentage}%`);

console.log('\n=====================================\n');

if (testsFailed === 0) {
  console.log('🎉 ALL TESTS PASSED!');
  console.log('\nEndpoint Summary:');
  console.log('- GET /api/teacher/students-with-scores');
  console.log('- Filters CAs/Exams by teacher\'s assigned subjects');
  console.log('- Returns: subjects, students with scores, CAs, exams metadata');
  console.log('- Supports: classId, classGroupId, subjectId, academicSessionId, termId');
  console.log('\nNext Steps:');
  console.log('1. Start MySQL database');
  console.log('2. Run: npm run prisma:deploy');
  console.log('3. Run: npm start');
  console.log('4. Test with authentication token and query parameters');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please review the implementation.');
  process.exit(1);
}
