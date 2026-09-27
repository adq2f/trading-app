// ============================================
// Admin Panel — admin.js
// Part 3: Firebase + Auth + Market CRUD
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

// ===== Firebase Config =====
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

// ===== DOM Elements =====
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

// Market Form
const newMarketName = document.getElementById("new-market-name");
const newMarketSymbol = document.getElementById("new-market-symbol");
const newMarketBase = document.getElementById("new-market-base");
const createMarketBtn = document.getElementById("create-market-btn");

// Settings
const winRateInput = document.getElementById("win-rate-input");
const saveWinRateBtn = document.getElementById("save-win-rate");
const payoutInput = document.getElementById("payout-input");
const savePayoutBtn = document.getElementById("save-payout");
const autoIntervalInput = document.getElementById("auto-interval-input");
const saveAutoIntervalBtn = document.getElementById("save-auto-interval");
const autoModeToggle = document.getElementById("auto-mode-toggle");

// ===== Globals =====
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

// ===== Admin Logout =====
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

      // সব ডেটা লোড
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

// ===== Tab Switch =====
adminTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    adminTabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    tabPanes.forEach(p => p.classList.remove("active"));
    const target = document.getElementById("tab-" + tab.dataset.tab);
    if (target) target.classList.add("active");
  });
});

// ===== Refresh Buttons =====
if (refreshUsers) refreshUsers.addEventListener("click", () => loadUsers());
if (refreshTrades) refreshTrades.addEventListener("click", () => loadTrades());
if (refreshDeposits) refreshDeposits.addEventListener("click", () => loadDeposits());
if (refreshWithdrawals) refreshWithdrawals.addEventListener("click", () => loadWithdrawals());
if (refreshMarkets) refreshMarkets.addEventListener("click", () => loadMarkets());

// ============================================
// MARKET CRUD
// ============================================

// ===== নতুন মার্কেট তৈরি =====
if (createMarketBtn) {
  createMarketBtn.addEventListener("click", async () => {
    const name = newMarketName.value.trim();
    const symbol = newMarketSymbol.value.trim().toUpperCase();
    const base = parseFloat(newMarketBase.value) || 50000;

    if (!name || !symbol) {
      alert("❌ নাম ও সিম্বল দিন");
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

      alert(`✅ ${name} তৈরি হয়েছে!`);

    } catch (err) {
      alert("❌ " + err.message);
    }
  });
}

// ===== মার্কেট লোড =====
function loadMarkets() {
  if (!marketsList) return;

  marketsList.innerHTML = '<p class="loading-text">লোড হচ্ছে...</p>';
  if (marketsUnsub) marketsUnsub();

  marketsUnsub = onSnapshot(collection(db, "markets"), (snap) => {
    marketsList.innerHTML = "";

    if (snap.empty) {
      marketsList.innerHTML = '<p class="loading-text">কোনো মার্কেট নেই</p>';
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

// ===== মার্কেট আইটেম রেন্ডার =====
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
      <button class="btn-action btn-edit" data-action="edit-market" data-mid="${market.id}">
        ✏️ Edit
      </button>
      <button class="btn-action ${market.enabled ? 'btn-reject' : 'btn-approve'}"
              data-action="toggle-market" data-mid="${market.id}" data-enabled="${market.enabled}">
        ${market.enabled ? "🔒 Disable" : "▶️ Enable"}
      </button>
      <button class="btn-action btn-reject" data-action="delete-market" data-mid="${market.id}">
        🗑 Delete
      </button>
    </div>
  `;

  marketsList.appendChild(div);
}

// ===== মার্কেট অ্যাকশন =====
if (marketsList) {
  marketsList.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const mid = btn.dataset.mid;
    if (!mid) return;

    if (action === "edit-market") {
      await editMarket(mid);
    } else if (action === "toggle-market") {
      await toggleMarket(mid, btn.dataset.enabled === "true");
    } else if (action === "delete-market") {
      await deleteMarket(mid);
    }
  });
}

// ===== মার্কেট এডিট =====
async function editMarket(mid) {
  try {
    const marketDoc = await getDoc(doc(db, "markets", mid));
    if (!marketDoc.exists()) { alert("❌ নেই"); return; }

    const m = marketDoc.data();

    const newName = prompt("নাম:", m.name || "");
    if (newName === null) return;

    const newPayout = prompt("Payout %:", m.payout || 85);
    if (newPayout === null) return;

    const newWinRate = prompt("Win Rate %:", m.winRate || 50);
    if (newWinRate === null) return;

    const payoutVal = parseInt(newPayout);
    const winVal = parseInt(newWinRate);

    if (isNaN(payoutVal) || payoutVal < 0 || payoutVal > 200) {
      alert("❌ Payout 0-200 এর মধ্যে"); return;
    }
    if (isNaN(winVal) || winVal < 0 || winVal > 100) {
      alert("❌ Win Rate 0-100 এর মধ্যে"); return;
    }

    await updateDoc(doc(db, "markets", mid), {
      name: newName,
      payout: payoutVal,
      winRate: winVal,
      updatedAt: new Date().toISOString()
    });

    alert("✅ আপডেট হয়েছে");

  } catch (err) {
    alert("❌ " + err.message);
  }
}

// ===== মার্কেট Enable/Disable =====
async function toggleMarket(mid, isEnabled) {
  const action = isEnabled ? "Disable" : "Enable";
  if (!confirm(`${action} করবেন?`)) return;

  try {
    await updateDoc(doc(db, "markets", mid), {
      enabled: !isEnabled,
      updatedAt: new Date().toISOString()
    });
    alert(`✅ ${action} সম্পন্ন`);
  } catch (err) {
    alert("❌ " + err.message);
  }
}

// ===== মার্কেট ডিলিট =====
async function deleteMarket(mid) {
  if (!confirm("⚠️ এই মার্কেট এবং এর সব ক্যান্ডেল ডিলিট হবে! নিশ্চিত?")) return;
  if (!confirm("সত্যিই ডিলিট করবেন? এটা ফেরানো যাবে না।")) return;

  try {
    // ক্যান্ডেল সাব-কালেকশন ডিলিট
    const candlesSnap = await getDocs(collection(db, "markets", mid, "candles"));
    for (const c of candlesSnap.docs) {
      await deleteDoc(doc(db, "markets", mid, "candles", c.id));
    }

    // মার্কেট ডিলিট
    await deleteDoc(doc(db, "markets", mid));
    alert("✅ ডিলিট সম্পন্ন");

  } catch (err) {
    alert("❌ " + err.message);
  }
}

// ===== Candle Market Select আপডেট =====
function updateCandleMarketSelect(markets) {
  const sel = document.getElementById("candle-market-select");
  if (!sel) return;

  const current = sel.value;
  sel.innerHTML = '<option value="">— মার্কেট বেছে নিন —</option>';

  markets.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = `${m.name} (${m.symbol})`;
    sel.appendChild(opt);
  });

  if (current) sel.value = current;
}
// ============================================
// Part 4: Users + Trades + Deposits + Withdrawals + Settings
// ============================================

// ===== Stats =====
async function loadStats() {
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    if (statUsers) statUsers.textContent = usersSnap.size;

    const activeTradesSnap = await getDocs(
      query(collection(db, "trades"), where("status", "==", "pending"))
    );
    if (statActiveTrades) statActiveTrades.textContent = activeTradesSnap.size;

    const depositsSnap = await getDocs(
      query(collection(db, "deposits"), where("status", "==", "pending"))
    );
    if (statPendingDeposits) statPendingDeposits.textContent = depositsSnap.size;

    const withdrawalsSnap = await getDocs(
      query(collection(db, "withdrawals"), where("status", "==", "pending"))
    );
    if (statPendingWithdrawals) statPendingWithdrawals.textContent = withdrawalsSnap.size;

  } catch (err) {
    console.error("Stats error:", err);
  }
}

// ============================================
// USERS
// ============================================

function loadUsers() {
  if (!usersList) return;
  usersList.innerHTML = '<p class="loading-text">লোড হচ্ছে...</p>';
  if (usersUnsub) usersUnsub();

  usersUnsub = onSnapshot(collection(db, "users"), (snap) => {
    usersList.innerHTML = "";

    if (snap.empty) {
      usersList.innerHTML = '<p class="loading-text">কোনো ইউজার নেই</p>';
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
  const joined = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-GB")
    : "-";

  div.innerHTML = `
    <div class="admin-item-header">
      <div class="admin-item-title">${user.email || "no-email"}</div>
      ${roleBadge}
    </div>
    <div class="admin-item-info">
      <span>ডেমো: <strong>$${demoBal}</strong></span>
      <span>রিয়েল: <strong>$${realBal}</strong></span>
      <span>জয়েন: <strong>${joined}</strong></span>
      <span>ব্যানড: <strong>${user.banned ? "হ্যাঁ" : "না"}</strong></span>
    </div>
    <div class="admin-item-actions">
      <button class="btn-action btn-edit" data-action="edit-demo" data-uid="${user.id}" data-bal="${user.demoBalance ?? 1000}">✏️ ডেমো</button>
      <button class="btn-action btn-edit" data-action="edit-real" data-uid="${user.id}" data-bal="${user.realBalance ?? 0}">✏️ রিয়েল</button>
      <button class="btn-action ${user.banned ? 'btn-approve' : 'btn-reject'}" data-action="ban" data-uid="${user.id}" data-banned="${user.banned ? "true" : "false"}">${user.banned ? "✅ আনব্যান" : "🚫 ব্যান"}</button>
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
  const label = field === "demoBalance" ? "ডেমো" : "রিয়েল";
  const input = prompt(`${label} ব্যালেন্স (বর্তমান: $${currentValue})`, currentValue);
  if (input === null) return;

  const newVal = parseFloat(input);
  if (isNaN(newVal) || newVal < 0) { alert("❌ ভুল মান"); return; }

  try {
    await updateDoc(doc(db, "users", uid), { [field]: newVal });
    alert(`✅ ${label}: $${newVal.toFixed(2)}`);
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

// ============================================
// TRADES
// ============================================

function loadTrades() {
  if (!tradesList) return;
  tradesList.innerHTML = '<p class="loading-text">লোড হচ্ছে...</p>';
  if (tradesUnsub) tradesUnsub();

  tradesUnsub = onSnapshot(collection(db, "trades"), (snap) => {
    tradesList.innerHTML = "";
    if (snap.empty) {
      tradesList.innerHTML = '<p class="loading-text">কোনো ট্রেড নেই</p>';
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
      <span class="full-width">Asset: <strong>${trade.asset || "-"}</strong></span>
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
        const curBal = userData[field] ?? 0;
        await updateDoc(userRef, { [field]: curBal + profit });
      }
    }

    alert(`✅ ${result === "win" ? "জেতানো" : "হারানো"} হয়েছে`);
  } catch (err) { alert("❌ " + err.message); }
}

// ============================================
// DEPOSITS
// ============================================

function loadDeposits() {
  if (!depositsList) return;
  depositsList.innerHTML = '<p class="loading-text">লোড হচ্ছে...</p>';
  if (depositsUnsub) depositsUnsub();

  depositsUnsub = onSnapshot(collection(db, "deposits"), (snap) => {
    depositsList.innerHTML = "";
    if (snap.empty) {
      depositsList.innerHTML = '<p class="loading-text">কোনো ডিপোজিট নেই</p>';
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
  if (!confirm("অ্যাপ্রুভ করবেন? ইউজারের রিয়েল ব্যালেন্স বাড়বে।")) return;

  try {
    const depRef = doc(db, "deposits", depositId);
    const depDoc = await getDoc(depRef);
    if (!depDoc.exists()) { alert("❌ নেই"); return; }

    const dep = depDoc.data();
    if (dep.status === "approved") { alert("⚠️ আগেই অ্যাপ্রুভ"); return; }

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

    alert("✅ অ্যাপ্রুভ হয়েছে");
    loadStats();
  } catch (err) { alert("❌ " + err.message); }
}

async function rejectDeposit(depositId) {
  if (!confirm("রিজেক্ট করবেন?")) return;
  try {
    await updateDoc(doc(db, "deposits", depositId), {
      status: "rejected",
      rejectedAt: new Date().toISOString()
    });
    alert("✅ রিজেক্ট");
    loadStats();
  } catch (err) { alert("❌ " + err.message); }
}

// ============================================
// WITHDRAWALS
// ============================================

function loadWithdrawals() {
  if (!withdrawalsList) return;
  withdrawalsList.innerHTML = '<p class="loading-text">লোড হচ্ছে...</p>';
  if (withdrawalsUnsub) withdrawalsUnsub();

  withdrawalsUnsub = onSnapshot(collection(db, "withdrawals"), (snap) => {
    withdrawalsList.innerHTML = "";
    if (snap.empty) {
      withdrawalsList.innerHTML = '<p class="loading-text">কোনো উইথড্র নেই</p>';
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
  if (!confirm("অ্যাপ্রুভ করবেন? ইউজারের রিয়েল ব্যালেন্স কমবে।")) return;

  try {
    const wRef = doc(db, "withdrawals", wid);
    const wDoc = await getDoc(wRef);
    if (!wDoc.exists()) { alert("❌ নেই"); return; }

    const w = wDoc.data();
    if (w.status === "approved") { alert("⚠️ আগেই অ্যাপ্রুভ"); return; }

    const userRef = doc(db, "users", w.userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const curReal = userDoc.data().realBalance ?? 0;
      if (curReal < w.amount) { alert("⚠️ ইউজারের পর্যাপ্ত ব্যালেন্স নেই"); return; }
      await updateDoc(userRef, { realBalance: curReal - w.amount });
    }

    await updateDoc(wRef, {
      status: "approved",
      approvedAt: new Date().toISOString()
    });

    alert("✅ অ্যাপ্রুভ");
    loadStats();
  } catch (err) { alert("❌ " + err.message); }
}

async function rejectWithdrawal(wid) {
  if (!confirm("রিজেক্ট করবেন?")) return;
  try {
    await updateDoc(doc(db, "withdrawals", wid), {
      status: "rejected",
      rejectedAt: new Date().toISOString()
    });
    alert("✅ রিজেক্ট");
    loadStats();
  } catch (err) { alert("❌ " + err.message); }
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

if (saveAutoIntervalBtn) {
  saveAutoIntervalBtn.addEventListener("click", async () => {
    const val = parseInt(autoIntervalInput.value);
    if (isNaN(val) || val < 1 || val > 60) { alert("❌ 1-60 মিনিট"); return; }
    try {
      await setDoc(doc(db, "settings", "global"), { autoModeInterval: val }, { merge: true });
      currentAutoInterval = val;
      alert(`✅ Interval: ${val} মিনিট`);
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
    } catch (err) {
      alert("❌ " + err.message);
      isAutoMode = !isAutoMode;
      updateAutoModeButton();
    }
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
/* ============================================================
   CANDLE SCHEDULER — Robust Logic (v2)
   ============================================================ */

let candleList = [];
let candleCounter = 0;

// ---------- Render Table ----------
function renderCandleTable() {
  const tbody = document.getElementById('candle-table-body');
  if (!tbody) return;

  if (candleList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" class="empty-text">কোনো ক্যান্ডেল নেই</td></tr>`;
    return;
  }

  tbody.innerHTML = candleList.map((c, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${c.date || '-'}</td>
      <td>${c.time || '-'}</td>
      <td>${c.timeframe || '1m'}</td>
      <td>${c.open}</td>
      <td>${c.high}</td>
      <td>${c.low}</td>
      <td>${c.close}</td>
      <td class="${c.color}">${c.color === 'green' ? '🟢' : '🔴'}</td>
      <td>${c.up || 0}m</td>
      <td>${c.down || 0}m</td>
      <td>
        <button class="act-btn edit" data-i="${i}">✏️</button>
        <button class="act-btn del"  data-i="${i}">🗑</button>
        <button class="act-btn copy" data-i="${i}">📋</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.act-btn.edit').forEach(b =>
    b.onclick = () => editCandle(Number(b.dataset.i)));
  tbody.querySelectorAll('.act-btn.del').forEach(b =>
    b.onclick = () => deleteCandle(Number(b.dataset.i)));
  tbody.querySelectorAll('.act-btn.copy').forEach(b =>
    b.onclick = () => copyCandle(Number(b.dataset.i)));

  if (typeof renderCandlePreview === 'function') renderCandlePreview();
  if (typeof renderDirectionTimeline === 'function') renderDirectionTimeline();
}

// ---------- Add Candle ----------
function addCandle() {
  try {
    candleCounter++;

    const baseEl = document.getElementById('bulk-base');
    const base   = Number(baseEl?.value || 50000);

    const open  = base + (Math.random() * 100 - 50);
    const close = open + (Math.random() * 80 - 40);
    const high  = Math.max(open, close) + Math.random() * 20;
    const low   = Math.min(open, close) - Math.random() * 20;
    const color = close >= open ? 'green' : 'red';

    const now  = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 8);

    candleList.push({
      number: candleCounter,
      date,
      time,
      timeframe: document.getElementById('candle-timeframe')?.value || '1m',
      open:  open.toFixed(2),
      high:  high.toFixed(2),
      low:   low.toFixed(2),
      close: close.toFixed(2),
      color,
      up:   Number(document.getElementById('bulk-up')?.value   || 5),
      down: Number(document.getElementById('bulk-down')?.value || 5)
    });

    renderCandleTable();
    console.log('✅ Candle added, total =', candleList.length);
  } catch (err) {
    console.error('❌ addCandle error:', err);
    alert('Error: ' + err.message);
  }
}

// ---------- Delete ----------
function deleteCandle(index) {
  if (!confirm(`ক্যান্ডেল #${index + 1} ডিলিট?`)) return;
  candleList.splice(index, 1);
  renderCandleTable();
}

// ---------- Edit ----------
function editCandle(index) {
  const c = candleList[index];
  const newOpen  = prompt('Open:', c.open);  if (newOpen  === null) return;
  const newClose = prompt('Close:', c.close); if (newClose === null) return;
  const newHigh  = prompt('High:', c.high);  if (newHigh  === null) return;
  const newLow   = prompt('Low:', c.low);    if (newLow   === null) return;

  c.open  = Number(newOpen).toFixed(2);
  c.close = Number(newClose).toFixed(2);
  c.high  = Number(newHigh).toFixed(2);
  c.low   = Number(newLow).toFixed(2);
  c.color = Number(newClose) >= Number(newOpen) ? 'green' : 'red';

  renderCandleTable();
}

// ---------- Copy ----------
function copyCandle(index) {
  candleCounter++;
  const c = { ...candleList[index], number: candleCounter };
  candleList.splice(index + 1, 0, c);
  renderCandleTable();
}

// ---------- Clear ----------
function clearCandles() {
  if (!confirm('সব ক্যান্ডেল মুছবেন?')) return;
  candleList = [];
  candleCounter = 0;
  renderCandleTable();
}

// ---------- Bind (works regardless of timing) ----------
function bindCandleButtons() {
  const add = document.getElementById('add-candle-btn');
  if (add) {
    add.onclick = addCandle;
    console.log('✅ Add button bound');
  } else {
    console.warn('⚠️ add-candle-btn not found');
  }

  const clr = document.getElementById('clear-candles-btn');
  if (clr) {
    clr.onclick = clearCandles;
    console.log('✅ Clear button bound');
  }

  renderCandleTable();
}

// Run bind immediately AND on DOMContentLoaded AND after small delay
bindCandleButtons();
document.addEventListener('DOMContentLoaded', bindCandleButtons);
setTimeout(bindCandleButtons, 800);
setTimeout(bindCandleButtons, 2500);

// Global expose
window.addCandle = addCandle;
window.clearCandles = clearCandles;
window.candleList = candleList;
window.renderCandleTable = renderCandleTable;
window.bindCandleButtons = bindCandleButtons;

console.log('🎯 Candle Scheduler v2 loaded');

/* ============================================================
   PART 6A: Candle Save / Load / Refresh
   ============================================================ */

// Current selected market
let currentMarketId = null;

// ---------- Market Select Change ----------
function bindMarketSelect() {
  const sel = document.getElementById('candle-market-select');
  if (!sel || sel.dataset.bound === '1') return;

  sel.dataset.bound = '1';
  sel.addEventListener('change', () => {
    currentMarketId = sel.value || null;
    console.log('📌 Market changed:', currentMarketId);
    if (currentMarketId) {
      loadCandlesFromFirestore(currentMarketId);
    } else {
      candleList = [];
      candleCounter = 0;
      renderCandleTable();
    }
  });

  console.log('✅ Market select bound');
}

// ---------- Load Candles from Firestore ----------
async function loadCandlesFromFirestore(marketId) {
  if (!marketId) return;
  console.log('📥 Loading candles for market:', marketId);

  try {
    const candlesSnap = await getDocs(
      collection(db, "markets", marketId, "candles")
    );

    if (candlesSnap.empty) {
      console.log('⚠️ No candles in Firestore');
      candleList = [];
      candleCounter = 0;
      renderCandleTable();
      return;
    }

    candleList = [];
    candlesSnap.forEach(d => {
      const data = d.data();
      candleList.push({
        id: d.id,
        number: data.number || 0,
        date: data.date || '-',
        time: data.startTime || data.time || '-',
        timeframe: data.timeframe || '1m',
        open:  Number(data.open || 0).toFixed(2),
        high:  Number(data.high || 0).toFixed(2),
        low:   Number(data.low || 0).toFixed(2),
        close: Number(data.close || 0).toFixed(2),
        color: data.color || 'green',
        up:    data.upDuration || data.up || 5,
        down:  data.downDuration || data.down || 5
      });
    });

    candleList.sort((a, b) => (a.number || 0) - (b.number || 0));
    candleCounter = candleList.length;

    renderCandleTable();
    console.log('✅ Loaded', candleList.length, 'candles');

  } catch (err) {
    console.error('❌ Load candles error:', err);
    alert('❌ Load error: ' + err.message);
  }
}

// ---------- Save All Candles ----------
async function saveAllCandles() {
  if (!currentMarketId) {
    alert('⚠️ আগে মার্কেট সিলেক্ট করুন');
    return;
  }
  if (candleList.length === 0) {
    alert('⚠️ কোনো ক্যান্ডেল নেই');
    return;
  }

  const confirmMsg = `মার্কেট: ${currentMarketId}\n${candleList.length}টা ক্যান্ডেল Save হবে?\n\n⚠️ পুরনো সব ক্যান্ডেল Firestore-এ থাকলে সেটা overwrite হবে।`;
  if (!confirm(confirmMsg)) return;

  console.log('💾 Saving', candleList.length, 'candles...');

  try {
    // 1. Delete old candles
    const oldSnap = await getDocs(
      collection(db, "markets", currentMarketId, "candles")
    );
    for (const d of oldSnap.docs) {
      await deleteDoc(doc(db, "markets", currentMarketId, "candles", d.id));
    }
    console.log('🗑 Deleted', oldSnap.size, 'old candles');

    // 2. Save new candles
    for (let i = 0; i < candleList.length; i++) {
      const c = candleList[i];
      const candleId = `c_${String(i + 1).padStart(4, '0')}`;

      await setDoc(
        doc(db, "markets", currentMarketId, "candles", candleId),
        {
          number: i + 1,
          date: c.date || '',
          startTime: c.time || '',
          endTime: '',
          duration: 60,
          timeframe: c.timeframe || '1m',
          open:  Number(c.open),
          high:  Number(c.high),
          low:   Number(c.low),
          close: Number(c.close),
          color: c.color || 'green',
          direction: Number(c.close) >= Number(c.open) ? 'up' : 'down',
          upDuration: Number(c.up || 0),
          downDuration: Number(c.down || 0),
          neutralDuration: 0,
          wickLength: 20,
          bodySize: 60,
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      );
    }

    // 3. Update market's currentCandleIndex
    await updateDoc(doc(db, "markets", currentMarketId), {
      currentCandleIndex: 0,
      updatedAt: new Date().toISOString()
    });

    alert(`✅ ${candleList.length}টা ক্যান্ডেল Save হয়েছে!`);
    console.log('✅ All saved');

  } catch (err) {
    console.error('❌ Save error:', err);
    alert('❌ Save error: ' + err.message);
  }
}

// ---------- Refresh Button ----------
function bindRefreshCandles() {
  const btn = document.getElementById('refresh-candles');
  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';

  btn.addEventListener('click', async () => {
    if (!currentMarketId) {
      alert('⚠️ আগে মার্কেট সিলেক্ট করুন');
      return;
    }
    await loadCandlesFromFirestore(currentMarketId);
    alert('✅ Reloaded');
  });

  console.log('✅ Refresh button bound');
}

// ---------- Save Button ----------
function bindSaveButton() {
  const btn = document.getElementById('save-candles-btn');
  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';

  btn.addEventListener('click', saveAllCandles);
  console.log('✅ Save button bound');
}

// ---------- Bind All (retry-safe) ----------
function bindPart6A() {
  bindMarketSelect();
  bindRefreshCandles();
  bindSaveButton();
}

bindPart6A();
document.addEventListener('DOMContentLoaded', bindPart6A);
setTimeout(bindPart6A, 800);
setTimeout(bindPart6A, 2500);

// Global expose
window.loadCandlesFromFirestore = loadCandlesFromFirestore;
window.saveAllCandles = saveAllCandles;
window.bindPart6A = bindPart6A;

console.log('🎯 Part 6A (Save/Load/Refresh) loaded');
/* ============================================================
   FIX: Ensure addCandle updates the SAME candleList
   ============================================================ */

// Force addCandle to use the global list
const _originalAddCandle = window.addCandle;

window.addCandle = function() {
  console.log('🔵 addCandle called');
  console.log('🔵 Before push, length:', candleList.length);

  // call original
  _originalAddCandle();

  console.log('🔵 After push, length:', candleList.length);
};

// Force saveAllCandles to read the same list
const _originalSave = window.saveAllCandles;

window.saveAllCandles = async function() {
  console.log('🟢 saveAllCandles called');
  console.log('🟢 candleList length:', candleList.length);
  return await _originalSave();
};

console.log('✅ Debug wrappers installed');
