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
  
  // Find the course codes and names row (looks for "Course Code" and "Course Name")
  let courseInfoRow = -1;
  let courseCodes = [];
  let courseNames = [];
  
  for (let i = 0; i < Math.min(jsonData.length, 15); i++) {
    const row = jsonData[i];
    const rowStr = row.join('|').toLowerCase();
    
    if (rowStr.includes('course code') && rowStr.includes('course name')) {
      courseInfoRow = i;
      console.log('✅ Found course info header at row', i + 1);
      // Extract course codes and names from subsequent rows
      for (let j = i + 1; j < Math.min(i + 20, jsonData.length); j++) {
        const courseRow = jsonData[j];
        if (courseRow[1] && String(courseRow[1]).trim().length > 0) {
          const code = String(courseRow[1]).trim();
          const name = String(courseRow[2] || '').trim();
          // Check if this looks like a course code (e.g., BMATE101)
          if (code && !code.toLowerCase().includes('course') && 
              !code.toLowerCase().includes('indicator') && 
              !code.toLowerCase().includes('percentage') &&
              code.length < 20 && code.length > 3) {
            courseCodes.push(code);
            courseNames.push(name || code);
          }
        } else {
          // Stop when we hit empty cells or reach the indicators section
          if (courseCodes.length > 0) break;
        }
      }
      break;
    }
  }
  
  console.log('📚 Found courses:', courseCodes);
  
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
  
  for (let i = dataStartRow; i < jsonData.length; i++) {
    const row = jsonData[i];
    
    // Skip empty rows
    if (!row || row.length === 0 || !row[1]) continue;
    
    const studentRow = {};
    headers.forEach((header, idx) => {
      studentRow[header] = row[idx] !== undefined ? row[idx] : '';
    });
    
    // Get USN - usually in column 1 or 2
    const usn = String(studentRow[headers[1]] || studentRow.USN || '').trim();
    if (usn && usn.length > 2 && !usn.toLowerCase().includes('usn') && !usn.toLowerCase().includes('s.n')) {
      studentData.push(studentRow);
    }
  }
  
  console.log('👨‍🎓 Students found:', studentData.length);
  
  if (studentData.length === 0) {
    throw new Error('No valid student data found in Excel file');
  }
  
  // Find CIE and SEE columns for each subject
  const subjectColumns = [];
  const subjectPairs = [];
  
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase();
    if (header === 'cie' || header === 'see') {
      subjectColumns.push(headers[i]);
    }
  }
  
  // Pair CIE and SEE columns
  for (let i = 0; i < subjectColumns.length; i += 2) {
    if (i + 1 < subjectColumns.length) {
      const cieCol = subjectColumns[i];
      const seeCol = subjectColumns[i + 1];
      const subjectIndex = Math.floor(i / 2);
      const courseCode = courseCodes[subjectIndex] || `Subject ${subjectIndex + 1}`;
      const courseName = courseNames[subjectIndex] || courseCode;
      
      subjectPairs.push({
        courseCode: courseCode,
        courseName: courseName,
        cieColumn: cieCol,
        seeColumn: seeCol
      });
    }
  }
  
  console.log('📚 Subject pairs:', subjectPairs.length);
  
  // Calculate statistics for each subject
  const subjectStats = [];
  const allMarks = [];
  
  subjectPairs.forEach((subject, idx) => {
    const marks = studentData.map(student => {
      const cie = parseFloat(student[subject.cieColumn]) || 0;
      const see = parseFloat(student[subject.seeColumn]) || 0;
      return cie + see;
    }).filter(m => m > 0);
    
    if (marks.length > 0) {
      const sum = marks.reduce((a, b) => a + b, 0);
      const avg = sum / marks.length;
      const max = Math.max(...marks);
      const min = Math.min(...marks);
      const passCount = marks.filter(m => m >= 40).length; // Total 40+ is pass
      
      subjectStats.push({
        subject: subject.courseCode,
        courseCode: subject.courseCode,
        courseName: subject.courseName,
        average: Math.round(avg * 100) / 100,
        highest: max,
        lowest: min,
        passPercent: Math.round((passCount / marks.length) * 100 * 100) / 100,
        passed: passCount,
        failed: marks.length - passCount
      });
      
      allMarks.push(...marks);
    }
  });
  
  // Calculate overall pass/fail
  const passedStudents = studentData.filter(student => {
    let allPassed = true;
    subjectPairs.forEach(subject => {
      const cie = parseFloat(student[subject.cieColumn]) || 0;
      const see = parseFloat(student[subject.seeColumn]) || 0;
      const total = cie + see;
      if (total < 40 || see < 18) allPassed = false; // Need 40 total and 18 in SEE
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
      const cie = parseFloat(student[subject.cieColumn]) || 0;
      const see = parseFloat(student[subject.seeColumn]) || 0;
      return cie + see;
    });
    
    // Create subjects array with CIE/SEE breakdown for each subject
    const subjects = subjectPairs.map(subject => {
      const cie = parseFloat(student[subject.cieColumn]) || 0;
      const see = parseFloat(student[subject.seeColumn]) || 0;
      return {
        cie: cie,
        see: see,
        total: cie + see,
        courseCode: subject.courseCode
      };
    });
    
    const total = marks.reduce((a, b) => a + b, 0);
    const avg = marks.length > 0 ? total / marks.length : 0;
    
    // Check if passed (all subjects >= 40 and SEE >= 18)
    let passed = true;
    subjectPairs.forEach(subject => {
      const cie = parseFloat(student[subject.cieColumn]) || 0;
      const see = parseFloat(student[subject.seeColumn]) || 0;
      const total = cie + see;
      if (total < 40 || see < 18) passed = false;
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
      subjects: subjects,  // Added this!
      total: Math.round(total * 100) / 100,
      average: Math.round(avg * 100) / 100,
      percentage: percentage,
      grade: grade,
      result: passed ? 'PASS' : 'FAIL'
    };
  });
  
  // Transform data to match renderComprehensiveAnalysis expected format
  return {
    success: true,
    status: 'success',
    message: 'File analyzed successfully!',
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