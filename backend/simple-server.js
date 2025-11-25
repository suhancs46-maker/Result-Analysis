// Simple working server for result analysis
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require('fs');
const XLSX = require('xlsx');

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true
}));

// Handle preflight OPTIONS requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept');
  res.sendStatus(200);
});

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept Excel files
    if (file.mimetype.includes('spreadsheet') || file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed!'), false);
    }
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// Test route
app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'Result Analysis Server is running!' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Upload handler function with real Excel processing
const handleFileUpload = async (req, res) => {
  console.log('📁 File upload request received from:', req.headers.origin || req.headers.host);
  console.log('📄 Content-Type:', req.headers['content-type']);
  
  try {
    if (!req.file) {
      console.log('❌ No file provided');
      return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    console.log('📄 File details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Process Excel file using XLSX
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    
    if (!sheetName) {
      return res.status(400).json({ status: 'error', message: 'No worksheet found in Excel file' });
    }

    console.log('📊 Processing worksheet:', sheetName);
    
    // Convert to JSON
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    console.log('📈 Raw data rows:', jsonData.length);
    
    if (jsonData.length < 2) {
      return res.status(400).json({ status: 'error', message: 'Excel file must contain header and data rows' });
    }

    // Find data start (look for USN/CIE/SEE patterns)
    let dataStartRow = 0;
    let headers = [];
    
    for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
      const row = jsonData[i];
      const rowStr = row.join(' ').toLowerCase();
      if (rowStr.includes('usn') && (rowStr.includes('cie') || rowStr.includes('see') || rowStr.includes('name'))) {
        headers = row;
        dataStartRow = i + 1;
        break;
      }
    }

    if (!headers.length) {
      return res.status(400).json({ status: 'error', message: 'Could not find header row with USN/student data' });
    }

    console.log('🏷️ Headers found:', headers);
    console.log('📊 Data starts at row:', dataStartRow);

    // Extract student data
    const studentData = [];
    for (let i = dataStartRow; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (row.length >= headers.length && row[1]) { // Must have USN
        const student = {};
        headers.forEach((header, idx) => {
          student[header] = row[idx] || '';
        });
        studentData.push(student);
      }
    }

    console.log('👨‍🎓 Students processed:', studentData.length);

    if (studentData.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No valid student data found' });
    }

    // Calculate analysis (simplified for demo)
    const subjectHeaders = headers.filter(h => 
      h && h.toString().toLowerCase().includes('cie') || 
      h.toString().toLowerCase().includes('see') ||
      (!h.toString().toLowerCase().includes('usn') && 
       !h.toString().toLowerCase().includes('name') && 
       !h.toString().toLowerCase().includes('s.n'))
    );

    const allMarks = [];
    const subjectAnalysis = {};

    subjectHeaders.forEach(subject => {
      const marks = studentData.map(student => {
        const mark = parseFloat(student[subject]) || 0;
        return isNaN(mark) ? 0 : mark;
      }).filter(mark => mark > 0);
      
      allMarks.push(...marks);
      
      if (marks.length > 0) {
        const avg = marks.reduce((a, b) => a + b, 0) / marks.length;
        subjectAnalysis[subject] = {
          average: Math.round(avg * 100) / 100,
          count: marks.length,
          max: Math.max(...marks),
          min: Math.min(...marks)
        };
      }
    });

    // Overall statistics
    const overallAvg = allMarks.length > 0 ? allMarks.reduce((a, b) => a + b, 0) / allMarks.length : 0;
    const overallHigh = allMarks.length > 0 ? Math.max(...allMarks) : 0;
    const overallLow = allMarks.length > 0 ? Math.min(...allMarks) : 0;
    const passCount = allMarks.filter(mark => mark >= 35).length;
    const passPercent = allMarks.length > 0 ? (passCount / allMarks.length) * 100 : 0;

    // Prepare response compatible with existing frontend
    const response = {
      status: 'success',
      message: 'File analyzed successfully!',
      summary: {
        overallAvg: Math.round(overallAvg * 100) / 100,
        overallHigh,
        overallLow,
        passPercent: Math.round(passPercent * 100) / 100
      },
      subjects: Object.keys(subjectAnalysis).map(subject => ({
        subject: subject,
        average: subjectAnalysis[subject].average
      })),
      studentData: studentData, // Include raw student data for analysis
      headers: headers
    };

    console.log('✅ Analysis complete - sending response');
    console.log('📊 Summary:', response.summary);
    res.json(response);

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ status: 'error', message: 'File processing failed: ' + error.message });
  }
};

// Upload routes
app.post('/upload', upload.single('file'), handleFileUpload);
app.post('/api/upload', upload.single('file'), handleFileUpload);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({ status: 'error', message: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  console.log('❓ 404 for:', req.method, req.url);
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Result Analysis Server running!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📁 Upload endpoints: /upload and /api/upload`);
  console.log(`🏥 Health check: /health`);
  console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down...');
  server.close(() => {
    process.exit(0);
  });
});