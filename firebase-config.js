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

// Initialize Firebase (only once)
firebase.initializeApp(firebaseConfig);

// Export database reference (optional for modular reuse)
const db = firebase.database();
