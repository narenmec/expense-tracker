// === DOM Elements ===
const fileInput = document.getElementById("excelFile");
const uploadBtn = document.getElementById("uploadBtn");
const loadDataBtn = document.getElementById("loadDataBtn");
const tableContainer = document.getElementById("table-container");
const categoryFilter = document.getElementById("categoryFilter");
const lastUploadDiv = document.getElementById("lastUpload"); // ✅ New element
let chart;

// === Firebase Upload with Deep Sanitization ===
uploadBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) return alert("⚠️ Please select an Excel file first!");

  if (!confirm("This will delete old records and upload fresh data. Continue?")) return;

  try {
    // 1️⃣ Clear old data
    await db.ref("expenses").remove();
    console.log("🧹 Old data cleared from Firebase");

    // 2️⃣ Read Excel file
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      console.log("✅ Parsed Data:", jsonData);

      // ✅ Deep sanitize keys recursively
      function sanitizeKeys(obj) {
        if (Array.isArray(obj)) {
          return obj.map(sanitizeKeys);
        } else if (obj !== null && typeof obj === "object") {
          const clean = {};
          Object.entries(obj).forEach(([key, value]) => {
            const safeKey = key.replace(/[.#$/[\]\/\s]/g, "_").trim();
            clean[safeKey] = sanitizeKeys(value);
          });
          return clean;
        }
        return obj;
      }

      const sanitizedData = jsonData.map(sanitizeKeys);
      console.log("🧩 Sanitized Data Example:", sanitizedData[0]);

      // 3️⃣ Upload to Firebase safely
      const uploadPromises = sanitizedData.map((row) =>
        db.ref("expenses").push(row)
      );
      await Promise.all(uploadPromises);

      // 4️⃣ Save Last Upload Timestamp
      const timestamp = new Date().toLocaleString();
      await db.ref("meta/lastUpload").set(timestamp);

      alert("✅ All records uploaded successfully!");
      updateLastUploadUI(timestamp);
    };

    reader.readAsArrayBuffer(file);
  } catch (error) {
    console.error("❌ Upload failed:", error);
    alert("❌ Error uploading data: " + error.message);
  }
});


// === Load Data from Firebase ===
loadDataBtn.addEventListener("click", async () => {
  const snapshot = await db.ref("expenses").get();
  if (!snapshot.exists()) return alert("No data found in Firebase!");

  const data = Object.values(snapshot.val());
  displayTable(data);
  populateCategoryFilter(data);
  showChart(data);
  fetchLastUploadTime();
});

// === Fetch & Show Last Upload Time ===
async function fetchLastUploadTime() {
  const snap = await db.ref("meta/lastUpload").get();
  if (snap.exists()) updateLastUploadUI(snap.val());
}

function updateLastUploadUI(time) {
  lastUploadDiv.innerHTML = `🕒 <b>Last Upload:</b> ${time}`;
}

// === Display Table ===
function displayTable(data) {
  let html = "<table border='1'><tr>";
  Object.keys(data[0]).forEach((key) => (html += `<th>${key}</th>`));
  html += "</tr>";

  data.forEach((row) => {
    html += "<tr>";
    Object.values(row).forEach((val) => (html += `<td>${val ?? ""}</td>`));
    html += "</tr>";
  });

  html += "</table>";
  tableContainer.innerHTML = html;
}

// === Populate Category Filter ===
function populateCategoryFilter(data) {
  const categories = [...new Set(data.map((d) => d.Category || d.category))];
  categoryFilter.innerHTML = `<option value="">All</option>`;
  categories.forEach((cat) => {
    categoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
  });

  categoryFilter.onchange = () => {
    const filtered = categoryFilter.value
      ? data.filter((d) => (d.Category || d.category) === categoryFilter.value)
      : data;
    displayTable(filtered);
    showChart(filtered);
  };
}

// === Show Chart ===
function showChart(data) {
  const expense = data
    .filter((d) => (d["Income/Expense"] || d.type) === "Exp.")
    .reduce((sum, d) => sum + Number(d.Amount || d.amount || 0), 0);

  const income = data
    .filter((d) => (d["Income/Expense"] || d.type) === "Inc.")
    .reduce((sum, d) => sum + Number(d.Amount || d.amount || 0), 0);

  const ctx = document.getElementById("expenseChart").getContext("2d");
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Expense", "Income"],
      datasets: [
        {
          label: "Amount (INR)",
          data: [expense, income],
          backgroundColor: ["#ff6384", "#36a2eb"],
        },
      ],
    },
    options: { responsive: true },
  });
}
// === Load Last Upload Time on Page Load ===
window.addEventListener("DOMContentLoaded", fetchLastUploadTime);

