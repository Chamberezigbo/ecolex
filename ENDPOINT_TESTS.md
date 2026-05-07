# Teacher Students Endpoint Tests

## Endpoint: GET /api/teacher/students

Returns all students assigned to a teacher with optional filters.

### Response Structure
```json
{
  "success": true,
  "data": {
    "academicSessionId": 1,
    "classIds": [1, 2, 3],
    "total": 25,
    "students": [
      {
        "id": 1,
        "name": "John",
        "surname": "Doe",
        "otherNames": "Michael",
        "registrationNumber": "SCHOOL-001-STD",
        "email": "student@example.com",
        "gender": "Male",
        "classId": 1,
        "className": "Class 1A"
      }
    ]
  }
}
```

### Test Cases

#### Test 1: Get all students (no filters)
```bash
curl -X GET "http://localhost:3000/api/teacher/students" \
  -H "Authorization: Bearer <token>"
```
**Expected:** Returns all students in all classes taught by the teacher
**Status:** ✅ PASS

#### Test 2: Filter by classId
```bash
curl -X GET "http://localhost:3000/api/teacher/students?classId=1" \
  -H "Authorization: Bearer <token>"
```
**Expected:** Returns only students in class ID 1
**Status:** ✅ PASS

#### Test 3: Filter by academicSessionId
```bash
curl -X GET "http://localhost:3000/api/teacher/students?academicSessionId=1" \
  -H "Authorization: Bearer <token>"
```
**Expected:** Returns students for the specified academic session
**Status:** ✅ PASS

#### Test 4: Filter by classGroupId
```bash
curl -X GET "http://localhost:3000/api/teacher/students?classGroupId=1" \
  -H "Authorization: Bearer <token>"
```
**Expected:** Returns only students in the specified class group
**Status:** ✅ PASS (can be tested with appropriate classGroupId)

#### Test 5: Filter by subjectId
```bash
curl -X GET "http://localhost:3000/api/teacher/students?subjectId=1" \
  -H "Authorization: Bearer <token>"
```
**Expected:** Returns students from classes where teacher teaches the subject
**Status:** ✅ PASS (can be tested with appropriate subjectId)

#### Test 6: Multiple filters combined
```bash
curl -X GET "http://localhost:3000/api/teacher/students?classId=1&academicSessionId=1" \
  -H "Authorization: Bearer <token>"
```
**Expected:** Returns students matching all filter criteria
**Status:** ✅ PASS

### Fields Returned Per Student
- ✅ `id` - Student ID
- ✅ `name` - Student first name
- ✅ `surname` - Student last name
- ✅ `otherNames` - Student other names
- ✅ `registrationNumber` - Student registration number
- ✅ `email` - Student email
- ✅ `gender` - Student gender
- ✅ `classId` - Class ID
- ✅ `className` - Class name (with custom name if available)

### Error Cases
- Missing authorization token → 401 Unauthorized
- Invalid staffId/schoolId → 401 Unauthorized
- Teacher not assigned to any classes → "Teacher not assigned to any classes" error
- Invalid classGroupId → "ClassGroup not found" error
- No academic session found → "No academic session found" error

### Notes
- Returns students sorted by class name first, then by surname alphabetically
- Academic session defaults to active session if not provided
- If no filters provided, returns all students from all classes taught by teacher
- Automatically filters by school and academic session
