// XLSX library for Excel generation
import * as XLSX from "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm";

console.log('✅ Application initialized - No Firebase required');

// ==================== WAIT FOR DOM THEN INITIALIZE ====================
document.addEventListener('DOMContentLoaded', function () {
  console.log('🚀 DOM Content Loaded - Initializing...');
  
  initializeCourseManagement();
  initializeStudentManagement();
  
  console.log('✅ All modules initialized');
});

// ==================== COURSE MANAGEMENT ====================
function initializeCourseManagement() {
  const addBtn = document.getElementsByClassName('addBtn')[0];
  let tableRoot = document.getElementsByClassName('addCourseTable')[0];
  
  if (!addBtn || !tableRoot) {
    console.warn('⚠️ Course table elements not found');
    return;
  }
  
  let tableEl = tableRoot.tagName.toLowerCase() === 'table' ? tableRoot : tableRoot.querySelector('table');
  let tbody = tableEl.tBodies[0] || tableEl.createTBody();
  let count = tbody.rows.length;

  console.log('📚 Initializing Course Management...');

  addBtn.addEventListener('click', function () {
    console.log('➕ Adding new course row');
    const row = tbody.insertRow();
    count++;

      const c0 = row.insertCell(); c0.textContent = count;
      const c1 = row.insertCell(); c1.innerHTML = `<input type="text" id="courseCode${count}" name="courseCode${count}" placeholder="Enter Course Code" class="course-code" autocomplete="off">`;
      const c2 = row.insertCell(); c2.innerHTML = `<input type="text" id="courseTitle${count}" name="courseTitle${count}" placeholder="Enter Course Title" class="course-title" autocomplete="off">`;
      const c3 = row.insertCell(); c3.innerHTML = `<input type="text" id="staffIncharge${count}" name="staffIncharge${count}" placeholder="Enter Staff Incharge" class="staff-incharge" autocomplete="off">`;
      const c4 = row.insertCell(); c4.innerHTML = `
        <select id="courseType${count}" name="courseType${count}" class="course-type">
          <option value="">Select Course Type</option>
          <option>Theory</option>
          <option>Lab</option>
          <option>Project</option>
        </select>`;
      const c5 = row.insertCell(); c5.innerHTML = `<input type="number" id="maxCIE${count}" name="maxCIE${count}" placeholder="Enter MAX CIE" class="max-cie" autocomplete="off">`;
      const c6 = row.insertCell(); c6.innerHTML = `<input type="number" id="minCIE${count}" name="minCIE${count}" placeholder="Enter MIN CIE" class="min-cie" autocomplete="off">`;
      const c7 = row.insertCell(); c7.innerHTML = `<input type="number" id="maxSEE${count}" name="maxSEE${count}" placeholder="Enter MAX SEE" class="max-see" autocomplete="off">`;
      const c8 = row.insertCell(); c8.innerHTML = `<input type="number" id="minSEE${count}" name="minSEE${count}" placeholder="Enter MIN SEE" class="min-see" autocomplete="off">`;
      const c9 = row.insertCell(); c9.innerHTML = `<input type="number" id="totalMax${count}" name="totalMax${count}" placeholder="Enter Total MAX" class="total-max" autocomplete="off">`;
      const c10 = row.insertCell(); c10.innerHTML = `<input type="number" id="totalMin${count}" name="totalMin${count}" placeholder="Enter Total MIN (Pass)" class="total-min" autocomplete="off">`;
      const c11 = row.insertCell();
      c11.innerHTML = `
        <button type="button" class="save-course-btn" style="background: #28a745; color: white; padding: 5px 10px; margin-right: 5px; border: none; border-radius: 4px; cursor: pointer;">💾 Save</button>
        <button type="button" class="delete-btn" style="background: #dc3545; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer;">🗑️ Delete</button>
      `;

    // Mark course as saved (local only)
    c11.querySelector('.save-course-btn').addEventListener('click', function () {
      console.log('💾 Saving course locally...');
      
      const courseData = {
        courseCode: row.querySelector('.course-code').value.trim(),
        courseTitle: row.querySelector('.course-title').value.trim(),
        staffIncharge: row.querySelector('.staff-incharge').value.trim(),
        courseType: row.querySelector('.course-type').value,
        maxCIE: row.querySelector('.max-cie').value,
        minCIE: row.querySelector('.min-cie').value,
        maxSEE: row.querySelector('.max-see').value,
        minSEE: row.querySelector('.min-see').value,
        totalMax: row.querySelector('.total-max').value,
        totalMin: row.querySelector('.total-min').value
      };

      console.log('📝 Course Data:', courseData);

      if (!courseData.courseCode || !courseData.courseTitle) {
        alert('❌ Please fill in Course Code and Course Title');
        return;
      }

      // Mark as saved
      alert('✅ Course saved locally!');
      row.style.background = '#e8f5e9';
      this.textContent = '✓ Saved';
      this.disabled = true;
      this.style.background = '#6c757d';
      
      // Make inputs read-only
      row.querySelectorAll('input, select').forEach(input => input.readOnly = true);
    });

      c11.querySelector('.delete-btn').addEventListener('click', function () {
        row.remove();
        refreshSerials();
      });
    });

  function refreshSerials() {
    Array.from(tbody.rows).forEach((r, idx) => r.cells[0].textContent = idx + 1);
    count = tbody.rows.length;
  }
}

// ==================== STUDENT MANAGEMENT ====================
function initializeStudentManagement() {
  const addBtn = document.getElementById('addStudentBtn') || document.querySelector('.addStudentBtn button');
  const saveBtn = document.getElementById('saveTemplateBtn') || document.querySelector('.saveTemplate button');
  const tableEl = document.querySelector('.addStudentTable table');

  if (!tableEl || !addBtn || !saveBtn) {
    console.warn('⚠️ Student table elements not found');
    return;
  }

  const tableBody = tableEl.tBodies[0] || tableEl.createTBody();
  let count = tableBody.rows.length;

  console.log('👨‍🎓 Initializing Student Management...');

  addBtn.addEventListener('click', function() {
    console.log('➕ Adding new student row');
    const row = tableBody.insertRow();
    count++;

    const c0 = row.insertCell(); c0.textContent = count;
    const c1 = row.insertCell(); c1.innerHTML = `<input type="text" id="studentUSN${count}" name="studentUSN${count}" placeholder="Enter your USN" class="student-usn" style="width: 92%;" autocomplete="off">`;
    const c2 = row.insertCell(); c2.innerHTML = `<input type="text" id="studentName${count}" name="studentName${count}" placeholder="Enter Student Name" class="student-name" style="width: 95%;" autocomplete="off">`;
    const c3 = row.insertCell(); 
    c3.innerHTML = `
      <button type="button" class="save-student-btn" style="background: #28a745; color: white; padding: 5px 8px; margin-right: 5px; border: none; border-radius: 4px; cursor: pointer;">💾</button>
      <button type="button" class="delete-btn" style="background: #dc3545; color: white; padding: 5px 8px; border: none; border-radius: 4px; cursor: pointer;">🗑️</button>
    `;

    // Mark student as saved (local only)
    c3.querySelector('.save-student-btn').addEventListener('click', function() {
      console.log('💾 Saving student locally...');
      
      const studentData = {
        usn: row.querySelector('.student-usn').value.trim(),
        name: row.querySelector('.student-name').value.trim()
      };

      console.log('📝 Student Data:', studentData);

      if (!studentData.usn || !studentData.name) {
        alert('❌ Please fill USN and Name');
        return;
      }

      // Mark as saved
      alert('✅ Student saved locally!');
      this.textContent = '✓';
      this.disabled = true;
      this.style.background = '#6c757d';
      row.querySelector('.student-usn').readOnly = true;
      row.querySelector('.student-name').readOnly = true;
      row.style.background = '#e8f5e9';
    });

    c3.querySelector('.delete-btn').addEventListener('click', function() {
      row.remove();
      refreshSerials();
    });
  });

  function refreshSerials() {
    Array.from(tableBody.rows).forEach((r, idx) => {
      if (r.cells && r.cells[0]) r.cells[0].textContent = idx + 1;
    });
    count = tableBody.rows.length;
  }

  // Attach delete handlers for existing buttons
  Array.from(tableBody.rows).forEach(r => {
      const del = r.querySelector('.delete-btn') || r.querySelector('#actiondeletebtn2');
      if (del && !del.dataset.bound) {
        del.addEventListener('click', function() { 
          if (confirm('Delete this student?')) {
            r.remove(); 
            refreshSerials(); 
          }
        });
        del.dataset.bound = '1';
      }
    });

  // ==================== SAVE TEMPLATE TO FIREBASE (EXCEL + DATABASE) ====================
  saveBtn.addEventListener('click', async function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('💾 Save Template button clicked');

    const academicYear = document.getElementById('academicYear')?.value.trim() || '';
    const branch = document.getElementById('branch')?.value.trim() || '';
    const semester = document.getElementById('semester')?.value || '';

    console.log('📋 Form Values:', { academicYear, branch, semester });

    if (!academicYear || !branch || !semester) {
      alert(`❌ Please fill all required fields:\n\n- Academic Year: ${academicYear || 'MISSING'}\n- Branch: ${branch || 'MISSING'}\n- Semester: ${semester || 'MISSING'}`);
      return;
    }

    // Collect students
    const students = [];
    Array.from(tableBody.rows).forEach(r => {
      const inputs = r.querySelectorAll('input');
      const cells = r.querySelectorAll('td');
      const usn = inputs[0]?.value.trim() || cells[1]?.textContent.trim() || '';
      const name = inputs[1]?.value.trim() || cells[2]?.textContent.trim() || '';
      if (usn && name) students.push({ usn, name });
    });

    console.log('👨‍🎓 Collected students:', students.length);

    // Collect courses
    const courseTableBody = document.querySelector('.addCourseTable table tbody');
    const courses = [];
      if (courseTableBody) {
        Array.from(courseTableBody.rows).forEach(r => {
          const inputs = r.querySelectorAll('input');
          const selects = r.querySelectorAll('select');
          const cells = r.querySelectorAll('td');
          
          const courseCode = inputs[0]?.value.trim() || cells[1]?.textContent.trim() || '';
          const courseTitle = inputs[1]?.value.trim() || cells[2]?.textContent.trim() || '';
          
          if (courseCode && courseTitle) {
            courses.push({
              courseCode,
              courseTitle,
              staffIncharge: inputs[2]?.value.trim() || cells[3]?.textContent.trim() || '',
              courseType: selects[0]?.value || cells[4]?.textContent.trim() || '',
              maxCIE: inputs[3]?.value || cells[5]?.textContent.trim() || '',
              minCIE: inputs[4]?.value || cells[6]?.textContent.trim() || '',
              maxSEE: inputs[5]?.value || cells[7]?.textContent.trim() || '',
              minSEE: inputs[6]?.value || cells[8]?.textContent.trim() || '',
              totalMax: inputs[7]?.value || cells[9]?.textContent.trim() || '',
              totalMin: inputs[8]?.value || cells[10]?.textContent.trim() || ''
            });
          }
        });
      }

    console.log('📚 Collected courses:', courses.length);

    if (students.length === 0) { 
      alert('❌ No student data to save'); 
      return; 
    }

    try {
      console.log('📊 Creating Excel file...');
        
      // ==================== CREATE EXCEL FILE ====================
      const wb = XLSX.utils.book_new();
      
      // ==================== MAIN RESULT SHEET (Like your example) ====================
      const resultData = [];
      
      // Row 1: Instructions
      resultData.push(["Please enter the marks and upload this Excel file to the 'Examination Result Analysis' software to analyze the results"]);
      
      // Row 2: Academic Year
      resultData.push([`Academic Year: ${academicYear}`]);
      
      // Row 3: Branch
      resultData.push([`Branch: ${branch}`]);
      
      // Row 4: Semester
      resultData.push([`Semester: ${semester}`]);
      
      // Row 5: Course Code Header
      const courseCodeRow = ['Course Code', '', ''];
      courses.forEach(course => {
        courseCodeRow.push(course.courseCode);
        courseCodeRow.push(''); // Empty cell for SEE column
      });
      resultData.push(courseCodeRow);
      
      // Row 6: Column Headers (S.N., USN, NAME, CIE, SEE for each course)
      const headerRow = ['S.N.', 'USN', 'NAME'];
      courses.forEach(() => {
        headerRow.push('CIE');
        headerRow.push('SEE');
      });
      resultData.push(headerRow);
      
      // Rows 7+: Student data rows
      students.forEach((student, idx) => {
        const row = [idx + 1, student.usn, student.name];
        // Add empty CIE and SEE cells for each course
        courses.forEach(() => {
          row.push(''); // CIE
          row.push(''); // SEE
        });
        resultData.push(row);
      });
      
      const wsResult = XLSX.utils.aoa_to_sheet(resultData);
      XLSX.utils.book_append_sheet(wb, wsResult, 'Result Template');
      
      // ==================== SHEET 2: Course Details ====================
      if (courses.length > 0) {
        const courseData = [];
        courseData.push(['Course Information']);
        courseData.push(['S.No', 'Course Code', 'Course Title', 'Staff Incharge', 'Course Type', 'MAX CIE', 'MIN CIE', 'MAX SEE', 'MIN SEE', 'Total MAX', 'Total MIN']);
        
        courses.forEach((c, idx) => {
          courseData.push([
            idx + 1,
            c.courseCode,
            c.courseTitle,
            c.staffIncharge,
            c.courseType,
            c.maxCIE,
            c.minCIE,
            c.maxSEE,
            c.minSEE,
            c.totalMax,
            c.totalMin
          ]);
        });
        
        const wsCourses = XLSX.utils.aoa_to_sheet(courseData);
        XLSX.utils.book_append_sheet(wb, wsCourses, 'Course Details');
      }
      
      // ==================== SHEET 3: Student List ====================
      const studentData = [];
      studentData.push(['Student Information']);
      studentData.push(['S.No', 'USN', 'Student Name']);
      
      students.forEach((s, idx) => {
        studentData.push([idx + 1, s.usn, s.name]);
      });
      
      const wsStudents = XLSX.utils.aoa_to_sheet(studentData);
      XLSX.utils.book_append_sheet(wb, wsStudents, 'Student List');

      // Generate Excel file as blob
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const excelFileName = `template_${academicYear}_${branch}_sem${semester}_${Date.now()}.xlsx`;
      
      console.log('📥 Downloading Excel file...');
      
      // ==================== DOWNLOAD EXCEL LOCALLY ====================
      const link = document.createElement('a');
      link.href = URL.createObjectURL(excelBlob);
      link.download = excelFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      console.log('✅ Excel file downloaded!');
      
      alert(`✅ Template created successfully!\n\n📁 File: ${excelFileName}\n👨‍🎓 Students: ${students.length}\n📚 Courses: ${courses.length}\n\n✓ Excel file downloaded to your computer`);
        
    } catch (error) {
      console.error('❌ Error creating template:', error);
      alert('❌ Error: ' + error.message);
    }
  });
}
