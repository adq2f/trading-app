// ============================================
// Admin Panel — admin.js
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDSHI9UELxtQe0jrApkjg_F46LwKuG-vns",
  authDomain: "trading-app-b2b27.firebaseapp.com",
  projectId: "trading-app-b2b27",
  storageBucket: "trading-app-b2b27.firebasestorage.app",
  messagingSenderId: "664005846808",
  appId: "1:664005846808:web:9858549ad3a92715bf206d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM
const adminLogin = document.getElementById("admin-login");
const adminDashboard = document.getElementById("admin-dashboard");
const adminEmailInput = document.getElementById("admin-email");
const adminPasswordInput = document.getElementById("admin-password");
const adminLoginBtn = document.getElementById("admin-login-btn");
const adminMessage = document.getElementById("admin-message");
const adminEmailDisplay = document.getElementById("admin-email-display");
const adminLogoutBtn = document.getElementById("admin-logout");

const statUsers = document.getElementById("stat-users");
const statActiveTrades = document.getElementById("stat-active-trades");
const statPendingDeposits = document.getElementById("stat-pending-deposits");
const statPendingWithdrawals = document.getElementById("stat-pending-withdrawals");

const adminTabs = document.querySelectorAll(".admin-tab");
const tabPanes = document.querySelectorAll(".admin-tab-pane");

const usersList = document.getElementById("users-list");
const tradesList = document.getElementById("trades-list");
const depositsList = document.getElementById("deposits-list");
const withdrawalsList = document.getElementById("withdrawals-list");

const refreshUsers = document.getElementById("refresh-users");
const refreshTrades = document.getElementById("refresh-trades");
const refreshDeposits = document.getElementById("refresh-deposits");
const refreshWithdrawals = document.getElementById("refresh-withdrawals");

const winRateInput = document.getElementById("win-rate-input");
const saveWinRateBtn = document.getElementById("save-win-rate");
const payoutInput = document.getElementById("payout-input");
const savePayoutBtn = document.getElementById("save-payout");
const marketUpBtn = document.getElementById("market-up");
const marketDownBtn = document.getElementById("market-down");
const marketResetBtn = document.getElementById("market-reset");
const autoModeToggle = document.getElementById("auto-mode-toggle");

let currentAdmin = null;
let usersUnsub = null;
let tradesUnsub = null;
let depositsUnsub = null;
let withdrawalsUnsub = null;
let currentWinRate = 50;
let currentPayout = 85;
let isAutoMode = false;

// ===== Admin Login =====
if (adminLoginBtn) {
  adminLoginBtn.addEventListener("click", async () => {
    const email = adminEmailInput.value.trim();
    const password = adminPasswordInput.value;

    if (!email || !password) {
      adminMessage.textContent = "ইমেইল ও পাসওয়ার্ড দিন";
      return;
    }

    try {
      adminMessage.style.color = "#2196f3";
      adminMessage.textContent = "লগইন হচ্ছে...";

      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", userCred.user.uid));

      if (!userDoc.exists() || userDoc.data().role !== "admin") {
        await signOut(auth);
        adminMessage.style.color = "#ff5252";
        adminMessage.textContent = "❌ আপনি অ্যাডমিন নন";
        return;
      }

      adminMessage.style.color = "#00c853";
      adminMessage.textContent = "লগইন সফল!";

    } catch (error) {
      adminMessage.style.color = "#ff5252";
      adminMessage.textContent = error.message;
    }
  });
}

if (adminLogoutBtn) {
  adminLogoutBtn.addEventListener("click", async () => {
    if (confirm("লগআউট করবেন?")) {
      await signOut(auth);
    }
  });
}

// ===== Auth State =====
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists() || userDoc.data().role !== "admin") {
        adminLogin.classList.remove("hidden");
        adminDashboard.classList.add("hidden");
        adminMessage.style.color = "#ff5252";
        adminMessage.textContent = "❌ আপনি অ্যাডমিন নন";
        await signOut(auth);
        return;
      }

      currentAdmin = user;
      adminLogin.classList.add("hidden");
      adminDashboard.classList.remove("hidden");
      adminEmailDisplay.textContent = user.email;

      loadStats();
      loadUsers();
      loadTrades();
      loadDeposits();
      loadWithdrawals();
      loadSettings();

    } catch (err) {
      console.error(err);
      await signOut(auth);
    }
  } else {
    currentAdmin = null;
    adminLogin.classList.remove("hidden");
    adminDashboard.classList.add("hidden");
    adminEmailInput.value = "";
    adminPasswordInput.value = "";

    if (usersUnsub) usersUnsub();
    if (tradesUnsub) tradesUnsub();
    if (depositsUnsub) depositsUnsub();
    if (withdrawalsUnsub) withdrawalsUnsub();
  }
});

// ===== Tabs =====
adminTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    adminTabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    tabPanes.forEach(p => p.classList.remove("active"));
    const target = document.getElementById("tab-" + tab.dataset.tab);
    if (target) target.classList.add("active");
  });
});

if (refreshUsers) refreshUsers.addEventListener("click", () => loadUsers());
if (refreshTrades) refreshTrades.addEventListener("click", () => loadTrades());
if (refreshDeposits) refreshDeposits.addEventListener("click", () => loadDeposits());
if (refreshWithdrawals) refreshWithdrawals.addEventListener("click", () => loadWithdrawals());

// ===== Stats =====
async function loadStats() {
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    if (statUsers) statUsers.textContent = usersSnap.size;

    const activeTradesSnap = await getDocs(query(collection(db, "trades"), where("status", "==", "pending")));
    if (statActiveTrades) statActiveTrades.textContent = activeTradesSnap.size;

    const depositsSnap = await getDocs(query(collection(db, "deposits"), where("status", "==", "pending")));
    if (statPendingDeposits) statPendingDeposits.textContent = depositsSnap.size;

    const withdrawalsSnap = await getDocs(query(collection(db, "withdrawals"), where("status", "==", "pending")));
    if (statPendingWithdrawals) statPendingWithdrawals.textContent = withdrawalsSnap.size;
  } catch (err) {
    console.error(err);
  }
}

// ===== Users =====
function loadUsers() {
  if (!usersList) return;
  usersList.innerHTML = '<p class="loading-text">লোড হচ্ছে...</p>';
  if (usersUnsub) usersUnsub();

  usersUnsub = onSnapshot(collection(db, "users"), (snapshot) => {
    usersList.innerHTML = "";
    if (snapshot.empty) {
      usersList.innerHTML = '<p class="loading-text">কোনো ইউজার নেই</p>';
      return;
    }
    const users = [];
    snapshot.forEach(d => users.push({ id: d.id, ...d.data() }));
    users.sort((a, b) => {
      const aT = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bT = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bT - aT;
    });
    users.forEach(u => renderUserItem(u));
    loadStats();
  });
}

function renderUserItem(user) {
  const div = document.createElement("div");
  div.className = "admin-item";

  const roleBadge = user.role === "admin"
    ? '<span class="admin-item-badge badge-admin">ADMIN</span>'
    : '<span class="admin-item-badge badge-user">USER</span>';

  const demoBal = (user.demoBalance ?? 1000).toFixed(2);
  const realBal = (user.realBalance ?? 0).toFixed(2);
  const accType = user.accountType || "demo";
  const joined = user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-GB") : "-";

  div.innerHTML = `
    <div class="admin-item-header">
      <div class="admin-item-title">${user.email || "no-email"}</div>
      ${roleBadge}
    </div>
    <div class="admin-item-info">
      <span>ডেমো: <strong>$${demoBal}</strong></span>
      <span>রিয়েল: <strong>$${realBal}</strong></span>
      <span>টাইপ: <strong>${accType}</strong></span>
      <span>জয়েন: <strong>${joined}</strong></span>
    </div>
    <div class="admin-item-actions">
      <button class="btn-action btn-edit" data-action="edit-demo" data-uid="${user.id}" data-bal="${user.demoBalance ?? 1000}">✏️ ডেমো</button>
      <button class="btn-action btn-edit" data-action="edit-real" data-uid="${user.id}" data-bal="${user.realBalance ?? 0}">✏️ রিয়েল</button>
      <button class="btn-action btn-force-win" data-action="win-rate" data-uid="${user.id}" data-rate="${user.winRate ?? 50}">🎯 Win Rate</button>
      <button class="btn-action btn-reject" data-action="ban" data-uid="${user.id}" data-banned="${user.banned ? "true" : "false"}">${user.banned ? "✅ আনব্যান" : "🚫 ব্যান"}</button>
    </div>
  `;
  usersList.appendChild(div);
}

if (usersList) {
  usersList.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const uid = btn.dataset.uid;
    if (!uid) return;

    if (action === "edit-demo") await editBalance(uid, "demoBalance", btn.dataset.bal);
    else if (action === "edit-real") await editBalance(uid, "realBalance", btn.dataset.bal);
    else if (action === "win-rate") await editWinRate(uid, btn.dataset.rate);
    else if (action === "ban") await toggleBan(uid, btn.dataset.banned === "true");
  });
}

async function editBalance(uid, field, currentValue) {
  const label = field === "demoBalance" ? "ডেমো" : "রিয়েল";
  const input = prompt(`${label} ব্যালেন্স (বর্তমান: $${currentValue})`, currentValue);
  if (input === null) return;
  const newVal = parseFloat(input);
  if (isNaN(newVal) || newVal < 0) { alert("❌ ভুল মান"); return; }
  try {
    await updateDoc(doc(db, "users", uid), { [field]: newVal });
    alert(`✅ ${label} ব্যালেন্স: $${newVal.toFixed(2)}`);
  } catch (err) { alert("❌ " + err.message); }
}

async function editWinRate(uid, currentRate) {
  const input = prompt(`Win Rate % (বর্তমান: ${currentRate}%)`, currentRate);
  if (input === null) return;
  const rate = parseInt(input);
  if (isNaN(rate) || rate < 0 || rate > 100) { alert("❌ 0-100"); return; }
  try {
    await updateDoc(doc(db, "users", uid), { winRate: rate });
    alert(`✅ Win Rate: ${rate}%`);
  } catch (err) { alert("❌ " + err.message); }
}

async function toggleBan(uid, isBanned) {
  const action = isBanned ? "আনব্যান" : "ব্যান";
  if (!confirm(`${action} করবেন?`)) return;
  try {
    await updateDoc(doc(db, "users", uid), { banned: !isBanned });
    alert(`✅ ${action} সম্পন্ন`);
  } catch (err) { alert("❌ " + err.message); }
}

// ===== Trades =====
function loadTrades() {
  if (!tradesList) return;
  tradesList.innerHTML = '<p class="loading-text">লোড হচ্ছে...</p>';
  if (tradesUnsub) tradesUnsub();

  tradesUnsub = onSnapshot(collection(db, "trades"), (snapshot) => {
    tradesList.innerHTML = "";
    if (snapshot.empty) {
      tradesList.innerHTML = '<p class="loading-text">কোনো ট্রেড নেই</p>';
      return;
    }
    const trades = [];
    snapshot.forEach(d => trades.push({ id: d.id, ...d.data() }));
    trades.sort((a, b) => {
      const aT = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bT = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bT - aT;
    });
    trades.slice(0, 100).forEach(t => renderTradeItem(t));
  });
}

function renderTradeItem(trade) {
  const div = document.createElement("div");
  div.className = "admin-item";

  let statusBadge = "";
  if (trade.status === "pending") statusBadge = '<span class="admin-item-badge badge-pending">PENDING</span>';
  else if (trade.result === "win") statusBadge = '<span class="admin-item-badge badge-win">WIN</span>';
  else if (trade.result === "loss") statusBadge = '<span class="admin-item-badge badge-loss">LOSS</span>';

  const entryPrice = (trade.entryPrice || 0).toFixed(2);
  const exitPrice = (trade.exitPrice || 0).toFixed(2);
  const profit = trade.profit ? trade.profit.toFixed(2) : "0.00";
  const created = trade.createdAt ? new Date(trade.createdAt).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "-";

  div.innerHTML = `
    <div class="admin-item-header">
      <div class="admin-item-title">${trade.userEmail || "no-email"}</div>
      ${statusBadge}
    </div>
    <div class="admin-item-info">
      <span>Type: <strong>${trade.type?.toUpperCase()}</strong></span>
      <span>Amount: <strong>$${trade.amount}</strong></span>
      <span>Entry: <strong>$${entryPrice}</strong></span>
      <span>Exit: <strong>$${exitPrice}</strong></span>
      <span>Profit: <strong>$${profit}</strong></span>
      <span>Time: <strong>${created}</strong></span>
    </div>
    <div class="admin-item-actions">
      <button class="btn-action btn-force-win" data-action="force-win" data-tid="${trade.id}">✅ জেতাও</button>
      <button class="btn-action btn-force-loss" data-action="force-loss" data-tid="${trade.id}">❌ হারাও</button>
      <button class="btn-action btn-force-pending" data-action="force-pending" data-tid="${trade.id}">⏳ Pending</button>
    </div>
  `;
  tradesList.appendChild(div);
}

if (tradesList) {
  tradesList.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const tid = btn.dataset.tid;
    if (!tid) return;
    if (action === "force-win") await forceTradeResult(tid, "win");
    else if (action === "force-loss") await forceTradeResult(tid, "loss");
    else if (action === "force-pending") await forceTradeResult(tid, "pending");
  });
}

async function forceTradeResult(tradeId, result) {
  if (!confirm(`ট্রেড ${result} করবেন?`)) return;
  try {
    const tradeRef = doc(db, "trades", tradeId);
    const tradeDoc = await getDoc(tradeRef);
    if (!tradeDoc.exists()) { alert("❌ ট্রেড নেই"); return; }
    const trade = tradeDoc.data();

    if (result === "pending") {
      await updateDoc(tradeRef, { status: "pending", result: null, profit: 0 });
      alert("✅ Pending");
      return;
    }

    const payoutRate = currentPayout / 100 + 1;
    const profit = result === "win" ? trade.amount * payoutRate : 0;

    await updateDoc(tradeRef, {
      status: "completed",
      result: result,
      profit: profit,
      exitPrice: trade.entryPrice,
      completedAt: new Date().toISOString()
    });

    if (result === "win") {
      const userRef = doc(db, "users", trade.userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const field = trade.accountType === "real" ? "realBalance" : "demoBalance";
        const currentBal = userData[field] ?? 0;
        await updateDoc(userRef, { [field]: currentBal + profit });
      }
    }

    alert(`✅ ${result === "win" ? "জেতানো" : "হারানো"} হয়েছে`);
  } catch (err) { alert("❌ " + err.message); }
}

// ===== Deposits =====
function loadDeposits() {
  if (!depositsList) return;
  depositsList.innerHTML = '<p class="loading-text">লোড হচ্ছে...</p>';
  if (depositsUnsub) depositsUnsub();

  depositsUnsub = onSnapshot(collection(db, "deposits"), (snapshot) => {
    depositsList.innerHTML = "";
    if (snapshot.empty) {
      depositsList.innerHTML = '<p class="loading-text">কোনো ডিপোজিট নেই</p>';
      return;
    }
    const deposits = [];
    snapshot.forEach(d => deposits.push({ id: d.id, ...d.data() }));
    deposits.sort((a, b) => {
      const aT = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bT = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bT - aT;
    });
    deposits.forEach(d => renderDepositItem(d));
  });
}

function renderDepositItem(dep) {
  const div = document.createElement("div");
  div.className = "admin-item";

  let statusBadge = "";
  if (dep.status === "pending") statusBadge = '<span class="admin-item-badge badge-pending">PENDING</span>';
  else if (dep.status === "approved") statusBadge = '<span class="admin-item-badge badge-win">APPROVED</span>';
  else statusBadge = '<span class="admin-item-badge badge-rejected">REJECTED</span>';

  const created = dep.createdAt ? new Date(dep.createdAt).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "-";

  div.innerHTML = `
    <div class="admin-item-header">
      <div class="admin-item-title">${dep.email || "no-email"}</div>
      ${statusBadge}
    </div>
    <div class="admin-item-info">
      <span>Amount: <strong>$${dep.amount}</strong></span>
      <span>Method: <strong>${dep.method || "manual"}</strong></span>
      <span class="full-width">TrxID: <strong>${dep.txid || "-"}</strong></span>
      <span class="full-width">Time: <strong>${created}</strong></span>
    </div>
    <div class="admin-item-actions">
      <button class="btn-action btn-approve" data-action="approve-dep" data-did="${dep.id}">✅ অ্যাপ্রুভ</button>
      <button class="btn-action btn-reject" data-action="reject-dep" data-did="${dep.id}">❌ রিজেক্ট</button>
    </div>
  `;
  depositsList.appendChild(div);
}

if (depositsList) {
  depositsList.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const did = btn.dataset.did;
    if (!did) return;
    if (action === "approve-dep") await approveDeposit(did);
    else if (action === "reject-dep") await rejectDeposit(did);
  });
}

async function approveDeposit(depositId) {
  if (!confirm("অ্যাপ্রুভ করবেন?")) return;
  try {
    const depRef = doc(db, "deposits", depositId);
    const depDoc = await getDoc(depRef);
    if (!depDoc.exists()) { alert("❌ নেই"); return; }
    const dep = depDoc.data();
    if (dep.status === "approved") { alert("⚠️ আগেই অ্যাপ্রুভ"); return; }

    const userRef = doc(db, "users", dep.userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const currentReal = userDoc.data().realBalance ?? 0;
      await updateDoc(userRef, { realBalance: currentReal + dep.amount });
    }

    await updateDoc(depRef, { status: "approved", approvedAt: new Date().toISOString() });
    alert("✅ অ্যাপ্রুভ হয়েছে");
    loadStats();
  } catch (err) { alert("❌ " + err.message); }
}

async function rejectDeposit(depositId) {
  if (!confirm("রিজেক্ট করবেন?")) return;
  try {
    await updateDoc(doc(db, "deposits", depositId), { status: "rejected", rejectedAt: new Date().toISOString() });
    alert("✅ রিজেক্ট");
    loadStats();
  } catch (err) { alert("❌ " + err.message); }
}

// ===== Withdrawals =====
function loadWithdrawals() {
  if (!withdrawalsList) return;
  withdrawalsList.innerHTML = '<p class="loading-text">লোড হচ্ছে...</p>';
  if (withdrawalsUnsub) withdrawalsUnsub();

  withdrawalsUnsub = onSnapshot(collection(db, "withdrawals"), (snapshot) => {
    withdrawalsList.innerHTML = "";
    if (snapshot.empty) {
      withdrawalsList.innerHTML = '<p class="loading-text">কোনো উইথড্র নেই</p>';
      return;
    }
    const withdrawals = [];
    snapshot.forEach(d => withdrawals.push({ id: d.id, ...d.data() }));
    withdrawals.sort((a, b) => {
      const aT = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bT = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bT - aT;
    });
    withdrawals.forEach(w => renderWithdrawItem(w));
  });
}

function renderWithdrawItem(w) {
  const div = document.createElement("div");
  div.className = "admin-item";

  let statusBadge = "";
  if (w.status === "pending") statusBadge = '<span class="admin-item-badge badge-pending">PENDING</span>';
  else if (w.status === "approved") statusBadge = '<span class="admin-item-badge badge-win">APPROVED</span>';
  else statusBadge = '<span class="admin-item-badge badge-rejected">REJECTED</span>';

  const created = w.createdAt ? new Date(w.createdAt).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "-";

  div.innerHTML = `
    <div class="admin-item-header">
      <div class="admin-item-title">${w.email || "no-email"}</div>
      ${statusBadge}
    </div>
    <div class="admin-item-info">
      <span>Amount: <strong>$${w.amount}</strong></span>
      <span>Method: <strong>${w.method || "-"}</strong></span>
      <span class="full-width">Number: <strong>${w.number || "-"}</strong></span>
      <span class="full-width">Time: <strong>${created}</strong></span>
    </div>
    <div class="admin-item-actions">
      <button class="btn-action btn-approve" data-action="approve-wd" data-wid="${w.id}">✅ অ্যাপ্রুভ</button>
      <button class="btn-action btn-reject" data-action="reject-wd" data-wid="${w.id}">❌ রিজেক্ট</button>
    </div>
  `;
  withdrawalsList.appendChild(div);
}

if (withdrawalsList) {
  withdrawalsList.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const wid = btn.dataset.wid;
    if (!wid) return;
    if (action === "approve-wd") await approveWithdrawal(wid);
    else if (action === "reject-wd") await rejectWithdrawal(wid);
  });
}

async function approveWithdrawal(wid) {
  if (!confirm("অ্যাপ্রুভ করবেন?")) return;
  try {
    const wRef = doc(db, "withdrawals", wid);
    const wDoc = await getDoc(wRef);
    if (!wDoc.exists()) { alert("❌ নেই"); return; }
    const w = wDoc.data();
    if (w.status === "approved") { alert("⚠️ আগেই অ্যাপ্রুভ"); return; }

    const userRef = doc(db, "users", w.userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const currentReal = userDoc.data().realBalance ?? 0;
      if (currentReal < w.amount) { alert("⚠️ ব্যালেন্স কম"); return; }
      await updateDoc(userRef, { realBalance: currentReal - w.amount });
    }

    await updateDoc(wRef, { status: "approved", approvedAt: new Date().toISOString() });
    alert("✅ অ্যাপ্রুভ");
    loadStats();
  } catch (err) { alert("❌ " + err.message); }
}

async function rejectWithdrawal(wid) {
  if (!confirm("রিজেক্ট করবেন?")) return;
  try {
    await updateDoc(doc(db, "withdrawals", wid), { status: "rejected", rejectedAt: new Date().toISOString() });
    alert("✅ রিজেক্ট");
    loadStats();
  } catch (err) { alert("❌ " + err.message); }
}

// ===== Settings =====
async function loadSettings() {
  try {
    const settingsDoc = await getDoc(doc(db, "settings", "global"));
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      currentWinRate = data.winRate ?? 50;
      currentPayout = data.payout ?? 85;
      isAutoMode = data.autoMode ?? false;
      if (winRateInput) winRateInput.value = currentWinRate;
      if (payoutInput) payoutInput.value = currentPayout;
      updateAutoModeButton();
    }
  } catch (err) { console.error(err); }
}

if (saveWinRateBtn) {
  saveWinRateBtn.addEventListener("click", async () => {
    const val = parseInt(winRateInput.value);
    if (isNaN(val) || val < 0 || val > 100) { alert("❌ 0-100"); return; }
    try {
      await setDoc(doc(db, "settings", "global"), { winRate: val }, { merge: true });
      currentWinRate = val;
      alert(`✅ Win Rate: ${val}%`);
    } catch (err) { alert("❌ " + err.message); }
  });
}

if (savePayoutBtn) {
  savePayoutBtn.addEventListener("click", async () => {
    const val = parseInt(payoutInput.value);
    if (isNaN(val) || val < 0 || val > 200) { alert("❌ 0-200"); return; }
    try {
      await setDoc(doc(db, "settings", "global"), { payout: val }, { merge: true });
      currentPayout = val;
      alert(`✅ Payout: ${val}%`);
    } catch (err) { alert("❌ " + err.message); }
  });
}

if (marketUpBtn) {
  marketUpBtn.addEventListener("click", async () => {
    try {
      const settingsDoc = await getDoc(doc(db, "settings", "global"));
      let currentForce = 0;
      if (settingsDoc.exists()) currentForce = settingsDoc.data().forceMarket ?? 0;
      await setDoc(doc(db, "settings", "global"), {
        forceMarket: currentForce + 1,
        forceMarketAt: Date.now()
      }, { merge: true });
      marketUpBtn.style.transform = "scale(1.1)";
      setTimeout(() => marketUpBtn.style.transform = "", 200);
    } catch (err) { console.error(err); }
  });
}

if (marketDownBtn) {
  marketDownBtn.addEventListener("click", async () => {
    try {
      const settingsDoc = await getDoc(doc(db, "settings", "global"));
      let currentForce = 0;
      if (settingsDoc.exists()) currentForce = settingsDoc.data().forceMarket ?? 0;
      await setDoc(doc(db, "settings", "global"), {
        forceMarket: currentForce - 1,
        forceMarketAt: Date.now()
      }, { merge: true });
      marketDownBtn.style.transform = "scale(1.1)";
      setTimeout(() => marketDownBtn.style.transform = "", 200);
    } catch (err) { console.error(err); }
  });
}

if (marketResetBtn) {
  marketResetBtn.addEventListener("click", async () => {
    try {
      await setDoc(doc(db, "settings", "global"), {
        forceMarket: 0,
        forceMarketAt: Date.now()
      }, { merge: true });
      alert("✅ রিসেট");
    } catch (err) { alert("❌ " + err.message); }
  });
}

if (autoModeToggle) {
  autoModeToggle.addEventListener("click", async () => {
    isAutoMode = !isAutoMode;
    try {
      await setDoc(doc(db, "settings", "global"), { autoMode: isAutoMode }, { merge: true });
      updateAutoModeButton();
      alert(isAutoMode ? "✅ Auto Mode চালু" : "⏸ Auto Mode বন্ধ");
    } catch (err) { alert("❌ " + err.message); isAutoMode = !isAutoMode; updateAutoModeButton(); }
  });
}

function updateAutoModeButton() {
  if (!autoModeToggle) return;
  if (isAutoMode) {
    autoModeToggle.classList.add("active");
    autoModeToggle.textContent = "🟢 Auto Mode: চালু";
  } else {
    autoModeToggle.classList.remove("active");
    autoModeToggle.textContent = "⚫ Auto Mode: বন্ধ";
  }
}
