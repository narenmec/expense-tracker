
let parsedData = [];

function setUploadStatus(message, type) {
  setStatusBox(document.getElementById("status"), message, type);
}

document.getElementById("previewBtn").addEventListener("click", () => {
  const file = document.getElementById("excelFile").files[0];
  if (!file) {
    setUploadStatus("Please select a file first.", "warning");
    return;
  }

  setUploadStatus("Reading file…", "info");
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false });

      parsedData = rawData.map(row => {
        const processedRow = {};
        Object.keys(row).forEach(key => {
          let value = row[key];

          if (key.toLowerCase().includes("date") || key.toLowerCase().includes("period")) {
            if (typeof value === "number" && value > 25569) {
              const excelEpoch = new Date(1899, 11, 30);
              value = new Date(excelEpoch.getTime() + value * 86400000).toLocaleDateString("en-IN");
            } else if (value instanceof Date) {
              value = value.toLocaleDateString("en-IN");
            }
          }

          processedRow[key.replace(/[.#$/[\]]/g, "_")] = value;
        });
        return processedRow;
      });

      showPreview(parsedData);
      setUploadStatus(`Loaded ${parsedData.length} rows from "${sheetName}"`, "success");
    } catch (err) {
      setUploadStatus("Failed to read file: " + err.message, "error");
    }
  };
  reader.onerror = () => setUploadStatus("Could not read the selected file.", "error");
  reader.readAsArrayBuffer(file);
});

function showPreview(data) {
  const container = document.getElementById("previewContainer");
  const table = document.getElementById("previewTable");
  container.style.display = "block";
  table.innerHTML = "";

  if (!data.length) {
    table.innerHTML = "<tr><td>No data found</td></tr>";
    return;
  }

  const headers = Object.keys(data[0]);
  const thead = "<tr>" + headers.map(h => `<th>${h}</th>`).join("") + "</tr>";
  const tbody = data.slice(0, 10)
    .map(row => "<tr>" + headers.map(h => `<td>${row[h] ?? ""}</td>`).join("") + "</tr>")
    .join("");

  table.innerHTML = thead + tbody;
}

document.getElementById("uploadBtn").addEventListener("click", async () => {
  if (!parsedData.length) {
    setUploadStatus("Please preview a file before uploading.", "warning");
    return;
  }

  if (!db) {
    setUploadStatus("Cannot connect to server. Check your internet connection.", "error");
    return;
  }

  const btn = document.getElementById("uploadBtn");
  btn.classList.add("loading");
  btn.innerHTML = '<span class="spinner"></span> Uploading…';
  setUploadStatus("Uploading to Firebase…", "info");

  try {
    await db.ref("expenses").set(parsedData);
    const now = new Date().toLocaleString();
    await db.ref("lastUploadTime").set(now);
    setUploadStatus("Upload successful! " + now, "success");
  } catch (err) {
    setUploadStatus("Upload failed: " + err.message, "error");
    console.error("Upload error:", err);
  } finally {
    btn.classList.remove("loading");
    btn.innerHTML = "🚀 Upload to Firebase";
  }
});
