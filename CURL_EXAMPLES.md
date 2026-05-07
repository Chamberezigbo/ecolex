# cURL Examples - Teacher Students Endpoint

## Quick Reference

### Example 1: Get All Students
```bash
curl -X GET "http://localhost:3000/api/teacher/students" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example 2: Filter by ClassId=1
```bash
curl -X GET "http://localhost:3000/api/teacher/students?classId=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example 3: Filter by AcademicSessionId=1
```bash
curl -X GET "http://localhost:3000/api/teacher/students?academicSessionId=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example 4: Filter by ClassGroupId=1
```bash
curl -X GET "http://localhost:3000/api/teacher/students?classGroupId=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example 5: Filter by SubjectId=1
```bash
curl -X GET "http://localhost:3000/api/teacher/students?subjectId=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example 6: Multiple Filters
```bash
curl -X GET "http://localhost:3000/api/teacher/students?classId=1&academicSessionId=1&subjectId=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Formatted Output with jq

If you have `jq` installed, you can format the output:

```bash
curl -X GET "http://localhost:3000/api/teacher/students?classId=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq .
```

---

## Get JWT Token (for use in above commands)

```bash
curl -X POST "http://localhost:3000/api/teacher/login" \
  -H "Content-Type: application/json" \
  -d '{
    "registrationNumber": "STAFF-001",
    "password": "password123"
  }' | jq .
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "staffId": 1,
    "schoolId": 1
  }
}
```

---

## Store Token in Variable (Bash)

```bash
# Login and store token
TOKEN=$(curl -s -X POST "http://localhost:3000/api/teacher/login" \
  -H "Content-Type: application/json" \
  -d '{
    "registrationNumber": "STAFF-001",
    "password": "password123"
  }' | jq -r '.data.token')

# Use token in request
curl -X GET "http://localhost:3000/api/teacher/students?classId=1" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## View Response in Pretty JSON

```bash
curl -s -X GET "http://localhost:3000/api/teacher/students" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | python3 -m json.tool
```

---

## Count Students in Response

```bash
curl -s -X GET "http://localhost:3000/api/teacher/students?classId=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq '.data.students | length'
```

---

## Extract Student Names Only

```bash
curl -s -X GET "http://localhost:3000/api/teacher/students?classId=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq '.data.students[] | "\(.surname) \(.name)"'
```

---

## Extract Registration Numbers

```bash
curl -s -X GET "http://localhost:3000/api/teacher/students?classId=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq '.data.students[] | .registrationNumber'
```

---

## Filter Students by Gender

```bash
curl -s -X GET "http://localhost:3000/api/teacher/students?classId=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq '.data.students[] | select(.gender=="Male")'
```

---

## Get Student Details in CSV Format

```bash
curl -s -X GET "http://localhost:3000/api/teacher/students?classId=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | \
  jq -r '.data.students[] | [.id, .surname, .name, .registrationNumber, .className] | @csv'
```

Output:
```
2,"Abuchi","Darlinton","IMCC-2500-STD","jss1"
3,"Blessing","Nmesoma","IMCC-7365-STD","jss1"
1,"Eze","Darlinton","IMCC-3971-STD","jss1"
```

---

## Test All Filters in Sequence

```bash
#!/bin/bash

# Set your token
TOKEN="YOUR_JWT_TOKEN"
BASE_URL="http://localhost:3000/api/teacher/students"

echo "=== Test 1: No filters ==="
curl -s -X GET "$BASE_URL" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | {total, classIds}'

echo ""
echo "=== Test 2: classId=1 ==="
curl -s -X GET "$BASE_URL?classId=1" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | {total, classIds}'

echo ""
echo "=== Test 3: academicSessionId=1 ==="
curl -s -X GET "$BASE_URL?academicSessionId=1" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | {total, classIds}'

echo ""
echo "=== Test 4: classGroupId=1 ==="
curl -s -X GET "$BASE_URL?classGroupId=1" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | {total, classIds}'

echo ""
echo "=== Test 5: subjectId=1 ==="
curl -s -X GET "$BASE_URL?subjectId=1" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | {total, classIds}'

echo ""
echo "=== Test 6: Multiple filters ==="
curl -s -X GET "$BASE_URL?classId=1&academicSessionId=1&subjectId=1" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | {total, classIds}'
```

Save this as `test_students_endpoint.sh` and run with:
```bash
bash test_students_endpoint.sh
```
