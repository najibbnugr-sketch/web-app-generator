// APP GENERATOR LOGIC

// State
let appConfig = {
  apiUrl: '',
  spreadsheetUrl: '',
  appName: 'My Spreadsheet App',
  theme: 'indigo', // indigo, emerald, ocean, purple
  sheets: [] // Filled dynamically after analyzing
};

// Demo Data to show on start / test
const demoSheets = [
  {
    name: 'Donatur',
    headers: ['ID', 'Nama', 'No HP', 'Status'],
    tableColumns: ['ID', 'Nama', 'No HP', 'Status'],
    detailColumns: ['ID', 'Nama', 'No HP', 'Status'],
    kpiColumns: [],
    chartConfigs: [],
    crud: true
  },
  {
    name: 'Transaksi Masuk',
    headers: ['ID Transaksi', 'Tanggal', 'ID Donatur', 'Nominal', 'Keterangan'],
    tableColumns: ['ID Transaksi', 'Tanggal', 'ID Donatur', 'Nominal', 'Keterangan'],
    detailColumns: ['ID Transaksi', 'Tanggal', 'ID Donatur', 'Nominal', 'Keterangan'],
    kpiColumns: ['Nominal'],
    chartConfigs: [{ type: 'bar', x: 'Tanggal', y: 'Nominal' }],
    crud: true
  }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadDemoData();
});

function setupEventListeners() {
  // Theme chip clicks
  document.querySelectorAll('.theme-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      document.querySelectorAll('.theme-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const themeName = chip.dataset.theme;
      appConfig.theme = themeName;
      document.body.setAttribute('data-theme', themeName);
      updatePreview();
    });
  });

  // App Name input
  document.getElementById('input-app-name').addEventListener('input', (e) => {
    appConfig.appName = e.target.value || 'My Spreadsheet App';
    updatePreview();
  });
}

function loadDemoData() {
  appConfig.appName = 'Sedekah Dashboard';
  appConfig.sheets = JSON.parse(JSON.stringify(demoSheets));
  renderSheetConfigurator();
  updatePreview();
}

// Fetch spreadsheet metadata from Apps Script
async function analyzeSpreadsheet() {
  const apiUrlInput = document.getElementById('input-api-url').value.trim();
  const ssUrlInput = document.getElementById('input-ss-url').value.trim();

  if (!apiUrlInput) {
    showToast('Masukkan API Web App URL terlebih dahulu!', 'error');
    return;
  }

  showToast('Menganalisis Spreadsheet...', 'success');
  
  try {
    const url = `${apiUrlInput}?action=list_sheets&spreadsheetUrl=${encodeURIComponent(ssUrlInput)}`;
    const response = await fetch(url);
    const result = await response.json();

    if (result.error) {
      showToast('Error: ' + result.error, 'error');
      return;
    }

    if (!result.sheets || result.sheets.length === 0) {
      showToast('Tidak ada sheet yang ditemukan.', 'error');
      return;
    }

    appConfig.apiUrl = apiUrlInput;
    appConfig.spreadsheetUrl = ssUrlInput;
    
    // Build sheets configuration
    appConfig.sheets = result.sheets.map(sheet => {
      // Find numeric columns for potential KPIs or Charts
      const headers = sheet.headers || [];
      return {
        name: sheet.name,
        headers: headers,
        tableColumns: [...headers],
        detailColumns: [...headers],
        kpiColumns: [],
        chartConfigs: [],
        crud: true
      };
    });

    renderSheetConfigurator();
    updatePreview();
    showToast('Spreadsheet berhasil dianalisis!', 'success');
  } catch (error) {
    console.error(error);
    showToast('Koneksi gagal. Pastikan URL Apps Script benar dan telah dideploy.', 'error');
  }
}

// Render dynamic configurator UI
function renderSheetConfigurator() {
  const container = document.getElementById('sheets-config-container');
  container.innerHTML = '';

  appConfig.sheets.forEach((sheet, sheetIdx) => {
    const sheetEl = document.createElement('div');
    sheetEl.className = 'sheet-config-item';
    
    // Create columns checkboxes
    let columnsHtml = '';
    sheet.headers.forEach(header => {
      const isChecked = sheet.tableColumns.includes(header) ? 'checked' : '';
      columnsHtml += `
        <label class="checkbox-row">
          <input type="checkbox" data-sheet="${sheetIdx}" data-col="${header}" ${isChecked} onchange="toggleTableColumn(this)">
          ${header}
        </label>
      `;
    });

    // Create KPI numeric columns selection
    let kpiHtml = '';
    sheet.headers.forEach(header => {
      const isChecked = sheet.kpiColumns.includes(header) ? 'checked' : '';
      kpiHtml += `
        <label class="checkbox-row">
          <input type="checkbox" data-sheet="${sheetIdx}" data-kpi="${header}" ${isChecked} onchange="toggleKpiColumn(this)">
          ${header}
        </label>
      `;
    });

    // Create Charts config
    let hasChart = sheet.chartConfigs.length > 0;
    let chartX = hasChart ? sheet.chartConfigs[0].x : '';
    let chartY = hasChart ? sheet.chartConfigs[0].y : '';
    let chartType = hasChart ? sheet.chartConfigs[0].type : 'bar';

    let chartXOptions = '<option value="">-- Pilih Kolom X --</option>';
    let chartYOptions = '<option value="">-- Pilih Kolom Y (Angka) --</option>';
    
    sheet.headers.forEach(header => {
      chartXOptions += `<option value="${header}" ${header === chartX ? 'selected' : ''}>${header}</option>`;
      chartYOptions += `<option value="${header}" ${header === chartY ? 'selected' : ''}>${header}</option>`;
    });

    sheetEl.innerHTML = `
      <div class="sheet-config-header" onclick="toggleAccordion('sheet-details-${sheetIdx}')">
        <span class="sheet-config-title">📄 Sheet: ${sheet.name}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
      <div id="sheet-details-${sheetIdx}" style="display: flex; flex-direction: column; gap: 12px; margin-top: 10px; padding-left: 10px;">
        <label class="checkbox-row">
          <input type="checkbox" data-sheet="${sheetIdx}" ${sheet.crud ? 'checked' : ''} onchange="toggleCrud(${sheetIdx}, this)">
          Aktifkan CRUD (Tambah/Edit/Hapus)
        </label>
        
        <div style="font-weight:550; font-size:0.85rem; margin-top: 6px;">Kolom Ditampilkan di Tabel:</div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
          ${columnsHtml}
        </div>

        <div style="font-weight:550; font-size:0.85rem; margin-top: 6px;">Total/KPI Card (Kolom Angka):</div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
          ${kpiHtml}
        </div>

        <div style="font-weight:550; font-size:0.85rem; margin-top: 6px;">Grafik Pendukung:</div>
        <div class="form-field">
          <select data-sheet="${sheetIdx}" data-chart-type onchange="updateChartConfig(${sheetIdx})">
            <option value="bar" ${chartType === 'bar' ? 'selected' : ''}>Bar (Batang)</option>
            <option value="line" ${chartType === 'line' ? 'selected' : ''}>Line (Garis)</option>
            <option value="pie" ${chartType === 'pie' ? 'selected' : ''}>Pie (Lingkaran)</option>
          </select>
          <select data-sheet="${sheetIdx}" data-chart-x onchange="updateChartConfig(${sheetIdx})" style="margin-top:4px;">
            ${chartXOptions}
          </select>
          <select data-sheet="${sheetIdx}" data-chart-y onchange="updateChartConfig(${sheetIdx})" style="margin-top:4px;">
            ${chartYOptions}
          </select>
        </div>
      </div>
    `;

    container.appendChild(sheetEl);
  });
}

function toggleAccordion(id) {
  const el = document.getElementById(id);
  if (el.style.display === 'none') {
    el.style.display = 'flex';
  } else {
    el.style.display = 'none';
  }
}

function toggleTableColumn(checkbox) {
  const sheetIdx = parseInt(checkbox.dataset.sheet);
  const colName = checkbox.dataset.col;
  const sheet = appConfig.sheets[sheetIdx];

  if (checkbox.checked) {
    if (!sheet.tableColumns.includes(colName)) {
      sheet.tableColumns.push(colName);
    }
  } else {
    sheet.tableColumns = sheet.tableColumns.filter(c => c !== colName);
  }
  updatePreview();
}

function toggleKpiColumn(checkbox) {
  const sheetIdx = parseInt(checkbox.dataset.sheet);
  const colName = checkbox.dataset.kpi;
  const sheet = appConfig.sheets[sheetIdx];

  if (checkbox.checked) {
    if (!sheet.kpiColumns.includes(colName)) {
      sheet.kpiColumns.push(colName);
    }
  } else {
    sheet.kpiColumns = sheet.kpiColumns.filter(c => c !== colName);
  }
  updatePreview();
}

function toggleCrud(sheetIdx, checkbox) {
  appConfig.sheets[sheetIdx].crud = checkbox.checked;
  updatePreview();
}

function updateChartConfig(sheetIdx) {
  const sheet = appConfig.sheets[sheetIdx];
  const type = document.querySelector(`select[data-sheet="${sheetIdx}"][data-chart-type]`).value;
  const x = document.querySelector(`select[data-sheet="${sheetIdx}"][data-chart-x]`).value;
  const y = document.querySelector(`select[data-sheet="${sheetIdx}"][data-chart-y]`).value;

  if (x && y) {
    sheet.chartConfigs = [{ type, x, y }];
  } else {
    sheet.chartConfigs = [];
  }
  updatePreview();
}

// Generate the complete single-file HTML output for Vercel / User Download
function generateHtmlSource() {
  const themeColors = {
    indigo: {
      gradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #020617 100%)',
      primary: '#6366f1',
      primaryHover: '#4f46e5',
      glow: 'rgba(99, 102, 241, 0.4)'
    },
    emerald: {
      gradient: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #020617 100%)',
      primary: '#10b981',
      primaryHover: '#059669',
      glow: 'rgba(16, 185, 129, 0.4)'
    },
    ocean: {
      gradient: 'linear-gradient(135deg, #0c4a6e 0%, #0f172a 50%, #020617 100%)',
      primary: '#0ea5e9',
      primaryHover: '#0284c7',
      glow: 'rgba(14, 165, 233, 0.4)'
    },
    purple: {
      gradient: 'linear-gradient(135deg, #3b0764 0%, #0f172a 50%, #020617 100%)',
      primary: '#a855f7',
      primaryHover: '#9333ea',
      glow: 'rgba(168, 85, 247, 0.4)'
    }
  }[appConfig.theme];

  const configJson = JSON.stringify(appConfig, null, 2);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appConfig.appName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg-gradient: ${themeColors.gradient};
      --primary: ${themeColors.primary};
      --primary-hover: ${themeColors.primaryHover};
      --primary-glow: ${themeColors.glow};
      --panel-bg: rgba(15, 23, 42, 0.55);
      --panel-border: rgba(255, 255, 255, 0.08);
      --panel-blur: 20px;
      --text-primary: #f8fafc;
      --text-muted: #94a3b8;
      --danger: #ef4444;
      --danger-hover: #dc2626;
      --secondary: #10b981;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Outfit', sans-serif;
      background: var(--bg-gradient);
      color: var(--text-primary);
      min-height: 100vh;
      overflow-x: hidden;
    }

    .app-container {
      display: grid;
      grid-template-columns: 260px 1fr;
      min-height: 100vh;
    }

    /* SIDEBAR */
    .sidebar {
      background: var(--panel-bg);
      backdrop-filter: blur(var(--panel-blur));
      -webkit-backdrop-filter: blur(var(--panel-blur));
      border-right: 1px solid var(--panel-border);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .sidebar-header h2 {
      font-size: 1.25rem;
      font-weight: 700;
      background: linear-gradient(135deg, #fff 0%, var(--text-muted) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .nav-item {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 12px 16px;
      border-radius: 8px;
      cursor: pointer;
      text-align: left;
      font-size: 0.95rem;
      font-weight: 550;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: inherit;
    }

    .nav-item:hover, .nav-item.active {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-primary);
    }
    
    .nav-item.active {
      border-left: 3px solid var(--primary);
    }

    /* MAIN CONTENT */
    .main-content {
      padding: 30px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      overflow-y: auto;
      height: 100vh;
    }

    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-bar h1 {
      font-size: 1.75rem;
      font-weight: 600;
    }

    /* CARDS */
    .card {
      background: var(--panel-bg);
      border: 1px solid var(--panel-border);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }

    .kpi-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
    }

    .kpi-card {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 18px;
    }

    .kpi-title {
      font-size: 0.85rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .kpi-value {
      font-size: 1.8rem;
      font-weight: 700;
      margin-top: 6px;
    }

    /* TABLE */
    .table-controls {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .search-input {
      flex: 1;
      min-width: 200px;
      background: rgba(0,0,0,0.25);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 10px 16px;
      border-radius: 8px;
      color: #fff;
      font-family: inherit;
      outline: none;
    }

    .search-input:focus {
      border-color: var(--primary);
    }

    .table-container {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    th {
      padding: 12px 16px;
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.85rem;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      text-transform: uppercase;
    }

    td {
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      font-size: 0.95rem;
    }

    tr:hover td {
      background: rgba(255,255,255,0.01);
    }

    /* BUTTONS */
    .btn {
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      font-family: inherit;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--primary);
      color: #fff;
    }

    .btn-primary:hover {
      background: var(--primary-hover);
    }

    .btn-secondary {
      background: rgba(255,255,255,0.08);
      color: #fff;
    }

    .btn-danger {
      background: var(--danger);
      color: #fff;
    }

    /* MODAL */
    .modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(5px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 20px;
    }

    .modal-content {
      background: #0f172a;
      border: 1px solid var(--panel-border);
      border-radius: 16px;
      width: 100%;
      max-width: 500px;
      padding: 24px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }

    .form-group {
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-size: 0.85rem;
      font-weight: 550;
      color: var(--text-muted);
    }

    .form-group input, .form-group select {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 10px;
      border-radius: 6px;
      color: #fff;
      font-family: inherit;
      outline: none;
    }

    .form-group input:focus {
      border-color: var(--primary);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }

    /* CHARTS */
    .chart-box {
      margin-top: 20px;
      height: 250px;
    }
  </style>
</head>
<body>
  <div class="app-container">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2>${appConfig.appName}</h2>
      </div>
      <nav class="sidebar-nav" id="sidebar-nav"></nav>
    </aside>
    
    <main class="main-content">
      <div class="header-bar">
        <h1 id="view-title">Loading...</h1>
        <div id="action-bar"></div>
      </div>
      
      <div class="kpi-container" id="kpi-container"></div>
      
      <div class="card" id="chart-card" style="display:none;">
        <div class="chart-box"><canvas id="analyticsChart"></canvas></div>
      </div>

      <div class="card">
        <div class="table-controls">
          <input type="search" class="search-input" id="search-input" placeholder="Cari data..." oninput="handleSearch(this.value)">
          <button class="btn btn-secondary" onclick="exportCSV()">Ekspor CSV</button>
        </div>
        <div class="table-container">
          <table id="data-table">
            <thead><tr id="table-headers"></tr></thead>
            <tbody id="table-body"></tbody>
          </table>
        </div>
      </div>
    </main>
  </div>

  <!-- Form Modal (Dynamic) -->
  <div class="modal" id="form-modal">
    <div class="modal-content">
      <h3 id="modal-title" style="margin-bottom:20px;">Form Data</h3>
      <form id="dynamic-form" onsubmit="handleFormSubmit(event)">
        <input type="hidden" id="form-action-type">
        <input type="hidden" id="form-record-id">
        <div id="form-fields-container"></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
          <button type="submit" class="btn btn-primary">Simpan</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    const config = ${configJson};
    let currentSheetIdx = 0;
    let sheetData = {};
    let activeChart = null;

    window.onload = async () => {
      buildNavigation();
      if (config.apiUrl) {
        await loadData();
      } else {
        // Fallback demo data
        loadDemoData();
      }
    };

    function buildNavigation() {
      const nav = document.getElementById('sidebar-nav');
      nav.innerHTML = '';
      config.sheets.forEach((sheet, idx) => {
        const btn = document.createElement('button');
        btn.className = 'nav-item' + (idx === 0 ? ' active' : '');
        btn.innerHTML = '📄 ' + sheet.name;
        btn.onclick = () => switchSheet(idx);
        nav.appendChild(btn);
      });
    }

    function switchSheet(idx) {
      currentSheetIdx = idx;
      document.querySelectorAll('.nav-item').forEach((btn, i) => {
        btn.classList.toggle('active', i === idx);
      });
      renderActiveSheet();
    }

    async function loadData() {
      document.getElementById('table-body').innerHTML = '<tr><td colspan="100">Memuat data...</td></tr>';
      try {
        const promises = config.sheets.map(async (sheet) => {
          const res = await fetch(\`\${config.apiUrl}?sheet=\${encodeURIComponent(sheet.name)}&spreadsheetUrl=\${encodeURIComponent(config.spreadsheetUrl)}\`);
          const json = await res.json();
          sheetData[sheet.name] = json.data || [];
        });
        await Promise.all(promises);
        renderActiveSheet();
      } catch (err) {
        console.error(err);
        alert('Gagal mengambil data dari API Web App.');
      }
    }

    function loadDemoData() {
      config.sheets.forEach(sheet => {
        sheetData[sheet.name] = [
          { 'ID': '1', 'Nama': 'Ahmad', 'No HP': '0812', 'Status': 'Tetap', 'Nominal': 100000, 'Tanggal': '2026-06-21', 'ID Donatur': '1', 'ID Transaksi': 'T1' },
          { 'ID': '2', 'Nama': 'Budi', 'No HP': '0813', 'Status': 'Sementara', 'Nominal': 150000, 'Tanggal': '2026-06-22', 'ID Donatur': '2', 'ID Transaksi': 'T2' }
        ];
      });
      renderActiveSheet();
    }

    function renderActiveSheet() {
      const sheet = config.sheets[currentSheetIdx];
      const data = sheetData[sheet.name] || [];
      
      document.getElementById('view-title').innerText = sheet.name;
      
      // Render Action Bar (Add button)
      const actionBar = document.getElementById('action-bar');
      actionBar.innerHTML = '';
      if (sheet.crud) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        btn.innerHTML = '+ Tambah Baru';
        btn.onclick = () => openAddModal();
        actionBar.appendChild(btn);
      }

      // Render KPIs
      renderKpis(sheet, data);

      // Render Table Headers
      const headersTr = document.getElementById('table-headers');
      headersTr.innerHTML = '';
      sheet.tableColumns.forEach(col => {
        const th = document.createElement('th');
        th.innerText = col;
        headersTr.appendChild(th);
      });
      if (sheet.crud) {
        const th = document.createElement('th');
        th.innerText = 'Aksi';
        headersTr.appendChild(th);
      }

      // Render Table Data
      renderTableRows(data);

      // Render Chart
      renderChart(sheet, data);
    }

    function renderKpis(sheet, data) {
      const container = document.getElementById('kpi-container');
      container.innerHTML = '';
      if (!sheet.kpiColumns || sheet.kpiColumns.length === 0) return;

      sheet.kpiColumns.forEach(col => {
        const sum = data.reduce((acc, row) => acc + (parseFloat(row[col]) || 0), 0);
        const card = document.createElement('div');
        card.className = 'kpi-card';
        card.innerHTML = \`
          <div class="kpi-title">Total \${col}</div>
          <div class="kpi-value">\${formatCurrency(sum)}</div>
        \`;
        container.appendChild(card);
      });
    }

    function renderTableRows(data) {
      const sheet = config.sheets[currentSheetIdx];
      const tbody = document.getElementById('table-body');
      tbody.innerHTML = '';
      
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="100" style="text-align:center;">Tidak ada data.</td></tr>';
        return;
      }

      data.forEach((row) => {
        const tr = document.createElement('tr');
        sheet.tableColumns.forEach(col => {
          const td = document.createElement('td');
          let val = row[col];
          if (sheet.kpiColumns.includes(col)) {
            val = formatCurrency(val);
          }
          td.innerText = val !== undefined ? val : '';
          tr.appendChild(td);
        });

        if (sheet.crud) {
          const td = document.createElement('td');
          // Find first key as ID identifier
          const idKey = sheet.headers[0];
          const recordId = row[idKey];
          td.innerHTML = \`
            <button class="btn btn-secondary" style="padding:6px 10px; font-size:0.8rem;" onclick="openEditModal('\${recordId}')">Edit</button>
            <button class="btn btn-danger" style="padding:6px 10px; font-size:0.8rem;" onclick="handleDelete('\${recordId}')">Hapus</button>
          \`;
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      });
    }

    function renderChart(sheet, data) {
      const card = document.getElementById('chart-card');
      if (activeChart) {
        activeChart.destroy();
        activeChart = null;
      }
      
      if (!sheet.chartConfigs || sheet.chartConfigs.length === 0) {
        card.style.display = 'none';
        return;
      }

      card.style.display = 'block';
      const chartCfg = sheet.chartConfigs[0];
      const labels = data.map(r => r[chartCfg.x] || '');
      const chartData = data.map(r => parseFloat(r[chartCfg.y]) || 0);

      const ctx = document.getElementById('analyticsChart').getContext('2d');
      activeChart = new Chart(ctx, {
        type: chartCfg.type,
        data: {
          labels: labels,
          datasets: [{
            label: chartCfg.y,
            data: chartData,
            backgroundColor: 'rgba(99, 102, 241, 0.4)',
            borderColor: '#6366f1',
            borderWidth: 2,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
          }
        }
      });
    }

    // Modal Operations
    function openAddModal() {
      const sheet = config.sheets[currentSheetIdx];
      document.getElementById('modal-title').innerText = 'Tambah Data ' + sheet.name;
      document.getElementById('form-action-type').value = 'create';
      
      buildFormFields({});
      document.getElementById('form-modal').style.display = 'flex';
    }

    function openEditModal(recordId) {
      const sheet = config.sheets[currentSheetIdx];
      const data = sheetData[sheet.name] || [];
      const idKey = sheet.headers[0];
      const record = data.find(r => r[idKey] == recordId);
      
      if (!record) return;
      
      document.getElementById('modal-title').innerText = 'Edit Data ' + sheet.name;
      document.getElementById('form-action-type').value = 'update';
      document.getElementById('form-record-id').value = recordId;
      
      buildFormFields(record);
      document.getElementById('form-modal').style.display = 'flex';
    }

    function buildFormFields(record) {
      const sheet = config.sheets[currentSheetIdx];
      const container = document.getElementById('form-fields-container');
      container.innerHTML = '';

      sheet.headers.forEach((col, idx) => {
        const val = record[col] !== undefined ? record[col] : '';
        const group = document.createElement('div');
        group.className = 'form-group';
        
        // Primary key (first column) is readonly on Edit, auto-generated or manual on Add
        const isPrimaryKey = idx === 0;
        const readOnlyAttr = (isPrimaryKey && document.getElementById('form-action-type').value === 'update') ? 'readonly' : '';
        
        group.innerHTML = \`
          <label>\${col}</label>
          <input type="text" name="\${col}" value="\${val}" \${readOnlyAttr} required>
        \`;
        container.appendChild(group);
      });
    }

    function closeModal() {
      document.getElementById('form-modal').style.display = 'none';
    }

    async function handleFormSubmit(e) {
      e.preventDefault();
      const sheet = config.sheets[currentSheetIdx];
      const formEl = document.getElementById('dynamic-form');
      const formData = new FormData(formEl);
      const action = document.getElementById('form-action-type').value;
      const recordId = document.getElementById('form-record-id').value;

      const dataObj = {};
      formData.forEach((value, key) => {
        dataObj[key] = value;
      });

      const body = {
        action: action,
        sheet: sheet.name,
        spreadsheetUrl: config.spreadsheetUrl,
        id: recordId,
        data: dataObj
      };

      try {
        closeModal();
        document.getElementById('table-body').innerHTML = '<tr><td colspan="100">Menyimpan data...</td></tr>';
        
        const res = await fetch(config.apiUrl, {
          method: 'POST',
          body: JSON.stringify(body)
        });
        const result = await res.json();
        
        if (result.error) {
          alert('Error: ' + result.error);
        } else {
          alert(result.message || 'Berhasil menyimpan data!');
        }
        await loadData();
      } catch (err) {
        console.error(err);
        alert('Terjadi kesalahan jaringan.');
        await loadData();
      }
    }

    async function handleDelete(recordId) {
      if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
      const sheet = config.sheets[currentSheetIdx];
      
      const body = {
        action: 'delete',
        sheet: sheet.name,
        spreadsheetUrl: config.spreadsheetUrl,
        id: recordId
      };

      try {
        document.getElementById('table-body').innerHTML = '<tr><td colspan="100">Menghapus data...</td></tr>';
        const res = await fetch(config.apiUrl, {
          method: 'POST',
          body: JSON.stringify(body)
        });
        const result = await res.json();
        if (result.error) {
          alert('Error: ' + result.error);
        }
        await loadData();
      } catch (err) {
        console.error(err);
        alert('Terjadi kesalahan jaringan.');
        await loadData();
      }
    }

    function handleSearch(q) {
      const sheet = config.sheets[currentSheetIdx];
      const data = sheetData[sheet.name] || [];
      if (!q) {
        renderTableRows(data);
        return;
      }
      const query = q.toLowerCase();
      const filtered = data.filter(row => {
        return Object.values(row).some(val => String(val).toLowerCase().includes(query));
      });
      renderTableRows(filtered);
    }

    function exportCSV() {
      const sheet = config.sheets[currentSheetIdx];
      const data = sheetData[sheet.name] || [];
      if (data.length === 0) return;
      
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += sheet.tableColumns.join(",") + "\\n";
      
      data.forEach(row => {
        const rowData = sheet.tableColumns.map(col => {
          const val = String(row[col] || '').replace(/"/g, '""');
          return \`"\${val}"\`;
        });
        csvContent += rowData.join(",") + "\\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", \`\${sheet.name}.csv\`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    function formatCurrency(val) {
      const num = parseFloat(val) || 0;
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
    }
  </script>
</body>
</html>`;
}

// Update the interactive preview window
function updatePreview() {
  const iframe = document.getElementById('preview-iframe');
  if (!iframe) return;

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(generateHtmlSource());
  doc.close();

  // Also update Code Area for copy/paste
  const codePre = document.querySelector('.code-container pre code');
  if (codePre) {
    codePre.innerText = generateHtmlSource();
  }
}

// Download final generated index.html directly
function downloadGeneratedApp() {
  const source = generateHtmlSource();
  const blob = new Blob([source], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'index.html';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  showToast('Web App berhasil diunduh! Simpan sebagai index.html dan siap dideploy.', 'success');
}

// Helper to copy code to clipboard
function copyToClipboard() {
  const source = generateHtmlSource();
  navigator.clipboard.writeText(source).then(() => {
    showToast('Kode disalin ke clipboard!', 'success');
  }).catch(() => {
    showToast('Gagal menyalin kode.', 'error');
  });
}

// UI notification helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : '❌'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
