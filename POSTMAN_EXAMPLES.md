# Postman Examples - Teacher Students Endpoint

## Setup

1. **Import Collection:** Import `postman_collection.json` into Postman
2. **Set JWT Token:** Replace `YOUR_JWT_TOKEN_HERE` with actual token
3. **Base URL:** http://localhost:3000

---

## Example 1: Get All Students (No Filters)

### Request
```
GET http://localhost:3000/api/teacher/students
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Example Response
```json
{
  "success": true,
  "data": {
    "academicSessionId": 1,
    "classIds": [1],
    "total": 3,
    "students": [
      {
        "id": 2,
        "name": "Darlinton",
        "surname": "Abuchi",
        "otherNames": "Bubu",
        "registrationNumber": "IMCC-2500-STD",
        "email": "student@example.com",
        "gender": "Male",
        "classId": 1,
        "className": "jss1"
      },
      {
        "id": 3,
        "name": "Nmesoma",
        "surname": "Blessing",
        "otherNames": "Bubu",
        "registrationNumber": "IMCC-7365-STD",
        "email": "student@example.com",
        "gender": "Male",
        "classId": 1,
        "className": "jss1"
      },
      {
        "id": 1,
        "name": "Darlinton",
        "surname": "Eze",
        "otherNames": "Abuchi",
        "registrationNumber": "IMCC-3971-STD",
        "email": "student@example.com",
        "gender": "Male",
        "classId": 1,
        "className": "jss1"
      }
    ]
  }
}
```

---

## Example 2: Filter by ClassId

### Request
```
GET http://localhost:3000/api/teacher/students?classId=1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Query Parameters
| Parameter | Value | Description |
|-----------|-------|-------------|
| classId | 1 | Get students only from class ID 1 |

### Example Response
```json
{
  "success": true,
  "data": {
    "academicSessionId": 1,
    "classIds": [1],
    "total": 3,
    "students": [
      {
        "id": 2,
        "name": "Darlinton",
        "surname": "Abuchi",
        "otherNames": "Bubu",
        "registrationNumber": "IMCC-2500-STD",
        "email": "student@example.com",
        "gender": "Male",
        "classId": 1,
        "className": "jss1"
      }
    ]
  }
}
```

---

## Example 3: Filter by Academic Session

### Request
```
GET http://localhost:3000/api/teacher/students?academicSessionId=1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Query Parameters
| Parameter | Value | Description |
|-----------|-------|-------------|
| academicSessionId | 1 | Get students for academic session ID 1 |

### Example Response
```json
{
  "success": true,
  "data": {
    "academicSessionId": 1,
    "classIds": [1],
    "total": 3,
    "students": [...]
  }
}
```

---

## Example 4: Filter by Class Group

### Request
```
GET http://localhost:3000/api/teacher/students?classGroupId=1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Query Parameters
| Parameter | Value | Description |
|-----------|-------|-------------|
| classGroupId | 1 | Get students only from class group ID 1 |

---

## Example 5: Filter by Subject

### Request
```
GET http://localhost:3000/api/teacher/students?subjectId=1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Query Parameters
| Parameter | Value | Description |
|-----------|-------|-------------|
| subjectId | 1 | Get students from classes where teacher teaches subject ID 1 |

---

## Example 6: Multiple Filters Combined

### Request
```
GET http://localhost:3000/api/teacher/students?classId=1&academicSessionId=1&subjectId=1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Query Parameters
| Parameter | Value | Description |
|-----------|-------|-------------|
| classId | 1 | Specific class |
| academicSessionId | 1 | Specific academic session |
| subjectId | 1 | Specific subject |

### Example Response (Filtered by multiple criteria)
```json
{
  "success": true,
  "data": {
    "academicSessionId": 1,
    "classIds": [1],
    "total": 2,
    "students": [
      {
        "id": 2,
        "name": "Darlinton",
        "surname": "Abuchi",
        "otherNames": "Bubu",
        "registrationNumber": "IMCC-2500-STD",
        "email": "student@example.com",
        "gender": "Male",
        "classId": 1,
        "className": "jss1"
      },
      {
        "id": 3,
        "name": "Nmesoma",
        "surname": "Blessing",
        "otherNames": "Bubu",
        "registrationNumber": "IMCC-7365-STD",
        "email": "student@example.com",
        "gender": "Male",
        "classId": 1,
        "className": "jss1"
      }
    ]
  }
}
```

---

## Response Fields Explained

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Request was successful |
| academicSessionId | number | ID of the academic session |
| classIds | array | List of class IDs queried |
| total | number | Total number of students returned |
| students | array | Array of student objects |

### Student Object Fields
| Field | Type | Description |
|-------|------|-------------|
| id | number | Student ID |
| name | string | Student first name |
| surname | string | Student last name |
| otherNames | string | Student other names |
| registrationNumber | string | Student registration number (unique) |
| email | string | Student email address |
| gender | string | Student gender |
| classId | number | Class ID student belongs to |
| className | string | Class name (customized if available) |

---

## Error Examples

### 401 Unauthorized (Missing Token)
```json
{
  "message": "Unauthorized: Missing token"
}
```

### 401 Unauthorized (Invalid Token)
```json
{
  "success": false,
  "message": "Unauthorized: Invalid token"
}
```

### Teacher Not Assigned to Any Classes
```json
{
  "success": false,
  "message": "Teacher not assigned to any classes"
}
```

### Class Group Not Found
```json
{
  "success": false,
  "message": "ClassGroup not found"
}
```

### No Academic Session Found
```json
{
  "success": false,
  "message": "No academic session found"
}
```

---

## How to Get JWT Token

1. Send POST to `/api/teacher/login`:
```bash
curl -X POST http://localhost:3000/api/teacher/login \
  -H "Content-Type: application/json" \
  -d '{
    "registrationNumber": "STAFF-001",
    "password": "password123"
  }'
```

2. Response will include token:
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

3. Copy the token and paste into Postman request header

---

## Testing Checklist

- [ ] Test 1: Get all students (no filters)
- [ ] Test 2: Filter by classId
- [ ] Test 3: Filter by academicSessionId
- [ ] Test 4: Filter by classGroupId
- [ ] Test 5: Filter by subjectId
- [ ] Test 6: Multiple filters combined
- [ ] Verify all student fields are present
- [ ] Verify total count matches students array length
- [ ] Test with invalid token (should return 401)
- [ ] Test with non-existent classId (should filter correctly)
