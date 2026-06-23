/**
 * GOOGLE APPS SCRIPT WEB APP TEMPLATE
 * 
 * Petunjuk Penggunaan:
 * 1. Buka Google Spreadsheet Anda.
 * 2. Klik menu "Ekstensi" -> "Apps Script".
 * 3. Hapus kode bawaan, lalu salin dan tempel seluruh kode di bawah ini.
 * 4. Klik tombol "Simpan" (ikon disket).
 * 5. Klik "Terapkan" (Deploy) -> "Terapkan Baru" (New deployment).
 * 6. Pilih tipe: "Aplikasi Web" (Web app).
 * 7. Setel konfigurasi:
 *    - Jalankan sebagai: "Saya" (Me)
 *    - Siapa yang memiliki akses: "Siapa saja" (Anyone)
 * 8. Klik "Terapkan", setujui izin akses jika diminta.
 * 9. Salin URL Aplikasi Web yang diberikan (gunakan URL ini di Spreadsheet Generator).
 */

function doGet(e) {
  var spreadsheetUrl = e.parameter.spreadsheetUrl;
  var sheetName = e.parameter.sheet;
  var action = e.parameter.action;
  
  var ss;
  try {
    ss = spreadsheetUrl ? SpreadsheetApp.openByUrl(spreadsheetUrl) : SpreadsheetApp.getActiveSpreadsheet();
  } catch (err) {
    return createJsonResponse({ error: "Gagal membuka Spreadsheet: " + err.message });
  }
  
  // Jika meminta daftar semua sheet
  if (action === "list_sheets" || !sheetName) {
    var sheets = ss.getSheets();
    var sheetList = [];
    for (var i = 0; i < sheets.length; i++) {
      var name = sheets[i].getName();
      var dataRange = sheets[i].getDataRange();
      var values = dataRange.getValues();
      var headers = [];
      if (values.length > 0) {
        var headerLoc = findHeaderLocation(values);
        if (headerLoc) {
          headers = values[headerLoc.row].filter(function(h) {
            return h !== undefined && h !== null && h.toString().trim() !== "";
          });
        } else {
          // Fallback ke baris pertama jika tidak ada ID
          headers = values[0].filter(function(h) {
            return h !== undefined && h !== null && h.toString().trim() !== "";
          });
        }
      }
      sheetList.push({
        name: name,
        headers: headers,
        rowCount: Math.max(0, values.length - 1)
      });
    }
    return createJsonResponse({ sheets: sheetList });
  }
  
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return createJsonResponse({ error: "Sheet '" + sheetName + "' tidak ditemukan" });
  
  var data = sheet.getDataRange().getValues();
  if (data.length === 0) return createJsonResponse({ data: [] });

  var loc = findHeaderLocation(data);
  var headerIdx = loc ? loc.row : 0;
  var idColIdx = loc ? loc.col : 0;
  var headers = data[headerIdx];
  var rows = [];
  
  for (var i = headerIdx + 1; i < data.length; i++) {
    var idValue = data[i][idColIdx];
    if (idValue === undefined || idValue === null || idValue.toString().trim() === "") {
      continue;
    }
    
    var obj = {};
    for (var j = idColIdx; j < headers.length; j++) {
      var hName = headers[j];
      if (hName !== undefined && hName !== null && hName.toString().trim() !== "") {
        obj[hName] = data[i][j];
      }
    }
    rows.push(obj);
  }
  
  return createJsonResponse({ data: rows });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var sheetName = body.sheet;
    var spreadsheetUrl = body.spreadsheetUrl;
    
    var ss;
    try {
      ss = spreadsheetUrl ? SpreadsheetApp.openByUrl(spreadsheetUrl) : SpreadsheetApp.getActiveSpreadsheet();
    } catch (err) {
      return createJsonResponse({ error: "Gagal membuka Spreadsheet: " + err.message });
    }
    
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return createJsonResponse({ error: "Sheet '" + sheetName + "' tidak ditemukan" });
    }
    
    var data = sheet.getDataRange().getValues();
    var loc = findHeaderLocation(data);
    var headerIdx = 0;
    var idColIdx = 0;
    var headers = [];
    
    if (!loc) {
       if (body.data) {
          headers = Object.keys(body.data);
          sheet.appendRow(headers);
          headerIdx = 0;
          idColIdx = 0;
          data = sheet.getDataRange().getValues();
       } else {
          return createJsonResponse({ error: "Kolom ID tidak ditemukan dan tidak ada data baru" });
       }
    } else {
       headerIdx = loc.row;
       idColIdx = loc.col;
       headers = data[headerIdx];
    }

    if (action === 'create') {
      var lastRow = findLastDataRow(data, headerIdx, idColIdx);
      var newRowIdx = lastRow + 1;
      
      // Mengisi baris baru sesuai nama kolom
      for (var j = idColIdx; j < headers.length; j++) {
        var headerName = headers[j];
        if (headerName && body.data[headerName] !== undefined && body.data[headerName] !== null) {
          sheet.getRange(newRowIdx, j + 1).setValue(body.data[headerName]);
        }
      }
      
      return createJsonResponse({ success: true, message: "Data berhasil disimpan" });
    }
    
    if (action === 'update') {
      var idValue = body.id;
      for (var i = headerIdx + 1; i < data.length; i++) {
        if (data[i][idColIdx] == idValue) {
          for (var j = idColIdx; j < headers.length; j++) {
            var headerName = headers[j];
            if (headerName && body.data[headerName] !== undefined && body.data[headerName] !== null) {
              sheet.getRange(i + 1, j + 1).setValue(body.data[headerName]);
            }
          }
          return createJsonResponse({ success: true, message: "Data berhasil diperbarui" });
        }
      }
      return createJsonResponse({ error: "Data dengan ID " + idValue + " tidak ditemukan" });
    }
    
    if (action === 'delete') {
      var idValue = body.id;
      for (var i = headerIdx + 1; i < data.length; i++) {
        if (data[i][idColIdx] == idValue) {
          sheet.deleteRow(i + 1);
          return createJsonResponse({ success: true, message: "Data berhasil dihapus" });
        }
      }
      return createJsonResponse({ error: "Data dengan ID " + idValue + " tidak ditemukan" });
    }

    return createJsonResponse({ error: "Aksi tidak valid" });
  } catch(err) {
    return createJsonResponse({ error: "Terjadi kesalahan: " + err.message });
  }
}

// Mencari lokasi kolom header ID atau baris header tabel
function findHeaderLocation(data) {
  // 1. Coba cari baris yang punya kolom kata kunci ID
  for (var i = 0; i < Math.min(data.length, 15); i++) {
    for (var j = 0; j < data[i].length; j++) {
      var val = String(data[i][j]).toLowerCase().trim();
      if (val === 'id' || val.indexOf('id_') === 0 || val.indexOf('id ') === 0 || val.indexOf('kode') === 0) {
        return { row: i, col: j };
      }
    }
  }

  // 2. Jika tidak ada kolom ID, cari baris pertama yang memiliki jumlah kolom terisi signifikan
  var maxFilled = 0;
  var rowCounts = [];
  for (var i = 0; i < Math.min(data.length, 15); i++) {
    var filled = 0;
    for (var j = 0; j < data[i].length; j++) {
      if (data[i][j] !== undefined && data[i][j] !== null && String(data[i][j]).trim() !== "") {
        filled++;
      }
    }
    rowCounts.push(filled);
    if (filled > maxFilled) {
      maxFilled = filled;
    }
  }

  // Cari baris pertama yang jumlah terisinya >= 70% dari maxFilled dan minimal ada 2 kolom terisi
  if (maxFilled >= 2) {
    for (var i = 0; i < rowCounts.length; i++) {
      if (rowCounts[i] >= Math.max(2, maxFilled * 0.7)) {
        // Cari kolom pertama yang tidak kosong di baris ini sebagai kolom ID/Kunci
        for (var j = 0; j < data[i].length; j++) {
          if (data[i][j] !== undefined && data[i][j] !== null && String(data[i][j]).trim() !== "") {
            return { row: i, col: j };
          }
        }
      }
    }
  }

  return null;
}

// Menemukan baris terakhir yang berisi data
function findLastDataRow(data, headerIdx, idColIdx) {
  var lastRow = headerIdx + 1;
  for (var i = headerIdx + 1; i < data.length; i++) {
    var idVal = data[i][idColIdx];
    if (idVal !== undefined && idVal !== null && idVal.toString().trim() !== "") {
      lastRow = i + 1;
    }
  }
  return lastRow;
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
