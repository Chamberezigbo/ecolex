#!/bin/bash

# Compute Result Endpoint - cURL Examples
# GET /api/teacher/students-with-scores

# Set these variables
BASE_URL="http://localhost:3000/api/teacher/students-with-scores"
TOKEN="YOUR_JWT_TOKEN_HERE"

echo "================================"
echo "Compute Result Endpoint Tests"
echo "================================"
echo ""

# Test 1: Get all students with scores (no filters)
echo "TEST 1: Get all students (no filters)"
echo "Command: curl -X GET \"$BASE_URL\" -H \"Authorization: Bearer \$TOKEN\""
echo ""
curl -s -X GET "$BASE_URL" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -50
echo ""
echo "---"
echo ""

# Test 2: Filter by classId=1
echo "TEST 2: Filter by classId=1"
echo "Command: curl -X GET \"$BASE_URL?classId=1\" -H \"Authorization: Bearer \$TOKEN\""
echo ""
curl -s -X GET "$BASE_URL?classId=1" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -50
echo ""
echo "---"
echo ""

# Test 3: Filter by academicSessionId
echo "TEST 3: Filter by academicSessionId=1"
echo "Command: curl -X GET \"$BASE_URL?academicSessionId=1\" -H \"Authorization: Bearer \$TOKEN\""
echo ""
curl -s -X GET "$BASE_URL?academicSessionId=1" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -30
echo ""
echo "---"
echo ""

# Test 4: Filter by termId
echo "TEST 4: Filter by termId=1"
echo "Command: curl -X GET \"$BASE_URL?termId=1\" -H \"Authorization: Bearer \$TOKEN\""
echo ""
curl -s -X GET "$BASE_URL?termId=1" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -30
echo ""
echo "---"
echo ""

# Test 5: Filter by subjectId
echo "TEST 5: Filter by subjectId=1"
echo "Command: curl -X GET \"$BASE_URL?subjectId=1\" -H \"Authorization: Bearer \$TOKEN\""
echo ""
curl -s -X GET "$BASE_URL?subjectId=1" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -30
echo ""
echo "---"
echo ""

# Test 6: Multiple filters combined
echo "TEST 6: Multiple filters (classId=1&termId=1&subjectId=1)"
echo "Command: curl -X GET \"$BASE_URL?classId=1&termId=1&subjectId=1\" -H \"Authorization: Bearer \$TOKEN\""
echo ""
curl -s -X GET "$BASE_URL?classId=1&termId=1&subjectId=1" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -50
echo ""
echo "---"
echo ""

# Test 7: Extract student names
echo "TEST 7: Extract student names and registration numbers"
echo "Command: Extract from response using jq"
echo ""
curl -s -X GET "$BASE_URL?classId=1" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.data.students[] | "\(.surname) \(.name) (\(.registrationNumber))"'
echo ""
echo "---"
echo ""

# Test 8: Get CA names
echo "TEST 8: Get available CAs"
echo "Command: Extract CA metadata from response"
echo ""
curl -s -X GET "$BASE_URL?classId=1" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.data.cas[] | "\(.name) (Max: \(.maxScore))"'
echo ""
echo "---"
echo ""

# Test 9: Get specific student's scores
echo "TEST 9: Get specific student's scores"
echo "Command: Extract first student's scores"
echo ""
curl -s -X GET "$BASE_URL?classId=1" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.data.students[0] | {name: .name, surname: .surname, caTotal: .caTotal, examTotal: .examTotal, grandTotal: .grandTotal}'
echo ""
echo "---"
echo ""

# Test 10: Count students
echo "TEST 10: Count total students in response"
echo "Command: Count students in response"
echo ""
curl -s -X GET "$BASE_URL?classId=1" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.data.students | length'
echo ""

echo "================================"
echo "Tests Complete"
echo "================================"
