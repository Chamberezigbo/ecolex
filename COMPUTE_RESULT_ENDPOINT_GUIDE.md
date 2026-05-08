# Compute Result Endpoint - GET /api/teacher/students-with-scores

## Overview
This endpoint returns students with their individual CA scores, exam scores, and calculated totals. It's designed for the "Compute Result" UI where teachers need to view and manage student scores in a table format.

## Endpoint
```
GET http://localhost:3000/api/teacher/students-with-scores
```

## Authentication
```
Authorization: Bearer {JWT_TOKEN}
```

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `classId` | number | No | Filter by specific class ID |
| `classGroupId` | number | No | Filter by specific class group ID |
| `subjectId` | number | No | Filter to classes where teacher teaches this subject |
| `academicSessionId` | number | No | Academic session ID (defaults to active, then latest) |
| `termId` | number | No | Filter by specific term (applies to CA and Exam results) |

### Notes on Parameters
- If no class filters provided, returns all students from all classes the teacher teaches
- `academicSessionId` defaults to active session, then falls back to latest session
- `termId` filters both CA results AND exam results by term
- Multiple filters can be combined: `?classId=1&termId=1&subjectId=1`

## Example Requests

### 1. Get All Students with Scores (No Filters)
```bash
curl -X GET "http://localhost:3000/api/teacher/students-with-scores" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Filter by Class ID
```bash
curl -X GET "http://localhost:3000/api/teacher/students-with-scores?classId=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Filter by Academic Session and Term
```bash
curl -X GET "http://localhost:3000/api/teacher/students-with-scores?academicSessionId=1&termId=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Filter by Subject (all classes teaching this subject)
```bash
curl -X GET "http://localhost:3000/api/teacher/students-with-scores?subjectId=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Multiple Filters Combined
```bash
curl -X GET "http://localhost:3000/api/teacher/students-with-scores?classId=1&termId=1&subjectId=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Response Format

### Successful Response (200 OK)
```json
{
  "success": true,
  "data": {
    "academicSessionId": 1,
    "termId": 1,
    "classIds": [1],
    "cas": [
      {
        "id": 1,
        "name": "CA1",
        "maxScore": 10
      },
      {
        "id": 2,
        "name": "CA2",
        "maxScore": 10
      },
      {
        "id": 3,
        "name": "CA3",
        "maxScore": 10
      }
    ],
    "exams": [
      {
        "id": 1,
        "name": "Final Exam",
        "maxScore": 100
      }
    ],
    "students": [
      {
        "id": 2,
        "registrationNumber": "IMCC-2500-STD",
        "surname": "Abuchi",
        "name": "Darlinton",
        "otherNames": "Bubu",
        "className": "jss1",
        "caScores": [
          {
            "caId": 1,
            "caName": "CA1",
            "score": 8,
            "maxScore": 10
          },
          {
            "caId": 2,
            "caName": "CA2",
            "score": null,
            "maxScore": 10
          },
          {
            "caId": 3,
            "caName": "CA3",
            "score": 9,
            "maxScore": 10
          }
        ],
        "examScore": {
          "examId": 1,
          "examName": "Final Exam",
          "score": 75,
          "maxScore": 100
        },
        "caTotal": 17,
        "examTotal": 75,
        "grandTotal": 92
      },
      {
        "id": 3,
        "registrationNumber": "IMCC-7365-STD",
        "surname": "Blessing",
        "name": "Nmesoma",
        "otherNames": "Bubu",
        "className": "jss1",
        "caScores": [
          {
            "caId": 1,
            "caName": "CA1",
            "score": 9,
            "maxScore": 10
          },
          {
            "caId": 2,
            "caName": "CA2",
            "score": 8,
            "maxScore": 10
          },
          {
            "caId": 3,
            "caName": "CA3",
            "score": null,
            "maxScore": 10
          }
        ],
        "examScore": {
          "examId": 1,
          "examName": "Final Exam",
          "score": 82,
          "maxScore": 100
        },
        "caTotal": 17,
        "examTotal": 82,
        "grandTotal": 99
      }
    ]
  }
}
```

## Response Fields Explained

### Top Level
| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Request was successful |
| `data` | object | Contains all results |

### Data Object
| Field | Type | Description |
|-------|------|-------------|
| `academicSessionId` | number | ID of the academic session used |
| `termId` | number \| null | ID of the term (null if not filtered) |
| `classIds` | number[] | List of class IDs included in results |
| `cas` | array | List of continuous assessments with metadata |
| `exams` | array | List of exams with metadata |
| `students` | array | Array of student objects with scores |

### CA/Exam Metadata Objects
```json
{
  "id": 1,
  "name": "CA1",
  "maxScore": 10
}
```

### Student Object
| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Student ID |
| `registrationNumber` | string | Student registration number |
| `surname` | string | Student last name |
| `name` | string | Student first name |
| `otherNames` | string | Student other names |
| `className` | string | Class name (custom name if available) |
| `caScores` | array | Individual CA scores |
| `examScore` | object | Exam score (or null if no exam) |
| `caTotal` | number | Sum of all CA scores (0 if all null) |
| `examTotal` | number | Exam score (0 if null) |
| `grandTotal` | number | caTotal + examTotal |

### CA Score Object
```json
{
  "caId": 1,
  "caName": "CA1",
  "score": 8,
  "maxScore": 10
}
```

**Note:** If a student has no score for a CA, `score` will be `null` (not 0). The totals treat null scores as 0.

## Error Responses

### 401 Unauthorized
```json
{
  "message": "Unauthorized"
}
```
**Cause:** Missing or invalid JWT token

### 400 Bad Request
```json
{
  "success": false,
  "message": "Teacher not assigned to any classes"
}
```
**Cause:** Teacher has no class assignments and no specific filter provided

### 404 Not Found
```json
{
  "success": false,
  "message": "ClassGroup not found"
}
```
**Cause:** Provided classGroupId doesn't exist

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "No academic session found"
}
```
**Cause:** No academic sessions exist for the school

## Key Features

✅ **Individual CA Scores** - Each CA gets its own score column (not aggregated)
✅ **Null Safety** - Missing scores return `null`, calculations treat as 0
✅ **Score Metadata** - Returns max scores for each CA and Exam
✅ **Flexible Filtering** - Supports class, group, subject, session, and term filters
✅ **Automatic Totals** - Calculates caTotal, examTotal, and grandTotal
✅ **Sorted Results** - Students sorted by class name, then surname alphabetically

## Database Requirements

This endpoint relies on:
- **Students table** - For student information
- **ContinuousAssessment table** - For CA definitions
- **Exam table** - For exam definitions
- **CAResult table** - For individual CA scores (studentId can be null)
- **ExamResult table** - For exam scores (studentId can be null)
- **AcademicSession table** - For session information
- **TeacherAssignment table** - To verify teacher has access

## UI Integration

The response structure is designed to work directly with the Compute Result UI:

### Table Header (from `cas` array)
```
| S/N | Reg No | Student Name | CA1 | CA2 | CA3 | Final Exam | Total |
```

### Table Rows (from `students` array)
```
| 1 | IMCC-2500-STD | Abuchi Darlinton | 8 | null | 9 | 75 | 92 |
| 2 | IMCC-7365-STD | Blessing Nmesoma | 9 | 8 | null | 82 | 99 |
```

## Testing Checklist

- [ ] Test with no filters (all students from all classes)
- [ ] Test with classId filter (specific class)
- [ ] Test with termId filter (specific term)
- [ ] Test with subjectId filter (classes teaching subject)
- [ ] Test with multiple filters combined
- [ ] Verify null scores are handled correctly
- [ ] Verify totals are calculated correctly
- [ ] Verify students are sorted by class then surname
- [ ] Verify CA and Exam metadata is returned
- [ ] Verify unauthorized request returns 401
- [ ] Verify teacher with no classes returns appropriate error

## Performance Notes

- Uses efficient Prisma queries to fetch all data in parallel
- CAs and Exams are fetched once with all results included
- Students are fetched once with class information
- Calculations are done in-memory after fetching
- Suitable for classes with 20-50 students
- For larger classes, consider pagination in future iterations
