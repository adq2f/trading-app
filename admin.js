// ============================================
// Admin Panel - admin.js
// Part 3-6B-3 Complete (Clean)
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
  deleteDoc,
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
const marketsList = document.getElementById("markets-list");

const refreshUsers = document.getElementById("refresh-users");
const refreshTrades = document.getElementById("refresh-trades");
const refreshDeposits = document.getElementById("refresh-deposits");
const refreshWithdrawals = document.getElementById("refresh-withdrawals");
const refreshMarkets = document.getElementById("refresh-markets");

const newMarketName = document.getElementById("new-market-name");
const newMarketSymbol = document.getElementById("new-market-symbol");
const newMarketBase = document.getElementById("new-market-base");
const createMarketBtn = document.getElementById("create-market-btn");

const winRateInput = document.getElementById("win-rate-input");
const saveWinRateBtn = document.getElementById("save-win-rate");
const payoutInput = document.getElementById("payout-input");
const savePayoutBtn = document.getElementById("save-payout");
const autoIntervalInput = document.getElementById("auto-interval-input");
const saveAutoIntervalBtn = document.getElementById("save-auto-interval");
const autoModeToggle = document.getElementById("auto-mode-toggle");

let currentAdmin = null;
let usersUnsub = null;
let tradesUnsub = null;
let depositsUnsub = null;
let withdrawalsUnsub = null;
let marketsUnsub = null;
let currentWinRate = 50;
let currentPayout = 85;
let currentAutoInterval = 5;
let isAutoMode = false;

// ============================================
// ADMIN LOGIN
// ============================================
if (adminLoginBtn) {
  adminLoginBtn.addEventListener("click", async () => {
    const email = adminEmailInput.value.trim();
    const password = adminPasswordInput.value;

    if (!email || !password) {
      adminMessage.textContent = "Email and password required";
      return;
    }

    try {
      adminMessage.style.color = "#2196f3";
      adminMessage.textContent = "Logging in...";

      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", userCred.user.uid));

      if (!userDoc.exists() || userDoc.data().role !== "admin") {
        await signOut(auth);
        adminMessage.style.color = "#ff5252";
        adminMessage.textContent = "Not an admin";
        return;
      }

      adminMessage.style.color = "#00c853";
      adminMessage.textContent = "Login successful!";
    } catch (error) {
      adminMessage.style.color = "#ff5252";
      adminMessage.textContent = error.message;
    }
  });
}

if (adminLogoutBtn) {
  adminLogoutBtn.addEventListener("click", async () => {
    if (confirm("Logout?")) {
      await signOut(auth);
    }
  });
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists() || userDoc.data().role !== "admin") {
        adminLogin.classList.remove("hidden");
        adminDashboard.classList.add("hidden");
        adminMessage.style.color = "#ff5252";
        adminMessage.textContent = "Not an admin";
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
      loadMarkets();
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
    if (marketsUnsub) marketsUnsub();
  }
});

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
if (refreshMarkets) refreshMarkets.addEventListener("click", () => loadMarkets());

// ============================================
// MARKET CRUD
// ============================================
if (createMarketBtn) {
  createMarketBtn.addEventListener("click", async () => {
    const name = newMarketName.value.trim();
    const symbol = newMarketSymbol.value.trim().toUpperCase();
    const base = parseFloat(newMarketBase.value) || 50000;

    if (!name || !symbol) {
      alert("Name and symbol required");
      return;
    }

    try {
      const marketId = symbol.toLowerCase() + "_" + Date.now();
      await setDoc(doc(db, "markets", marketId), {
        id: marketId,
        name: name,
        symbol: symbol,
        basePrice: base,
        currentPrice: base,
        enabled: true,
        payout: currentPayout,
        winRate: currentWinRate,
        candleMode: "random",
        currentCandleIndex: 0,
        autoModeInterval: currentAutoInterval,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      newMarketName.value = "";
      newMarketSymbol.value = "";
      newMarketBase.value = "50000";
      alert(name + " created!");
    } catch (err) {
      alert(err.message);
    }
  });
}

function loadMarkets() {
  if (!marketsList) return;
  marketsList.innerHTML = '<p class="loading-text">Loading...</p>';
  if (marketsUnsub) marketsUnsub();

  marketsUnsub = onSnapshot(collection(db, "markets"), (snap) => {
    marketsList.innerHTML = "";
    if (snap.empty) {
      marketsList.innerHTML = '<p class="loading-text">No markets</p>';
      updateCandleMarketSelect([]);
      return;
    }
    const markets = [];
    snap.forEach(d => markets.push({ id: d.id, ...d.data() }));
    markets.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    markets.forEach(m => renderMarketItem(m));
    updateCandleMarketSelect(markets);
  });
}

function renderMarketItem(market) {
  const div = document.createElement("div");
  div.className = "market-item" + (market.enabled ? "" : " disabled");
  div.dataset.marketId = market.id;

  const enabledBadge = market.enabled
    ? '<span class="admin-item-badge badge-win">ACTIVE</span>'
    : '<span class="admin-item-badge badge-rejected">DISABLED</span>';

  div.innerHTML = `
    <div class="market-item-header">
      <div class="market-item-name">${market.name || "no-name"}</div>
      ${enabledBadge}
    </div>
    <div class="market-item-info">
      <span>Symbol: <strong>${market.symbol || "-"}</strong></span>
      <span>Base: <strong>$${(market.basePrice || 0).toFixed(2)}</strong></span>
      <span>Payout: <strong>${market.payout || 85}%</strong></span>
      <span>Win Rate: <strong>${market.winRate || 50}%</strong></span>
      <span>Mode: <strong>${market.candleMode || "random"}</strong></span>
      <span>Candle: <strong>#${market.currentCandleIndex || 0}</strong></span>
    </div>
    <div class="market-item-actions">
      <button class="btn-action btn-edit" data-action="edit-market" data-mid="${market.id}">Edit</button>
      <button class="btn-action ${market.enabled ? 'btn-reject' : 'btn-approve'}"
              data-action="toggle-market" data-mid="${market.id}" data-enabled="${market.enabled}">
        ${market.enabled ? "Disable" : "Enable"}
      </button>
      <button class="btn-action btn-reject" data-action="delete-market" data-mid="${market.id}">Delete</button>
    </div>
  `;
  marketsList.appendChild(div);
}

if (marketsList) {
  marketsList.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const mid = btn.dataset.mid;
    if (!mid) return;
    if (action === "edit-market") await editMarket(mid);
    else if (action === "toggle-market") await toggleMarket(mid, btn.dataset.enabled === "true");
    else if (action === "delete-market") await deleteMarket(mid);
  });
}

async function editMarket(mid) {
  try {
    const marketDoc = await getDoc(doc(db, "markets", mid));
    if (!marketDoc.exists()) { alert("Not found"); return; }
    const m = marketDoc.data();
    const newName = prompt("Name:", m.name || "");
    if (newName === null) return;
    const newPayout = prompt("Payout %:", m.payout || 85);
    if (newPayout === null) return;
    const newWinRate = prompt("Win Rate %:", m.winRate || 50);
    if (newWinRate === null) return;

    const payoutVal = parseInt(newPayout);
    const winVal = parseInt(newWinRate);

    if (isNaN(payoutVal) || payoutVal < 0 || payoutVal > 200) { alert("Payout 0-200"); return; }
    if (isNaN(winVal) || winVal < 0 || winVal > 100) { alert("Win Rate 0-100"); return; }

    await updateDoc(doc(db, "markets", mid), {
      name: newName,
      payout: payoutVal,
      winRate: winVal,
      updatedAt: new Date().toISOString()
    });
    alert("Updated");
  } catch (err) { alert(err.message); }
}

async function toggleMarket(mid, isEnabled) {
  const action = isEnabled ? "Disable" : "Enable";
  if (!confirm(action + "?")) return;
  try {
    await updateDoc(doc(db, "markets", mid), {
      enabled: !isEnabled,
      updatedAt: new Date().toISOString()
    });
    alert(action + " done");
  } catch (err) { alert(err.message); }
}

async function deleteMarket(mid) {
  if (!confirm("Delete this market and all candles?")) return;
  if (!confirm("Really delete?")) return;
  try {
    const candlesSnap = await getDocs(collection(db, "markets", mid, "candles"));
    for (const c of candlesSnap.docs) {
      await deleteDoc(doc(db, "markets", mid, "candles", c.id));
    }
    await deleteDoc(doc(db, "markets", mid));
    alert("Deleted");
  } catch (err) { alert(err.message); }
}

function updateCandleMarketSelect(markets) {
  const sel = document.getElementById("candle-market-select");
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">-- Select Market --</option>';
  markets.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name + " (" + m.symbol + ")";
    sel.appendChild(opt);
  });
  if (current) sel.value = current;
}

// ============================================
// STATS
// ============================================
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
  } catch (err) { console.error("Stats error:", err); }
}

// ============================================
// USERS
// ============================================
function loadUsers() {
  if (!usersList) return;
  usersList.innerHTML = '<p class="loading-text">Loading...</p>';
  if (usersUnsub) usersUnsub();

  usersUnsub = onSnapshot(collection(db, "users"), (snap) => {
    usersList.innerHTML = "";
    if (snap.empty) {
      usersList.innerHTML = '<p class="loading-text">No users</p>';
      return;
    }
    const users = [];
    snap.forEach(d => users.push({ id: d.id, ...d.data() }));
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
  const joined = user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-GB") : "-";

  div.innerHTML = `
    <div class="admin-item-header">
      <div class="admin-item-title">${user.email || "no-email"}</div>
      ${roleBadge}
    </div>
    <div class="admin-item-info">
      <span>Demo: <strong>$${demoBal}</strong></span>
      <span>Real: <strong>$${realBal}</strong></span>
      <span>Joined: <strong>${joined}</strong></span>
      <span>Banned: <strong>${user.banned ? "Yes" : "No"}</strong></span>
    </div>
    <div class="admin-item-actions">
      <button class="btn-action btn-edit" data-action="edit-demo" data-uid="${user.id}" data-bal="${user.demoBalance ?? 1000}">Demo</button>
      <button class="btn-action btn-edit" data-action="edit-real" data-uid="${user.id}" data-bal="${user.realBalance ?? 0}">Real</button>
      <button class="btn-action ${user.banned ? 'btn-approve' : 'btn-reject'}" data-action="ban" data-uid="${user.id}" data-banned="${user.banned ? "true" : "false"}">${user.banned ? "Unban" : "Ban"}</button>
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
    else if (action === "ban") await toggleBan(uid, btn.dataset.banned === "true");
  });
}

async function editBalance(uid, field, currentValue) {
  const label = field === "demoBalance" ? "Demo" : "Real";
  const input = prompt(label + " Balance (current: $" + currentValue + ")", currentValue);
  if (input === null) return;
  const newVal = parseFloat(input);
  if (isNaN(newVal) || newVal < 0) { alert("Invalid value"); return; }
  try {
    await updateDoc(doc(db, "users", uid), { [field]: newVal });
    alert(label + ": $" + newVal.toFixed(2));
  } catch (err) { alert(err.message); }
}

async function toggleBan(uid, isBanned) {
  const action = isBanned ? "Unban" : "Ban";
  if (!confirm(action + "?")) return;
  try {
    await updateDoc(doc(db, "users", uid), { banned: !isBanned });
    alert(action + " done");
  } catch (err) { alert(err.message); }
}

// ============================================
// TRADES
// ============================================
function loadTrades() {
  if (!tradesList) return;
  tradesList.innerHTML = '<p class="loading-text">Loading...</p>';
  if (tradesUnsub) tradesUnsub();

  tradesUnsub = onSnapshot(collection(db, "trades"), (snap) => {
    tradesList.innerHTML = "";
    if (snap.empty) {
      tradesList.innerHTML = '<p class="loading-text">No trades</p>';
      return;
    }
    const trades = [];
    snap.forEach(d => trades.push({ id: d.id, ...d.data() }));
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
  if (trade.status === "pending")
    statusBadge = '<span class="admin-item-badge badge-pending">PENDING</span>';
  else if (trade.result === "win")
    statusBadge = '<span class="admin-item-badge badge-win">WIN</span>';
  else
    statusBadge = '<span class="admin-item-badge badge-loss">LOSS</span>';

  const entryPrice = (trade.entryPrice || 0).toFixed(2);
  const exitPrice = (trade.exitPrice || 0).toFixed(2);
  const profit = trade.profit ? trade.profit.toFixed(2) : "0.00";
  const created = trade.createdAt
    ? new Date(trade.createdAt).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "-";

  div.innerHTML = `
    <div class="admin-item-header">
      <div class="admin-item-title">${trade.userEmail || "no-email"}</div>
      ${statusBadge}
    </div>
    <div class="admin-item-info">
      <span>Type: <strong>${(trade.type || "").toUpperCase()}</strong></span>
      <span>Amount: <strong>$${trade.amount}</strong></span>
      <span>Entry: <strong>$${entryPrice}</strong></span>
      <span>Exit: <strong>$${exitPrice}</strong></span>
      <span>Profit: <strong>$${profit}</strong></span>
      <span>Time: <strong>${created}</strong></span>
    </div>
    <div class="admin-item-actions">
      <button class="btn-action btn-force-win" data-action="force-win" data-tid="${trade.id}">Force Win</button>
      <button class="btn-action btn-force-loss" data-action="force-loss" data-tid="${trade.id}">Force Loss</button>
      <button class="btn-action btn-force-pending" data-action="force-pending" data-tid="${trade.id}">Pending</button>
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
  if (!confirm("Force " + result + "?")) return;
  try {
    const tradeRef = doc(db, "trades", tradeId);
    const tradeDoc = await getDoc(tradeRef);
    if (!tradeDoc.exists()) { alert("Trade not found"); return; }
    const trade = tradeDoc.data();

    if (result === "pending") {
      await updateDoc(tradeRef, { status: "pending", result: null, profit: 0 });
      alert("Pending");
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
        const curBal = userData[field] ?? 0;
        await updateDoc(userRef, { [field]: curBal + profit });
      }
    }
    alert(result + " done");
  } catch (err) { alert(err.message); }
}

// ============================================
// DEPOSITS
// ============================================
function loadDeposits() {
  if (!depositsList) return;
  depositsList.innerHTML = '<p class="loading-text">Loading...</p>';
  if (depositsUnsub) depositsUnsub();

  depositsUnsub = onSnapshot(collection(db, "deposits"), (snap) => {
    depositsList.innerHTML = "";
    if (snap.empty) {
      depositsList.innerHTML = '<p class="loading-text">No deposits</p>';
      return;
    }
    const deposits = [];
    snap.forEach(d => deposits.push({ id: d.id, ...d.data() }));
    deposits.sort((a, b) => {
      const aT = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bT = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bT - aT;
    });
    deposits.forEach(d => renderDepositItem(d));
    loadStats();
  });
}

function renderDepositItem(dep) {
  const div = document.createElement("div");
  div.className = "admin-item";

  let statusBadge = "";
  if (dep.status === "pending")
    statusBadge = '<span class="admin-item-badge badge-pending">PENDING</span>';
  else if (dep.status === "approved")
    statusBadge = '<span class="admin-item-badge badge-win">APPROVED</span>';
  else
    statusBadge = '<span class="admin-item-badge badge-rejected">REJECTED</span>';

  const created = dep.createdAt
    ? new Date(dep.createdAt).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "-";

  div.innerHTML = `
    <div class="admin-item-header">
      <div class="admin-item-title">${dep.email || "no-email"}</div>
      ${statusBadge}
    </div>
    <div class="admin-item-info">
      <span>Amount: <strong>$${dep.amount}</strong></span>
      <span>Method: <strong>${dep.method || "manual"}</strong></span>
      <span>TrxID: <strong>${dep.txid || "-"}</strong></span>
      <span>Time: <strong>${created}</strong></span>
    </div>
    <div class="admin-item-actions">
      <button class="btn-action btn-approve" data-action="approve-dep" data-did="${dep.id}">Approve</button>
      <button class="btn-action btn-reject" data-action="reject-dep" data-did="${dep.id}">Reject</button>
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
  if (!confirm("Approve?")) return;
  try {
    const depRef = doc(db, "deposits", depositId);
    const depDoc = await getDoc(depRef);
    if (!depDoc.exists()) { alert("Not found"); return; }
    const dep = depDoc.data();
    if (dep.status === "approved") { alert("Already approved"); return; }
    const userRef = doc(db, "users", dep.userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const curReal = userDoc.data().realBalance ?? 0;
      await updateDoc(userRef, { realBalance: curReal + dep.amount });
    }
    await updateDoc(depRef, {
      status: "approved",
      approvedAt: new Date().toISOString()
    });
    alert("Approved");
    loadStats();
  } catch (err) { alert(err.message); }
}

async function rejectDeposit(depositId) {
  if (!confirm("Reject?")) return;
  try {
    await updateDoc(doc(db, "deposits", depositId), {
      status: "rejected",
      rejectedAt: new Date().toISOString()
    });
    alert("Rejected");
    loadStats();
  } catch (err) { alert(err.message); }
}

// ============================================
// WITHDRAWALS
// ============================================
function loadWithdrawals() {
  if (!withdrawalsList) return;
  withdrawalsList.innerHTML = '<p class="loading-text">Loading...</p>';
  if (withdrawalsUnsub) withdrawalsUnsub();

  withdrawalsUnsub = onSnapshot(collection(db, "withdrawals"), (snap) => {
    withdrawalsList.innerHTML = "";
    if (snap.empty) {
      withdrawalsList.innerHTML = '<p class="loading-text">No withdrawals</p>';
      return;
    }
    const ws = [];
    snap.forEach(d => ws.push({ id: d.id, ...d.data() }));
    ws.sort((a, b) => {
      const aT = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bT = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bT - aT;
    });
    ws.forEach(w => renderWithdrawItem(w));
    loadStats();
  });
}

function renderWithdrawItem(w) {
  const div = document.createElement("div");
  div.className = "admin-item";

  let statusBadge = "";
  if (w.status === "pending")
    statusBadge = '<span class="admin-item-badge badge-pending">PENDING</span>';
  else if (w.status === "approved")
    statusBadge = '<span class="admin-item-badge badge-win">APPROVED</span>';
  else
    statusBadge = '<span class="admin-item-badge badge-rejected">REJECTED</span>';

  const created = w.createdAt
    ? new Date(w.createdAt).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "-";

  div.innerHTML = `
    <div class="admin-item-header">
      <div class="admin-item-title">${w.email || "no-email"}</div>
      ${statusBadge}
    </div>
    <div class="admin-item-info">
      <span>Amount: <strong>$${w.amount}</strong></span>
      <span>Method: <strong>${w.method || "-"}</strong></span>
      <span>Number: <strong>${w.number || "-"}</strong></span>
      <span>Time: <strong>${created}</strong></span>
    </div>
    <div class="admin-item-actions">
      <button class="btn-action btn-approve" data-action="approve-wd" data-wid="${w.id}">Approve</button>
      <button class="btn-action btn-reject" data-action="reject-wd" data-wid="${w.id}">Reject</button>
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
  if (!confirm("Approve?")) return;
  try {
    const wRef = doc(db, "withdrawals", wid);
    const wDoc = await getDoc(wRef);
    if (!wDoc.exists()) { alert("Not found"); return; }
    const w = wDoc.data();
    if (w.status === "approved") { alert("Already approved"); return; }
    const userRef = doc(db, "users", w.userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const curReal = userDoc.data().realBalance ?? 0;
      if (curReal < w.amount) { alert("Insufficient balance"); return; }
      await updateDoc(userRef, { realBalance: curReal - w.amount });
    }
    await updateDoc(wRef, {
      status: "approved",
      approvedAt: new Date().toISOString()
    });
    alert("Approved");
    loadStats();
  } catch (err) { alert(err.message); }
}

async function rejectWithdrawal(wid) {
  if (!confirm("Reject?")) return;
  try {
    await updateDoc(doc(db, "withdrawals", wid), {
      status: "rejected",
      rejectedAt: new Date().toISOString()
    });
    alert("Rejected");
    loadStats();
  } catch (err) { alert(err.message); }
}

// ============================================
// SETTINGS
// ============================================
async function loadSettings() {
  try {
    const sDoc = await getDoc(doc(db, "settings", "global"));
    if (sDoc.exists()) {
      const d = sDoc.data();
      currentWinRate = d.winRate ?? 50;
      currentPayout = d.payout ?? 85;
      currentAutoInterval = d.autoModeInterval ?? 5;
      isAutoMode = d.autoMode ?? false;
      if (winRateInput) winRateInput.value = currentWinRate;
      if (payoutInput) payoutInput.value = currentPayout;
      if (autoIntervalInput) autoIntervalInput.value = currentAutoInterval;
      updateAutoModeButton();
    }
  } catch (err) { console.error(err); }
}

if (saveWinRateBtn) {
  saveWinRateBtn.addEventListener("click", async () => {
    const val = parseInt(winRateInput.value);
    if (isNaN(val) || val < 0 || val > 100) { alert("0-100"); return; }
    try {
      await setDoc(doc(db, "settings", "global"), { winRate: val }, { merge: true });
      currentWinRate = val;
      alert("Win Rate: " + val + "%");
    } catch (err) { alert(err.message); }
  });
}

if (savePayoutBtn) {
  savePayoutBtn.addEventListener("click", async () => {
    const val = parseInt(payoutInput.value);
    if (isNaN(val) || val < 0 || val > 200) { alert("0-200"); return; }
    try {
      await setDoc(doc(db, "settings", "global"), { payout: val }, { merge: true });
      currentPayout = val;
      alert("Payout: " + val + "%");
    } catch (err) { alert(err.message); }
  });
}

if (saveAutoIntervalBtn) {
  saveAutoIntervalBtn.addEventListener("click", async () => {
    const val = parseInt(autoIntervalInput.value);
    if (isNaN(val) || val < 1 || val > 60) { alert("1-60"); return; }
    try {
      await setDoc(doc(db, "settings", "global"), { autoModeInterval: val }, { merge: true });
      currentAutoInterval = val;
      alert("Interval: " + val + " min");
    } catch (err) { alert(err.message); }
  });
}

if (autoModeToggle) {
  autoModeToggle.addEventListener("click", async () => {
    isAutoMode = !isAutoMode;
    try {
      await setDoc(doc(db, "settings", "global"), { autoMode: isAutoMode }, { merge: true });
      updateAutoModeButton();
      alert(isAutoMode ? "Auto Mode ON" : "Auto Mode OFF");
    } catch (err) {
      alert(err.message);
      isAutoMode = !isAutoMode;
      updateAutoModeButton();
    }
  });
}

function updateAutoModeButton() {
  if (!autoModeToggle) return;
  if (isAutoMode) {
    autoModeToggle.classList.add("active");
    autoModeToggle.textContent = "Auto Mode: ON";
  } else {
    autoModeToggle.classList.remove("active");
    autoModeToggle.textContent = "Auto Mode: OFF";
  }
}

// ============================================
// CANDLE SCHEDULER
// ============================================
window.candleList = [];
window.candleCounter = 0;
window.currentMarketId = null;

function renderCandleTable() {
  const tbody = document.getElementById('candle-table-body');
  if (!tbody) return;

  if (window.candleList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12" class="empty-text">No candles</td></tr>';
    return;
  }

  tbody.innerHTML = window.candleList.map((c, i) => {
    const dir = c.direction || (Number(c.close) >= Number(c.open) ? 'up' : 'down');
    const color = c.color || (dir === 'up' ? 'green' : 'red');
    const colorEmoji = color === 'green' ? 'G' : 'R';

    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + (c.date || '-') + '</td>' +
      '<td>' + (c.time || '-') + '</td>' +
      '<td>' + (c.timeframe || '1m') + '</td>' +
      '<td>' + c.open + '</td>' +
      '<td>' + c.high + '</td>' +
      '<td>' + c.low + '</td>' +
      '<td>' + c.close + '</td>' +
      '<td class="' + color + '">' + colorEmoji + ' ' + color + '</td>' +
      '<td>' + (c.up || 0) + 'm</td>' +
      '<td>' + (c.down || 0) + 'm</td>' +
      '<td>' +
        '<button class="act-btn edit" data-i="' + i + '">E</button>' +
        '<button class="act-btn del" data-i="' + i + '">D</button>' +
        '<button class="act-btn copy" data-i="' + i + '">C</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  tbody.querySelectorAll('.act-btn.edit').forEach(b =>
    b.onclick = () => editCandle(Number(b.dataset.i)));
  tbody.querySelectorAll('.act-btn.del').forEach(b =>
    b.onclick = () => deleteCandle(Number(b.dataset.i)));
  tbody.querySelectorAll('.act-btn.copy').forEach(b =>
    b.onclick = () => copyCandle(Number(b.dataset.i)));
}

function addCandle() {
  try {
    window.candleCounter++;
    const baseEl = document.getElementById('bulk-base');
    const base = Number(baseEl?.value || 50000);
    const open = base + (Math.random() * 100 - 50);
    const close = open + (Math.random() * 80 - 40);
    const high = Math.max(open, close) + Math.random() * 20;
    const low = Math.min(open, close) - Math.random() * 20;
    const color = close >= open ? 'green' : 'red';
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 8);

    window.candleList.push({
      number: window.candleCounter,
      date, time,
      timeframe: document.getElementById('candle-timeframe')?.value || '1m',
      open: open.toFixed(2),
      high: high.toFixed(2),
      low: low.toFixed(2),
      close: close.toFixed(2),
      color,
      direction: close >= open ? 'up' : 'down',
      size: 'medium',
      up: Number(document.getElementById('bulk-up')?.value || 5),
      down: Number(document.getElementById('bulk-down')?.value || 5)
    });

    renderCandleTable();
    console.log('Candle added, total =', window.candleList.length);
  } catch (err) {
    console.error('addCandle error:', err);
    alert('Error: ' + err.message);
  }
}

function deleteCandle(index) {
  if (!confirm('Delete candle #' + (index + 1) + '?')) return;
  window.candleList.splice(index, 1);
  renderCandleTable();
}

function editCandle(index) {
  const c = window.candleList[index];
  const newOpen = prompt('Open:', c.open); if (newOpen === null) return;
  const newClose = prompt('Close:', c.close); if (newClose === null) return;
  const newHigh = prompt('High:', c.high); if (newHigh === null) return;
  const newLow = prompt('Low:', c.low); if (newLow === null) return;

  c.open = Number(newOpen).toFixed(2);
  c.close = Number(newClose).toFixed(2);
  c.high = Number(newHigh).toFixed(2);
  c.low = Number(newLow).toFixed(2);
  c.color = Number(newClose) >= Number(newOpen) ? 'green' : 'red';
  c.direction = Number(newClose) >= Number(newOpen) ? 'up' : 'down';

  renderCandleTable();
}

function copyCandle(index) {
  window.candleCounter++;
  const c = Object.assign({}, window.candleList[index], { number: window.candleCounter });
  window.candleList.splice(index + 1, 0, c);
  renderCandleTable();
}

function clearCandles() {
  if (!confirm('Delete all candles?')) return;
  window.candleList = [];
  window.candleCounter = 0;
  renderCandleTable();
}

function bindCandleButtons() {
  const add = document.getElementById('add-candle-btn');
  if (add) { add.onclick = addCandle; }
  const clr = document.getElementById('clear-candles-btn');
  if (clr) { clr.onclick = clearCandles; }
  renderCandleTable();
}

bindCandleButtons();
document.addEventListener('DOMContentLoaded', bindCandleButtons);
setTimeout(bindCandleButtons, 800);
setTimeout(bindCandleButtons, 2500);

// ============================================
// SAVE / LOAD / REFRESH
// ============================================
function bindMarketSelect() {
  const sel = document.getElementById('candle-market-select');
  if (!sel || sel.dataset.bound === '1') return;
  sel.dataset.bound = '1';
  sel.addEventListener('change', () => {
    window.currentMarketId = sel.value || null;
    console.log('Market changed:', window.currentMarketId);
    if (window.currentMarketId) {
      loadCandlesFromFirestore(window.currentMarketId);
    } else {
      window.candleList = [];
      window.candleCounter = 0;
      renderCandleTable();
    }
  });
  console.log('Market select bound');
}

async function loadCandlesFromFirestore(marketId) {
  if (!marketId) return;
  console.log('Loading candles for market:', marketId);
  try {
    const candlesSnap = await getDocs(collection(db, "markets", marketId, "candles"));
    if (candlesSnap.empty) {
      window.candleList = [];
      window.candleCounter = 0;
      renderCandleTable();
      return;
    }
    window.candleList = [];
    candlesSnap.forEach(d => {
      const data = d.data();
      window.candleList.push({
        id: d.id,
        number: data.number || 0,
        date: data.date || '-',
        time: data.startTime || data.time || '-',
        endTime: data.endTime || '',
        timeframe: data.timeframe || '1m',
        open: Number(data.open || 0).toFixed(2),
        high: Number(data.high || 0).toFixed(2),
        low: Number(data.low || 0).toFixed(2),
        close: Number(data.close || 0).toFixed(2),
        color: data.color || 'green',
        direction: data.direction || (Number(data.close) >= Number(data.open) ? 'up' : 'down'),
        size: data.size || 'medium',
        wick: data.wick || data.wickLength || 20,
        body: data.body || data.bodySize || 60,
        up: data.upDuration || data.up || 5,
        down: data.downDuration || data.down || 5
      });
    });
    window.candleList.sort((a, b) => (a.number || 0) - (b.number || 0));
    window.candleCounter = window.candleList.length;
    renderCandleTable();
    console.log('Loaded', window.candleList.length, 'candles');
  } catch (err) {
    console.error('Load error:', err);
    alert('Load error: ' + err.message);
  }
}

async function saveAllCandles() {
  if (!window.currentMarketId) { alert('Select market first'); return; }
  if (window.candleList.length === 0) { alert('No candles'); return; }

  const confirmMsg = 'Market: ' + window.currentMarketId + '\n' + window.candleList.length + ' candles will be saved.\n\nOverwrite old?';
  if (!confirm(confirmMsg)) return;

  console.log('Saving', window.candleList.length, 'candles...');
  try {
    const oldSnap = await getDocs(collection(db, "markets", window.currentMarketId, "candles"));
    for (const d of oldSnap.docs) {
      await deleteDoc(doc(db, "markets", window.currentMarketId, "candles", d.id));
    }
    console.log('Deleted', oldSnap.size, 'old candles');

    for (let i = 0; i < window.candleList.length; i++) {
      const c = window.candleList[i];
      const candleId = 'c_' + String(i + 1).padStart(4, '0');
      const dir = c.direction || (Number(c.close) >= Number(c.open) ? 'up' : 'down');

      await setDoc(
        doc(db, "markets", window.currentMarketId, "candles", candleId),
        {
          number: i + 1,
          date: c.date || '',
          startTime: c.time || '',
          endTime: c.endTime || '',
          duration: 60,
          timeframe: c.timeframe || '1m',
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          color: c.color || 'green',
          direction: dir,
          size: c.size || 'medium',
          upDuration: Number(c.up || 0),
          downDuration: Number(c.down || 0),
          neutralDuration: 0,
          wickLength: Number(c.wick || 20),
          bodySize: Number(c.body || 60),
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      );
    }
    await updateDoc(doc(db, "markets", window.currentMarketId), {
      currentCandleIndex: 0,
      updatedAt: new Date().toISOString()
    });
    alert(window.candleList.length + ' candles saved!');
    console.log('All saved');
  } catch (err) {
    console.error('Save error:', err);
    alert('Save error: ' + err.message);
  }
}

function bindRefreshCandles() {
  const btn = document.getElementById('refresh-candles');
  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', async () => {
    if (!window.currentMarketId) { alert('Select market first'); return; }
    await loadCandlesFromFirestore(window.currentMarketId);
    alert('Reloaded');
  });
  console.log('Refresh button bound');
}

function bindSaveButton() {
  const btn = document.getElementById('save-candles-btn');
  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', saveAllCandles);
  console.log('Save button bound');
}

function bindPart6A() {
  bindMarketSelect();
  bindRefreshCandles();
  bindSaveButton();
}

bindPart6A();
document.addEventListener('DOMContentLoaded', bindPart6A);
setTimeout(bindPart6A, 800);
setTimeout(bindPart6A, 2500);

// ============================================
// TIME CALCULATION
// ============================================
function timeframeToSeconds(tf) {
  const map = { '5s': 5, '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400 };
  return map[tf] || 60;
}

function secondsToTime(totalSec) {
  const h = Math.floor(totalSec / 3600) % 24;
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function timeToSeconds(timeStr) {
  const parts = (timeStr || '00:00:00').split(':').map(Number);
  return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
}

function addDaysToDate(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function calcCandleTime(startDate, startTime, index, tfSeconds) {
  const startSec = timeToSeconds(startTime);
  const totalSec = startSec + index * tfSeconds;
  const dayOffset = Math.floor(totalSec / 86400);
  const daySec = totalSec % 86400;
  return {
    date: addDaysToDate(startDate, dayOffset),
    startTime: secondsToTime(daySec),
    endTime: secondsToTime(daySec + tfSeconds),
    dayOffset
  };
}

function validateBulkForm() {
  const startDate = document.getElementById('bulk-date')?.value;
  const startTime = document.getElementById('bulk-time')?.value;
  const count = parseInt(document.getElementById('bulk-count')?.value || 0);
  const base = parseFloat(document.getElementById('bulk-base')?.value || 0);
  const tf = document.getElementById('candle-timeframe')?.value || '1m';
  const up = parseInt(document.getElementById('bulk-up')?.value || 0);
  const down = parseInt(document.getElementById('bulk-down')?.value || 0);
  const neutral = parseInt(document.getElementById('bulk-neutral')?.value || 0);
  const wick = parseInt(document.getElementById('bulk-wick')?.value || 20);
  const body = parseInt(document.getElementById('bulk-body')?.value || 60);

  if (!startDate) { alert('Start Date required'); return null; }
  if (!startTime) { alert('Start Time required'); return null; }
  if (isNaN(count) || count < 1 || count > 500) { alert('Count 1-500'); return null; }
  if (isNaN(base) || base <= 0) { alert('Base Price required'); return null; }
  if (up + down + neutral <= 0) { alert('Duration required'); return null; }

  return { startDate, startTime, count, base, tf, up, down, neutral, wick, body };
}

async function confirmOverwrite() {
  if (!window.currentMarketId) { alert('Select market first'); return false; }
  try {
    const snap = await getDocs(collection(db, "markets", window.currentMarketId, "candles"));
    if (snap.size === 0) return true;
    return confirm('This market has ' + snap.size + ' candles. Overwrite?');
  } catch (err) { return true; }
}

function clearCurrentCandleList() {
  window.candleList = [];
  window.candleCounter = 0;
  renderCandleTable();
}

// ============================================
// PRICE CALCULATION
// ============================================
function getPriceMovement(direction) {
  const baseMove = 30 + Math.random() * 90;
  if (direction === 'up') return Math.abs(baseMove);
  if (direction === 'down') return -Math.abs(baseMove);
  return (Math.random() - 0.5) * 10;
}

function getSizeMultiplier(sizeType) {
  if (sizeType === 'small') return 0.5;
  if (sizeType === 'large') return 1.8;
  return 1.0;
}

function buildCandleWithPrice(params) {
  const { number, date, time, endTime, timeframe, prevClose, basePrice,
          direction, wick, body, sizeType } = params;

  const sizeMul = getSizeMultiplier(sizeType);
  const wickScaled = wick * sizeMul;
  const bodyScaled = body * sizeMul;

  const open = prevClose !== null ? prevClose : basePrice;
  const movement = getPriceMovement(direction);
  const close = open + movement;
  const maxOC = Math.max(open, close);
  const minOC = Math.min(open, close);
  const high = maxOC + wickScaled;
  const low = minOC - wickScaled;

  let color;
  if (direction === 'up') color = 'green';
  else if (direction === 'down') color = 'red';
  else color = close >= open ? 'green' : 'red';

  return {
    number, date, time, endTime, timeframe,
    open: open.toFixed(2),
    high: high.toFixed(2),
    low: low.toFixed(2),
    close: close.toFixed(2),
    color, direction, size: sizeType,
    wick: wickScaled.toFixed(0),
    body: bodyScaled.toFixed(0),
    up: 0, down: 0
  };
}

async function bulkGenerateCandles() {
  console.log('Bulk Generate clicked');
  const form = validateBulkForm();
  if (!form) return;
  if (!window.currentMarketId) { alert('Select market first'); return; }
  const ok = await confirmOverwrite();
  if (!ok) return;

  const tfSeconds = timeframeToSeconds(form.tf);
  const patternLength = form.up + form.down + form.neutral;
  const sizeType = 'medium';

  console.log('Generating', form.count, 'candles');
  clearCurrentCandleList();

  const tempList = [];
  let prevClose = null;
  let upCount = 0, downCount = 0, neutralCount = 0;

  for (let i = 0; i < form.count; i++) {
    const timeInfo = calcCandleTime(form.startDate, form.startTime, i, tfSeconds);
    let direction = 'up';
    if (patternLength > 0) {
      const pos = i % patternLength;
      if (pos < form.up) direction = 'up';
      else if (pos < form.up + form.down) direction = 'down';
      else direction = 'neutral';
    }
    const candle = buildCandleWithPrice({
      number: i + 1, date: timeInfo.date,
      time: timeInfo.startTime, endTime: timeInfo.endTime,
      timeframe: form.tf, prevClose, basePrice: form.base,
      direction, wick: form.wick, body: form.body, sizeType
    });
    candle.up = form.up;
    candle.down = form.down;
    prevClose = parseFloat(candle.close);
    if (direction === 'up') upCount++;
    else if (direction === 'down') downCount++;
    else neutralCount++;
    tempList.push(candle);
  }

  window.candleList = tempList;
  window.candleCounter = tempList.length;
  renderCandleTable();

  console.log('Generated', tempList.length, 'candles');
  console.log('UP: ' + upCount + ' | DOWN: ' + downCount + ' | NEUTRAL: ' + neutralCount);
  alert(tempList.length + ' candles generated!\n\nUP: ' + upCount + ' | DOWN: ' + downCount + ' | NEUTRAL: ' + neutralCount + '\nPrice: $' + tempList[0].open + ' -> $' + tempList[tempList.length - 1].close);
}

function rebindBulkGenerate() {
  const btn = document.getElementById('bulk-generate-btn');
  if (!btn) return;
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', bulkGenerateCandles);
  console.log('Bulk Generate rebound');
}

rebindBulkGenerate();
document.addEventListener('DOMContentLoaded', rebindBulkGenerate);
setTimeout(rebindBulkGenerate, 800);
setTimeout(rebindBulkGenerate, 2500);

// ============================================
// Global Expose
// ============================================
window.addCandle = addCandle;
window.clearCandles = clearCandles;
window.renderCandleTable = renderCandleTable;
window.saveAllCandles = saveAllCandles;
window.loadCandlesFromFirestore = loadCandlesFromFirestore;
window.bulkGenerateCandles = bulkGenerateCandles;
window.timeframeToSeconds = timeframeToSeconds;
window.calcCandleTime = calcCandleTime;

console.log('admin.js FULLY loaded - Part 3 to 6B-3');
