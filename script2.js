// ============================
// script2.js
// ============================

// Global variables
let excelData = [];
let resultChartInstance = null;
let selectedFile = null; // file chosen by user for server upload
let currentAnalysisData = null; // Store current analysis data for Excel export

// Wait until DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("fileInput");
    const analyzeBtn = document.getElementById("analyzeBtn");
    const saveBtn = document.getElementById("saveBtn");

    if (fileInput) fileInput.addEventListener("change", handleFile, false);
    if (analyzeBtn) analyzeBtn.addEventListener("click", analyzeData);
    if (saveBtn) saveBtn.addEventListener("click", saveAnalysisToExcel);
    
    // Load and display saved student-wise results if available
    loadSavedStudentResults();
});

// ============================
// Read Excel File
// ============================
function handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        alert('Please select a valid Excel file (.xlsx or .xls)');
        event.target.value = ''; // Reset the input
        return;
    }

    // store file for server upload and also keep a small client-side confirmation
    selectedFile = file;
    excelData = []; // clear any previous client-side parsed data
    console.log('Selected file for upload:', file.name, 'Type:', file.type, 'Size:', file.size, 'bytes');

    const infoEl = document.createElement('div');
    infoEl.style.position = 'fixed';
    infoEl.style.right = '16px';
    infoEl.style.bottom = '16px';
    infoEl.style.background = '#0b8';
    infoEl.style.color = '#023';
    infoEl.style.padding = '8px 12px';
    infoEl.style.borderRadius = '6px';
    infoEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    infoEl.textContent = `Selected ${file.name} — click Analyze to upload to server`;
    document.body.appendChild(infoEl);
    // Keep info message visible without auto-removal to prevent blinking
}

// ============================
// Analyze Excel Data
// ============================
function analyzeData() {
    // Check if file is selected
    const fileInput = document.getElementById("fileInput");
    const file = fileInput?.files?.[0] || selectedFile;
    
    if (!file) {
        alert("Please select an Excel file first!");
        return;
    }
    
    console.log('Starting analysis for file:', file.name, 'Type:', file.type, 'Size:', file.size);
    
    // Show loading indicator
    showLoadingIndicator();
    
    const form = new FormData();
    form.append('file', file);
    
    // Update selectedFile to ensure consistency
    selectedFile = file;

        // Try a list of possible upload endpoints to support both server variants and different origins
        // IMPORTANT: Backend server is on port 3000, so try those endpoints FIRST
        const endpoints = [
            'http://localhost:3000/api/upload',
            'http://localhost:3000/upload',
            'http://127.0.0.1:3000/api/upload',
            'http://127.0.0.1:3000/upload',
            '/api/upload',
            '/upload'
        ];

        const tryUpload = async (i = 0) => {
            if (i >= endpoints.length) {
                hideLoadingIndicator();
                console.error('❌ Upload failed: no working upload endpoint found');
                console.error('📍 All attempted endpoints:', endpoints);
                console.error('🌐 Current page origin:', window.location.origin);
                console.error('📝 Check console above for specific error details for each endpoint');
                return;
            }
            const url = endpoints[i];
            console.log(`📤 Attempting upload to: ${url} (current page: ${window.location.origin})`);
            console.log('📁 FormData contains:', form.has('file') ? 'File present' : 'No file found');
            try {
                const resp = await fetch(url, { 
                    method: 'POST', 
                    body: form,
                    // Don't set Content-Type header - let browser set it for multipart/form-data
                });
                if (resp.status === 405) {
                    console.warn(`⚠️ ${url} returned 405 (Method Not Allowed), trying next endpoint`);
                    return tryUpload(i + 1);
                }
                if (!resp.ok) {
                    const txt = await resp.text();
                    console.error(`❌ ${url} returned ${resp.status}: ${txt}`);
                    throw new Error(`Server ${url} returned ${resp.status}: ${txt}`);
                }
                const data = await resp.json();
                hideLoadingIndicator();
                console.log('✅ Analysis response received:', data);
                
                // Ensure data is valid before rendering
                if (data && data.success) {
                    // Use new comprehensive rendering
                    if (typeof renderComprehensiveAnalysis === 'function') {
                        return renderComprehensiveAnalysis(data);
                    } else {
                        return renderAnalysisFromServer(data);
                    }
                } else if (data && data.summary && data.subjects) {
                    return renderAnalysisFromServer(data);
                } else {
                    console.error('❌ Received invalid data from server');
                    console.error('📊 Data received:', data);
                    console.error('🔍 Expected: data.success=true OR (data.summary AND data.subjects)');
                    return;
                }
            } catch (err) {
                console.error(`❌ Upload to ${url} failed:`, err);
                return tryUpload(i + 1);
            }
        };

        tryUpload();
        return;

    const headers = Object.keys(excelData[0] || {});
    const subjects = headers.length > 1 ? headers.slice(1) : [];
    const subjectAverages = [];

    subjects.forEach((subject) => {
        const marks = excelData.map((row) => {
            const v = row[subject];
            const n = parseFloat(v ?? 0);
            return Number.isFinite(n) ? n : 0;
        });
        subjectAverages.push(average(marks));
    });

    const allMarks = excelData.flatMap((row) =>
        subjects.map((s) => {
            const v = row[s];
            const n = parseFloat(v ?? 0);
            return Number.isFinite(n) ? n : 0;
        })
    );

    const overallAvg = allMarks.length ? average(allMarks).toFixed(2) : "0.00";
    const overallHigh = allMarks.length ? Math.max(...allMarks) : 0;
    const overallLow = allMarks.length ? Math.min(...allMarks) : 0;
    const passCount = allMarks.filter((m) => m >= 35).length;
    const passPercent = allMarks.length
        ? ((passCount / allMarks.length) * 100).toFixed(2)
        : "0.00";

    // ============================
    // Update Result Summary
    // ============================
    const resultDiv = document.querySelector(".resultAnalysis");
    resultDiv.innerHTML = `
        <div class="summary-box">
            <h3>Result Summary</h3>
            <p><b>Overall Average Marks:</b> ${overallAvg}</p>
            <p><b>Highest Marks:</b> ${overallHigh}</p>
            <p><b>Lowest Marks:</b> ${overallLow}</p>
            <p><b>Pass Percentage:</b> ${passPercent}%</p>
        </div>

        <table id="resultTable">
            <thead>
                <tr>
                    <th>Subject</th>
                    <th>Total Marks</th>
                    <th>Average Marks</th>
                    <th>Percentage</th>
                    <th>Grade</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>

        <canvas id="resultChart" width="400" height="200"></canvas>
    `;

    const tbody = document.querySelector("#resultTable tbody");
    subjects.forEach((subj, i) => {
        const percent = subjectAverages[i].toFixed(2);
        const grade =
            percent >= 90
                ? "A+"
                : percent >= 80
                ? "A"
                : percent >= 70
                ? "B"
                : percent >= 60
                ? "C"
                : "F";

        tbody.innerHTML += `
            <tr>
                <td>${subj}</td>
                <td>100</td>
                <td>${percent}</td>
                <td>${percent}%</td>
                <td>${grade}</td>
            </tr>
        `;
    });

    // ============================
    // Chart Section
    // ============================
    const ctxEl = document.getElementById("resultChart");
    if (ctxEl && window.Chart) {
        if (resultChartInstance) {
            try {
                resultChartInstance.destroy();
            } catch (e) {}
            resultChartInstance = null;
        }

        const ctx = ctxEl.getContext("2d");
        resultChartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: subjects,
                datasets: [
                    {
                        label: "Average Marks",
                        data: subjectAverages,
                        backgroundColor: "#0078D7",
                    },
                ],
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                    },
                },
            },
        });
    }
}

// ============================
// Helper Functions
// ============================
function average(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function showLoadingIndicator() {
    const resultDiv = document.querySelector('.resultAnalysis');
    resultDiv.innerHTML = `
        <div class="loading-container" style="text-align: center; padding: 60px; background: white; position: static;">
            <div style="border: 4px solid #f3f3f3; border-top: 4px solid #0078D7; border-radius: 50%; width: 50px; height: 50px; margin: 0 auto;"></div>
            <h3 style="color: #0078D7; margin-top: 20px;">🔄 Processing...</h3>
            <p style="color: #666;">Analyzing your file</p>
        </div>
    `;
}

function hideLoadingIndicator() {
    // Simple function - no dynamic style removal needed
}

function renderAnalysisFromServer(data) {
    if (!data || !data.success) {
        alert('No data received from server or analysis failed');
        console.error('Invalid data:', data);
        return;
    }
    
    // Store analysis data globally for Excel export
    currentAnalysisData = data;
    
    console.log('Rendering comprehensive analysis data:', data);
    
    // Handle different response formats
    let summary, subjects, downloadUrl;
    
    if (data.summary && data.subjects) {
        // New format from updated server
        summary = data.summary;
        subjects = data.subjects;
        downloadUrl = data.download;
    } else if (data.status === 'success') {
        // Old format - convert to new format
        summary = {
            overallAvg: data.averageMarks || 0,
            overallHigh: 0, // not available in old format
            overallLow: 0,  // not available in old format
            passPercent: 0  // not available in old format
        };
        subjects = []; // would need to be calculated from data.data
    } else {
        alert('Invalid response format from server');
        return;
    }

    const resultDiv = document.querySelector('.resultAnalysis');
    
    // Ensure the div is properly displayed without reset conflicts
    resultDiv.style.display = 'block';
    resultDiv.style.position = 'static';
    resultDiv.style.visibility = 'visible';
    resultDiv.style.opacity = '1';
    
    // Build the HTML content step by step to avoid any rendering issues
    const summaryHTML = `
        <div class="analysis-results" style="margin-top: 20px; padding: 20px;">
            <div class="summary-section" style="margin-bottom: 30px;">
                <h3 style="color: #0078D7; margin-bottom: 15px;">📊 Result Summary</h3>
                <div class="summary-cards" style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;">
                    <div class="card" style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; min-width: 150px;">
                        <h4 style="margin: 0; color: #666;">Average Marks</h4>
                        <p style="font-size: 24px; font-weight: bold; color: #0078D7; margin: 10px 0;">${summary.overallAvg || 0}</p>
                    </div>
                    <div class="card" style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; min-width: 150px;">
                        <h4 style="margin: 0; color: #666;">Highest Marks</h4>
                        <p style="font-size: 24px; font-weight: bold; color: #0078D7; margin: 10px 0;">${summary.overallHigh || 0}</p>
                    </div>
                    <div class="card" style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; min-width: 150px;">
                        <h4 style="margin: 0; color: #666;">Lowest Marks</h4>
                        <p style="font-size: 24px; font-weight: bold; color: #0078D7; margin: 10px 0;">${summary.overallLow || 0}</p>
                    </div>
                    <div class="card" style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; min-width: 150px;">
                        <h4 style="margin: 0; color: #666;">Pass Percentage</h4>
                        <p style="font-size: 24px; font-weight: bold; color: #0078D7; margin: 10px 0;">${summary.passPercent || 0}%</p>
                    </div>
                </div>
            </div>

            <div class="table-section" style="margin-bottom: 30px;">
                <h3 style="color: #0078D7; margin-bottom: 15px;">📚 Subject-wise Analysis</h3>
                <table id="resultTable" style="width: 100%; border-collapse: collapse; margin: 0 auto;">
                    <thead>
                        <tr style="background: #0078D7; color: white;">
                            <th style="padding: 12px; border: 1px solid #ddd;">Subject</th>
                            <th style="padding: 12px; border: 1px solid #ddd;">Average Marks</th>
                            <th style="padding: 12px; border: 1px solid #ddd;">Percentage</th>
                            <th style="padding: 12px; border: 1px solid #ddd;">Grade</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>

            <div class="chart-section" style="margin-bottom: 30px;">
                <h3 style="color: #0078D7; margin-bottom: 15px;">📈 Performance Chart</h3>
                <canvas id="resultChart" style="max-width: 100%; height: 400px;"></canvas>
            </div>
            
            ${downloadUrl ? `<div class="download-section" style="text-align: center; margin-top: 20px;">
                <h3 style="color: #0078D7; margin-bottom: 15px;">📥 Download Results</h3>
                <a href="${downloadUrl}" download style="display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Download Excel with Analysis</a>
            </div>` : ''}
        </div>
    `;
    
    resultDiv.innerHTML = summaryHTML;

    // Keep content stable without scrolling or style manipulation
    resultDiv.style.cssText = 'display: block; position: static; visibility: visible; opacity: 1; margin-top: 20px;';
    
    // Ensure content remains visible and prevent any disappearing
    setTimeout(() => {
        resultDiv.style.display = 'block';
        resultDiv.style.visibility = 'visible';
        resultDiv.style.opacity = '1';
    }, 100);

    const tbody = document.querySelector('#resultTable tbody');
    const labels = [];
    const dataPoints = [];
    
    if (subjects && subjects.length > 0) {
        subjects.forEach((s, index) => {
            const avg = Number(s.average || 0).toFixed(2);
            const grade = avg >= 90 ? 'A+' : avg >= 80 ? 'A' : avg >= 70 ? 'B' : avg >= 60 ? 'C' : 'F';
            
            // Add row with inline styles to prevent CSS conflicts
            const row = tbody.insertRow();
            row.style.cssText = 'background: white; position: static; display: table-row;';
            row.innerHTML = `
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${s.subject}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${avg}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${avg}%</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${grade}</td>
            `;
            
            labels.push(s.subject);
            dataPoints.push(Number(s.average || 0));
        });
    }

    // Render chart immediately
    const ctxEl = document.getElementById('resultChart');
    if (ctxEl && window.Chart && labels.length > 0) {
        if (resultChartInstance) {
            try { resultChartInstance.destroy(); } catch(e) {}
        }
        const ctx = ctxEl.getContext('2d');
        resultChartInstance = new Chart(ctx, {
            type: 'bar',
            data: { 
                labels, 
                datasets: [{ 
                    label: 'Average Marks', 
                    data: dataPoints, 
                    backgroundColor: '#0078D7',
                    borderColor: '#005fa3',
                    borderWidth: 2
                }] 
            },
            options: { 
                responsive: true,
                animation: false, // Disable chart animations
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        max: 100
                    }
                },
                plugins: {
                    legend: { display: true },
                    title: { display: true, text: 'Subject Performance Overview' }
                }
            }
        });
    }
}

// ============================
// Save Analysis to Excel
// ============================
function saveAnalysisToExcel() {
    // Use either currentAnalysisData or window.currentAnalysisData
    const data = currentAnalysisData || window.currentAnalysisData;
    
    if (!data || !data.success) {
        alert('No analysis data available. Please analyze a file first.');
        return;
    }
    
    console.log('Downloading analysis data as Excel:', data);
    
    try {
        // Create a new workbook with student-wise results only
        const wb = XLSX.utils.book_new();
        
        // Extract data from analysis
        const { students, academicYear, branch, semester, courseTypes } = data;
        
        // Sheet: Student-wise Results (Complete Details)
        const studentHeaders = ['S.N.', 'USN', 'Name'];
        
        // Add subject headers with CIE/SEE subheaders
        const subHeaderRow = ['', '', '']; // Empty cells for S.N., USN, Name
        
        if (students && students.length > 0 && students[0].subjects) {
            students[0].subjects.forEach((subj, idx) => {
                const courseType = courseTypes?.[idx] || {};
                studentHeaders.push(subj.name); // Course code as main header
                
                if (courseType.isProject) {
                    studentHeaders.push(''); // Empty for colspan effect
                    subHeaderRow.push('SEE');
                    subHeaderRow.push('Total');
                } else {
                    studentHeaders.push(''); // Empty cells for colspan
                    studentHeaders.push(''); 
                    subHeaderRow.push('CIE');
                    subHeaderRow.push('SEE');
                    subHeaderRow.push('Total');
                }
            });
        }
        
        studentHeaders.push('% Marks', 'Result', 'Grade');
        subHeaderRow.push('', '', ''); // Empty for these columns
        
        const studentData = [studentHeaders, subHeaderRow];
        
        // Add student rows
        students.forEach((student, index) => {
            const row = [
                index + 1, // Serial number
                student.usn,
                student.name
            ];
            
            // Add subject marks (CIE, SEE, Total for each subject)
            student.subjects.forEach((subj, idx) => {
                const courseType = courseTypes?.[idx] || {};
                if (courseType.isProject) {
                    row.push(subj.see || 0);
                    row.push(subj.total || 0);
                } else {
                    row.push(subj.cie || 0);
                    row.push(subj.see || 0);
                    row.push(subj.total || 0);
                }
            });
            
            row.push(
                student.percentage + '%' || '0%',
                student.result || '-',
                student.grade || '-'
            );
            
            studentData.push(row);
        });
        
        const wsStudents = XLSX.utils.aoa_to_sheet(studentData);
        
        // Add some styling - merge cells for course headers
        const merge = [];
        let colIndex = 3; // Start after S.N., USN, Name
        if (students && students.length > 0 && students[0].subjects) {
            students[0].subjects.forEach((subj, idx) => {
                const courseType = courseTypes?.[idx] || {};
                const numCols = courseType.isProject ? 2 : 3; // SEE+Total=2 or CIE+SEE+Total=3
                
                // Merge course code header across CIE/SEE/Total columns
                merge.push({
                    s: { r: 0, c: colIndex },
                    e: { r: 0, c: colIndex + numCols - 1 }
                });
                
                colIndex += numCols;
            });
        }
        
        wsStudents['!merges'] = merge;
        
        // Set column widths
        const colWidths = [
            { wch: 5 },  // S.N.
            { wch: 15 }, // USN
            { wch: 25 }  // Name
        ];
        
        if (students && students.length > 0 && students[0].subjects) {
            students[0].subjects.forEach((subj, idx) => {
                const courseType = courseTypes?.[idx] || {};
                if (courseType.isProject) {
                    colWidths.push({ wch: 8 }); // SEE
                    colWidths.push({ wch: 8 }); // Total
                } else {
                    colWidths.push({ wch: 8 }); // CIE
                    colWidths.push({ wch: 8 }); // SEE
                    colWidths.push({ wch: 8 }); // Total
                }
            });
        }
        
        colWidths.push({ wch: 10 }); // % Marks
        colWidths.push({ wch: 10 }); // Result
        colWidths.push({ wch: 8 });  // Grade
        
        wsStudents['!cols'] = colWidths;
        
        XLSX.utils.book_append_sheet(wb, wsStudents, 'Student-wise Results');
        
        // Save to localStorage for permanent display on result analysis page
        const timestamp = Date.now();
        const savedData = {
            id: timestamp,
            students: students,
            courseTypes: courseTypes,
            academicYear: academicYear,
            branch: branch,
            semester: semester,
            totalStudents: students.length,
            createdAt: new Date().toLocaleString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            })
        };
        
        // Get existing saved results
        let savedResults = JSON.parse(localStorage.getItem('savedStudentResults') || '[]');
        
        // Ensure it's an array
        if (!Array.isArray(savedResults)) {
            savedResults = [];
        }
        
        // Add new result to the list
        savedResults.push(savedData);
        
        // Save back to localStorage
        localStorage.setItem('savedStudentResults', JSON.stringify(savedResults));
        
        // Display the saved results list
        displaySavedResultsList();
        
        console.log('✅ Analysis saved to result analysis page');
        
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #28a745; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); z-index: 10000; font-weight: bold;';
        successMsg.innerHTML = `✅ Student-wise results saved successfully!`;
        document.body.appendChild(successMsg);
        
        setTimeout(() => {
            successMsg.remove();
        }, 3000);
        
    } catch (error) {
        console.error('Error saving analysis:', error);
        alert('Error saving analysis: ' + error.message);
    }
}

// ============================
// Display Saved Results List
// ============================
function displaySavedResultsList() {
    // Get saved results from localStorage
    let savedResults = localStorage.getItem('savedStudentResults');
    
    // Handle old format (single object) or invalid data
    try {
        savedResults = JSON.parse(savedResults);
        
        // If it's an object (old format), convert to array
        if (savedResults && !Array.isArray(savedResults)) {
            // Old format was a single object, wrap it in an array
            savedResults = [savedResults];
            // Update localStorage to new format
            localStorage.setItem('savedStudentResults', JSON.stringify(savedResults));
        }
        
        // If null or undefined, initialize as empty array
        if (!savedResults) {
            savedResults = [];
        }
    } catch (error) {
        console.error('Error parsing saved results:', error);
        savedResults = [];
    }
    
    if (savedResults.length === 0) {
        return;
    }
    
    // Remove existing saved results section if any
    const existingSection = document.querySelector('#savedResultsSection');
    if (existingSection) {
        existingSection.remove();
    }
    
    const resultDiv = document.querySelector('.resultAnalysis');
    
    // Build the saved results list HTML
    let html = `
        <div id="savedResultsSection" style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #0078D7; margin-bottom: 20px; text-align: center;">📚 Saved Student Results</h3>
            <div style="background: white; border-radius: 8px; padding: 15px;">`;
    
    // Display each saved result as a line item
    savedResults.forEach((result, index) => {
        const resultNumber = index + 1;
        html += `
            <div style="padding: 15px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 6px; background: white; display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: #0078D7; font-size: 16px; margin-bottom: 5px;">
                        ${resultNumber}. ${result.academicYear || 'N/A'} | ${result.branch || 'N/A'} | Semester ${result.semester || 'N/A'}
                    </div>
                    <div style="font-size: 14px; color: #666;">
                        Total Students: ${result.totalStudents} | Created: ${result.createdAt}
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="viewSavedResult(${result.id})" style="padding: 8px 16px; background: #0078D7; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        VIEW
                    </button>
                    <button onclick="downloadSavedResult(${result.id})" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        DOWNLOAD
                    </button>
                    <button onclick="deleteSavedResult(${result.id})" style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        DELETE
                    </button>
                </div>
            </div>`;
    });
    
    html += `
            </div>
        </div>`;
    
    // Append to the result div
    resultDiv.insertAdjacentHTML('beforeend', html);
}

// ============================
// View Saved Result
// ============================
function viewSavedResult(id) {
    let savedResults = JSON.parse(localStorage.getItem('savedStudentResults') || '[]');
    
    // Ensure it's an array
    if (!Array.isArray(savedResults)) {
        savedResults = [];
    }
    
    const result = savedResults.find(r => r.id === id);
    
    if (!result) {
        alert('Result not found!');
        return;
    }
    
    // Display the student-wise results table
    displayStudentWiseResults(result.students, result.courseTypes);
    
    // Scroll to the table
    setTimeout(() => {
        document.querySelector('#studentWiseSection')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

// ============================
// Download Saved Result
// ============================
function downloadSavedResult(id) {
    let savedResults = JSON.parse(localStorage.getItem('savedStudentResults') || '[]');
    
    // Ensure it's an array
    if (!Array.isArray(savedResults)) {
        savedResults = [];
    }
    
    const result = savedResults.find(r => r.id === id);
    
    if (!result) {
        alert('Result not found!');
        return;
    }
    
    try {
        // Create Excel workbook
        const wb = XLSX.utils.book_new();
        const { students, courseTypes, academicYear, branch, semester } = result;
        
        // Create student-wise results sheet
        const studentHeaders = ['S.N.', 'USN', 'Name'];
        const subHeaderRow = ['', '', ''];
        
        if (students && students.length > 0 && students[0].subjects) {
            students[0].subjects.forEach((subj, idx) => {
                const courseType = courseTypes?.[idx] || {};
                studentHeaders.push(subj.name);
                
                if (courseType.isProject) {
                    studentHeaders.push('');
                    subHeaderRow.push('SEE');
                    subHeaderRow.push('Total');
                } else {
                    studentHeaders.push('');
                    studentHeaders.push('');
                    subHeaderRow.push('CIE');
                    subHeaderRow.push('SEE');
                    subHeaderRow.push('Total');
                }
            });
        }
        
        studentHeaders.push('% Marks', 'Result', 'Grade');
        subHeaderRow.push('', '', '');
        
        const studentData = [studentHeaders, subHeaderRow];
        
        students.forEach((student, index) => {
            const row = [index + 1, student.usn, student.name];
            
            student.subjects.forEach((subj, idx) => {
                const courseType = courseTypes?.[idx] || {};
                if (courseType.isProject) {
                    row.push(subj.see || 0);
                    row.push(subj.total || 0);
                } else {
                    row.push(subj.cie || 0);
                    row.push(subj.see || 0);
                    row.push(subj.total || 0);
                }
            });
            
            row.push(student.percentage + '%', student.result, student.grade);
            studentData.push(row);
        });
        
        const ws = XLSX.utils.aoa_to_sheet(studentData);
        XLSX.utils.book_append_sheet(wb, ws, 'Student-wise Results');
        
        // Download
        const filename = `Analysis_${academicYear}_${branch}_Sem${semester}_${id}.xlsx`;
        XLSX.writeFile(wb, filename);
        
        console.log('✅ Downloaded:', filename);
    } catch (error) {
        console.error('Error downloading result:', error);
        alert('Error downloading: ' + error.message);
    }
}

// ============================
// Delete Saved Result
// ============================
function deleteSavedResult(id) {
    if (!confirm('Are you sure you want to delete this saved result?')) {
        return;
    }
    
    let savedResults = JSON.parse(localStorage.getItem('savedStudentResults') || '[]');
    
    // Ensure it's an array
    if (!Array.isArray(savedResults)) {
        savedResults = [];
    }
    savedResults = savedResults.filter(r => r.id !== id);
    
    localStorage.setItem('savedStudentResults', JSON.stringify(savedResults));
    
    // Refresh the list
    displaySavedResultsList();
    
    // Remove the student-wise table if it was showing this result
    const studentSection = document.querySelector('#studentWiseSection');
    if (studentSection) {
        studentSection.remove();
    }
    
    console.log('✅ Deleted result:', id);
}

// ============================
// Display Student-wise Results on Page
// ============================
function displayStudentWiseResults(students, courseTypes) {
    if (!students || students.length === 0) {
        return;
    }
    
    // Remove any existing student-wise results section
    const existingSection = document.querySelector('#studentWiseSection');
    if (existingSection) {
        existingSection.remove();
    }
    
    // Create a new section for student-wise results
    const resultDiv = document.querySelector('.resultAnalysis');
    
    // Build the table HTML
    let html = `
        <div id="studentWiseSection" style="margin-top: 40px; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: #0078D7; margin: 0;">📋 Student-wise Results</h3>
                <button onclick="closeStudentResults()" style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    CLOSE
                </button>
            </div>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background: #0078D7; color: white;">
                            <th rowspan="2" style="padding: 10px; border: 1px solid #ddd; text-align: center;">S.N.</th>
                            <th rowspan="2" style="padding: 10px; border: 1px solid #ddd; text-align: center;">USN</th>
                            <th rowspan="2" style="padding: 10px; border: 1px solid #ddd; text-align: center;">Name</th>`;
    
    // Add subject headers
    if (students[0].subjects) {
        students[0].subjects.forEach((subj, idx) => {
            const courseType = courseTypes?.[idx] || {};
            const colspan = courseType.isProject ? 2 : 3;
            html += `<th colspan="${colspan}" style="padding: 10px; border: 1px solid #ddd; text-align: center;">${subj.name}</th>`;
        });
    }
    
    html += `
                            <th rowspan="2" style="padding: 10px; border: 1px solid #ddd; text-align: center;">% Marks</th>
                            <th rowspan="2" style="padding: 10px; border: 1px solid #ddd; text-align: center;">Result</th>
                            <th rowspan="2" style="padding: 10px; border: 1px solid #ddd; text-align: center;">Grade</th>
                        </tr>
                        <tr style="background: #0078D7; color: white;">`;
    
    // Add CIE/SEE/Total subheaders
    if (students[0].subjects) {
        students[0].subjects.forEach((subj, idx) => {
            const courseType = courseTypes?.[idx] || {};
            if (courseType.isProject) {
                html += `
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 12px;">SEE</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 12px;">Total</th>`;
            } else {
                html += `
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 12px;">CIE</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 12px;">SEE</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 12px;">Total</th>`;
            }
        });
    }
    
    html += `
                        </tr>
                    </thead>
                    <tbody>`;
    
    // Add student rows
    students.forEach((student, index) => {
        // Determine row color based on rank or result
        let rowColor = 'white';
        if (student.rank === 1) rowColor = '#FFD700'; // Gold
        else if (student.rank === 2) rowColor = '#C0C0C0'; // Silver
        else if (student.rank === 3) rowColor = '#8B4513'; // Brown
        else if (student.result === 'FAIL') rowColor = '#ffcccc'; // Light red
        
        html += `
            <tr style="background: ${rowColor};">
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${student.usn}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: left;">${student.name}</td>`;
        
        // Add subject marks
        student.subjects.forEach((subj, idx) => {
            const courseType = courseTypes?.[idx] || {};
            if (courseType.isProject) {
                const seeColor = (subj.see || 0) < 40 ? 'red' : 'black';
                html += `
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${seeColor};">${subj.see || 0}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${subj.total || 0}</td>`;
            } else {
                const cieColor = (subj.cie || 0) < 20 ? 'red' : 'black';
                const seeColor = (subj.see || 0) < 20 ? 'red' : 'black';
                html += `
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${cieColor};">${subj.cie || 0}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${seeColor};">${subj.see || 0}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${subj.total || 0}</td>`;
            }
        });
        
        const resultColor = student.result === 'FAIL' ? 'red' : 'green';
        html += `
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${student.percentage}%</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ${resultColor};">${student.result}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${student.grade}</td>
            </tr>`;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>`;
    
    // Append to the result div
    resultDiv.insertAdjacentHTML('beforeend', html);
}

// ============================
// Load Saved Student Results from localStorage
// ============================
function loadSavedStudentResults() {
    // Load and display the saved results list
    displaySavedResultsList();
}

// ============================
// Close Student Results Table
// ============================
function closeStudentResults() {
    const studentSection = document.querySelector('#studentWiseSection');
    if (studentSection) {
        studentSection.remove();
    }
}