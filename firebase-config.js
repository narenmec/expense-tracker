// ============================
// Firebase Configuration
// ============================
const firebaseConfig = {
  apiKey: "AIzaSyAO96bxbGfz7cpwK2egALEZFL1sgzDa6AA",
  authDomain: "expensetracker-bfe87.firebaseapp.com",
  databaseURL: "https://expensetracker-bfe87-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "expensetracker-bfe87",
  storageBucket: "expensetracker-bfe87.firebasestorage.app",
  messagingSenderId: "784239033436",
  appId: "1:784239033436:web:5f3c4a53f5d4287d20fa99"
};

let db = null;

try {
  if (typeof firebase === "undefined") {
    console.error("Firebase SDK not loaded. Include firebase-app-compat and firebase-database-compat before this file.");
  } else {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
  }
} catch (err) {
  console.error("Firebase initialization failed:", err);
}

/** Monitor Realtime Database connection state */
function monitorConnection(onChange) {
  if (!db) {
    onChange("offline");
    return;
  }
  const connectedRef = db.ref(".info/connected");
  connectedRef.on("value", (snap) => {
    onChange(snap.val() ? "online" : "offline");
  });
}

/** Update a connection badge element */
function setConnectionBadge(el, state) {
  if (!el) return;
  el.className = "conn-badge conn-" + state;
  const labels = { online: "Connected", offline: "Offline", connecting: "Connecting…" };
  el.textContent = labels[state] || state;
}
