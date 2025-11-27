const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const app = express();
const PORT = 3000;

// CORS middleware - MUST be first
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept']
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer upload configuration
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// ============ ROUTES ============

// GET endpoint - test server health
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Server running' });
});

// Function to process Excel file and analyze results
function analyzeExcelFile(fileBuffer) {
  console.log('📊 Starting Excel analysis...');
  
  // Read the Excel file
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  
  if (!sheetName) {
    throw new Error('No worksheet found in Excel file');
  }
  
  console.log('📄 Processing sheet:', sheetName);
  
  // Convert to JSON
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  console.log('📈 Total rows:', jsonData.length);
  
  // Read Course Details sheet if it exists to get course types
  const courseTypes = {};
  if (workbook.SheetNames.includes('Course Details')) {
    console.log('📚 Reading Course Details sheet...');
    const courseSheet = workbook.Sheets['Course Details'];
    const courseData = XLSX.utils.sheet_to_json(courseSheet, { header: 1, defval: '' });
    
    // Find header row and course type column
    for (let i = 0; i < courseData.length; i++) {
      const row = courseData[i];
      const rowStr = row.join('|').toLowerCase();
      
      if (rowStr.includes('course code') && rowStr.includes('course type')) {
        // Found header row, now read course data
        for (let j = i + 1; j < courseData.length; j++) {
          const dataRow = courseData[j];
          const courseCode = String(dataRow[1] || '').trim(); // Column B - Course Code
          const courseType = String(dataRow[4] || '').trim(); // Column E - Course Type
          
          if (courseCode && courseType) {
            courseTypes[courseCode] = courseType;
            console.log(`   Course ${courseCode}: Type = ${courseType}`);
          }
        }
        break;
      }
    }
  }
  
  console.log('📋 Course Types:', courseTypes);
  
  // Extract header information (Academic Year, Branch, Semester)
  let academicYear = '';
  let branch = '';
  let semester = '';
  
  for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
    const row = jsonData[i];
    const firstCell = String(row[0] || '').trim();
    
    if (firstCell.toLowerCase().includes('academic year')) {
      // Extract value after the colon
      const parts = firstCell.split(':');
      if (parts.length > 1) {
        academicYear = parts[1].trim();
        console.log('📅 Found Academic Year:', academicYear);
      }
    } else if (firstCell.toLowerCase().includes('branch')) {
      // Extract value after the colon
      const parts = firstCell.split(':');
      if (parts.length > 1) {
        branch = parts[1].trim();
        console.log('🏫 Found Branch:', branch);
      }
    } else if (firstCell.toLowerCase().includes('semester')) {
      // Extract value after the colon
      const parts = firstCell.split(':');
      if (parts.length > 1) {
        semester = parts[1].trim();
        console.log('📚 Found Semester:', semester);
      }
    }
  }
  
  console.log('📋 Extracted Header Info:', { academicYear, branch, semester });
  
  // Extract course codes from row 5 (0-indexed row 4)
  // Template structure: Row 5 has ['Course Code', '', '', code1, '', code2, '', code3, ...]
  let courseCodes = [];
  let courseNames = [];
  
  // Look for the "Course Code" row (row 5 in template)
  for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
    const row = jsonData[i];
    const firstCell = String(row[0] || '').toLowerCase().trim();
    
    if (firstCell === 'course code') {
      console.log('✅ Found Course Code row at index', i);
      console.log('Full row:', row);
      
      // Extract course codes starting from column 3
      // Don't skip any columns - just collect all non-empty values
      for (let j = 3; j < row.length; j++) {
        const code = String(row[j] || '').trim();
        if (code && code.length > 0 && !code.toLowerCase().includes('course')) {
          courseCodes.push(code);
          courseNames.push(code);
          console.log(`📚 Found course code at column ${j}: ${code}`);
        }
      }
      break;
    }
  }
  
  console.log('📚 Extracted course codes:', courseCodes);
  
  // Find student data header (USN, NAME, CIE, SEE pattern)
  let headerRowIndex = -1;
  let headers = [];
  
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    const rowStr = row.join('|').toLowerCase();
    
    if (rowStr.includes('usn') && rowStr.includes('name') && (rowStr.includes('cie') || rowStr.includes('see'))) {
      headers = row.map(h => String(h || '').trim());
      headerRowIndex = i;
      console.log('✅ Found student header at row', i + 1);
      break;
    }
  }
  
  if (headerRowIndex === -1) {
    throw new Error('Could not find student data header row');
  }
  
  // Extract student data
  const studentData = [];
  const dataStartRow = headerRowIndex + 1;
  
  console.log('📋 Headers found:', headers);
  console.log('🔍 Starting to read student data from row', dataStartRow + 1);
  
  for (let i = dataStartRow; i < jsonData.length; i++) {
    const row = jsonData[i];
    
    // Skip empty rows
    if (!row || row.length === 0 || !row[1]) continue;
    
    const studentRow = {
      _rawRow: row  // Store the raw row data for index access
    };
    headers.forEach((header, idx) => {
      studentRow[header] = row[idx] !== undefined ? row[idx] : '';
    });
    
    // Get USN - usually in column 1 or 2
    const usn = String(studentRow[headers[1]] || studentRow.USN || '').trim();
    if (usn && usn.length > 2 && !usn.toLowerCase().includes('usn') && !usn.toLowerCase().includes('s.n')) {
      console.log(`👤 Student ${studentData.length + 1}: USN=${usn}, Row data:`, row.slice(0, 10));
      studentData.push(studentRow);
    }
  }
  
  console.log('👨‍🎓 Students found:', studentData.length);
  
  if (studentData.length === 0) {
    throw new Error('No valid student data found in Excel file');
  }
  
  console.log('\n🔍 HEADER ROW ANALYSIS:');
  console.log('Headers array:', headers);
  console.log('Number of headers:', headers.length);
  
  // Build subject pairs based on course types
  const subjectPairs = [];
  let currentColIndex = 3; // Start after S.N., USN, NAME
  
  console.log('\n🏗️ BUILDING SUBJECT PAIRS:');
  console.log(`Starting column index: ${currentColIndex}`);
  console.log(`Total course codes found: ${courseCodes.length}`);
  console.log(`Course types mapping:`, courseTypes);
  
  // New approach: Map columns by looking at the header row structure
  console.log('\n🔍 Analyzing header structure:');
  let headerIndex = 3; // Start after S.N., USN, NAME
  
  courseCodes.forEach((courseCode, subjectIndex) => {
    const courseType = courseTypes[courseCode] || '';
    const isProject = courseType === 'Project';
    
    console.log(`\n📚 Processing Course ${subjectIndex + 1}/${courseCodes.length}: ${courseCode}`);
    console.log(`   Type: ${courseType || 'Not specified'}`);
    console.log(`   Is Project: ${isProject}`);
    console.log(`   Looking for columns starting at index: ${headerIndex}`);
    
    // Look at the actual header row to determine column structure
    // The header row should have CIE, SEE or just SEE for projects
    const nextHeader = headers[headerIndex]?.toLowerCase() || '';
    const nextNextHeader = headers[headerIndex + 1]?.toLowerCase() || '';
    
    console.log(`   Header at ${headerIndex}: "${headers[headerIndex]}"`);
    console.log(`   Header at ${headerIndex + 1}: "${headers[headerIndex + 1]}"`);
    
    if (isProject || nextHeader === 'see') {
      // Project course or SEE-only course - only one column
      console.log(`   ✅ Project/SEE-only course - SEE at column ${headerIndex}`);
      subjectPairs.push({
        courseCode: courseCode,
        courseName: courseCode,
        cieColumnIndex: null,
        seeColumnIndex: headerIndex,
        isProject: true
      });
      headerIndex += 1; // Move to next column
    } else if (nextHeader === 'cie' && nextNextHeader === 'see') {
      // Regular course with both CIE and SEE
      console.log(`   ✅ Regular course - CIE at ${headerIndex}, SEE at ${headerIndex + 1}`);
      subjectPairs.push({
        courseCode: courseCode,
        courseName: courseCode,
        cieColumnIndex: headerIndex,
        seeColumnIndex: headerIndex + 1,
        isProject: false
      });
      headerIndex += 2; // Move past both columns
    } else {
      // Fallback - assume regular course
      console.log(`   ⚠️ Fallback - assuming regular course structure`);
      subjectPairs.push({
        courseCode: courseCode,
        courseName: courseCode,
        cieColumnIndex: headerIndex,
        seeColumnIndex: headerIndex + 1,
        isProject: false
      });
      headerIndex += 2;
    }
    console.log(`   Next header index will be: ${headerIndex}`);
  });
  
  console.log('\n✅ FINAL SUBJECT PAIRS SUMMARY:');
  console.log(`Total subject pairs created: ${subjectPairs.length}`);
  
  // Log subject pair details
  subjectPairs.forEach((sp, idx) => {
    if (sp.isProject) {
      console.log(`📖 ${idx + 1}. ${sp.courseCode} (Project) - SEE column: ${sp.seeColumnIndex}, Header: "${headers[sp.seeColumnIndex]}"`);
    } else {
      console.log(`📖 ${idx + 1}. ${sp.courseCode} - CIE column: ${sp.cieColumnIndex} ("${headers[sp.cieColumnIndex]}"), SEE column: ${sp.seeColumnIndex} ("${headers[sp.seeColumnIndex]}")`);
    }
  });
  
  // Calculate statistics for each subject
  const subjectStats = [];
  const allMarks = [];
  
  subjectPairs.forEach((subject, idx) => {
    console.log(`\n📊 Processing subject ${idx + 1}: ${subject.courseCode}`);
    
    let cieMarks, seeMarks, totalMarks;
    
    if (subject.isProject) {
      // Project courses only have SEE marks
      console.log(`   Project course - using only SEE from column index: ${subject.seeColumnIndex}`);
      
      cieMarks = studentData.map(() => 0); // No CIE for projects
      seeMarks = studentData.map((s, i) => {
        const val = parseFloat(s._rawRow[subject.seeColumnIndex]) || 0;
        if (i === 0) console.log(`   First student SEE value: "${s._rawRow[subject.seeColumnIndex]}" -> ${val}`);
        return val;
      });
      totalMarks = seeMarks; // Total = SEE only for projects
    } else {
      // Regular courses have both CIE and SEE
      console.log(`   Looking for CIE in column index: ${subject.cieColumnIndex}`);
      console.log(`   Looking for SEE in column index: ${subject.seeColumnIndex}`);
      
      cieMarks = studentData.map((s, i) => {
        const val = parseFloat(s._rawRow[subject.cieColumnIndex]) || 0;
        if (i === 0) console.log(`   First student CIE value: "${s._rawRow[subject.cieColumnIndex]}" -> ${val}`);
        return val;
      });
      seeMarks = studentData.map((s, i) => {
        const val = parseFloat(s._rawRow[subject.seeColumnIndex]) || 0;
        if (i === 0) console.log(`   First student SEE value: "${s._rawRow[subject.seeColumnIndex]}" -> ${val}`);
        return val;
      });
      totalMarks = studentData.map(student => {
        const cie = parseFloat(student._rawRow[subject.cieColumnIndex]) || 0;
        const see = parseFloat(student._rawRow[subject.seeColumnIndex]) || 0;
        return cie + see;
      });
    }
    
    console.log(`   All CIE marks:`, cieMarks);
    console.log(`   All SEE marks:`, seeMarks);
    
    const validTotalMarks = totalMarks.filter(m => m > 0);
    const validCIE = cieMarks.filter(m => m > 0);
    const validSEE = seeMarks.filter(m => m > 0);
    
    if (validTotalMarks.length > 0) {
      const sum = validTotalMarks.reduce((a, b) => a + b, 0);
      const avg = sum / validTotalMarks.length;
      const passCount = validTotalMarks.filter(m => m >= 40).length;
      
      // Grade distribution for this subject
      const fcdCount = totalMarks.filter(m => m >= 70).length;
      const fcCount = totalMarks.filter(m => m >= 60 && m < 70).length;
      const scCount = totalMarks.filter(m => m >= 40 && m < 60).length;
      
      subjectStats.push({
        subject: subject.courseCode,
        courseCode: subject.courseCode,
        courseName: subject.courseName,
        average: Math.round(avg * 100) / 100,
        highest: Math.max(...totalMarks),
        lowest: Math.min(...validTotalMarks),
        passPercent: Math.round((passCount / validTotalMarks.length) * 100 * 100) / 100,
        passed: passCount,
        failed: validTotalMarks.length - passCount,
        appeared: studentData.length,
        // CIE Statistics
        maxCIE: Math.max(...cieMarks),
        minCIE: Math.min(...validCIE),
        avgCIE: validCIE.length > 0 ? Math.round((validCIE.reduce((a, b) => a + b, 0) / validCIE.length) * 100) / 100 : 0,
        // SEE Statistics
        maxSEE: Math.max(...seeMarks),
        minSEE: Math.min(...validSEE),
        avgSEE: validSEE.length > 0 ? Math.round((validSEE.reduce((a, b) => a + b, 0) / validSEE.length) * 100) / 100 : 0,
        // Grade counts
        fcd: fcdCount,
        fc: fcCount,
        sc: scCount
      });
      
      allMarks.push(...validTotalMarks);
    }
  });
  
  // Calculate overall pass/fail
  const passedStudents = studentData.filter(student => {
    let allPassed = true;
    subjectPairs.forEach(subject => {
      if (subject.isProject) {
        // For projects, only check SEE (no CIE)
        const see = parseFloat(student._rawRow[subject.seeColumnIndex]) || 0;
        if (see < 40) allPassed = false; // Need 40 in SEE for projects
      } else {
        // For regular courses, check both CIE and SEE
        const cie = parseFloat(student._rawRow[subject.cieColumnIndex]) || 0;
        const see = parseFloat(student._rawRow[subject.seeColumnIndex]) || 0;
        const total = cie + see;
        if (total < 40 || see < 18) allPassed = false; // Need 40 total and 18 in SEE
      }
    });
    return allPassed;
  }).length;
  
  const failedStudents = studentData.length - passedStudents;
  
  // Overall statistics
  const overallSum = allMarks.reduce((a, b) => a + b, 0);
  const overallAvg = allMarks.length > 0 ? overallSum / allMarks.length : 0;
  const overallHigh = allMarks.length > 0 ? Math.max(...allMarks) : 0;
  const overallLow = allMarks.length > 0 ? Math.min(...allMarks) : 0;
  
  console.log('📊 Analysis complete:', {
    students: studentData.length,
    subjects: subjectPairs.length,
    avgMarks: Math.round(overallAvg * 100) / 100,
    passed: passedStudents
  });
  
  // Transform students data
  const students = studentData.map((student, index) => {
    const marks = subjectPairs.map(subject => {
      if (subject.isProject) {
        // For projects, only SEE marks
        const see = parseFloat(student._rawRow[subject.seeColumnIndex]) || 0;
        return see;
      } else {
        // For regular courses, CIE + SEE
        const cie = parseFloat(student._rawRow[subject.cieColumnIndex]) || 0;
        const see = parseFloat(student._rawRow[subject.seeColumnIndex]) || 0;
        return cie + see;
      }
    });
    
    // Create subjects array with CIE/SEE breakdown for each subject
    const subjects = subjectPairs.map(subject => {
      if (subject.isProject) {
        // For projects, only SEE
        const see = parseFloat(student._rawRow[subject.seeColumnIndex]) || 0;
        return {
          cie: 'N/A', // No CIE for projects
          see: see,
          total: see,
          courseCode: subject.courseCode,
          isProject: true
        };
      } else {
        // For regular courses
        const cie = parseFloat(student._rawRow[subject.cieColumnIndex]) || 0;
        const see = parseFloat(student._rawRow[subject.seeColumnIndex]) || 0;
        return {
          cie: cie,
          see: see,
          total: cie + see,
          courseCode: subject.courseCode,
          isProject: false
        };
      }
    });
    
    const total = marks.reduce((a, b) => a + b, 0);
    const avg = marks.length > 0 ? total / marks.length : 0;
    
    // Check if passed (all subjects >= 40 and SEE >= 18)
    let passed = true;
    subjectPairs.forEach(subject => {
      if (subject.isProject) {
        // For projects, only check SEE
        const see = parseFloat(student._rawRow[subject.seeColumnIndex]) || 0;
        if (see < 40) passed = false; // Need 40 in SEE for projects
      } else {
        // For regular courses, check both CIE and SEE
        const cie = parseFloat(student._rawRow[subject.cieColumnIndex]) || 0;
        const see = parseFloat(student._rawRow[subject.seeColumnIndex]) || 0;
        const total = cie + see;
        if (total < 40 || see < 18) passed = false;
      }
    });
    
    // Calculate grade based on percentage
    const percentage = Math.round((total / (marks.length * 100)) * 100 * 100) / 100;
    let grade = 'F';
    if (percentage >= 70) grade = 'FCD';
    else if (percentage >= 60) grade = 'FC';
    else if (percentage >= 50) grade = 'SC';
    else if (percentage >= 40) grade = 'P';
    
    return {
      sno: index + 1,
      sn: index + 1,
      usn: student[headers[1]] || '',
      name: student[headers[2]] || student.NAME || '',
      marks: marks,
      subjects: subjects,
      total: Math.round(total * 100) / 100,
      average: Math.round(avg * 100) / 100,
      percentage: percentage,
      grade: grade,
      result: passed ? 'PASS' : 'FAIL'
    };
  });
  
  // Sort students by percentage to assign ranks
  const sortedStudents = [...students].sort((a, b) => b.percentage - a.percentage);
  
  // Assign ranks and colors
  students.forEach(student => {
    const rank = sortedStudents.findIndex(s => s.usn === student.usn) + 1;
    student.rank = rank;
    
    // Assign rank colors
    if (rank === 1) {
      student.rankColor = '#FFD700'; // Gold
      student.rankLabel = '🥇 1st';
    } else if (rank === 2) {
      student.rankColor = '#C0C0C0'; // Silver
      student.rankLabel = '🥈 2nd';
    } else if (rank === 3) {
      student.rankColor = '#CD7F32'; // Bronze
      student.rankLabel = '🥉 3rd';
    } else {
      student.rankColor = 'transparent';
      student.rankLabel = rank;
    }
  });
  
  // Transform data to match renderComprehensiveAnalysis expected format
  return {
    success: true,
    status: 'success',
    message: 'File analyzed successfully!',
    academicYear: academicYear,
    branch: branch,
    semester: semester,
    classStats: {
      totalStudents: studentData.length,
      passed: passedStudents,
      failed: failedStudents,
      passPercentage: Math.round((passedStudents / studentData.length) * 100 * 100) / 100
    },
    subjectStats: subjectStats,
    students: students,
    subjectNames: subjectPairs.map(s => s.courseCode),
    courseCodes: courseCodes,
    courseNames: courseNames,
    courseTypes: subjectPairs.map(s => ({
      courseCode: s.courseCode,
      isProject: s.isProject || false
    })),
    summary: {
      overallAvg: Math.round(overallAvg * 100) / 100,
      overallHigh: overallHigh,
      overallLow: overallLow,
      passPercent: Math.round((passedStudents / studentData.length) * 100 * 100) / 100
    },
    headers: headers,
    totalStudents: studentData.length
  };
}

// OPTIONS handlers for CORS preflight
app.options('/upload', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.sendStatus(200);
});

app.options('/api/upload', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.sendStatus(200);
});

// POST /upload - file upload with real Excel analysis
app.post('/upload', upload.single('file'), (req, res) => {
  console.log('📁 POST /upload received');
  
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }
    
    console.log('📄 File:', req.file.originalname, 'Size:', req.file.size);
    
    // Analyze the Excel file
    const result = analyzeExcelFile(req.file.buffer);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to analyze file: ' + error.message 
    });
  }
});

// POST /api/upload - same with /api prefix
app.post('/api/upload', upload.single('file'), (req, res) => {
  console.log('📁 POST /api/upload received');
  
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }
    
    console.log('📄 File:', req.file.originalname, 'Size:', req.file.size);
    
    // Analyze the Excel file
    const result = analyzeExcelFile(req.file.buffer);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to analyze file: ' + error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📤 POST /upload configured`);
  console.log(`📤 POST /api/upload configured`);
});