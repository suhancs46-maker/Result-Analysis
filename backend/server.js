// server.js
const express = require("express");
const bodyParser = require("body-parser");
const fs = require('fs');
const multer = require("multer");
const ExcelJS = require('exceljs');
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..'))); // Serves HTML, CSS, JS files from parent directory
app.use('/uploads', express.static(UPLOAD_DIR)); // Serve uploads directory

// Storage setup for file uploads (disk)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Route: Serve main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

// Route: Upload Excel file and analyze data
// Shared upload handler so both routes behave the same
const handleUpload = async (req, res) => {
  try {
    if (!req.file || !req.file.path) return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    const filePath = req.file.path;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return res.status(400).json({ status: 'error', message: 'No worksheet found' });

    // Convert worksheet to array-of-rows (skip empty rows)
    const rows = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const vals = row.values.slice(1);
      rows.push(vals);
    });
    if (rows.length < 2) return res.status(400).json({ status: 'error', message: 'Not enough rows' });

    const headers = rows[0].map(h => String(h || '').trim());
    const sheetData = rows.slice(1).map(r => {
      const obj = {};
      headers.forEach((h, i) => obj[h || `col${i}`] = r[i] ?? '');
      return obj;
    });

    // Compute subject-wise averages and overall stats
    const subjects = headers.length > 1 ? headers.slice(1) : [];

    const subjectAverages = subjects.map(subject => {
      const marks = sheetData.map(row => {
        const v = row[subject];
        const n = parseFloat(v === undefined || v === null ? 0 : v);
        return Number.isFinite(n) ? n : 0;
      });
      const avg = marks.length ? marks.reduce((a,b)=>a+b,0)/marks.length : 0;
      return Number.isFinite(avg) ? avg : 0;
    });

    const allMarks = sheetData.flatMap(row => subjects.map(s => {
      const v = row[s];
      const n = parseFloat(v === undefined || v === null ? 0 : v);
      return Number.isFinite(n) ? n : 0;
    }));

    const overallAvg = allMarks.length ? (allMarks.reduce((a,b)=>a+b,0)/allMarks.length) : 0;
    const overallHigh = allMarks.length ? Math.max(...allMarks) : 0;
    const overallLow = allMarks.length ? Math.min(...allMarks) : 0;
    const passCount = allMarks.filter(m => m >= 35).length;
    const passPercent = allMarks.length ? ((passCount / allMarks.length) * 100) : 0;

    // Add an "Analysis" worksheet to the workbook with summary and subject averages
    const analysisSheet = workbook.addWorksheet('Analysis');
    analysisSheet.addRow(['Result Summary']);
    analysisSheet.addRow([]);
    analysisSheet.addRow(['Overall Average', Number(overallAvg.toFixed(2))]);
    analysisSheet.addRow(['Highest Marks', overallHigh]);
    analysisSheet.addRow(['Lowest Marks', overallLow]);
    analysisSheet.addRow(['Pass Percentage', Number(passPercent.toFixed(2)) + '%']);
    analysisSheet.addRow([]);
    analysisSheet.addRow(['Subject', 'Average Marks']);
    subjectAverages.forEach((avg, idx) => {
      analysisSheet.addRow([subjects[idx], Number(avg.toFixed(2))]);
    });

    // Save modified workbook to a new file and provide download URL
    const outName = `analysis-${Date.now()}-${path.basename(filePath)}`;
    const outPath = path.join(UPLOAD_DIR, outName);
    await workbook.xlsx.writeFile(outPath);

    res.json({
      status: "success",
      message: "File analyzed successfully!",
      summary: {
        overallAvg: Number(overallAvg.toFixed(2)),
        overallHigh,
        overallLow,
        passPercent: Number(passPercent.toFixed(2))
      },
      subjects: subjects.map((s, idx) => ({ subject: s, average: Number(subjectAverages[idx].toFixed(2)) })),
      download: `/uploads/${outName}`
    });
  } catch (error) {
    console.error("Error analyzing file:", error);
    res.status(500).json({ status: "error", message: "File processing failed" });
  }
};

app.post("/upload", upload.single("file"), handleUpload);
app.post("/api/upload", upload.single("file"), handleUpload);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});