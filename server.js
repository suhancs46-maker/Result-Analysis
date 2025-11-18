const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const ExcelJS = require('exceljs');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// Serve static files from project root
app.use(express.static(path.join(__dirname)));

// Simple health endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// In-memory storage for uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST /api/upload - accept a single file field named 'file'
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('File upload attempt:', req.file ? 'File received' : 'No file');
    if (!req.file || !req.file.buffer) {
      console.log('Upload failed: No file or buffer');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('Processing file:', req.file.originalname, 'Size:', req.file.buffer.length);
    
    // Try ExcelJS first
    let workbook = new ExcelJS.Workbook();
    let useXLSX = false;
    
    try {
      await workbook.xlsx.load(req.file.buffer);
      console.log('ExcelJS: Workbook loaded, worksheets:', workbook.worksheets.length);
      
      if (workbook.worksheets.length === 0) {
        console.log('ExcelJS found no worksheets, trying XLSX library...');
        useXLSX = true;
      }
    } catch (error) {
      console.error('ExcelJS error:', error.message);
      console.log('Trying XLSX library as fallback...');
      useXLSX = true;
    }
    
    let worksheet = null;
    let rows = [];
    
    if (useXLSX) {
      // Fallback to XLSX library
      try {
        const xlsxWorkbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        console.log('XLSX: Workbook loaded, sheets:', Object.keys(xlsxWorkbook.Sheets).length);
        console.log('XLSX: Sheet names:', Object.keys(xlsxWorkbook.Sheets));
        
        if (Object.keys(xlsxWorkbook.Sheets).length === 0) {
          return res.status(400).json({ error: 'Excel file contains no worksheets' });
        }
        
        // Use first sheet
        const firstSheetName = Object.keys(xlsxWorkbook.Sheets)[0];
        const xlsxSheet = xlsxWorkbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(xlsxSheet, { header: 1, defval: '' });
        
        console.log('XLSX: Converted to JSON, rows:', jsonData.length);
        console.log('XLSX: First 3 rows:', jsonData.slice(0, 3));
        
        // Convert to our format
        rows = jsonData.map((row, index) => ({ rowNumber: index + 1, vals: row }));
        
      } catch (xlsxError) {
        console.error('XLSX error:', xlsxError.message);
        return res.status(400).json({ error: 'Unable to read Excel file with any library' });
      }
    } else {
      // Use ExcelJS
      console.log('ExcelJS: Worksheet names:', workbook.worksheets.map(ws => ws.name));
      
      // Try to find the worksheet with student results (look for USN column)
      for (const ws of workbook.worksheets) {
        // Check multiple rows for USN (could be in row 1 or later rows)
        let foundUSN = false;
        for (let i = 1; i <= Math.min(10, ws.rowCount); i++) {
          const row = ws.getRow(i);
          const hasUSN = row.values.some(v => String(v || '').toUpperCase().includes('USN'));
          if (hasUSN) {
            foundUSN = true;
            break;
          }
        }
        if (foundUSN) {
          worksheet = ws;
          console.log('Found student results in worksheet:', ws.name);
          break;
        }
      }
      
      // If no USN found, use first worksheet
      if (!worksheet) {
        worksheet = workbook.worksheets[0];
        console.log('Using first worksheet:', worksheet?.name);
      }
      
      if (!worksheet) {
        console.log('No worksheet found in workbook');
        return res.status(400).json({ error: 'No worksheet found' });
      }

      // Read all rows including potential course code rows
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const vals = row.values.slice(1); // ExcelJS row.values is 1-based, values[0] empty
        rows.push({ rowNumber, vals });
      });
    }

    if (rows.length < 2) return res.status(400).json({ error: 'Not enough rows (need header + at least one data row)' });

    console.log('First 5 rows:', rows.slice(0, 5).map(r => r.vals));
    
    // Try to identify structure
    // Your template format:
    // Row 1: Instructions
    // Row 2: Academic Year
    // Row 3: Branch
    // Row 4: Semester
    // Row 5: Course Codes
    // Row 6: Headers (S.N., USN, NAME, CIE, SEE...)
    // Row 7+: Student data
    
    let courseCodeRow = null;
    let headerRow = null;
    let dataStartRow = 0;
    
    // Look for row with course codes (pattern like BMATE101, BEC301, etc.)
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const vals = rows[i].vals;
      const hasCourseCodes = vals.some(v => {
        const str = String(v || '');
        return /^[A-Z]{3,6}\d{3,4}[A-Z]?/i.test(str); // Pattern like BMATE101 or BEC301
      });
      
      if (hasCourseCodes && !courseCodeRow) {
        courseCodeRow = vals;
        console.log('Found course codes in row', i + 1, ':', courseCodeRow);
      }
      
      // Look for header row with USN, Name, CIE, SEE patterns
      const hasUSN = vals.some(v => String(v || '').toUpperCase().includes('USN'));
      const hasCIE = vals.some(v => String(v || '').toUpperCase().includes('CIE'));
      const hasName = vals.some(v => String(v || '').toUpperCase().includes('NAME'));
      
      if ((hasUSN || (hasCIE && hasName)) && !headerRow) {
        headerRow = vals;
        dataStartRow = i + 1;
        console.log('Found header row', i + 1, ':', headerRow);
      }
    }
    
    // If no specific structure found, assume first row is header
    if (!headerRow) {
      headerRow = rows[0].vals;
      dataStartRow = 1;
    }
    
    const headers = headerRow.map(h => String(h || '').trim());
    console.log('Using headers:', headers);
    
    // Extract course codes if found
    const courseCodes = [];
    if (courseCodeRow) {
      for (let i = 2; i < courseCodeRow.length; i += 2) { // Start from index 2 (after USN, Name)
        const code = String(courseCodeRow[i] || '').trim();
        if (code && /^[A-Z]{4,6}\d{3,4}[A-Z]?/i.test(code)) {
          courseCodes.push(code);
        } else {
          courseCodes.push(`SUBJ${Math.floor(i/2)}`);
        }
      }
    }
    console.log('Course codes:', courseCodes);
    
    // Parse student data
    const students = rows.slice(dataStartRow).map((rowData, idx) => {
      const row = rowData.vals;
      
      // Determine column indices based on header
      let snIdx = 0, usnIdx = 1, nameIdx = 2, marksStartIdx = 3;
      
      // Check if first header is S.N. or serial number
      const firstHeader = String(headers[0] || '').toLowerCase();
      if (firstHeader.includes('s.n') || firstHeader.includes('serial') || firstHeader.includes('sno')) {
        // Has S.N. column: S.N., USN, NAME, marks...
        snIdx = 0;
        usnIdx = 1;
        nameIdx = 2;
        marksStartIdx = 3;
      } else if (firstHeader.includes('usn')) {
        // Starts with USN: USN, NAME, marks...
        snIdx = -1;
        usnIdx = 0;
        nameIdx = 1;
        marksStartIdx = 2;
      }
      
      const student = {
        sn: snIdx >= 0 ? (Number(row[snIdx]) || (idx + 1)) : (idx + 1), // Use serial from file or index
        usn: String(row[usnIdx] || '').trim(),
        name: String(row[nameIdx] || '').trim()
      };
      
      // Extract marks for each subject (CIE and SEE pairs)
      const subjects = [];
      for (let i = marksStartIdx; i < row.length; i += 2) {
        if (i + 1 < row.length) {
          const cie = parseFloat(row[i]) || 0;
          const see = parseFloat(row[i + 1]) || 0;
          subjects.push({ cie, see, total: cie + see });
        }
      }
      student.subjects = subjects;
      
      // Calculate total marks and percentage
      const totalMarks = subjects.reduce((sum, s) => sum + s.total, 0);
      const maxMarks = subjects.length * 100; // Each subject max 100 (50 CIE + 50 SEE)
      student.totalMarks = totalMarks;
      student.percentage = maxMarks > 0 ? ((totalMarks / maxMarks) * 100).toFixed(2) : 0;
      
      // Determine pass/fail status
      // Fail conditions: CIE < 20 OR SEE < 18 in any subject
      const hasCIEFailure = subjects.some(s => s.cie < 20);
      const hasSEEFailure = subjects.some(s => s.see < 18);
      student.result = (hasCIEFailure || hasSEEFailure) ? 'FAIL' : 'PASS';
      
      // Determine grade
      const pct = parseFloat(student.percentage);
      if (student.result === 'FAIL') {
        student.grade = 'FAIL';
      } else if (pct >= 70) {
        student.grade = 'FCD'; // First Class with Distinction
      } else if (pct >= 60) {
        student.grade = 'FC'; // First Class
      } else if (pct >= 50) {
        student.grade = 'SC'; // Second Class
      } else {
        student.grade = 'PASS';
      }
      
      return student;
    });
    
    // Extract subject names from headers (every pair after USN and Name)
    // Combine with course codes if available
    const subjectNames = [];
    for (let i = 2; i < headers.length; i += 2) {
      const headerName = headers[i].replace(/CIE|SEE/gi, '').trim();
      const courseCode = courseCodes[Math.floor((i-2)/2)] || '';
      const subjectName = courseCode || headerName || `Subject ${(i/2)}`;
      subjectNames.push(subjectName);
    }
    
    // Calculate subject-wise statistics
    const subjectStats = subjectNames.map((subjectName, subIdx) => {
      const courseCode = courseCodes[subIdx] || '';
      const appeared = students.length;
      const passedStudents = students.filter(st => {
        const subj = st.subjects[subIdx];
        return subj && subj.cie >= 20 && subj.see >= 18;
      });
      const passed = passedStudents.length;
      const failed = appeared - passed;
      
      // Get all CIE and SEE marks for this subject
      const cieMarks = students.map(st => st.subjects[subIdx]?.cie || 0);
      const seeMarks = students.map(st => st.subjects[subIdx]?.see || 0);
      const totalMarks = students.map(st => st.subjects[subIdx]?.total || 0);
      
      // Calculate statistics
      const maxCIE = Math.max(...cieMarks);
      const minCIE = Math.min(...cieMarks);
      const avgCIE = (cieMarks.reduce((a,b) => a+b, 0) / cieMarks.length).toFixed(2);
      const medianCIE = getMedian(cieMarks);
      
      const maxSEE = Math.max(...seeMarks);
      const minSEE = Math.min(...seeMarks);
      const avgSEE = (seeMarks.reduce((a,b) => a+b, 0) / seeMarks.length).toFixed(2);
      const medianSEE = getMedian(seeMarks);
      
      const avgTotal = (totalMarks.reduce((a,b) => a+b, 0) / totalMarks.length).toFixed(2);
      
      // Count grade distributions
      const fcdCount = passedStudents.filter(st => {
        const total = st.subjects[subIdx]?.total || 0;
        return total >= 70;
      }).length;
      
      const fcCount = passedStudents.filter(st => {
        const total = st.subjects[subIdx]?.total || 0;
        return total >= 60 && total < 70;
      }).length;
      
      const scCount = passedStudents.filter(st => {
        const total = st.subjects[subIdx]?.total || 0;
        return total >= 50 && total < 60;
      }).length;
      
      const passPercentage = ((passed / appeared) * 100).toFixed(2);
      
      return {
        courseCode,
        subject: subjectName,
        appeared,
        passed,
        failed,
        passPercentage,
        fcdCount,
        fcCount,
        scCount,
        maxCIE,
        minCIE,
        avgCIE,
        medianCIE,
        maxSEE,
        minSEE,
        avgSEE,
        medianSEE,
        avgTotal
      };
    });
    
    // Helper function for median
    function getMedian(arr) {
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 
        ? ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2)
        : sorted[mid].toFixed(2);
    }
    
    // Overall class statistics
    const totalStudents = students.length;
    const passedStudents = students.filter(st => st.result === 'PASS').length;
    const failedStudents = totalStudents - passedStudents;
    const overallPassPercentage = ((passedStudents / totalStudents) * 100).toFixed(2);
    
    return res.json({
      success: true,
      message: 'Analysis complete',
      classStats: {
        totalStudents,
        passed: passedStudents,
        failed: failedStudents,
        passPercentage: overallPassPercentage
      },
      subjectStats,
      students,
      subjectNames,
      courseCodes: courseCodes.length > 0 ? courseCodes : subjectNames
    });
  } catch (err) {
    console.error('Upload parse error:', err);
    return res.status(500).json({ error: 'Failed to parse file', details: err.message });
  }
});

// Add /upload endpoint as well for compatibility
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'No file uploaded' });

    // Use ExcelJS to parse the buffer
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return res.status(400).json({ error: 'No worksheet found' });

    // Read rows: first row is header
    const rows = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const vals = row.values.slice(1); // ExcelJS row.values is 1-based, values[0] empty
      rows.push(vals);
    });

    if (rows.length < 2) return res.status(400).json({ error: 'Not enough rows (need header + at least one data row)' });

    const headers = rows[0].map(h => String(h || '').trim());
    const data = rows.slice(1).map(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h || `col${i}`] = r[i] ?? ''; });
      return obj;
    });

    // Compute analysis similar to client: subjects are headers excluding first column
    const subjects = headers.slice(1);
    if (subjects.length === 0) return res.status(400).json({ error: 'No subject columns found' });

    const allMarks = [];
    const subjectTotals = subjects.map(() => 0);
    const subjectCounts = subjects.map(() => 0);

    data.forEach(row => {
      subjects.forEach((subj, idx) => {
        const mark = Number(row[subj]) || 0;
        if (mark > 0) {
          subjectTotals[idx] += mark;
          subjectCounts[idx]++;
          allMarks.push(mark);
        }
      });
    });

    const subjectAverages = subjectTotals.map((total, idx) => subjectCounts[idx] > 0 ? total / subjectCounts[idx] : 0);
    const overallAvg = allMarks.length ? allMarks.reduce((a,b)=>a+b,0) / allMarks.length : 0;
    const overallHigh = allMarks.length ? Math.max(...allMarks) : 0;
    const overallLow = allMarks.length ? Math.min(...allMarks) : 0;
    const passCount = allMarks.filter(m => m >= 35).length;
    const passPercent = allMarks.length ? (passCount / allMarks.length) * 100 : 0;

    res.json({
      status: 'success',
      message: 'File analyzed successfully!',
      summary: {
        overallAvg: Number(overallAvg.toFixed(2)),
        overallHigh,
        overallLow,
        passPercent: Number(passPercent.toFixed(2))
      },
      subjects: subjects.map((s, idx) => ({
        subject: s,
        average: Number((subjectAverages[idx] || 0).toFixed(2))
      }))
    });
  } catch (err) {
    console.error('Upload parse error:', err);
    return res.status(500).json({ error: 'Failed to parse file', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});
