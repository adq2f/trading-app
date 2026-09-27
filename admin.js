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
