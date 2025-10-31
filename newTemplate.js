document.addEventListener('DOMContentLoaded', function () {
      const addBtn = document.getElementsByClassName('addBtn')[0];
      let tableRoot = document.getElementsByClassName('addCourseTable')[0];
      let tableEl = tableRoot.tagName.toLowerCase() === 'table' ? tableRoot : tableRoot.querySelector('table');
      let tbody = tableEl.tBodies[0] || tableEl.createTBody();
      let count = tbody.rows.length;

      addBtn.addEventListener('click', function () {
        const row = tbody.insertRow();
        count++;

        const c0 = row.insertCell(); c0.textContent = count;
        const c1 = row.insertCell(); c1.innerHTML = `<input type="text" placeholder="Enter Course Code">`;
        const c2 = row.insertCell(); c2.innerHTML = `<input type="text" placeholder="Enter Course Title">`;
        const c3 = row.insertCell(); c3.innerHTML = `<input type="text" placeholder="Enter Staff Incharge">`;
        const c4 = row.insertCell(); c4.innerHTML = `
          <select>
            <option value="">Select Course Type</option>
            <option>Theory</option>
            <option>Lab</option>
            <option>Project</option>
           </select>`;
        const c5 = row.insertCell(); c5.innerHTML = `<input type="number" placeholder="Enter MAX CIE">`;
        const c6 = row.insertCell(); c6.innerHTML = `<input type="number" placeholder="Enter MIN CIE">`;
        const c7 = row.insertCell(); c7.innerHTML = `<input type="number" placeholder="Enter MAX SEE">`;
        const c8 = row.insertCell(); c8.innerHTML = `<input type="number" placeholder="Enter MIN SEE">`;
        const c9 = row.insertCell(); c9.innerHTML = `<input type="number" placeholder="Enter Total MAX">`;
        const c10 = row.insertCell(); c10.innerHTML = `<input type="number" placeholder="Enter Total MIN (Pass)">`;
        const c11 = row.insertCell();
        c11.innerHTML = `<button type="button" class="delete-btn">Delete</button>`;

        c11.querySelector('.delete-btn').addEventListener('click', function () {
          row.remove();
          refreshSerials();
        });
      });

      function refreshSerials() {
        const rows = Array.from(tbody.rows);
        rows.forEach((r, idx) => r.cells[0].textContent = idx + 1);
        count = tbody.rows.length;
      }
    });



    
document.addEventListener('DOMContentLoaded', function() {
  // Robust selectors with fallbacks to avoid null errors caused by mismatched HTML structure
  const addBtn = document.getElementById('addStudentBtn') || document.querySelector('.addStudentBtn button');
  const saveBtn = document.getElementById('saveTemplateBtn') || document.querySelector('.saveTemplate button');
  const tableEl = document.querySelector('.addStudentTable table');

  // If required elements are missing, quietly exit to avoid runtime errors
  if (!tableEl || !addBtn || !saveBtn) return;

  const tableBody = tableEl.tBodies[0] || tableEl.createTBody();
  let count = tableBody.rows.length;

  addBtn.addEventListener('click', function() {
    const row = tableBody.insertRow();
    count++;

    const c0 = row.insertCell(); c0.textContent = count;
    const c1 = row.insertCell(); c1.innerHTML = `<input type="text" placeholder="Enter your USN">`;
    const c2 = row.insertCell(); c2.innerHTML = `<input type="text" placeholder="Enter Student Name">`;
    const c3 = row.insertCell(); c3.innerHTML = `<button class="delete-btn">Delete</button>`;

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

  // Attach delete handlers for any existing delete buttons in the initial HTML
  Array.from(tableBody.rows).forEach(r => {
    const del = r.querySelector('.delete-btn') || r.querySelector('#actiondeletebtn2');
    if (del && !del.dataset.bound) {
      del.addEventListener('click', function() { r.remove(); refreshSerials(); });
      del.dataset.bound = '1';
    }
  });

  saveBtn.addEventListener('click', function() {
    const data = [];

    Array.from(tableBody.rows).forEach(r => {
      // Prefer finding inputs inside the row instead of relying on specific cell indices
      const inputs = r.querySelectorAll('input');
      const usn = inputs[0]?.value.trim() || '';
      const name = inputs[1]?.value.trim() || '';
      if (usn && name) data.push({ usn, name });
    });

    if (data.length === 0) { alert('No student data to save'); return; }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'student_template.json';
    // Append to DOM to make click work in all browsers, then cleanup
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  });
});
