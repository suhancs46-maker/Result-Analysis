// Comprehensive Analysis Rendering Function
function renderComprehensiveAnalysis(data) {
    if (!data || !data.success) {
        alert('Invalid analysis data received');
        return;
    }

    const resultDiv = document.querySelector('.resultAnalysis');
    resultDiv.style.display = 'block';
    resultDiv.style.visibility = 'visible';
    resultDiv.style.opacity = '1';

    const { classStats, subjectStats, students, subjectNames, academicYear, branch, semester } = data;

    let html = `
        <div style="padding: 20px; background: white;">
            <h2 style="color: #0078D7; text-align: center;">📊 Comprehensive Result Analysis</h2>
            
            <!-- Header Information from Excel -->
            <div style="margin: 20px 0; padding: 15px; background: #fff3cd; border-left: 5px solid #ffc107; border-radius: 8px;">
                <h3 style="color: #856404; margin-top: 0;">📋 Template Information</h3>
                <p style="margin: 5px 0;"><strong>Academic Year:</strong> ${academicYear || 'Not specified'}</p>
                <p style="margin: 5px 0;"><strong>Branch:</strong> ${branch || 'Not specified'}</p>
                <p style="margin: 5px 0;"><strong>Semester:</strong> ${semester || 'Not specified'}</p>
            </div>
            
            <!-- Class Statistics -->
            <div style="margin: 20px 0; padding: 15px; background: #f0f8ff; border-radius: 8px;">
                <h3 style="color: #0078D7;">Class Overview</h3>
                <p><strong>Total Students:</strong> ${classStats.totalStudents}</p>
                <p><strong>Passed:</strong> <span style="color: green;">${classStats.passed}</span></p>
                <p><strong>Failed:</strong> <span style="color: red;">${classStats.failed}</span></p>
                <p><strong>Pass Percentage:</strong> ${classStats.passPercentage}%</p>
            </div>

            <!-- Graphical Representations -->
            <h3 style="color: #0078D7; margin-top: 2rem; text-align: center;">📈 Graphical Analysis</h3>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 20px; margin: 20px 0;">
                <!-- Pass/Fail Distribution Chart -->
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h4 style="color: #0078D7; text-align: center;">Pass/Fail Distribution</h4>
                    <canvas id="passFailChart" width="450" height="450"></canvas>
                </div>

                <!-- Grade Distribution Chart -->
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h4 style="color: #0078D7; text-align: center;">Grade Distribution</h4>
                    <canvas id="gradeChart" width="450" height="450"></canvas>
                </div>

                <!-- Subject-wise Pass Percentage Chart -->
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h4 style="color: #0078D7; text-align: center;">Subject-wise Pass %</h4>
                    <canvas id="subjectPassChart" width="450" height="450"></canvas>
                </div>

                <!-- Subject-wise Average Marks Comparison -->
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h4 style="color: #0078D7; text-align: center;">CIE vs SEE Average</h4>
                    <canvas id="avgMarksChart" width="450" height="450"></canvas>
                </div>
            </div>

            <!-- Subject-wise Statistics Table -->
            <h3 style="color: #0078D7; margin-top: 30px;">📚 Subject-wise Indicators</h3>
            <div style="overflow-x: auto; margin-bottom: 1rem;">
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0 1rem 0; font-size: 14px; border-radius: 8px; overflow: hidden; color: #000000; border: 2px solid #000000;">
                    <thead>
                        <!-- Course Code Row (Dark Background) -->
                        <tr style="background: #2c3e50; color: #000000;">
                            <th style="padding: 10px; border: 1px solid #000000; font-weight: bold; color: #000000; background: #e0e0e0;">Indicators / Course Code</th>
    `;

    // Add course codes in the first row - one column per subject
    subjectStats.forEach(stat => {
        const courseCode = stat.courseCode || stat.subject;
        html += `
                            <th style="padding: 10px; border: 1px solid #000000; text-align: center; font-weight: bold; color: #000000; background: #e0e0e0;">${courseCode}</th>
        `;
    });

    html += `
                        </tr>
                    </thead>
                    <tbody>
    `;

    // Add subject stats rows - now we need to show data for each subject separately
    // First, let's create rows for each indicator
    const indicators = ['Appeared', 'Passed', 'Failed', 'Pass %', 'FCD', 'FC', 'SC', 'Max CIE', 'Min CIE', 'Avg CIE', 'Max SEE', 'Min SEE', 'Avg SEE'];
    
    indicators.forEach(indicator => {
        html += `
            <tr style="background: #f9f9f9;">
                <td style="padding: 8px; border: 1px solid #000000; font-weight: bold; color: #000000;">${indicator}</td>
        `;
        
        subjectStats.forEach(stat => {
            let value = '';
            switch(indicator) {
                case 'Appeared': value = stat.appeared || 0; break;
                case 'Passed': value = `<span style="color: green;">${stat.passed || 0}</span>`; break;
                case 'Failed': value = `<span style="color: red;">${stat.failed || 0}</span>`; break;
                case 'Pass %': value = (stat.passPercent || 0) + '%'; break;
                case 'FCD': value = stat.fcd || 0; break;
                case 'FC': value = stat.fc || 0; break;
                case 'SC': value = stat.sc || 0; break;
                case 'Max CIE': value = stat.maxCIE || 0; break;
                case 'Min CIE': value = stat.minCIE || 0; break;
                case 'Avg CIE': value = stat.avgCIE || 0; break;
                case 'Max SEE': value = stat.maxSEE || 0; break;
                case 'Min SEE': value = stat.minSEE || 0; break;
                case 'Avg SEE': value = stat.avgSEE || 0; break;
            }
            
            html += `
                <td style="padding: 8px; border: 1px solid #000000; text-align: center; color: #000000;">${value}</td>
            `;
        });
        
        html += `
            </tr>
        `;
    });

    html += `
                    </tbody>
                </table>
            </div>

            <!-- Student Results Table -->
            <h3 style="color: #0078D7; margin-top: 1rem;">👨‍🎓 Student-wise Results</h3>
            <div style="overflow-x: auto; margin-top: 1rem;">
                <table style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 13px; border-radius: 2px; overflow: hidden; color: #000000;">
                    <thead>
                        <tr style="background: #000000; color: black;">
                            <th style="padding: 8px; border: 1px solid black;">S.N.</th>
                            <th style="padding: 8px; border: 1px solid black;">USN</th>
                            <th style="padding: 8px; border: 1px solid black;">Name</th>
                            <th style="padding: 8px; border: 1px solid black;">% Marks</th>
                            <th style="padding: 8px; border: 1px solid black;">Result</th>
                            <th style="padding: 8px; border: 1px solid black;">Grade</th>
    `;

    // Add subject columns (CIE and SEE for each)
    const courseCodes = data.courseCodes || subjectNames;
    const courseTypes = data.courseTypes || [];
    
    courseCodes.forEach((code, idx) => {
        const displayText = code !== subjectNames[idx] ? `${code}<br/><small>${subjectNames[idx]}</small>` : code;
        const isProject = courseTypes[idx]?.isProject || false;
        const colspan = isProject ? "1" : "2"; // Project courses only have SEE column
        
        html += `
                            <th colspan="${colspan}" style="padding: 8px; border: 1px solid black; font-size: 12px;">${displayText}</th>
        `;
    });

    html += `
                        </tr>
                        <tr style="background: #f0f0f0; color: #000000;">
                            <th colspan="6" style="background: #f0f0f0;"></th>
    `;

    // Add CIE/SEE headers
    subjectNames.forEach((name, idx) => {
        const isProject = courseTypes[idx]?.isProject || false;
        
        if (isProject) {
            // Project courses only have SEE
            html += `
                            <th style="padding: 4px; border: 1px solid black; font-size: 11px; font-weight: bold; color: #000000;">SEE</th>
            `;
        } else {
            // Regular courses have both CIE and SEE
            html += `
                            <th style="padding: 4px; border: 1px solid black; font-size: 11px; font-weight: bold; color: #000000;">CIE</th>
                            <th style="padding: 4px; border: 1px solid black; font-size: 11px; font-weight: bold; color: #000000;">SEE</th>
            `;
        }
    });

    html += `
                        </tr>
                    </thead>
                    <tbody>
    `;

    // Add student rows
    students.forEach((student, index) => {
        // Determine row background color based on rank and result
        let rowColor = 'white'; // Default
        
        // Rank colors take priority for top 3
        if (student.rank === 1) {
            rowColor = '#FFD700'; // Gold for 1st
        } else if (student.rank === 2) {
            rowColor = '#C0C0C0'; // Silver for 2nd
        } else if (student.rank === 3) {
            rowColor = '#8B4513'; // Brown for 3rd (changed from bronze)
        } else if (student.result === 'FAIL') {
            rowColor = '#ffcccc'; // Light red for failed students (only if not in top 3)
        }
        
        const resultColor = student.result === 'PASS' ? 'green' : 'red';
        const serialNumber = student.sn || (index + 1);
        const rankLabel = student.rankLabel || serialNumber;
        
        html += `
            <tr style="background: ${rowColor};">
                <td style="padding: 6px; border: 1px solid black; text-align: center; font-weight: bold;">${rankLabel}</td>
                <td style="padding: 6px; border: 1px solid black;">${student.usn}</td>
                <td style="padding: 6px; border: 1px solid black; font-weight: ${student.rank <= 3 ? 'bold' : 'normal'};">${student.name}</td>
                <td style="padding: 6px; border: 1px solid black; text-align: center;">${student.percentage}%</td>
                <td style="padding: 6px; border: 1px solid black; text-align: center; color: ${resultColor}; font-weight: bold;">${student.result}</td>
                <td style="padding: 6px; border: 1px solid black; text-align: center; font-weight: bold;">${student.grade}</td>
        `;

        // Add marks for each subject
        student.subjects.forEach((subj, subjIdx) => {
            const isProject = courseTypes[subjIdx]?.isProject || false;
            
            if (isProject) {
                // Project courses only show SEE
                const seeColor = subj.see < 40 ? 'red' : 'black';
                html += `
                <td style="padding: 6px; border: 1px solid black; text-align: center; color: ${seeColor};">${subj.see}</td>
                `;
            } else {
                // Regular courses show both CIE and SEE
                const cieColor = subj.cie < 20 ? 'red' : 'black';
                const seeColor = subj.see < 18 ? 'red' : 'black';
                html += `
                <td style="padding: 6px; border: 1px solid black; text-align: center; color: ${cieColor};">${subj.cie === 'N/A' ? 'N/A' : subj.cie}</td>
                <td style="padding: 6px; border: 1px solid black; text-align: center; color: ${seeColor};">${subj.see}</td>
                `;
            }
        });

        html += `
            </tr>
        `;
    });

    html += `
                    </tbody>
                </table>
            </div>

            <!-- Legend -->
            <div style="margin-top: 1rem; padding: 15px; background: #f0f0f0; border-radius: 8px;">
                <h4 style="color: #0078D7;">Legend:</h4>
                <p><strong>CIE:</strong> Continuous Internal Evaluation (Min: 20 marks)</p>
                <p><strong>SEE:</strong> Semester End Examination (Min: 18 marks)</p>
                <p><strong>FCD:</strong> First Class with Distinction (≥70%)</p>
                <p><strong>FC:</strong> First Class (60-69%)</p>
                <p><strong>SC:</strong> Second Class (50-59%)</p>
                <p style="color: green;">● Green rows = PASS</p>
                <p style="color: red;">● Red rows = FAIL</p>
                <p style="color: red;">● Red marks = Below minimum (CIE<20 or SEE<18)</p>
            </div>
        </div>
    `;

    resultDiv.innerHTML = html;

    // Create Charts after DOM is updated
    setTimeout(() => {
        createCharts(data);
    }, 100);
}

// Function to create all charts
function createCharts(data) {
    const { classStats, subjectStats, students } = data;

    // 1. Pass/Fail Pie Chart with Top 3 Rankers
    const passFailCtx = document.getElementById('passFailChart');
    if (passFailCtx) {
        // Count students by category
        const firstRank = students.filter(s => s.rank === 1).length;
        const secondRank = students.filter(s => s.rank === 2).length;
        const thirdRank = students.filter(s => s.rank === 3).length;
        const otherPassed = classStats.passed - firstRank - secondRank - thirdRank;
        const failed = classStats.failed;

        new Chart(passFailCtx, {
            type: 'pie',
            data: {
                labels: ['🥇 1st Rank', '🥈 2nd Rank', '🥉 3rd Rank', 'Other Passed', 'Failed'],
                datasets: [{
                    data: [firstRank, secondRank, thirdRank, otherPassed, failed],
                    backgroundColor: ['#FFD700', '#C0C0C0', '#CD7F32', '#28a745', '#dc3545'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { size: 13 },
                            padding: 12
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = classStats.totalStudents;
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // 2. Grade Distribution Bar Chart
    // 2. Grade Distribution Bar Chart
    const gradeCtx = document.getElementById('gradeChart');
    if (gradeCtx) {
        const gradeCounts = {
            FCD: 0,
            FC: 0,
            SC: 0,
            FAIL: 0
        };

        students.forEach(student => {
            if (gradeCounts.hasOwnProperty(student.grade)) {
                gradeCounts[student.grade]++;
            }
        });

        new Chart(gradeCtx, {
            type: 'bar',
            data: {
                labels: ['FCD (≥70%)', 'FC (60-69%)', 'SC (50-59%)', 'FAIL (<50%)'],
                datasets: [{
                    label: 'Number of Students',
                    data: [gradeCounts.FCD, gradeCounts.FC, gradeCounts.SC, gradeCounts.FAIL],
                    backgroundColor: ['#28a745', '#17a2b8', '#ffc107', '#dc3545'],
                    borderWidth: 1,
                    borderColor: '#333'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    // 3. Subject-wise Pass Percentage Bar Chart
    const subjectPassCtx = document.getElementById('subjectPassChart');
    if (subjectPassCtx) {
        const labels = subjectStats.map(stat => stat.courseCode || stat.subject);
        const passPercentages = subjectStats.map(stat => stat.passPercentage);

        new Chart(subjectPassCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pass %',
                    data: passPercentages,
                    backgroundColor: passPercentages.map(p => p >= 75 ? '#28a745' : p >= 50 ? '#ffc107' : '#dc3545'),
                    borderWidth: 1,
                    borderColor: '#333'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: { size: 11 },
                            padding: 8
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            font: { size: 10 }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            font: { size: 10 },
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    // 4. Subject-wise Average Marks (CIE vs SEE) Grouped Bar Chart
    const avgMarksCtx = document.getElementById('avgMarksChart');
    if (avgMarksCtx) {
        const labels = subjectStats.map(stat => stat.courseCode || stat.subject);
        const avgCIE = subjectStats.map(stat => parseFloat(stat.avgCIE));
        const avgSEE = subjectStats.map(stat => parseFloat(stat.avgSEE));

        new Chart(avgMarksCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Avg CIE',
                        data: avgCIE,
                        backgroundColor: '#0078D7',
                        borderWidth: 1,
                        borderColor: '#005a9e'
                    },
                    {
                        label: 'Avg SEE',
                        data: avgSEE,
                        backgroundColor: '#ff6b6b',
                        borderWidth: 1,
                        borderColor: '#d63447'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: { size: 11 },
                            padding: 8
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            font: { size: 10 }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 50,
                        ticks: {
                            font: { size: 10 },
                            stepSize: 10
                        }
                    }
                }
            }
        });
    }
}
