
// === DOM Elements ===
const fileInput = document.getElementById("excelFile");
const uploadBtn = document.getElementById("uploadBtn");
const loadDataBtn = document.getElementById("loadDataBtn");
const tableContainer = document.getElementById("table-container");
const categoryFilter = document.getElementById("categoryFilter");
const lastUploadDiv = document.getElementById("lastUpload"); // ✅ New element
let chart;


    let parsedData = [];

    // 🔍 Preview Excel file with date conversion
    document.getElementById("previewBtn").addEventListener("click", () => {
      const file = document.getElementById("excelFile").files[0];
      if (!file) {
        document.getElementById("status").textContent = "⚠️ Please select a file first.";
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        
        // Parse with date conversion
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false });
        
        // Process dates and sanitize data
        parsedData = rawData.map(row => {
          const processedRow = {};
          Object.keys(row).forEach(key => {
            let value = row[key];
            
            // Convert Excel serial numbers to dates
            if (key.toLowerCase().includes('date') || key.toLowerCase().includes('period')) {
              if (typeof value === 'number' && value > 25569) { // Excel date serial number
                // Convert Excel serial number to JavaScript Date
                const excelEpoch = new Date(1899, 11, 30);
                const jsDate = new Date(excelEpoch.getTime() + value * 86400000);
                value = jsDate.toLocaleDateString('en-IN'); // Format as DD/MM/YYYY
              } else if (value instanceof Date) {
                value = value.toLocaleDateString('en-IN');
              }
            }
            
            // Sanitize key for Firebase
            const sanitizedKey = key.replace(/[.#$/[\]]/g, "_");
            processedRow[sanitizedKey] = value;
          });
          return processedRow;
        });

        showPreview(parsedData);
        document.getElementById("status").textContent = `✅ Loaded ${parsedData.length} rows from ${sheetName}`;
      };
      reader.readAsArrayBuffer(file);
    });

    // 📋 Show preview table (first 10 rows)
    function showPreview(data) {
      const container = document.getElementById("previewContainer");
      const table = document.getElementById("previewTable");
      container.style.display = "block";
      table.innerHTML = "";

      if (data.length === 0) {
        table.innerHTML = "<tr><td>No data found</td></tr>";
        return;
      }

      const headers = Object.keys(data[0]);
      let thead = "<tr>" + headers.map(h => `<th>${h}</th>`).join("") + "</tr>";
      let tbody = data.slice(0, 10)
                      .map(row => "<tr>" + headers.map(h => `<td>${row[h] ?? ""}</td>`).join("") + "</tr>")
                      .join("");

      table.innerHTML = thead + tbody;
    }

    // 🚀 Upload to Firebase with proper sanitization
    document.getElementById("uploadBtn").addEventListener("click", async () => {
      if (parsedData.length === 0) {
        document.getElementById("status").textContent = "⚠️ Please preview a file before uploading.";
        return;
      }

      document.getElementById("status").textContent = "⏳ Uploading to Firebase...";
      
      try {
        // Upload sanitized data
        await db.ref("expenses").set(parsedData);
        const now = new Date().toLocaleString();
        await db.ref("lastUploadTime").set(now);
        document.getElementById("status").textContent = "✅ Upload successful! (" + now + ")";
      } catch (err) {
        document.getElementById("status").textContent = "❌ Error: " + err.message;
        console.error("Upload error:", err);
      }
    });

  
