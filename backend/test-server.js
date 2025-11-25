// Test server endpoints
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;

// Enhanced CORS
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true
}));

// Handle preflight
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept');
  res.sendStatus(200);
});

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '..')));

// Multer setup
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Test routes
app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'Server is running!', endpoints: ['/upload', '/api/upload'] });
});

app.get('/test', (req, res) => {
  res.json({ method: 'GET', endpoint: '/test', status: 'working' });
});

app.post('/test', (req, res) => {
  res.json({ method: 'POST', endpoint: '/test', status: 'working', body: req.body });
});

// Upload handlers with detailed logging
const handleUpload = (req, res) => {
  console.log(`📁 ${new Date().toISOString()} - Upload request received`);
  console.log(`🌐 Method: ${req.method}, URL: ${req.url}`);
  console.log(`📤 Headers:`, req.headers);
  console.log(`📎 File:`, req.file ? 'Present' : 'Missing');
  
  if (!req.file) {
    console.log('❌ No file in request');
    return res.status(400).json({ status: 'error', message: 'No file uploaded' });
  }
  
  console.log(`📄 File details:`, {
    name: req.file.originalname,
    size: req.file.size,
    type: req.file.mimetype
  });
  
  // Mock response for testing
  const response = {
    status: 'success',
    message: 'File received successfully!',
    filename: req.file.originalname,
    size: req.file.size,
    summary: {
      overallAvg: 75.5,
      overallHigh: 95,
      overallLow: 45,
      passPercent: 85.0
    },
    subjects: [
      { subject: 'Math', average: 78.5 },
      { subject: 'Science', average: 82.3 },
      { subject: 'English', average: 74.2 }
    ]
  };
  
  console.log(`✅ Sending successful response`);
  res.json(response);
};

// Upload routes
app.post('/upload', upload.single('file'), handleUpload);
app.post('/api/upload', upload.single('file'), handleUpload);

// 404 handler
app.use((req, res) => {
  console.log(`❓ 404 - ${req.method} ${req.url}`);
  res.status(404).json({ 
    status: 'error', 
    message: 'Route not found',
    method: req.method,
    url: req.url,
    availableRoutes: ['GET /', 'GET /test', 'POST /test', 'POST /upload', 'POST /api/upload']
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(`❌ Server error:`, err);
  res.status(500).json({ status: 'error', message: 'Internal server error', error: err.message });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Test server running at http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /`);
  console.log(`   GET  /test`);
  console.log(`   POST /test`);
  console.log(`   POST /upload`);
  console.log(`   POST /api/upload`);
  console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received');
  server.close(() => process.exit(0));
});