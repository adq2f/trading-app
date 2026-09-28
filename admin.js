// Admin Panel - admin.js
// Part 3 to 6E-3-Fix3 Complete

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

/* ============================================================
   PART 6E-2: SINGLE SOURCE OF TRUTH — adminSettings
   ============================================================ */

window.adminSettings = {
  winRate: 50,
  payout: 85,
  candleMode: 'locked',
  autoMode: false,
  autoModeInterval: 5000
};

console.log('[Settings] adminSettings initialized:', window.adminSettings);

/* ============================================================
   ELEMENT REFERENCES (with ID fallbacks for both conventions)
   ============================================================ */

const adminLogin = document.getElementById("admin-login") || document.getElementById("login-screen");
const adminDashboard = document.getElementById("admin-dashboard") || document.getElementById("admin-panel");
const adminEmailInput = document.getElementById("admin-email") || document.getElementById("login-email");
const adminPasswordInput = document.getElementById("admin-password") || document.getElementById("login-password");
const adminLoginBtn = document.getElementById("admin-login-btn") || document.getElementById("login-btn");
const adminMessage = document.getElementById("admin-message") || document.getElementById("login-error");
const adminEmailDisplay = document.getElementById("admin-email-display") || document.getElementById("admin-user-email");
const adminLogoutBtn = document.getElementById("admin-logout") || document.getElementById("admin-logout-btn");

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
const marketsList = document.getElementById("markets-list") || document.getElementById("market-list");

const refreshUsers = document.getElementById("refresh-users");
const refreshTrades = document.getElementById("refresh-trades");
const refreshDeposits = document.getElementById("refresh-deposits");
const refreshWithdrawals = document.getElementById("refresh-withdrawals");
const refreshMarkets = document.getElementById("refresh-markets");

// Market form — dual ID support
const newMarketName = document.getElementById("new-market-name") || document.getElementById("market-name");
const newMarketSymbol = document.getElementById("new-market-symbol") || document.getElementById("market-symbol");
const newMarketBase = document.getElementById("new-market-base") || document.getElementById("market-base");
const newMarketPayout = document.getElementById("market-payout");
const newMarketWinrate = document.getElementById("market-winrate");
const createMarketBtn = document.getElementById("create-market-btn") || document.getElementById("market-add-btn");

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

/* ============================================================
   LOGIN BUTTON
   ============================================================ */

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

/* ============================================================
   AUTH STATE LISTENER (NULL-SAFE)
   ============================================================ */

onAuthStateChanged(auth, async (user) => {
  const loginEl = document.getElementById("login-screen") || document.getElementById("admin-login");
  const panelEl = document.getElementById("admin-panel") || document.getElementById("admin-dashboard");
  const emailInputEl = document.getElementById("login-email") || document.getElementById("admin-email");
  const passInputEl = document.getElementById("login-password") || document.getElementById("admin-password");
  const emailDisplayEl = document.getElementById("admin-user-email") || document.getElementById("admin-email-display");

  function showLogin() {
    if (loginEl) {
      loginEl.classList.remove("hidden");
      loginEl.style.display = "";
    }
    if (panelEl) {
      panelEl.classList.add("hidden");
      panelEl.style.display = "none";
    }
    if (emailInputEl) emailInputEl.value = "";
    if (passInputEl) passInputEl.value = "";
  }

  function showPanel() {
    if (loginEl) {
      loginEl.classList.add("hidden");
      loginEl.style.display = "none";
    }
    if (panelEl) {
      panelEl.classList.remove("hidden");
      panelEl.style.display = "";
    }
  }

  if (user) {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists() || userDoc.data().role !== "admin") {
        showLogin();
        if (adminMessage) {
          adminMessage.style.color = "#ff5252";
          adminMessage.textContent = "Not an admin";
        }
        await signOut(auth);
        return;
      }
      currentAdmin = user;
      window.currentAdmin = user;
      showPanel();
      if (emailDisplayEl) emailDisplayEl.textContent = user.email;

      loadStats();
      loadUsers();
      loadTrades();
      loadDeposits();
      loadWithdrawals();
      loadMarkets();
      loadSettings();
    } catch (err) {
      console.error("[Auth] Error:", err);
      await signOut(auth);
    }
  } else {
    currentAdmin = null;
    window.currentAdmin = null;
    showLogin();
    if (usersUnsub) usersUnsub();
    if (tradesUnsub) tradesUnsub();
    if (depositsUnsub) depositsUnsub();
    if (withdrawalsUnsub) withdrawalsUnsub();
    if (marketsUnsub) marketsUnsub();
  }
});

/* ============================================================
   TABS
   ============================================================ */

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

/* ============================================================
   MARKET CREATE
   ============================================================ */

if (createMarketBtn) {
  createMarketBtn.addEventListener("click", async () => {
    const name = newMarketName.value.trim();
    const symbol = newMarketSymbol.value.trim().toUpperCase();
    const base = parseFloat(newMarketBase.value) || 50000;
    const payout = newMarketPayout ? (parseInt(newMarketPayout.value) || currentPayout) : currentPayout;
    const winRate = newMarketWinrate ? (parseInt(newMarketWinrate.value) || currentWinRate) : currentWinRate;
    if (!name || !symbol) {
      alert("Name and symbol required");
      return;
    }
    try {
      const marketId = symbol.toLowerCase() + "_" + Date.now();
      await setDoc(doc(db, "markets", marketId), {
        id: marketId, name: name, symbol: symbol,
        basePrice: base, currentPrice: base,
        enabled: true, payout: payout, winRate: winRate,
        candleMode: window.candleMode || "locked",
        currentCandleIndex: 0,
        autoModeInterval: currentAutoInterval,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      newMarketName.value = "";
      newMarketSymbol.value = "";
      newMarketBase.value = "";
      if (newMarketPayout) newMarketPayout.value = "";
      if (newMarketWinrate) newMarketWinrate.value = "";
      alert(name + " created!");
    } catch (err) { alert(err.message); }
  });
}

/* ============================================================
   MARKETS LIST
   ============================================================ */

function loadMarkets() {
  if (!marketsList) {
    console.warn('[Markets] marketsList element not found');
    return;
  }
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
    console.log('[Markets] Loaded', markets.length, 'markets');
  });
}

function renderMarketItem(market) {
  const div = document.createElement("div");
  div.className = "market-item" + (market.enabled ? "" : " disabled");
  div.dataset.marketId = market.id;
  const enabledBadge = market.enabled
    ? '<span class="admin-item-badge badge-win">ACTIVE</span>'
    : '<span class="admin-item-badge badge-rejected">DISABLED</span>';
  div.innerHTML = '<div class="market-item-header"><div class="market-item-name">' + (market.name || "no-name") + '</div>' + enabledBadge + '</div>' +
    '<div class="market-item-info">' +
      '<span>Symbol: <strong>' + (market.symbol || "-") + '</strong></span>' +
      '<span>Base: <strong>$' + (market.basePrice || 0).toFixed(2) + '</strong></span>' +
      '<span>Payout: <strong>' + (market.payout || 85) + '%</strong></span>' +
      '<span>Win Rate: <strong>' + (market.winRate || 50) + '%</strong></span>' +
      '<span>Mode: <strong>' + (market.candleMode || "random") + '</strong></span>' +
      '<span>Candle: <strong>#' + (market.currentCandleIndex || 0) + '</strong></span>' +
    '</div>' +
    '<div class="market-item-actions">' +
      '<button class="btn-action btn-edit" data-action="edit-market" data-mid="' + market.id + '">Edit</button>' +
      '<button class="btn-action ' + (market.enabled ? 'btn-reject' : 'btn-approve') + '" data-action="toggle-market" data-mid="' + market.id + '" data-enabled="' + market.enabled + '">' + (market.enabled ? "Disable" : "Enable") + '</button>' +
      '<button class="btn-action btn-reject" data-action="delete-market" data-mid="' + market.id + '">Delete</button>' +
    '</div>';
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
      name: newName, payout: payoutVal, winRate: winVal,
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
      enabled: !isEnabled, updatedAt: new Date().toISOString()
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

/* ============================================================
   STATS
   ============================================================ */

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

/* ============================================================
   USERS
   ============================================================ */

function loadUsers() {
  if (!usersList) return;
  usersList.innerHTML = '<p class="loading-text">Loading...</p>';
  if (usersUnsub) usersUnsub();
  usersUnsub = onSnapshot(collection(db, "users"), (snap) => {
    usersList.innerHTML = "";
    if (snap.empty) { usersList.innerHTML = '<p class="loading-text">No users</p>'; return; }
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
  div.innerHTML = '<div class="admin-item-header"><div class="admin-item-title">' + (user.email || "no-email") + '</div>' + roleBadge + '</div>' +
    '<div class="admin-item-info">' +
      '<span>Demo: <strong>$' + demoBal + '</strong></span>' +
      '<span>Real: <strong>$' + realBal + '</strong></span>' +
      '<span>Joined: <strong>' + joined + '</strong></span>' +
      '<span>Banned: <strong>' + (user.banned ? "Yes" : "No") + '</strong></span>' +
    '</div>' +
    '<div class="admin-item-actions">' +
      '<button class="btn-action btn-edit" data-action="edit-demo" data-uid="' + user.id + '" data-bal="' + (user.demoBalance ?? 1000) + '">Demo</button>' +
      '<button class="btn-action btn-edit" data-action="edit-real" data-uid="' + user.id + '" data-bal="' + (user.realBalance ?? 0) + '">Real</button>' +
      '<button class="btn-action ' + (user.banned ? 'btn-approve' : 'btn-reject') + '" data-action="ban" data-uid="' + user.id + '" data-banned="' + (user.banned ? "true" : "false") + '">' + (user.banned ? "Unban" : "Ban") + '</button>' +
    '</div>';
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

/* ============================================================
   TRADES
   ============================================================ */

function loadTrades() {
  if (!tradesList) return;
  tradesList.innerHTML = '<p class="loading-text">Loading...</p>';
  if (tradesUnsub) tradesUnsub();
  tradesUnsub = onSnapshot(collection(db, "trades"), (snap) => {
    tradesList.innerHTML = "";
    if (snap.empty) { tradesList.innerHTML = '<p class="loading-text">No trades</p>'; return; }
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
  if (trade.status === "pending") statusBadge = '<span class="admin-item-badge badge-pending">PENDING</span>';
  else if (trade.result === "win") statusBadge = '<span class="admin-item-badge badge-win">WIN</span>';
  else statusBadge = '<span class="admin-item-badge badge-loss">LOSS</span>';
  const entryPrice = (trade.entryPrice || 0).toFixed(2);
  const exitPrice = (trade.exitPrice || 0).toFixed(2);
  const profit = trade.profit ? trade.profit.toFixed(2) : "0.00";
  const created = trade.createdAt ? new Date(trade.createdAt).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "-";
  div.innerHTML = '<div class="admin-item-header"><div class="admin-item-title">' + (trade.userEmail || "no-email") + '</div>' + statusBadge + '</div>' +
    '<div class="admin-item-info">' +
      '<span>Type: <strong>' + (trade.type || "").toUpperCase() + '</strong></span>' +
      '<span>Amount: <strong>$' + trade.amount + '</strong></span>' +
      '<span>Entry: <strong>$' + entryPrice + '</strong></span>' +
      '<span>Exit: <strong>$' + exitPrice + '</strong></span>' +
      '<span>Profit: <strong>$' + profit + '</strong></span>' +
      '<span>Time: <strong>' + created + '</strong></span>' +
    '</div>' +
    '<div class="admin-item-actions">' +
      '<button class="btn-action btn-force-win" data-action="force-win" data-tid="' + trade.id + '">Force Win</button>' +
      '<button class="btn-action btn-force-loss" data-action="force-loss" data-tid="' + trade.id + '">Force Loss</button>' +
      '<button class="btn-action btn-force-pending" data-action="force-pending" data-tid="' + trade.id + '">Pending</button>' +
    '</div>';
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
      status: "completed", result: result, profit: profit,
      exitPrice: trade.entryPrice, completedAt: new Date().toISOString()
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

/* ============================================================
   DEPOSITS
   ============================================================ */

function loadDeposits() {
  if (!depositsList) return;
  depositsList.innerHTML = '<p class="loading-text">Loading...</p>';
  if (depositsUnsub) depositsUnsub();
  depositsUnsub = onSnapshot(collection(db, "deposits"), (snap) => {
    depositsList.innerHTML = "";
    if (snap.empty) { depositsList.innerHTML = '<p class="loading-text">No deposits</p>'; return; }
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
  if (dep.status === "pending") statusBadge = '<span class="admin-item-badge badge-pending">PENDING</span>';
  else if (dep.status === "approved") statusBadge = '<span class="admin-item-badge badge-win">APPROVED</span>';
  else statusBadge = '<span class="admin-item-badge badge-rejected">REJECTED</span>';
  const created = dep.createdAt ? new Date(dep.createdAt).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "-";
  div.innerHTML = '<div class="admin-item-header"><div class="admin-item-title">' + (dep.email || "no-email") + '</div>' + statusBadge + '</div>' +
    '<div class="admin-item-info">' +
      '<span>Amount: <strong>$' + dep.amount + '</strong></span>' +
      '<span>Method: <strong>' + (dep.method || "manual") + '</strong></span>' +
      '<span>TrxID: <strong>' + (dep.txid || "-") + '</strong></span>' +
      '<span>Time: <strong>' + created + '</strong></span>' +
    '</div>' +
    '<div class="admin-item-actions">' +
      '<button class="btn-action btn-approve" data-action="approve-dep" data-did="' + dep.id + '">Approve</button>' +
      '<button class="btn-action btn-reject" data-action="reject-dep" data-did="' + dep.id + '">Reject</button>' +
    '</div>';
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
    await updateDoc(depRef, { status: "approved", approvedAt: new Date().toISOString() });
    alert("Approved");
    loadStats();
  } catch (err) { alert(err.message); }
}

async function rejectDeposit(depositId) {
  if (!confirm("Reject?")) return;
  try {
    await updateDoc(doc(db, "deposits", depositId), { status: "rejected", rejectedAt: new Date().toISOString() });
    alert("Rejected");
    loadStats();
  } catch (err) { alert(err.message); }
}

/* ============================================================
   WITHDRAWALS
   ============================================================ */

function loadWithdrawals() {
  if (!withdrawalsList) return;
  withdrawalsList.innerHTML = '<p class="loading-text">Loading...</p>';
  if (withdrawalsUnsub) withdrawalsUnsub();
  withdrawalsUnsub = onSnapshot(collection(db, "withdrawals"), (snap) => {
    withdrawalsList.innerHTML = "";
    if (snap.empty) { withdrawalsList.innerHTML = '<p class="loading-text">No withdrawals</p>'; return; }
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
  if (w.status === "pending") statusBadge = '<span class="admin-item-badge badge-pending">PENDING</span>';
  else if (w.status === "approved") statusBadge = '<span class="admin-item-badge badge-win">APPROVED</span>';
  else statusBadge = '<span class="admin-item-badge badge-rejected">REJECTED</span>';
  const created = w.createdAt ? new Date(w.createdAt).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "-";
  div.innerHTML = '<div class="admin-item-header"><div class="admin-item-title">' + (w.email || "no-email") + '</div>' + statusBadge + '</div>' +
    '<div class="admin-item-info">' +
      '<span>Amount: <strong>$' + w.amount + '</strong></span>' +
      '<span>Method: <strong>' + (w.method || "-") + '</strong></span>' +
      '<span>Number: <strong>' + (w.number || "-") + '</strong></span>' +
      '<span>Time: <strong>' + created + '</strong></span>' +
    '</div>' +
    '<div class="admin-item-actions">' +
      '<button class="btn-action btn-approve" data-action="approve-wd" data-wid="' + w.id + '">Approve</button>' +
      '<button class="btn-action btn-reject" data-action="reject-wd" data-wid="' + w.id + '">Reject</button>' +
    '</div>';
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
    await updateDoc(wRef, { status: "approved", approvedAt: new Date().toISOString() });
    alert("Approved");
    loadStats();
  } catch (err) { alert(err.message); }
}

async function rejectWithdrawal(wid) {
  if (!confirm("Reject?")) return;
  try {
    await updateDoc(doc(db, "withdrawals", wid), { status: "rejected", rejectedAt: new Date().toISOString() });
    alert("Rejected");
    loadStats();
  } catch (err) { alert(err.message); }
}

/* ============================================================
   SETTINGS
   ============================================================ */

async function loadSettings() {
  try {
    const sDoc = await getDoc(doc(db, "settings", "global"));
    if (sDoc.exists()) {
      const d = sDoc.data();
      currentWinRate = d.winRate ?? 50;
      currentPayout = d.payout ?? 85;
      currentAutoInterval = d.autoModeInterval ?? 5;
      window.adminSettings.winRate = currentWinRate;
      window.adminSettings.payout = currentPayout;
      window.adminSettings.autoMode = d.autoMode === true;
      window.adminSettings.autoModeInterval = d.autoModeInterval || 5000;
      if (winRateInput) winRateInput.value = currentWinRate;
      if (payoutInput) payoutInput.value = currentPayout;
      if (autoIntervalInput) autoIntervalInput.value = currentAutoInterval;
      console.log('[Settings] Loaded from Firestore:', window.adminSettings);
    }
  } catch (err) { console.error('[Settings] Load error:', err); }
}

if (saveWinRateBtn) {
  saveWinRateBtn.addEventListener("click", async () => {
    const val = parseInt(winRateInput.value);
    if (isNaN(val) || val < 0 || val > 100) { alert("0-100"); return; }
    try {
      await setDoc(doc(db, "settings", "global"), { winRate: val }, { merge: true });
      currentWinRate = val;
      window.adminSettings.winRate = val;
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
      window.adminSettings.payout = val;
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
      window.adminSettings.autoModeInterval = val * 1000;
      alert("Interval: " + val + " min");
    } catch (err) { alert(err.message); }
  });
}

/* ============================================================
   CANDLE SCHEDULER (Part 6A-6D)
   ============================================================ */

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
  tbody.querySelectorAll('.act-btn.edit').forEach(b => b.onclick = () => editCandle(Number(b.dataset.i)));
  tbody.querySelectorAll('.act-btn.del').forEach(b => b.onclick = () => deleteCandle(Number(b.dataset.i)));
  tbody.querySelectorAll('.act-btn.copy').forEach(b => b.onclick = () => copyCandle(Number(b.dataset.i)));
  if (typeof renderCandlePreview === 'function') renderCandlePreview();
  if (typeof renderDirectionTimeline === 'function') renderDirectionTimeline();
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
      number: window.candleCounter, date, time,
      timeframe: document.getElementById('candle-timeframe')?.value || '1m',
      open: open.toFixed(2), high: high.toFixed(2),
      low: low.toFixed(2), close: close.toFixed(2),
      color, direction: close >= open ? 'up' : 'down', size: 'medium',
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
  if (add) add.onclick = addCandle;
  const clr = document.getElementById('clear-candles-btn');
  if (clr) clr.onclick = clearCandles;
  renderCandleTable();
}

bindCandleButtons();
document.addEventListener('DOMContentLoaded', bindCandleButtons);
setTimeout(bindCandleButtons, 800);
setTimeout(bindCandleButtons, 2500);

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
        id: d.id, number: data.number || 0,
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
      await setDoc(doc(db, "markets", window.currentMarketId, "candles", candleId), {
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
      });
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

/* ============================================================
   PLAYBACK (Part 6C-1)
   ============================================================ */

window.playbackIndex = 0;
window.playbackTimer = null;
window.playbackSpeed = 1000;

function highlightActiveRow() {
  const tbody = document.getElementById('candle-table-body');
  if (!tbody) return;
  const rows = tbody.querySelectorAll('tr');
  rows.forEach((row, i) => {
    if (i === window.playbackIndex) {
      row.style.background = 'rgba(255, 179, 0, 0.25)';
      row.style.borderLeft = '4px solid #ffb300';
      row.style.fontWeight = 'bold';
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      row.style.background = '';
      row.style.borderLeft = '';
      row.style.fontWeight = '';
    }
  });
  const status = document.getElementById('playback-status');
  if (status) {
    status.textContent = 'Candle ' + (window.playbackIndex + 1) + ' / ' + window.candleList.length;
  }
}

function playbackPlay() {
  if (window.candleList.length === 0) { alert('No candles to play'); return; }
  if (window.playbackTimer) { console.log('Already playing'); return; }
  console.log('Playback START from index', window.playbackIndex);
  if (window.playbackIndex >= window.candleList.length - 1) {
    window.playbackIndex = 0;
  }
  highlightActiveRow();
  window.playbackTimer = setInterval(() => {
    if (window.playbackIndex < window.candleList.length - 1) {
      window.playbackIndex++;
      highlightActiveRow();
      console.log('Playback -> candle', window.playbackIndex + 1);
    } else {
      playbackPause();
      console.log('Playback FINISHED');
    }
  }, window.playbackSpeed);
}

function playbackPause() {
  if (window.playbackTimer) {
    clearInterval(window.playbackTimer);
    window.playbackTimer = null;
    console.log('Playback PAUSED at index', window.playbackIndex);
  }
}

function playbackSkip() {
  if (window.candleList.length === 0) return;
  if (window.playbackIndex < window.candleList.length - 1) {
    window.playbackIndex++;
    highlightActiveRow();
    console.log('Skip -> candle', window.playbackIndex + 1);
  }
}

function playbackBack() {
  if (window.candleList.length === 0) return;
  if (window.playbackIndex > 0) {
    window.playbackIndex--;
    highlightActiveRow();
    console.log('Back -> candle', window.playbackIndex + 1);
  }
}

function playbackReset() {
  playbackPause();
  window.playbackIndex = 0;
  highlightActiveRow();
  console.log('Playback RESET to 0');
}

function playbackSetSpeed(ms) {
  window.playbackSpeed = ms;
  console.log('Playback speed set to', ms, 'ms');
  if (window.playbackTimer) {
    playbackPause();
    playbackPlay();
  }
}

function bindPlaybackButtons() {
  const playBtn = document.getElementById('play-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const skipBtn = document.getElementById('skip-btn');
  const backBtn = document.getElementById('back-btn');
  const resetBtn = document.getElementById('reset-btn');
  if (playBtn && playBtn.dataset.bound !== '1') { playBtn.dataset.bound = '1'; playBtn.onclick = playbackPlay; }
  if (pauseBtn && pauseBtn.dataset.bound !== '1') { pauseBtn.dataset.bound = '1'; pauseBtn.onclick = playbackPause; }
  if (skipBtn && skipBtn.dataset.bound !== '1') { skipBtn.dataset.bound = '1'; skipBtn.onclick = playbackSkip; }
  if (backBtn && backBtn.dataset.bound !== '1') { backBtn.dataset.bound = '1'; backBtn.onclick = playbackBack; }
  if (resetBtn && resetBtn.dataset.bound !== '1') { resetBtn.dataset.bound = '1'; resetBtn.onclick = playbackReset; }
  console.log('Playback buttons bound');
}

bindPlaybackButtons();
document.addEventListener('DOMContentLoaded', bindPlaybackButtons);
setTimeout(bindPlaybackButtons, 800);
setTimeout(bindPlaybackButtons, 2500);

function bindSpeedSelector() {
  const sel = document.getElementById('playback-speed');
  if (!sel || sel.dataset.bound === '1') return;
  sel.dataset.bound = '1';
  sel.addEventListener('change', () => {
    playbackSetSpeed(parseInt(sel.value));
  });
  console.log('Speed selector bound');
}

bindSpeedSelector();
document.addEventListener('DOMContentLoaded', bindSpeedSelector);
setTimeout(bindSpeedSelector, 800);
setTimeout(bindSpeedSelector, 2500);

/* ============================================================
   LIVE PREVIEW (Part 6C-2)
   ============================================================ */

window.previewMaxCandles = 20;

function renderCandlePreview() {
  const container = document.getElementById('candle-preview');
  if (!container) return;
  const list = window.candleList || [];
  if (list.length === 0) {
    container.innerHTML = '<span class="empty-text">No candles to preview</span>';
    return;
  }
  const startIdx = Math.max(0, list.length - window.previewMaxCandles);
  const slice = list.slice(startIdx);
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  slice.forEach(c => {
    const h = Number(c.high || 0);
    const l = Number(c.low || 0);
    if (h > maxPrice) maxPrice = h;
    if (l < minPrice) minPrice = l;
  });
  if (maxPrice === minPrice) maxPrice = minPrice + 1;
  const range = maxPrice - minPrice;
  const CHART_HEIGHT = 180;
  const barsHTML = slice.map((c, idx) => {
    const open = Number(c.open || 0);
    const close = Number(c.close || 0);
    const high = Number(c.high || 0);
    const low = Number(c.low || 0);
    const yHigh = ((maxPrice - high) / range) * CHART_HEIGHT;
    const yLow = ((maxPrice - low) / range) * CHART_HEIGHT;
    const yOpen = ((maxPrice - open) / range) * CHART_HEIGHT;
    const yClose = ((maxPrice - close) / range) * CHART_HEIGHT;
    const bodyTop = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
    const isGreen = close >= open;
    const color = isGreen ? '#00c853' : '#ff5252';
    const wickTop = yHigh;
    const wickHeight = Math.max(1, yLow - yHigh);
    const realIdx = startIdx + idx;
    const isActive = (realIdx === window.playbackIndex);
    return '<div class="pv-candle' + (isActive ? ' pv-active' : '') + '" data-idx="' + realIdx + '" style="height:' + CHART_HEIGHT + 'px;">' +
      '<div class="pv-wick" style="top:' + wickTop + 'px; height:' + wickHeight + 'px; background:' + color + ';"></div>' +
      '<div class="pv-body" style="top:' + bodyTop + 'px; height:' + bodyHeight + 'px; background:' + color + ';"></div>' +
      '<div class="pv-label">' + (realIdx + 1) + '</div>' +
    '</div>';
  }).join('');
  const maxLabel = '<div class="pv-price-label pv-price-top">$' + maxPrice.toFixed(2) + '</div>';
  const minLabel = '<div class="pv-price-label pv-price-bottom">$' + minPrice.toFixed(2) + '</div>';
  container.innerHTML =
    '<div class="pv-chart-wrap">' + maxLabel + minLabel +
      '<div class="pv-chart">' + barsHTML + '</div>' +
    '</div>' +
    '<div class="pv-info">Showing last ' + slice.length + ' of ' + list.length + ' candles</div>';
  container.querySelectorAll('.pv-candle').forEach(el => {
    el.onclick = () => {
      const idx = Number(el.dataset.idx);
      window.playbackIndex = idx;
      if (typeof highlightActiveRow === 'function') highlightActiveRow();
      renderCandlePreview();
    };
  });
}

const _origHighlight = window.highlightActiveRow;
window.highlightActiveRow = function() {
  if (_origHighlight) _origHighlight();
  renderCandlePreview();
};

const _origRenderTable = window.renderCandleTable;
window.renderCandleTable = function() {
  if (_origRenderTable) _origRenderTable();
  setTimeout(() => { renderCandlePreview(); }, 60);
};

renderCandlePreview();
document.addEventListener('DOMContentLoaded', renderCandlePreview);
setTimeout(renderCandlePreview, 1000);
setTimeout(renderCandlePreview, 2500);

console.log('Part 6C-2 (Live Preview) loaded');

(function startPreviewWatcher() {
  let lastCount = -1;
  let lastFirstClose = '';
  setInterval(function() {
    const container = document.getElementById('candle-preview');
    if (!container) return;
    const list = window.candleList || [];
    const count = list.length;
    const firstClose = count > 0 ? (list[0].close || '') : '';
    const isBlank = container.innerHTML.indexOf('No candles') !== -1 ||
                    container.innerHTML.indexOf('empty-text') !== -1;
    const changed = (count !== lastCount) || (firstClose !== lastFirstClose) ||
                    (isBlank && count > 0);
    if (changed) {
      lastCount = count;
      lastFirstClose = firstClose;
      renderCandlePreview();
      console.log('Preview auto-updated:', count, 'candles');
    }
  }, 400);
  console.log('Preview auto-watcher started');
})();

/* ============================================================
   DIRECTION TIMELINE (Part 6C-3)
   ============================================================ */

function renderDirectionTimeline() {
  const container = document.getElementById('direction-timeline');
  if (!container) return;
  const list = window.candleList || [];
  if (list.length === 0) {
    container.innerHTML = '<span class="empty-text">No timeline data</span>';
    return;
  }
  let upCount = 0, downCount = 0, neutralCount = 0;
  list.forEach(c => {
    const dir = c.direction || (Number(c.close) >= Number(c.open) ? 'up' : 'down');
    if (dir === 'up') upCount++;
    else if (dir === 'down') downCount++;
    else neutralCount++;
  });
  const blocks = [];
  let currentBlock = null;
  list.forEach((c, i) => {
    const dir = c.direction || (Number(c.close) >= Number(c.open) ? 'up' : 'down');
    if (!currentBlock || currentBlock.dir !== dir) {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = { dir: dir, candles: [i], startIdx: i, endIdx: i };
    } else {
      currentBlock.candles.push(i);
      currentBlock.endIdx = i;
    }
  });
  if (currentBlock) blocks.push(currentBlock);
  const blocksHTML = blocks.map((block) => {
    const colorClass = block.dir === 'up' ? 'tl-up' :
                       block.dir === 'down' ? 'tl-down' : 'tl-neutral';
    const squaresHTML = block.candles.map(cIdx => {
      const c = list[cIdx];
      const dir = c.direction || (Number(c.close) >= Number(c.open) ? 'up' : 'down');
      const sqClass = dir === 'up' ? 'tl-sq-up' :
                      dir === 'down' ? 'tl-sq-down' : 'tl-sq-neutral';
      const isActive = (cIdx === window.playbackIndex);
      return '<div class="tl-square ' + sqClass + (isActive ? ' tl-sq-active' : '') + '" ' +
             'data-idx="' + cIdx + '" title="Candle ' + (cIdx + 1) + ' - ' + dir + '">' +
             '<span class="tl-sq-num">' + (cIdx + 1) + '</span></div>';
    }).join('');
    const blockLabel = block.dir === 'up' ? 'UP' :
                       block.dir === 'down' ? 'DOWN' : 'NEUTRAL';
    return '<div class="tl-block ' + colorClass + '">' +
      '<div class="tl-block-label">' + blockLabel + ' x' + block.candles.length + '</div>' +
      '<div class="tl-squares">' + squaresHTML + '</div>' +
    '</div>';
  }).join('');
  const firstCandle = list[0];
  const lastCandle = list[list.length - 1];
  const timeRange = (firstCandle.time || '--:--') + ' to ' + (lastCandle.time || '--:--');
  const summaryHTML =
    '<div class="tl-summary">' +
      '<span class="tl-summary-item tl-sum-up">UP: ' + upCount + '</span>' +
      '<span class="tl-summary-item tl-sum-down">DOWN: ' + downCount + '</span>' +
      '<span class="tl-summary-item tl-sum-neutral">NEUTRAL: ' + neutralCount + '</span>' +
      '<span class="tl-summary-item tl-sum-time">' + timeRange + '</span>' +
    '</div>';
  container.innerHTML = summaryHTML +
    '<div class="tl-blocks-wrap"><div class="tl-blocks">' + blocksHTML + '</div></div>';
  container.querySelectorAll('.tl-square').forEach(el => {
    el.onclick = () => {
      const idx = Number(el.dataset.idx);
      window.playbackIndex = idx;
      if (typeof highlightActiveRow === 'function') highlightActiveRow();
      if (typeof renderCandlePreview === 'function') renderCandlePreview();
      renderDirectionTimeline();
    };
  });
}

const _origHighlight2 = window.highlightActiveRow;
window.highlightActiveRow = function() {
  if (_origHighlight2) _origHighlight2();
  renderDirectionTimeline();
};

const _origRenderTable2 = window.renderCandleTable;
window.renderCandleTable = function() {
  if (_origRenderTable2) _origRenderTable2();
  setTimeout(function() { renderDirectionTimeline(); }, 60);
};

renderDirectionTimeline();
document.addEventListener('DOMContentLoaded', renderDirectionTimeline);
setTimeout(renderDirectionTimeline, 1000);
setTimeout(renderDirectionTimeline, 2500);

console.log('Part 6C-3 (Direction Timeline) loaded');

(function startTimelineWatcher() {
  let lastCount = -1;
  let lastFirstClose = '';
  setInterval(function() {
    const container = document.getElementById('direction-timeline');
    if (!container) return;
    const list = window.candleList || [];
    const count = list.length;
    const firstClose = count > 0 ? (list[0].close || '') : '';
    const isBlank = container.innerHTML.indexOf('No timeline') !== -1 ||
                    container.innerHTML.indexOf('empty-text') !== -1;
    const changed = (count !== lastCount) || (firstClose !== lastFirstClose) ||
                    (isBlank && count > 0);
    if (changed) {
      lastCount = count;
      lastFirstClose = firstClose;
      renderDirectionTimeline();
      console.log('Timeline auto-updated:', count, 'candles');
    }
  }, 500);
  console.log('Timeline auto-watcher started');
})();

/* ============================================================
   AUTO MODE (Part 6D) + MODE BEHAVIOR (Part 6E-2)
   ============================================================ */

window.autoModeActive = false;
window.autoModeTimer = null;
window.autoModeInterval = 5000;
window.autoModeMaxCandles = 500;

function autoGenerateOneCandle() {
  if (!window.currentMarketId) {
    console.log('Auto: No market selected, stopping');
    stopAutoMode();
    return;
  }
  if (window.candleList.length >= window.autoModeMaxCandles) {
    console.log('Auto: Max candles reached, stopping');
    stopAutoMode();
    return;
  }

  const mode = window.candleMode || 'locked';

  if (mode === 'locked') {
    console.warn('Auto: LOCKED mode - auto generation stopped');
    stopAutoMode();
    return;
  }

  let lastCandle = null;
  if (window.candleList.length > 0) {
    lastCandle = window.candleList[window.candleList.length - 1];
  }
  const baseEl = document.getElementById('bulk-base');
  const basePrice = Number(baseEl?.value || 50000);
  const tf = document.getElementById('candle-timeframe')?.value || '1m';
  const tfSeconds = timeframeToSeconds(tf);
  const wick = Number(document.getElementById('bulk-wick')?.value || 20);
  const body = Number(document.getElementById('bulk-body')?.value || 60);
  const upDuration = Number(document.getElementById('bulk-up')?.value || 5);
  const downDuration = Number(document.getElementById('bulk-down')?.value || 5);
  const patternLength = upDuration + downDuration;
  const idx = window.candleList.length;
  let direction = 'up';

  if (mode === 'random') {
    const r = Math.random();
    if (r < 0.45) direction = 'up';
    else if (r < 0.90) direction = 'down';
    else direction = 'neutral';
    console.log('Auto: RANDOM mode - direction:', direction);
  } else if (mode === 'mixed') {
    if (patternLength > 0) {
      const pos = idx % patternLength;
      if (pos < upDuration) direction = 'up';
      else direction = 'down';
    }
    console.log('Auto: MIXED mode - direction:', direction);
  } else if (mode === 'schedule') {
    if (patternLength > 0) {
      const pos = idx % patternLength;
      if (pos < upDuration) direction = 'up';
      else direction = 'down';
    }
    console.log('Auto: SCHEDULE mode - direction:', direction);
  }

  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().slice(0, 8);
  const endTimeSec = timeToSeconds(timeStr) + tfSeconds;
  const endTimeStr = secondsToTime(endTimeSec);
  const prevClose = lastCandle ? parseFloat(lastCandle.close) : null;
  const candle = buildCandleWithPrice({
    number: idx + 1,
    date: date, time: timeStr, endTime: endTimeStr,
    timeframe: tf, prevClose: prevClose, basePrice: basePrice,
    direction: direction, wick: wick, body: body, sizeType: 'medium'
  });
  candle.up = upDuration;
  candle.down = downDuration;
  window.candleList.push(candle);
  window.candleCounter = window.candleList.length;
  renderCandleTable();
  console.log('Auto-generated candle #' + candle.number + ' (' + direction + ') price: ' + candle.close);
}

function startAutoMode() {
  if (window.autoModeActive) return;
  if (!window.currentMarketId) { alert('Select a market first'); return; }
  window.autoModeActive = true;
  console.log('Auto Mode STARTED with interval', window.autoModeInterval, 'ms');
  if (window.playbackTimer) playbackPause();
  autoGenerateOneCandle();
  window.autoModeTimer = setInterval(function() { autoGenerateOneCandle(); }, window.autoModeInterval);
  updateAutoModeUI2();
}

function stopAutoMode() {
  if (!window.autoModeActive) return;
  if (window.autoModeTimer) {
    clearInterval(window.autoModeTimer);
    window.autoModeTimer = null;
  }
  window.autoModeActive = false;
  console.log('Auto Mode STOPPED');
  updateAutoModeUI2();
}

function toggleAutoMode() {
  if (window.autoModeActive) stopAutoMode();
  else startAutoMode();
}

function setAutoModeInterval(ms) {
  window.autoModeInterval = ms;
  console.log('Auto interval set to', ms, 'ms');
  if (window.autoModeActive) { stopAutoMode(); startAutoMode(); }
}

function updateAutoModeUI2() {
  const btn = document.getElementById('auto-mode-toggle');
  if (!btn) return;
  if (window.autoModeActive) {
    btn.textContent = 'Auto Mode: ON';
    btn.classList.add('active');
    btn.style.background = '#00c853';
    btn.style.color = '#04121a';
    window.adminSettings.autoMode = true;
  } else {
    btn.textContent = 'Auto Mode: OFF';
    btn.classList.remove('active');
    btn.style.background = '';
    btn.style.color = '';
    window.adminSettings.autoMode = false;
  }
}

function bindAutoMode() {
  const btn = document.getElementById('auto-mode-toggle');
  if (btn && btn.dataset.boundAuto !== '1') {
    btn.dataset.boundAuto = '1';
    btn.onclick = function(e) {
      toggleAutoMode();
    };
    console.log('Auto Mode toggle bound');
  }
  let sel = document.getElementById('auto-mode-speed');
  if (!sel && btn && btn.parentNode) {
    sel = document.createElement('select');
    sel.id = 'auto-mode-speed';
    sel.className = 'playback-speed-select';
    sel.style.marginLeft = '8px';
    sel.innerHTML =
      '<option value="1000">1s</option>' +
      '<option value="5000" selected>5s</option>' +
      '<option value="10000">10s</option>' +
      '<option value="30000">30s</option>' +
      '<option value="60000">1m</option>';
    btn.parentNode.appendChild(sel);
  }
  if (sel && sel.dataset.boundAuto !== '1') {
    sel.dataset.boundAuto = '1';
    sel.onchange = function() { setAutoModeInterval(parseInt(sel.value)); };
    console.log('Auto Mode speed selector bound');
  }
}

bindAutoMode();
document.addEventListener('DOMContentLoaded', bindAutoMode);
setTimeout(bindAutoMode, 800);
setTimeout(bindAutoMode, 2500);

console.log('Part 6D (Auto Mode) loaded');
console.log('Part 6C-1 (Playback) loaded');

/* ============================================================
   GLOBAL EXPOSE
   ============================================================ */

window.addCandle = addCandle;
window.clearCandles = clearCandles;
window.renderCandleTable = renderCandleTable;
window.saveAllCandles = saveAllCandles;
window.loadCandlesFromFirestore = loadCandlesFromFirestore;
window.bulkGenerateCandles = bulkGenerateCandles;
window.timeframeToSeconds = timeframeToSeconds;
window.calcCandleTime = calcCandleTime;
window.renderCandlePreview = renderCandlePreview;
window.renderDirectionTimeline = renderDirectionTimeline;
window.playbackPlay = playbackPlay;
window.playbackPause = playbackPause;
window.playbackSkip = playbackSkip;
window.playbackBack = playbackBack;
window.playbackReset = playbackReset;
window.playbackSetSpeed = playbackSetSpeed;
window.highlightActiveRow = highlightActiveRow;
window.startAutoMode = startAutoMode;
window.stopAutoMode = stopAutoMode;
window.toggleAutoMode = toggleAutoMode;
window.setAutoModeInterval = setAutoModeInterval;
window.autoGenerateOneCandle = autoGenerateOneCandle;

/* ============================================================
   PART 6E-1 + 6E-2: CANDLE MODE SWITCH + FIRESTORE + BEHAVIOR
   ============================================================ */

window.candleMode = window.candleMode || 'locked';

window.CANDLE_MODE_INFO = {
  locked:   '<strong>LOCKED:</strong> Admin-er save kora candle user-er kache exact jabe.',
  random:   '<strong>RANDOM:</strong> Prottek candle randomly generate hobe (up/down/neutral).',
  mixed:    '<strong>MIXED:</strong> Locked candle thakbe, kintu win rate target maintain hobe.',
  schedule: '<strong>SCHEDULE:</strong> Time-based candle generate hobe (schedule onujayi).'
};

window.updateCandleModeInfo = function(mode) {
  const infoEl = document.getElementById('candle-mode-info');
  if (!infoEl) {
    console.warn('[Mode] candle-mode-info element not found');
    return;
  }
  infoEl.innerHTML = window.CANDLE_MODE_INFO[mode] || '';
};

window.updateCandleModeButtons = function(mode) {
  const buttons = document.querySelectorAll('.mode-btn[data-mode]');
  if (!buttons.length) {
    console.warn('[Mode] No mode buttons found');
    return;
  }
  buttons.forEach(function(btn) {
    if (!btn) return;
    if (btn.getAttribute('data-mode') === mode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
};

window.setCandleMode = function(mode, skipSave) {
  const validModes = ['locked', 'random', 'mixed', 'schedule'];
  if (validModes.indexOf(mode) === -1) {
    console.error('[Mode] Invalid mode:', mode);
    return;
  }

  const oldMode = window.candleMode;
  window.candleMode = mode;
  window.adminSettings.candleMode = mode;

  window.updateCandleModeButtons(mode);
  window.updateCandleModeInfo(mode);

  console.log('[Mode] Switched: ' + oldMode + ' -> ' + mode);

  if (!skipSave) {
    window.saveCandleModeToFirestore(mode);
  }
};

window.saveCandleModeToFirestore = async function(mode) {
  try {
    if (typeof window.db === 'undefined') {
      console.warn('[Mode] Firestore db not exposed - skipping save');
      return;
    }
    const { doc: fbDoc, setDoc: fbSetDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    await fbSetDoc(
      fbDoc(window.db, 'settings', 'global'),
      { candleMode: mode, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    console.log('[Mode] Saved to Firestore:', mode);
  } catch (err) {
    console.error('[Mode] Firestore save error:', err.message);
  }
};

window.loadCandleModeFromFirestore = async function() {
  try {
    if (typeof window.db === 'undefined') {
      console.warn('[Mode] Firestore db not exposed - using default');
      window.setCandleMode('locked', true);
      return;
    }
    const { doc: fbDoc, getDoc: fbGetDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    const docSnap = await fbGetDoc(fbDoc(window.db, 'settings', 'global'));

    if (docSnap.exists()) {
      const data = docSnap.data();
      const savedMode = data.candleMode || 'locked';
      console.log('[Mode] Loaded from Firestore:', savedMode);
      window.setCandleMode(savedMode, true);
    } else {
      console.log('[Mode] No settings doc, using default: locked');
      window.setCandleMode('locked', true);
    }
  } catch (err) {
    console.error('[Mode] Load error:', err.message);
    window.setCandleMode('locked', true);
  }
};

window.bindCandleModeButtons = function() {
  const buttons = document.querySelectorAll('.mode-btn[data-mode]');
  if (!buttons.length) {
    console.warn('[Mode] No mode buttons to bind');
    return;
  }

  buttons.forEach(function(btn) {
    if (btn.dataset.modeBound === '1') return;
    btn.dataset.modeBound = '1';

    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const mode = btn.getAttribute('data-mode');
      console.log('[Mode] Button clicked:', mode);

      if (window.autoModeActive === true && typeof window.stopAutoMode === 'function') {
        console.log('[Mode] Auto Mode running - stopping before mode switch');
        window.stopAutoMode();
      }

      window.setCandleMode(mode);
    });
  });

  console.log('[Mode] Bound ' + buttons.length + ' mode buttons');
};

window.initCandleModeUI = function() {
  console.log('[Mode] Initializing Mode UI...');
  window.bindCandleModeButtons();
  window.updateCandleModeButtons(window.candleMode);
  window.updateCandleModeInfo(window.candleMode);
  console.log('[Mode] Init complete. Current mode:', window.candleMode);

  setTimeout(function() {
    if (window.currentAdmin) {
      window.loadCandleModeFromFirestore();
    }
  }, 1500);
};

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(window.initCandleModeUI, 800);
});

setTimeout(function() {
  if (!document.querySelector('.mode-btn.active')) {
    console.log('[Mode] Fallback init at 2500ms');
    window.initCandleModeUI();
  }
}, 2500);

/* ============================================================
   EXPOSE FIRESTORE DB TO WINDOW
   ============================================================ */

window.db = db;
window.auth = auth;
console.log('[Firebase] db + auth exposed to window');
/* ============================================================
   PART 6F: EXPORT / IMPORT JSON
   ============================================================ */

window.exportCandles = function() {
  console.log('[Export] Starting...');
  
  // Check if candles exist
  if (!window.candleList || window.candleList.length === 0) {
    alert('No candles to export. Generate or load candles first.');
    return;
  }
  
  try {
    // Build export object
    const exportData = {
      version: '6F',
      exportedAt: new Date().toISOString(),
      marketId: window.currentMarketId || 'unknown',
      candleCount: window.candleList.length,
      candleMode: window.candleMode || 'locked',
      candles: window.candleList.map(function(c, i) {
        return {
          number: i + 1,
          date: c.date || '',
          time: c.time || '',
          endTime: c.endTime || '',
          timeframe: c.timeframe || '1m',
          open: Number(c.open) || 0,
          high: Number(c.high) || 0,
          low: Number(c.low) || 0,
          close: Number(c.close) || 0,
          color: c.color || 'green',
          direction: c.direction || (Number(c.close) >= Number(c.open) ? 'up' : 'down'),
          size: c.size || 'medium',
          wick: Number(c.wick) || 20,
          body: Number(c.body) || 60,
          up: Number(c.up) || 0,
          down: Number(c.down) || 0
        };
      })
    };
    
    // Convert to JSON string
    const jsonStr = JSON.stringify(exportData, null, 2);
    
    // Create blob
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = 'candles_' + (window.currentMarketId || 'export') + '_' + timestamp + '.json';
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[Export] Exported ' + exportData.candleCount + ' candles to ' + filename);
    alert('Exported ' + exportData.candleCount + ' candles!\n\nFile: ' + filename);
    
  } catch (err) {
    console.error('[Export] Error:', err);
    alert('Export failed: ' + err.message);
  }
};

window.importCandles = function() {
  console.log('[Import] Opening file picker...');
  
  // Find or create file input
  let fileInput = document.getElementById('import-candles-file');
  if (!fileInput) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'import-candles-file';
    fileInput.accept = '.json,application/json';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    console.log('[Import] Created hidden file input');
  }
  
  // Bind change event
  fileInput.onchange = async function(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      console.log('[Import] No file selected');
      return;
    }
    
    console.log('[Import] File selected: ' + file.name + ' (' + file.size + ' bytes)');
    
    try {
      // Read file
      const text = await file.text();
      console.log('[Import] File read, length: ' + text.length);
      
      // Parse JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        throw new Error('Invalid JSON file: ' + parseErr.message);
      }
      
      // Validate structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid file format: not an object');
      }
      
      if (!Array.isArray(data.candles)) {
        throw new Error('Invalid file: missing "candles" array');
      }
      
      if (data.candles.length === 0) {
        throw new Error('File contains 0 candles');
      }
      
      console.log('[Import] Validated: ' + data.candles.length + ' candles');
      
      // Confirm with user
      const confirmMsg = 'Import ' + data.candles.length + ' candles?\n\n' +
        'From: ' + (data.marketId || 'unknown') + '\n' +
        'Exported: ' + (data.exportedAt || 'unknown') + '\n\n' +
        'This will REPLACE current ' + (window.candleList ? window.candleList.length : 0) + ' candles.';
      
      if (!confirm(confirmMsg)) {
        console.log('[Import] Cancelled by user');
        return;
      }
      
      // Validate and build new candle list
      const validCandles = [];
      let invalidCount = 0;
      
      for (let i = 0; i < data.candles.length; i++) {
        const c = data.candles[i];
        if (!c || typeof c !== 'object') {
          invalidCount++;
          continue;
        }
        
        // Open/close/high/low must be numbers (or parseable)
        const open = Number(c.open);
        const close = Number(c.close);
        const high = Number(c.high);
        const low = Number(c.low);
        
        if (isNaN(open) || isNaN(close) || isNaN(high) || isNaN(low)) {
          invalidCount++;
          continue;
        }
        
        validCandles.push({
          number: validCandles.length + 1,
          date: c.date || '',
          time: c.time || '',
          endTime: c.endTime || '',
          timeframe: c.timeframe || '1m',
          open: open.toFixed(2),
          high: high.toFixed(2),
          low: low.toFixed(2),
          close: close.toFixed(2),
          color: c.color || (close >= open ? 'green' : 'red'),
          direction: c.direction || (close >= open ? 'up' : 'down'),
          size: c.size || 'medium',
          wick: Number(c.wick) || 20,
          body: Number(c.body) || 60,
          up: Number(c.up) || 0,
          down: Number(c.down) || 0
        });
      }
      
      if (validCandles.length === 0) {
        throw new Error('No valid candles found. All ' + invalidCount + ' entries were invalid.');
      }
      
      console.log('[Import] Validated: ' + validCandles.length + ' valid, ' + invalidCount + ' invalid');
      
      // Apply
      window.candleList = validCandles;
      window.candleCounter = validCandles.length;
      renderCandleTable();
      
      // Update market select if available
      if (data.marketId && data.marketId !== 'unknown') {
        const sel = document.getElementById('candle-market-select');
        if (sel) {
          // Try to find the market in options
          let found = false;
          for (let i = 0; i < sel.options.length; i++) {
            if (sel.options[i].value === data.marketId) {
              sel.value = data.marketId;
              window.currentMarketId = data.marketId;
              found = true;
              break;
            }
          }
          if (found) {
            console.log('[Import] Auto-selected market: ' + data.marketId);
          }
        }
      }
      
      const successMsg = 'Imported ' + validCandles.length + ' candles!\n\n' +
        (invalidCount > 0 ? 'Skipped ' + invalidCount + ' invalid entries.\n\n' : '') +
        'Click "Save to Firestore" to persist them.';
      
      alert(successMsg);
      console.log('[Import] Success: ' + validCandles.length + ' candles loaded');
      
    } catch (err) {
      console.error('[Import] Error:', err);
      alert('Import failed:\n\n' + err.message);
    } finally {
      // Reset file input so same file can be re-selected
      fileInput.value = '';
    }
  };
  
  // Open file picker
  fileInput.click();
};

function bindExportImport() {
  const exportBtn = document.getElementById('export-candles-btn');
  if (exportBtn && exportBtn.dataset.bound !== '1') {
    exportBtn.dataset.bound = '1';
    exportBtn.onclick = function(e) {
      e.preventDefault();
      console.log('[Export] Button clicked');
      window.exportCandles();
    };
    console.log('[Export] Button bound');
  }
  
  const importBtn = document.getElementById('import-candles-btn');
  if (importBtn && importBtn.dataset.bound !== '1') {
    importBtn.dataset.bound = '1';
    importBtn.onclick = function(e) {
      e.preventDefault();
      console.log('[Import] Button clicked');
      window.importCandles();
    };
    console.log('[Import] Button bound');
  }
}

bindExportImport();
document.addEventListener('DOMContentLoaded', bindExportImport);
setTimeout(bindExportImport, 800);
setTimeout(bindExportImport, 2500);

console.log('Part 6F (Export/Import JSON) loaded');
/* ============================================================
   PART DEBUG-1: AUTO ERROR SYSTEM
   ============================================================ */

window.debugLogs = [];
window.debugPanelOpen = false;
window.maxDebugLogs = 200;

window.addDebugLog = function(level, message) {
  const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false });
  const entry = {
    time: timestamp,
    level: level,
    message: String(message)
  };
  window.debugLogs.push(entry);
  if (window.debugLogs.length > window.maxDebugLogs) {
    window.debugLogs.shift();
  }
  if (window.debugPanelOpen) {
    window.renderDebugPanel();
  }
};

window.createDebugPanel = function() {
  if (document.getElementById('debug-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'debug-panel';
  panel.style.cssText = [
    'position: fixed',
    'bottom: 0',
    'right: 0',
    'width: 100%',
    'max-width: 420px',
    'height: 50vh',
    'max-height: 400px',
    'background: #0b1220',
    'border-top: 2px solid #2196f3',
    'border-left: 2px solid #2196f3',
    'border-top-left-radius: 12px',
    'z-index: 99999',
    'display: none',
    'flex-direction: column',
    'box-shadow: -4px -4px 20px rgba(0,0,0,0.6)',
    'font-family: monospace',
    'font-size: 11px'
  ].join(';');

  panel.innerHTML =
    '<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:#0d1522; border-bottom:1px solid #1f2a3d;">' +
      '<span style="color:#2196f3; font-weight:bold;">DEBUG PANEL</span>' +
      '<div>' +
        '<button id="debug-copy-btn" style="background:#1a2333; color:#e6edf3; border:1px solid #2a3648; border-radius:4px; padding:4px 8px; font-size:10px; margin-right:4px; cursor:pointer;">Copy</button>' +
        '<button id="debug-clear-btn" style="background:#3a1220; color:#ff5252; border:1px solid #ff5252; border-radius:4px; padding:4px 8px; font-size:10px; margin-right:4px; cursor:pointer;">Clear</button>' +
        '<button id="debug-close-btn" style="background:#1a2333; color:#e6edf3; border:1px solid #2a3648; border-radius:4px; padding:4px 8px; font-size:10px; cursor:pointer;">X</button>' +
      '</div>' +
    '</div>' +
    '<div id="debug-log-body" style="flex:1; overflow-y:auto; padding:8px; color:#e6edf3;"></div>';

  document.body.appendChild(panel);

  document.getElementById('debug-copy-btn').onclick = function() {
    const text = window.debugLogs.map(function(l) {
      return '[' + l.time + '] [' + l.level + '] ' + l.message;
    }).join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        alert('Logs copied to clipboard! (' + window.debugLogs.length + ' entries)');
      }).catch(function() {
        alert('Copy failed. Total logs: ' + window.debugLogs.length);
      });
    } else {
      alert('Clipboard not available. Total logs: ' + window.debugLogs.length);
    }
  };

  document.getElementById('debug-clear-btn').onclick = function() {
    window.debugLogs = [];
    window.renderDebugPanel();
    window.addDebugLog('info', 'Logs cleared');
  };

  document.getElementById('debug-close-btn').onclick = function() {
    window.toggleDebugPanel(false);
  };
};

window.renderDebugPanel = function() {
  const body = document.getElementById('debug-log-body');
  if (!body) return;
  if (window.debugLogs.length === 0) {
    body.innerHTML = '<div style="color:#6b7a90; text-align:center; padding:20px;">No logs yet</div>';
    return;
  }
  const colorMap = {
    'error': '#ff5252',
    'warn': '#ffb300',
    'success': '#00c853',
    'info': '#2196f3'
  };
  body.innerHTML = window.debugLogs.map(function(l) {
    const color = colorMap[l.level] || '#e6edf3';
    return '<div style="margin-bottom:4px; padding:4px 6px; background:rgba(255,255,255,0.03); border-left:2px solid ' + color + '; border-radius:2px;">' +
      '<span style="color:#6b7a90;">[' + l.time + ']</span> ' +
      '<span style="color:' + color + '; font-weight:bold;">[' + l.level.toUpperCase() + ']</span> ' +
      '<span style="color:#e6edf3;">' + l.message.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>' +
    '</div>';
  }).join('');
  body.scrollTop = body.scrollHeight;
};

window.toggleDebugPanel = function(forceState) {
  const panel = document.getElementById('debug-panel');
  if (!panel) return;
  const open = typeof forceState === 'boolean' ? forceState : !window.debugPanelOpen;
  window.debugPanelOpen = open;
  panel.style.display = open ? 'flex' : 'none';
  if (open) {
    window.renderDebugPanel();
  }
};

window.createDebugButton = function() {
  if (document.getElementById('debug-toggle-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'debug-toggle-btn';
  btn.textContent = 'LOG';
  btn.style.cssText = [
    'position: fixed',
    'bottom: 16px',
    'right: 16px',
    'width: 56px',
    'height: 56px',
    'background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
    'color: #fff',
    'border: 2px solid #0b1220',
    'border-radius: 50%',
    'font-size: 12px',
    'font-weight: bold',
    'z-index: 99998',
    'cursor: pointer',
    'box-shadow: 0 4px 12px rgba(33, 150, 243, 0.5)'
  ].join(';');

  btn.onclick = function() {
    window.toggleDebugPanel();
  };

  document.body.appendChild(btn);
};

// ============ GLOBAL ERROR HANDLER ============

window.addEventListener('error', function(event) {
  const msg = event.message || 'Unknown error';
  const src = event.filename ? event.filename.split('/').pop() : '';
  const line = event.lineno || 0;
  const col = event.colno || 0;
  const fullMsg = msg + (src ? ' @ ' + src + ':' + line + ':' + col : '');
  window.addDebugLog('error', fullMsg);
});

window.addEventListener('unhandledrejection', function(event) {
  const reason = event.reason;
  let msg = 'Unhandled Promise Rejection: ';
  if (reason instanceof Error) {
    msg += reason.message;
  } else if (typeof reason === 'string') {
    msg += reason;
  } else {
    try { msg += JSON.stringify(reason); } catch (e) { msg += String(reason); }
  }
  window.addDebugLog('error', msg);
});

// ============ CONSOLE FORWARDING ============

(function() {
  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  console.log = function() {
    const msg = Array.prototype.slice.call(arguments).map(function(a) {
      if (typeof a === 'string') return a;
      if (typeof a === 'object') {
        try { return JSON.stringify(a); } catch (e) { return String(a); }
      }
      return String(a);
    }).join(' ');
    window.addDebugLog('info', msg);
    origLog.apply(console, arguments);
  };

  console.warn = function() {
    const msg = Array.prototype.slice.call(arguments).map(function(a) {
      if (typeof a === 'string') return a;
      if (typeof a === 'object') {
        try { return JSON.stringify(a); } catch (e) { return String(a); }
      }
      return String(a);
    }).join(' ');
    window.addDebugLog('warn', msg);
    origWarn.apply(console, arguments);
  };

  console.error = function() {
    const msg = Array.prototype.slice.call(arguments).map(function(a) {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return a.message;
      if (typeof a === 'object') {
        try { return JSON.stringify(a); } catch (e) { return String(a); }
      }
      return String(a);
    }).join(' ');
    window.addDebugLog('error', msg);
    origError.apply(console, arguments);
  };
})();

// ============ INIT ============

function initDebugSystem() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.createDebugButton();
      window.createDebugPanel();
      window.addDebugLog('success', 'Debug System initialized');
    });
  } else {
    window.createDebugButton();
    window.createDebugPanel();
    window.addDebugLog('success', 'Debug System initialized');
  }
}

initDebugSystem();


console.log('Part Debug-1 (Auto Error System) loaded');
/* ============================================================
   PART DEBUG-2: TEST MENU (window.runTests)
   ============================================================ */

window.testResults = {
  total: 0,
  pass: 0,
  fail: 0,
  warn: 0,
  tests: []
};

window.recordTest = function(name, status, details) {
  window.testResults.total++;
  if (status === 'pass') window.testResults.pass++;
  else if (status === 'fail') window.testResults.fail++;
  else window.testResults.warn++;
  window.testResults.tests.push({
    name: name,
    status: status,
    details: details || ''
  });
};

window.runTests = function() {
  console.log('===== RUN TESTS START =====');
  if (window.addDebugLog) window.addDebugLog('info', '===== RUN TESTS START =====');

  window.testResults = { total: 0, pass: 0, fail: 0, warn: 0, tests: [] };

  // -------- 1. ELEMENT CHECK --------
  console.log('--- ELEMENTS CHECK ---');
  var requiredIds = [
    'login-screen', 'admin-panel',
    'login-email', 'login-password', 'login-btn', 'login-error',
    'admin-user-email', 'admin-logout-btn',
    'candle-market-select', 'candle-timeframe',
    'bulk-date', 'bulk-time', 'bulk-count', 'bulk-base',
    'bulk-up', 'bulk-down', 'bulk-neutral', 'bulk-wick', 'bulk-body',
    'bulk-generate-btn',
    'add-candle-btn', 'save-candles-btn', 'clear-candles-btn', 'refresh-candles',
    'export-candles-btn', 'import-candles-btn',
    'play-btn', 'pause-btn', 'skip-btn', 'back-btn', 'reset-btn',
    'playback-speed', 'playback-status',
    'auto-mode-toggle', 'auto-interval-input', 'save-auto-interval',
    'candle-table-body', 'candle-preview', 'direction-timeline',
    'candle-mode-info', 'win-rate-input', 'save-win-rate',
    'payout-input', 'save-payout',
    'users-list', 'trades-list', 'deposits-list', 'withdrawals-list'
  ];

  var missingIds = [];
  requiredIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      window.recordTest('Element #' + id, 'pass');
    } else {
      window.recordTest('Element #' + id, 'fail', 'MISSING');
      missingIds.push(id);
    }
  });

  if (missingIds.length === 0) {
    console.log('[ELEMENTS] All ' + requiredIds.length + ' elements found ✓');
  } else {
    console.warn('[ELEMENTS] Missing: ' + missingIds.join(', '));
  }

  // -------- 2. MODE BUTTONS --------
  console.log('--- MODE BUTTONS CHECK ---');
  var modeBtns = document.querySelectorAll('.mode-btn[data-mode]');
  if (modeBtns.length === 4) {
    window.recordTest('4 Mode Buttons', 'pass');
  } else {
    window.recordTest('4 Mode Buttons', 'fail', 'Found: ' + modeBtns.length);
  }

  // -------- 3. FUNCTION CHECK --------
  console.log('--- FUNCTIONS CHECK ---');
  var requiredFns = [
    'addDebugLog', 'toggleDebugPanel',
    'exportCandles', 'importCandles',
    'setCandleMode', 'bindCandleModeButtons', 'initCandleModeUI',
    'saveCandleModeToFirestore', 'loadCandleModeFromFirestore',
    'updateCandleModeButtons', 'updateCandleModeInfo',
    'renderCandleTable', 'renderCandlePreview', 'renderDirectionTimeline',
    'addCandle', 'clearCandles', 'saveAllCandles', 'loadCandlesFromFirestore',
    'bulkGenerateCandles',
    'playbackPlay', 'playbackPause', 'playbackSkip', 'playbackBack',
    'playbackReset', 'playbackSetSpeed', 'highlightActiveRow',
    'startAutoMode', 'stopAutoMode', 'toggleAutoMode',
    'setAutoModeInterval', 'autoGenerateOneCandle',
    'timeframeToSeconds', 'calcCandleTime'
  ];

  var missingFns = [];
  requiredFns.forEach(function(fn) {
    if (typeof window[fn] === 'function') {
      window.recordTest('Function ' + fn, 'pass');
    } else {
      window.recordTest('Function ' + fn, 'fail', 'MISSING');
      missingFns.push(fn);
    }
  });

  if (missingFns.length === 0) {
    console.log('[FUNCTIONS] All ' + requiredFns.length + ' functions loaded ✓');
  } else {
    console.warn('[FUNCTIONS] Missing: ' + missingFns.join(', '));
  }

  // -------- 4. STATE CHECK --------
  console.log('--- STATE CHECK ---');
  var stateChecks = [
    { name: 'window.adminSettings', val: window.adminSettings, type: 'object' },
    { name: 'window.candleList', val: window.candleList, type: 'object' },
    { name: 'window.candleMode', val: window.candleMode, type: 'string' },
    { name: 'window.currentMarketId', val: window.currentMarketId, type: 'string_or_null' },
    { name: 'window.autoModeInterval', val: window.autoModeInterval, type: 'number' },
    { name: 'window.playbackSpeed', val: window.playbackSpeed, type: 'number' },
    { name: 'window.debugLogs', val: window.debugLogs, type: 'object' }
  ];

  stateChecks.forEach(function(c) {
    if (c.val === undefined) {
      window.recordTest('State ' + c.name, 'warn', 'undefined');
    } else {
      window.recordTest('State ' + c.name, 'pass', typeof c.val);
    }
  });

  // -------- 5. FIREBASE CONFIG --------
  console.log('--- FIREBASE CHECK ---');
  if (typeof window.db !== 'undefined' && window.db) {
    window.recordTest('Firebase db exposed', 'pass');
  } else {
    window.recordTest('Firebase db exposed', 'fail', 'window.db is undefined');
  }
  if (typeof window.auth !== 'undefined' && window.auth) {
    window.recordTest('Firebase auth exposed', 'pass');
  } else {
    window.recordTest('Firebase auth exposed', 'fail', 'window.auth is undefined');
  }

  // -------- 6. RENDER TEST --------
  console.log('--- RENDER TEST ---');
  try {
    var testList = [
      { number: 1, date: '2026-09-28', time: '10:00:00', open: '50000.00', high: '50100.00', low: '49900.00', close: '50050.00', direction: 'up', color: 'green', timeframe: '1m', up: 5, down: 5 },
      { number: 2, date: '2026-09-28', time: '10:01:00', open: '50050.00', high: '50150.00', low: '50000.00', close: '50100.00', direction: 'up', color: 'green', timeframe: '1m', up: 5, down: 5 },
      { number: 3, date: '2026-09-28', time: '10:02:00', open: '50100.00', high: '50120.00', low: '49980.00', close: '49990.00', direction: 'down', color: 'red', timeframe: '1m', up: 5, down: 5 }
    ];
    var savedList = window.candleList;
    var savedCounter = window.candleCounter;

    window.candleList = testList;
    window.candleCounter = 3;

    if (typeof window.renderCandleTable === 'function') {
      window.renderCandleTable();
      var tbody = document.getElementById('candle-table-body');
      if (tbody && tbody.innerHTML.indexOf('50000') !== -1) {
        window.recordTest('Render Table', 'pass');
      } else {
        window.recordTest('Render Table', 'fail', 'Table empty');
      }
    }

    if (typeof window.renderCandlePreview === 'function') {
      window.renderCandlePreview();
      var preview = document.getElementById('candle-preview');
      if (preview && preview.innerHTML.indexOf('pv-candle') !== -1) {
        window.recordTest('Render Preview', 'pass');
      } else {
        window.recordTest('Render Preview', 'fail', 'No candles');
      }
    }

    if (typeof window.renderDirectionTimeline === 'function') {
      window.renderDirectionTimeline();
      var timeline = document.getElementById('direction-timeline');
      if (timeline && timeline.innerHTML.indexOf('tl-block') !== -1) {
        window.recordTest('Render Timeline', 'pass');
      } else {
        window.recordTest('Render Timeline', 'fail', 'No blocks');
      }
    }

    // Restore
    window.candleList = savedList;
    window.candleCounter = savedCounter;
    if (typeof window.renderCandleTable === 'function') window.renderCandleTable();
  } catch (err) {
    window.recordTest('Render Test', 'fail', err.message);
  }

  // -------- FINAL SUMMARY --------
  console.log('===== RUN TESTS END =====');
  var summary = 'PASS: ' + window.testResults.pass +
    ' | FAIL: ' + window.testResults.fail +
    ' | WARN: ' + window.testResults.warn +
    ' | TOTAL: ' + window.testResults.total;

  console.log(summary);
  if (window.addDebugLog) {
    if (window.testResults.fail > 0) {
      window.addDebugLog('error', '[Tests] ' + summary);
    } else {
      window.addDebugLog('success', '[Tests] ' + summary);
    }
  }

  // Alert user
  var alertMsg = 'TEST RESULTS\n\n' +
    'Total: ' + window.testResults.total + '\n' +
    'Pass: ' + window.testResults.pass + '\n' +
    'Fail: ' + window.testResults.fail + '\n' +
    'Warn: ' + window.testResults.warn + '\n\n';

  if (window.testResults.fail === 0) {
    alertMsg += 'ALL TESTS PASSED!';
  } else {
    alertMsg += 'Check Debug Panel for failures.';
    var fails = window.testResults.tests.filter(function(t) { return t.status === 'fail'; });
    fails.forEach(function(f) {
      if (window.addDebugLog) window.addDebugLog('error', '[FAIL] ' + f.name + ' - ' + f.details);
    });
  }

  alert(alertMsg);

  return window.testResults;
};

// ============ TEST BUTTON IN DEBUG PANEL ============

window.addTestButtonToPanel = function() {
  var panel = document.getElementById('debug-panel');
  if (!panel) return;
  if (document.getElementById('debug-run-tests-btn')) return;

  var header = panel.querySelector('div');
  if (!header) return;

  var testBtn = document.createElement('button');
  testBtn.id = 'debug-run-tests-btn';
  testBtn.textContent = 'Run Tests';
  testBtn.style.cssText = 'background:linear-gradient(135deg,#00c853 0%,#00a844 100%);color:#fff;border:none;border-radius:4px;padding:4px 8px;font-size:10px;margin-right:4px;cursor:pointer;font-weight:bold;';

  testBtn.onclick = function() {
    window.runTests();
  };

  // Insert before Copy button
  var copyBtn = document.getElementById('debug-copy-btn');
  if (copyBtn && copyBtn.parentNode) {
    copyBtn.parentNode.insertBefore(testBtn, copyBtn);
  } else {
    header.appendChild(testBtn);
  }
};

// Re-add test button whenever panel is created
var _origCreateDebugPanel = window.createDebugPanel;
window.createDebugPanel = function() {
  if (_origCreateDebugPanel) _origCreateDebugPanel();
  setTimeout(window.addTestButtonToPanel, 100);
};

// Try adding button on init
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(window.addTestButtonToPanel, 1500);
});

setTimeout(function() {
  window.addTestButtonToPanel();
}, 2500);

console.log('Part Debug-2 (Test Menu) loaded');
console.log('admin.js FULLY loaded - Part 3 to Debug-2');

/* ============================================================
   MSG 12: Trap + Delay + Reversal Settings Save
   ============================================================ */

(function bindTrapRate() {
  var btn = document.getElementById("save-trap-rate");
  var input = document.getElementById("trap-rate-input");
  if (!btn || !input) return;

  btn.addEventListener("click", async function() {
    var val = parseInt(input.value);
    if (isNaN(val) || val < 0 || val > 100) {
      alert("Trap % must be 0-100");
      return;
    }
    try {
      await setDoc(doc(db, "settings", "global"), {
        trapRate: val,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log("[Settings] Trap Rate saved:", val + "%");
      alert("Trap Rate: " + val + "%");
    } catch (err) {
      alert(err.message);
    }
  });
  console.log("[Settings] Trap Rate button bound");
})();

(function bindDelayRate() {
  var btn = document.getElementById("save-delay-rate");
  var input = document.getElementById("delay-rate-input");
  if (!btn || !input) return;

  btn.addEventListener("click", async function() {
    var val = parseInt(input.value);
    if (isNaN(val) || val < 0 || val > 100) {
      alert("Delay % must be 0-100");
      return;
    }
    try {
      await setDoc(doc(db, "settings", "global"), {
        delayRate: val,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log("[Settings] Delay Rate saved:", val + "%");
      alert("Delay Rate: " + val + "%");
    } catch (err) {
      alert(err.message);
    }
  });
  console.log("[Settings] Delay Rate button bound");
})();

(function bindReversalRate() {
  var btn = document.getElementById("save-reversal-rate");
  var input = document.getElementById("reversal-rate-input");
  if (!btn || !input) return;

  btn.addEventListener("click", async function() {
    var val = parseInt(input.value);
    if (isNaN(val) || val < 0 || val > 100) {
      alert("Reversal % must be 0-100");
      return;
    }
    try {
      await setDoc(doc(db, "settings", "global"), {
        reversalRate: val,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log("[Settings] Reversal Rate saved:", val + "%");
      alert("Reversal Rate: " + val + "%");
    } catch (err) {
      alert(err.message);
    }
  });
  console.log("[Settings] Reversal Rate button bound");
})();

// Load values on Admin Panel load
(function loadTrapSettings() {
  async function fetchTrapSettings() {
    try {
      var sDoc = await getDoc(doc(db, "settings", "global"));
      if (!sDoc.exists()) return;

      var d = sDoc.data();
      var trapInput = document.getElementById("trap-rate-input");
      var delayInput = document.getElementById("delay-rate-input");
      var reversalInput = document.getElementById("reversal-rate-input");

      if (trapInput && d.trapRate !== undefined) trapInput.value = d.trapRate;
      if (delayInput && d.delayRate !== undefined) delayInput.value = d.delayRate;
      if (reversalInput && d.reversalRate !== undefined) reversalInput.value = d.reversalRate;

      console.log("[Settings] Trap/Delay/Reversal loaded:",
        (d.trapRate || 30) + "% / " + (d.delayRate || 20) + "% / " + (d.reversalRate || 15) + "%");
    } catch (err) {
      console.error("Trap settings load error:", err.message);
    }
  }

  setTimeout(fetchTrapSettings, 2500);
})();

console.log("MSG 12: Trap/Delay/Reversal settings loaded");

/* ============================================================
   MSG 13: Future Candle Designer + Auto 24/7
   ============================================================ */

// ============================================================
// 1. AUTO 24/7 TOGGLE
// ============================================================

(function bindAuto24h() {
  var btn = document.getElementById("auto-24h-toggle");
  if (!btn) return;

  btn.addEventListener("click", async function() {
    var isActive = btn.classList.contains("active");
    var newState = !isActive;

    try {
      await setDoc(doc(db, "settings", "global"), {
        autoGenerate24h: newState,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      if (newState) {
        btn.classList.add("active");
        btn.textContent = "Auto 24/7: ON";
        btn.style.background = "#00c853";
        btn.style.color = "#04121a";
        console.log("[MSG13] Auto 24/7: ON");
      } else {
        btn.classList.remove("active");
        btn.textContent = "Auto 24/7: OFF";
        btn.style.background = "";
        btn.style.color = "";
        console.log("[MSG13] Auto 24/7: OFF");
      }

      alert("Auto 24/7: " + (newState ? "ON" : "OFF"));
    } catch (err) {
      alert(err.message);
    }
  });

  // Load current state
  (async function loadState() {
    try {
      var sDoc = await getDoc(doc(db, "settings", "global"));
      if (sDoc.exists()) {
        var d = sDoc.data();
        if (d.autoGenerate24h) {
          btn.classList.add("active");
          btn.textContent = "Auto 24/7: ON";
          btn.style.background = "#00c853";
          btn.style.color = "#04121a";
        }
      }
    } catch(e) {}
  })();

  console.log("[MSG13] Auto 24/7 toggle bound");
})();

// ============================================================
// 2. LOAD MARKET SELECT IN DESIGNER
// ============================================================

(function bindDesignerMarket() {
  var sel = document.getElementById("designer-market-select");
  if (!sel) return;

  async function loadMarkets() {
    try {
      var snap = await getDocs(collection(db, "markets"));
      sel.innerHTML = '<option value="">-- Select Market --</option>';
      snap.forEach(function(d) {
        var m = d.data();
        if (m.enabled) {
          var opt = document.createElement("option");
          opt.value = d.id;
          opt.textContent = m.name + " (" + m.symbol + ")";
          sel.appendChild(opt);
        }
      });
      console.log("[MSG13] Designer markets loaded");
    } catch(err) {
      console.error("[MSG13] Load markets error:", err.message);
    }
  }

  loadMarkets();
  setInterval(loadMarkets, 30000); // Refresh every 30s
})();

// ============================================================
// 3. SAVE CANDLE DESIGNER
// ============================================================

(function bindDesignerSave() {
  var btn = document.getElementById("designer-save-btn");
  if (!btn) return;

  btn.addEventListener("click", async function() {
    var marketId = document.getElementById("designer-market-select").value;
    if (!marketId) { alert("Select market first"); return; }

    var data = {
      direction: document.getElementById("designer-direction").value,
      type: document.getElementById("designer-type").value,
      bodySize: parseInt(document.getElementById("designer-body").value) || 60,
      wickLength: parseInt(document.getElementById("designer-wick").value) || 20,
      open: parseFloat(document.getElementById("designer-open").value) || 50000,
      close: parseFloat(document.getElementById("designer-close").value) || 50100,
      high: parseFloat(document.getElementById("designer-high").value) || 50150,
      low: parseFloat(document.getElementById("designer-low").value) || 49950,
      savedAt: new Date().toISOString()
    };

    // Auto-calculate direction from open/close
    if (data.close > data.open) data.direction = "up";
    else if (data.close < data.open) data.direction = "down";
    else data.direction = "neutral";

    try {
      await setDoc(doc(db, "markets", marketId), {
        designerCandle: data,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      console.log("[MSG13] Designer saved:", data);
      alert("Designer saved for " + marketId);
    } catch(err) {
      alert(err.message);
    }
  });

  console.log("[MSG13] Designer save button bound");
})();

// ============================================================
// 4. APPLY TO NEXT CANDLE
// ============================================================

(function bindDesignerApply() {
  var btn = document.getElementById("designer-apply-btn");
  if (!btn) return;

  btn.addEventListener("click", async function() {
    var marketId = document.getElementById("designer-market-select").value;
    if (!marketId) { alert("Select market first"); return; }

    var data = {
      direction: document.getElementById("designer-direction").value,
      type: document.getElementById("designer-type").value,
      bodySize: parseInt(document.getElementById("designer-body").value) || 60,
      wickLength: parseInt(document.getElementById("designer-wick").value) || 20,
      open: parseFloat(document.getElementById("designer-open").value) || 50000,
      close: parseFloat(document.getElementById("designer-close").value) || 50100,
      high: parseFloat(document.getElementById("designer-high").value) || 50150,
      low: parseFloat(document.getElementById("designer-low").value) || 49950,
      applyToNext: true,
      appliedAt: new Date().toISOString()
    };

    if (data.close > data.open) data.direction = "up";
    else if (data.close < data.open) data.direction = "down";
    else data.direction = "neutral";

    try {
      // Save designer + set applyToNext flag
      await setDoc(doc(db, "markets", marketId), {
        designerCandle: data,
        applyNextAt: Date.now(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      console.log("[MSG13] Apply to next candle:", data);
      alert("Next candle will use your design!");
    } catch(err) {
      alert(err.message);
    }
  });

  console.log("[MSG13] Designer apply button bound");
})();

// ============================================================
// 5. RESET DESIGNER
// ============================================================

(function bindDesignerReset() {
  var btn = document.getElementById("designer-reset-btn");
  if (!btn) return;

  btn.addEventListener("click", function() {
    document.getElementById("designer-direction").value = "up";
    document.getElementById("designer-type").value = "medium";
    document.getElementById("designer-body").value = 60;
    document.getElementById("designer-wick").value = 20;
    document.getElementById("designer-open").value = 50000;
    document.getElementById("designer-close").value = 50100;
    document.getElementById("designer-high").value = 50150;
    document.getElementById("designer-low").value = 49950;
    alert("Designer reset");
  });

  console.log("[MSG13] Designer reset button bound");
})();

console.log("MSG 13: Future Candle Designer + Auto 24/7 loaded");

/* ============================================================
   MSG 14: Admin Chat System
   ============================================================ */

window.chatCurrentUserId = null;
window.chatMessagesUnsub = null;
window.chatAllUsers = [];
window.chatUnreadCounts = {};

// ============================================================
// 1. LOAD USER LIST FOR CHAT
// ============================================================

function loadChatUsers() {
  var container = document.getElementById("chat-user-list");
  if (!container) return;

  try {
    onSnapshot(collection(db, "users"), function(snap) {
      var users = [];
      snap.forEach(function(d) {
        var u = d.data();
        if (u.role !== "admin") {
          users.push({
            id: d.id,
            email: u.email || "no-email"
          });
        }
      });
      users.sort(function(a, b) {
        return (a.email || "").localeCompare(b.email || "");
      });
      window.chatAllUsers = users;

      container.innerHTML = "";
      if (users.length === 0) {
        container.innerHTML = '<p class="loading-text">No users</p>';
        return;
      }

      users.forEach(function(u) {
        var div = document.createElement("div");
        div.className = "chat-user-item";
        div.dataset.uid = u.id;
        div.textContent = u.email;
        if (window.chatUnreadCounts[u.id] > 0) {
          var dot = document.createElement("span");
          dot.className = "unread-dot";
          div.appendChild(dot);
        }
        div.onclick = function() {
          selectChatUser(u.id, u.email);
        };
        container.appendChild(div);
      });

      console.log("[MSG14] Chat users loaded:", users.length);
    });
  } catch (err) {
    console.error("[MSG14] Chat users error:", err.message);
  }
}

// ============================================================
// 2. SELECT USER + LOAD MESSAGES
// ============================================================

function selectChatUser(userId, userEmail) {
  window.chatCurrentUserId = userId;

  var headerEl = document.getElementById("chat-current-user");
  if (headerEl) headerEl.textContent = userEmail;

  document.querySelectorAll(".chat-user-item").forEach(function(el) {
    el.classList.toggle("active", el.dataset.uid === userId);
  });

  window.chatUnreadCounts[userId] = 0;

  // Unsubscribe previous
  if (window.chatMessagesUnsub) {
    window.chatMessagesUnsub();
    window.chatMessagesUnsub = null;
  }

  // Load messages
  var messagesEl = document.getElementById("chat-messages");
  if (!messagesEl) return;
  messagesEl.innerHTML = '<p class="empty-text">Loading messages...</p>';

  try {
    var q = query(
      collection(db, "chats", userId, "messages"),
      orderBy("timestamp", "asc")
    );

    window.chatMessagesUnsub = onSnapshot(q, function(snap) {
      messagesEl.innerHTML = "";
      if (snap.empty) {
        messagesEl.innerHTML = '<p class="empty-text">No messages yet</p>';
        return;
      }

      snap.forEach(function(d) {
        var m = d.data();
        var div = document.createElement("div");
        div.className = "chat-msg " + (m.from === "admin" ? "from-admin" : "from-user");

        var textNode = document.createTextNode(m.text || "");
        div.appendChild(textNode);

        var timeSpan = document.createElement("span");
        timeSpan.className = "chat-msg-time";
        var ts = m.timestamp ? new Date(m.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "-";
        timeSpan.textContent = ts;
        div.appendChild(timeSpan);

        messagesEl.appendChild(div);
      });

      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  } catch (err) {
    console.error("[MSG14] Messages error:", err.message);
    messagesEl.innerHTML = '<p class="empty-text">Error: ' + err.message + '</p>';
  }
}

// ============================================================
// 3. SEND MESSAGE
// ============================================================

async function sendChatMessage() {
  if (!window.chatCurrentUserId) {
    alert("Select a user first");
    return;
  }

  var input = document.getElementById("chat-input");
  if (!input) return;
  var text = input.value.trim();
  if (!text) return;

  input.value = "";

  try {
    await addDoc(collection(db, "chats", window.chatCurrentUserId, "messages"), {
      from: "admin",
      text: text,
      timestamp: new Date().toISOString()
    });

    console.log("[MSG14] Message sent to:", window.chatCurrentUserId);
  } catch (err) {
    console.error("[MSG14] Send error:", err.message);
    alert("Send failed: " + err.message);
  }
}

// ============================================================
// 4. BIND SEND BUTTON + ENTER KEY
// ============================================================

setTimeout(function() {
  var sendBtn = document.getElementById("chat-send-btn");
  if (sendBtn && sendBtn.dataset.bound !== "1") {
    sendBtn.dataset.bound = "1";
    sendBtn.onclick = sendChatMessage;
    console.log("[MSG14] Send button bound");
  }

  var input = document.getElementById("chat-input");
  if (input && input.dataset.bound !== "1") {
    input.dataset.bound = "1";
    input.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }
}, 2000);

// ============================================================
// 5. TRACK UNREAD MESSAGES
// ============================================================

function trackUnreadMessages() {
  if (!window.currentAdmin) return;

  try {
    // Watch each user's chat
    window.chatAllUsers.forEach(function(u) {
      if (!u.id) return;
      // Simple approach: count messages since last read
      // For simplicity, skip complex unread logic
    });
  } catch (err) {}
}

// ============================================================
// 6. INIT ON ADMIN LOGIN
// ============================================================

setInterval(function() {
  if (window.currentAdmin && window.chatAllUsers.length === 0) {
    loadChatUsers();
  }
}, 3000);

setTimeout(function() {
  if (window.currentAdmin) {
    loadChatUsers();
  }
}, 4000);

console.log("[MSG14] Admin Chat System loaded");
/* ============================================================
   MSG 11: LIVE MOVEMENT + AUTO CANDLE + MULTI-USER ANALYSIS
   ============================================================ */

// ============================================================
// 1. STATE VARIABLES
// ============================================================

window.adminWinPercent = 80;
window.adminLossPercent = 30;
window.liveSpeed = 500;
window.liveMovementInterval = null;
window.autoCandleInterval = null;
window.analyzerInterval = null;

// Track current candle time
window.currentCandleTime = Math.floor(Date.now() / 1000);
window.currentCandleOpen = currentPrice;

// ============================================================
// 2. LISTEN ADMIN SETTINGS FOR WIN/LOSS
// ============================================================

function listenWinLossSettings() {
  if (typeof db === "undefined") return;

  try {
    onSnapshot(doc(db, "settings", "global"), function(snap) {
      if (!snap.exists()) return;

      var d = snap.data();
      window.adminWinPercent = d.winPercent ?? 80;
      window.adminLossPercent = d.lossPercent ?? 30;
      window.liveSpeed = d.liveSpeed ?? 500;

      console.log(
        "[MSG11] Settings: Win " + window.adminWinPercent + "% | " +
        "Loss " + window.adminLossPercent + "% | " +
        "Speed " + window.liveSpeed + "ms"
      );
    });
  } catch (err) {
    console.error("[MSG11] Settings listen error:", err.message);
  }
}

setTimeout(listenWinLossSettings, 2500);

// ============================================================
// 3. LIVE PRICE MOVEMENT (every 500ms)
// ============================================================

function startLiveMovement() {
  if (window.liveMovementInterval) clearInterval(window.liveMovementInterval);

  window.liveMovementInterval = setInterval(function() {
    if (typeof candleSeries === "undefined" || !candleSeries) return;
    if (typeof currentPrice === "undefined") return;

    var speed = window.liveSpeed || 500;
    var drift = (Math.random() - 0.5) * 30;

    // Direction bias from adminForceMarket
    var force = (typeof adminForceMarket !== "undefined") ? adminForceMarket : 0;
    if (force > 0) drift += Math.random() * 15;
    else if (force < 0) drift -= Math.random() * 15;

    currentPrice = Math.max(100, currentPrice + drift);
    window.currentPrice = currentPrice;

    if (typeof currentPriceEl !== "undefined" && currentPriceEl) {
      currentPriceEl.textContent = currentPrice.toFixed(2);
      if (drift >= 0) {
        currentPriceEl.style.color = "#00c853";
      } else {
        currentPriceEl.style.color = "#ff5252";
      }
    }

    // Update chart candle in real-time
    var now = Math.floor(Date.now() / 1000);
    var candleTime = Math.floor(now / 60) * 60;

    if (candleTime > window.currentCandleTime) {
      // New minute started
      window.currentCandleTime = candleTime;
      window.currentCandleOpen = currentPrice;
    }

    try {
      var openP = window.currentCandleOpen;
      var closeP = currentPrice;
      var highP = Math.max(openP, closeP) + Math.random() * 5;
      var lowP = Math.min(openP, closeP) - Math.random() * 5;

      candleSeries.update({
        time: window.currentCandleTime,
        open: openP,
        high: highP,
        low: lowP,
        close: closeP
      });
    } catch(e) {
      // ignore
    }
  }, 500);

  console.log("[MSG11] Live movement started");
}

// ============================================================
// 4. AUTO CANDLE GENERATION (every 1m)
// ============================================================

function startAutoCandleGeneration() {
  if (window.autoCandleInterval) clearInterval(window.autoCandleInterval);

  window.autoCandleInterval = setInterval(function() {
    if (typeof candleSeries === "undefined" || !candleSeries) return;
    if (!window.currentUser) return;

    var mode = (typeof adminSettings !== "undefined" && adminSettings.candleMode) || "random";

    // Only auto-generate if mode is random or schedule
    if (mode === "locked") {
      console.log("[MSG11] LOCKED mode - no auto generation");
      return;
    }

    var now = Math.floor(Date.now() / 1000);
    var candleTime = Math.floor(now / 60) * 60;

    var openP = currentPrice;
    var move = (Math.random() - 0.5) * 200;
    var closeP = openP + move;
    var highP = Math.max(openP, closeP) + Math.random() * 50;
    var lowP = Math.min(openP, closeP) - Math.random() * 50;

    try {
      candleSeries.update({
        time: candleTime,
        open: openP,
        high: highP,
        low: lowP,
        close: closeP
      });

      currentPrice = closeP;
      window.currentPrice = closeP;
      window.currentCandleTime = candleTime;
      window.currentCandleOpen = closeP;

      console.log("[MSG11] Auto candle generated:", openP.toFixed(2), "→", closeP.toFixed(2));
    } catch(e) {
      console.error("[MSG11] Auto candle error:", e.message);
    }
  }, 60000);

  console.log("[MSG11] Auto candle generation started");
}

// ============================================================
// 5. MULTI-USER TRADE ANALYSIS
// ============================================================

window.tradeAnalysis = {
  totalCall: 0,
  totalPut: 0,
  callCount: 0,
  putCount: 0,
  callUsers: [],
  putUsers: [],
  suggestedDirection: "neutral"
};

async function analyzeActiveTrades() {
  if (!window.currentUser) return;

  try {
    var q = query(
      collection(db, "trades"),
      where("status", "==", "pending")
    );
    var snap = await getDocs(q);

    if (snap.empty) {
      window.tradeAnalysis = {
        totalCall: 0, totalPut: 0, callCount: 0, putCount: 0,
        callUsers: [], putUsers: [], suggestedDirection: "neutral"
      };
      return;
    }

    var callTotal = 0, putTotal = 0, callCount = 0, putCount = 0;
    var callUsers = [], putUsers = [];

    snap.forEach(function(d) {
      var t = d.data();
      if (t.type === "call") {
        callTotal += t.amount;
        callCount++;
        callUsers.push({ id: d.id, userId: t.userId, amount: t.amount });
      } else if (t.type === "put") {
        putTotal += t.amount;
        putCount++;
        putUsers.push({ id: d.id, userId: t.userId, amount: t.amount });
      }
    });

    window.tradeAnalysis = {
      totalCall: callTotal,
      totalPut: putTotal,
      callCount: callCount,
      putCount: putCount,
      callUsers: callUsers,
      putUsers: putUsers,
      suggestedDirection: callTotal > putTotal ? "down" : (putTotal > callTotal ? "up" : "neutral")
    };

    if (callCount + putCount > 0) {
      console.log(
        "[Analyzer] CALL: $" + callTotal + " (" + callCount + " users) | " +
        "PUT: $" + putTotal + " (" + putCount + " users) | " +
        "Suggest: " + window.tradeAnalysis.suggestedDirection.toUpperCase()
      );
    }
  } catch (err) {
    console.error("[Analyzer] Error:", err.message);
  }
}

function startTradeAnalysis() {
  if (window.analyzerInterval) clearInterval(window.analyzerInterval);
  window.analyzerInterval = setInterval(analyzeActiveTrades, 2000);
  console.log("[MSG11] Trade analyzer started (2s interval)");
}

// ============================================================
// 6. AUTO-DIRECTION BASED ON ANALYSIS
// ============================================================

function applyDirectionBias() {
  if (typeof candleSeries === "undefined" || !candleSeries) return;

  var analysis = window.tradeAnalysis;
  if (!analysis) return;
  if (analysis.callCount + analysis.putCount === 0) return;

  var direction = analysis.suggestedDirection;
  if (direction === "neutral") return;

  // Apply gentle pressure
  var bias = direction === "up" ? 1.5 : -1.5;
  currentPrice = currentPrice + bias;
  window.currentPrice = currentPrice;
}

setInterval(applyDirectionBias, 1000);

// ============================================================
// 7. IMPROVED processTradeResults — uses LIVE price
// ============================================================

async function processTradeResultsV2() {
  if (typeof currentUser === "undefined" || !currentUser) return;

  var trades = (typeof activeTradesLocal !== "undefined" && Array.isArray(activeTradesLocal))
    ? activeTradesLocal : [];

  if (trades.length === 0) return;

  var now = Date.now();

  for (var i = 0; i < trades.length; i++) {
    var trade = trades[i];
    if (trade.expiresAt > now || trade.status !== "pending") continue;

    var entryPrice = Number(trade.entryPrice) || currentPrice;
    var exitPrice = Number(currentPrice);
    var diff = exitPrice - entryPrice;

    var realResult = "loss";
    if (trade.type === "call" && diff > 0) realResult = "win";
    else if (trade.type === "put" && diff < 0) realResult = "win";

    // Admin Win/Loss override (optional)
    var winPercent = window.adminWinPercent || 80;
    var useAdminOverride = (winPercent !== 100 && winPercent !== 0);

    if (useAdminOverride) {
      var r = Math.random() * 100;
      if (r < winPercent) {
        realResult = "win";
      } else {
        realResult = "loss";
      }
    }

    console.log(
      "[Trade Result V2] " + String(trade.type).toUpperCase() +
      " | Entry: " + entryPrice.toFixed(2) +
      " → Exit: " + exitPrice.toFixed(2) +
      " | Diff: " + diff.toFixed(2) +
      " | Real: " + (diff > 0 ? "UP" : (diff < 0 ? "DOWN" : "FLAT")) +
      " | Result: " + realResult.toUpperCase() +
      " | WinTarget: " + winPercent + "%"
    );

    var payoutRate = ((typeof adminPayout !== "undefined" ? adminPayout : 96) / 100) + 1;
    var netProfit = realResult === "win" ? trade.amount * (payoutRate - 1) : 0;
    var returnAmount = realResult === "win" ? trade.amount + netProfit : 0;

    try {
      await updateDoc(doc(db, "trades", trade.id), {
        status: "completed",
        result: realResult,
        exitPrice: exitPrice,
        profit: returnAmount,
        netProfit: netProfit,
        completedAt: new Date().toISOString(),
        adminProcessed: true
      });

      if (realResult === "win") {
        var userRef = doc(db, "users", currentUser.uid);
        var userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          var userData = userDoc.data();
          var balanceField = accountType === "demo" ? "demoBalance" : "realBalance";
          var curBal = userData[balanceField] || 0;
          var newBal = curBal + returnAmount;

          await updateDoc(userRef, {
            [balanceField]: newBal,
            balance: newBal
          });

          userBalance = newBal;
          window.userBalance = newBal;

          if (balanceEl) balanceEl.textContent = newBal.toFixed(2);
          if (balancePopupValue) balancePopupValue.textContent = newBal.toFixed(2);

          if (typeof animateBalanceChange === "function") animateBalanceChange(returnAmount);
          if (typeof showResultFlash === "function") showResultFlash("win");
          if (typeof playSound === "function") playSound("win");

          if (tradeMessage) {
            tradeMessage.style.color = "#00c853";
            tradeMessage.textContent = "🎉 জিতেছেন! +$" + netProfit.toFixed(2);
            setTimeout(function() { tradeMessage.textContent = ""; }, 3500);
          }
        }
      } else {
        if (typeof showResultFlash === "function") showResultFlash("loss");
        if (typeof playSound === "function") playSound("loss");

        if (tradeMessage) {
          tradeMessage.style.color = "#ff5252";
          tradeMessage.textContent = "😔 হেরেছেন -$" + trade.amount.toFixed(2);
          setTimeout(function() { tradeMessage.textContent = ""; }, 3500);
        }
      }
    } catch (err) {
      console.error("[Trade Process V2 Error]", err.message);
    }
  }
}

// Override the old processTradeResults
window.processTradeResults = processTradeResultsV2;

// ============================================================
// 8. INIT
// ============================================================

setTimeout(function() {
  startLiveMovement();
  startAutoCandleGeneration();
  startTradeAnalysis();
  console.log("[MSG11] All systems started");
}, 4000);

// Expose for debugging
window.startLiveMovement = startLiveMovement;
window.startAutoCandleGeneration = startAutoCandleGeneration;
window.analyzeActiveTrades = analyzeActiveTrades;
window.processTradeResultsV2 = processTradeResultsV2;
window.tradeAnalysis = window.tradeAnalysis;

console.log("===== MSG 11: Live Movement + Auto Candle + Multi-user Analysis loaded =====");
