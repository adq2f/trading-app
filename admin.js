// ============================================================
// QUOTEX CLONE — admin.js v33-clean
// Part 1 of 7: Imports + Firebase + Auth + Tabs + State
// ============================================================
// A1-A4 FIXES APPLIED + Clean architecture
// ============================================================

// ============================================================
// 1. IMPORTS (Firebase v9 Modular)
// ============================================================

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
  onSnapshot,
  orderBy,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ============================================================
// 2. FIREBASE CONFIG
// ============================================================

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

// Expose to window for cross-file use
window.db = db;
window.auth = auth;
console.log('[Firebase] db + auth exposed');

// ============================================================
// 3. GLOBAL STATE — SINGLE SOURCE OF TRUTH
// ============================================================

// A4 FIX: One adminSettings object (no duplicate candleMode)
window.adminSettings = {
  // Win/Loss
  winRate: 50,
  payout: 85,
  winPercent: 80,
  lossPercent: 30,

  // Candle behavior
  candleMode: 'locked',   // locked | random | mixed | schedule

  // Auto mode
  autoMode: false,
  autoModeInterval: 5000,

  // Trap/Delay/Reversal
  trapRate: 30,
  delayRate: 20,
  reversalRate: 15,

  // Live
  liveSpeed: 500,
  autoGenerate24h: false,

  // SMART Win/Loss (Phase 1 NEW)
  smartEnabled: false,
  profitPercent: 40,
  lossPercentSmart: 60,
  autoAdjust: true,
  favorHouse: true,
  maxWinnersPerCandle: 5,
  minWinnersPerCandle: 1
};

// Candle scheduler state
window.candleList = [];
window.candleCounter = 0;
window.currentMarketId = null;
window.candleMode = 'locked';  // A4 FIX: keep single source too (synced with adminSettings)

// Playback state
window.playbackIndex = 0;
window.playbackTimer = null;
window.playbackSpeed = 1000;

// Auto mode state
window.autoModeActive = false;
window.autoModeTimer = null;

// Preview
window.previewMaxCandles = 20;

// Current admin user
window.currentAdmin = null;

// Debug
window.debugLogs = [];
window.debugPanelOpen = false;
window.maxDebugLogs = 200;

// Test
window.testResults = {
  total: 0, pass: 0, fail: 0, warn: 0, tests: []
};

// Chat state
window.chatCurrentUserId = null;
window.chatMessagesUnsub = null;
window.chatAllUsers = [];
window.chatUnreadCounts = {};

// Tournament
window.adminTourUnsub = null;

// Live movement
window.adminWinPercent = 80;
window.adminLossPercent = 30;
window.liveSpeed = 500;
window.liveMovementInterval = null;
window.autoCandleInterval = null;
window.analyzerInterval = null;
window.currentCandleTime = Math.floor(Date.now() / 1000);
window.currentCandleOpen = 50000;

// Trade analysis
window.tradeAnalysis = {
  totalCall: 0, totalPut: 0, callCount: 0, putCount: 0,
  callUsers: [], putUsers: [], suggestedDirection: 'neutral'
};

// Subscription handles
let usersUnsub = null;
let tradesUnsub = null;
let depositsUnsub = null;
let withdrawalsUnsub = null;
let marketsUnsub = null;
let settingsUnsub = null;
let scheduledCandlesUnsub = null;

// Cached values
let currentWinRate = 50;
let currentPayout = 85;
let currentAutoInterval = 5;

console.log('[State] adminSettings + all globals initialized');

// ============================================================
// 4. ELEMENT REFERENCES (with ID fallbacks)
// ============================================================

const $ = (id) => document.getElementById(id);

// Auth / Login
const adminLogin = $('admin-login') || $('login-screen');
const adminDashboard = $('admin-dashboard') || $('admin-panel');
const adminEmailInput = $('admin-email') || $('login-email');
const adminPasswordInput = $('admin-password') || $('login-password');
const adminLoginBtn = $('admin-login-btn') || $('login-btn');
const adminMessage = $('admin-message') || $('login-error');
const adminEmailDisplay = $('admin-email-display') || $('admin-user-email');
const adminLogoutBtn = $('admin-logout') || $('admin-logout-btn');

// Tabs
const adminTabs = document.querySelectorAll('.admin-tab');
const tabPanes = document.querySelectorAll('.admin-tab-content, .admin-tab-pane');

// Stats
const statUsers = $('stat-users');
const statActiveTrades = $('stat-active-trades');
const statPendingDeposits = $('stat-pending-deposits');
const statPendingWithdrawals = $('stat-pending-withdrawals');

// Lists
const usersList = $('users-list');
const tradesList = $('trades-list');
const depositsList = $('deposits-list');
const withdrawalsList = $('withdrawals-list');
const marketsList = $('markets-list') || $('market-list');

// Refresh buttons
const refreshUsers = $('refresh-users');
const refreshTrades = $('refresh-trades');
const refreshDeposits = $('refresh-deposits');
const refreshWithdrawals = $('refresh-withdrawals');
const refreshMarkets = $('refresh-markets');

// Market form
const newMarketName = $('new-market-name') || $('market-name');
const newMarketSymbol = $('new-market-symbol') || $('market-symbol');
const newMarketBase = $('new-market-base') || $('market-base');
const newMarketPayout = $('market-payout');
const newMarketWinrate = $('market-winrate');
const createMarketBtn = $('create-market-btn') || $('market-add-btn');

// Settings
const winRateInput = $('win-rate-input');
const saveWinRateBtn = $('save-win-rate');
const payoutInput = $('payout-input');
const savePayoutBtn = $('save-payout');
const autoIntervalInput = $('auto-interval-input');
const saveAutoIntervalBtn = $('save-auto-interval');
const autoModeToggle = $('auto-mode-toggle');

console.log('[DOM] Element references loaded');

// ============================================================
// 5. LOGIN / LOGOUT
// ============================================================

if (adminLoginBtn) {
  adminLoginBtn.addEventListener('click', async () => {
    const email = adminEmailInput ? adminEmailInput.value.trim() : '';
    const password = adminPasswordInput ? adminPasswordInput.value : '';

    if (!email || !password) {
      if (adminMessage) adminMessage.textContent = 'Email and password required';
      return;
    }

    try {
      if (adminMessage) {
        adminMessage.style.color = '#2196f3';
        adminMessage.textContent = 'Logging in...';
      }

      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));

      if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        await signOut(auth);
        if (adminMessage) {
          adminMessage.style.color = '#ff5252';
          adminMessage.textContent = 'Not an admin';
        }
        return;
      }

      if (adminMessage) {
        adminMessage.style.color = '#00c853';
        adminMessage.textContent = 'Login successful!';
      }
    } catch (error) {
      if (adminMessage) {
        adminMessage.style.color = '#ff5252';
        adminMessage.textContent = error.message;
      }
    }
  });
}

if (adminLogoutBtn) {
  adminLogoutBtn.addEventListener('click', async () => {
    if (confirm('Logout?')) {
      await signOut(auth);
    }
  });
}

console.log('[Auth] Login/logout bound');

// ============================================================
// 6. AUTH STATE LISTENER
// ============================================================

onAuthStateChanged(auth, async (user) => {
  const loginEl = $('login-screen') || $('admin-login');
  const panelEl = $('admin-panel') || $('admin-dashboard');
  const emailInputEl = $('login-email') || $('admin-email');
  const passInputEl = $('login-password') || $('admin-password');
  const emailDisplayEl = $('admin-user-email') || $('admin-email-display');

  function showLogin() {
    if (loginEl) { loginEl.classList.remove('hidden'); loginEl.style.display = ''; }
    if (panelEl) { panelEl.classList.add('hidden'); panelEl.style.display = 'none'; }
    if (emailInputEl) emailInputEl.value = '';
    if (passInputEl) passInputEl.value = '';
  }

  function showPanel() {
    if (loginEl) { loginEl.classList.add('hidden'); loginEl.style.display = 'none'; }
    if (panelEl) { panelEl.classList.remove('hidden'); panelEl.style.display = ''; }
  }

  if (user) {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        showLogin();
        if (adminMessage) {
          adminMessage.style.color = '#ff5252';
          adminMessage.textContent = 'Not an admin';
        }
        await signOut(auth);
        return;
      }

      window.currentAdmin = user;
      showPanel();
      if (emailDisplayEl) emailDisplayEl.textContent = user.email;

      console.log('[Auth] Admin logged in:', user.email);

      // Load everything
      loadStats();
      loadUsers();
      loadTrades();
      loadDeposits();
      loadWithdrawals();
      loadMarkets();
      loadSettings();
      loadCandleModeFromFirestore();
      listenWinLossSettings();

      // Init subsystems (defined in later parts)
      setTimeout(() => {
        if (typeof initCandleModeUI === 'function') initCandleModeUI();
        if (typeof bindPart6A === 'function') bindPart6A();
        if (typeof bindCandleButtons === 'function') bindCandleButtons();
        if (typeof bindPlaybackButtons === 'function') bindPlaybackButtons();
        if (typeof bindAutoMode === 'function') bindAutoMode();
        if (typeof bindExportImport === 'function') bindExportImport();
        if (typeof initAdminTournaments === 'function') initAdminTournaments();
        if (typeof loadChatUsers === 'function') loadChatUsers();
      }, 1000);

    } catch (err) {
      console.error('[Auth] Error:', err);
      await signOut(auth);
    }
  } else {
    window.currentAdmin = null;
    showLogin();

    // Cleanup subscriptions
    if (usersUnsub) { try { usersUnsub(); } catch(e) {} usersUnsub = null; }
    if (tradesUnsub) { try { tradesUnsub(); } catch(e) {} tradesUnsub = null; }
    if (depositsUnsub) { try { depositsUnsub(); } catch(e) {} depositsUnsub = null; }
    if (withdrawalsUnsub) { try { withdrawalsUnsub(); } catch(e) {} withdrawalsUnsub = null; }
    if (marketsUnsub) { try { marketsUnsub(); } catch(e) {} marketsUnsub = null; }
    if (settingsUnsub) { try { settingsUnsub(); } catch(e) {} settingsUnsub = null; }
    if (scheduledCandlesUnsub) { try { scheduledCandlesUnsub(); } catch(e) {} scheduledCandlesUnsub = null; }

    console.log('[Auth] Logged out');
  }
});

// ============================================================
// 7. TAB SWITCHING
// ============================================================

adminTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    adminTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    tabPanes.forEach(p => p.classList.remove('active'));
    const target = $('tab-' + tab.dataset.tab);
    if (target) target.classList.add('active');

    // Special init on tab switch
    if (tab.dataset.tab === 'tournaments') {
      setTimeout(() => {
        if (typeof initAdminTournaments === 'function') initAdminTournaments();
      }, 100);
    }
    if (tab.dataset.tab === 'chat') {
      setTimeout(() => {
        if (typeof loadChatUsers === 'function') loadChatUsers();
      }, 100);
    }
    if (tab.dataset.tab === 'candles') {
      setTimeout(() => {
        if (typeof bindPart6A === 'function') bindPart6A();
        if (typeof renderCandleTable === 'function') renderCandleTable();
      }, 100);
    }
  });
});

console.log('[Tabs] Switching bound');

// ============================================================
// 8. REFRESH BUTTONS
// ============================================================

if (refreshUsers) refreshUsers.addEventListener('click', () => loadUsers());
if (refreshTrades) refreshTrades.addEventListener('click', () => loadTrades());
if (refreshDeposits) refreshDeposits.addEventListener('click', () => loadDeposits());
if (refreshWithdrawals) refreshWithdrawals.addEventListener('click', () => loadWithdrawals());
if (refreshMarkets) refreshMarkets.addEventListener('click', () => loadMarkets());

console.log('[Buttons] Refresh bound');

// ============================================================
// 9. HELPER FUNCTIONS (used everywhere)
// ============================================================

// Format price
window.fmtPrice = function(n, decimals) {
  var d = (typeof decimals === 'number') ? decimals : 2;
  var num = Number(n);
  if (isNaN(num)) return '0.00';
  return num.toFixed(d);
};

// Format time HH:MM
window.fmtTime = function(dateObj) {
  if (!dateObj) return '-';
  var d = (typeof dateObj === 'string') ? new Date(dateObj) : dateObj;
  if (isNaN(d.getTime())) return '-';
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};

// Format date+time
window.fmtDateTime = function(dateObj) {
  if (!dateObj) return '-';
  var d = (typeof dateObj === 'string') ? new Date(dateObj) : dateObj;
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

// Safe element text setter
window.safeText = function(id, text) {
  var el = $(id);
  if (el) el.textContent = text;
};

// Time helpers for candle scheduling
window.timeframeToSeconds = function(tf) {
  var map = { '5s': 5, '10s': 10, '15s': 15, '30s': 30, '1m': 60, '2m': 120, '3m': 180, '5m': 300, '10m': 600, '15m': 900, '30m': 1800, '1h': 3600, '4h': 14400, '1d': 86400 };
  return map[tf] || 60;
};

window.secondsToTime = function(totalSec) {
  var h = Math.floor(totalSec / 3600) % 24;
  var m = Math.floor((totalSec % 3600) / 60);
  var s = totalSec % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
};

window.timeToSeconds = function(timeStr) {
  var parts = (timeStr || '00:00:00').split(':').map(Number);
  return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
};

window.addDaysToDate = function(dateStr, days) {
  var d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
};

window.calcCandleTime = function(startDate, startTime, index, tfSeconds) {
  var startSec = window.timeToSeconds(startTime);
  var totalSec = startSec + index * tfSeconds;
  var dayOffset = Math.floor(totalSec / 86400);
  var daySec = totalSec % 86400;
  return {
    date: window.addDaysToDate(startDate, dayOffset),
    startTime: window.secondsToTime(daySec),
    endTime: window.secondsToTime(daySec + tfSeconds),
    dayOffset: dayOffset
  };
};

console.log('[Helpers] Utility functions loaded');

// ============================================================
// END PART 1 of 7
// ============================================================

console.log('===== admin.js v33-clean — PART 1/7 LOADED =====');
// ============================================================
// QUOTEX CLONE — admin.js v33-clean
// Part 2 of 7: Markets + Stats + Users + Trades
// ============================================================

// ============================================================
// 10. MARKET CREATE
// ============================================================

if (createMarketBtn) {
  createMarketBtn.addEventListener('click', async () => {
    const name = newMarketName ? newMarketName.value.trim() : '';
    const symbol = newMarketSymbol ? newMarketSymbol.value.trim().toUpperCase() : '';
    const base = parseFloat(newMarketBase ? newMarketBase.value : 0) || 50000;
    const payout = newMarketPayout ? (parseInt(newMarketPayout.value) || currentPayout) : currentPayout;
    const winRate = newMarketWinrate ? (parseInt(newMarketWinrate.value) || currentWinRate) : currentWinRate;

    if (!name) { alert('Market Name dite hobe'); return; }
    if (!symbol) { alert('Symbol dite hobe (jemon: BTCUSDT)'); return; }
    if (symbol.length < 3) { alert('Symbol kompokkhe 3 character hote hobe'); return; }

    try {
      const marketId = symbol.toLowerCase() + '_' + Date.now();
      await setDoc(doc(db, 'markets', marketId), {
        id: marketId,
        name: name,
        symbol: symbol,
        basePrice: base,
        currentPrice: base,
        enabled: true,
        payout: payout,
        winRate: winRate,
        candleMode: window.candleMode || 'locked',
        currentCandleIndex: 0,
        autoModeInterval: currentAutoInterval,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      if (newMarketName) newMarketName.value = '';
      if (newMarketSymbol) newMarketSymbol.value = '';
      if (newMarketBase) newMarketBase.value = '';
      if (newMarketPayout) newMarketPayout.value = '';
      if (newMarketWinrate) newMarketWinrate.value = '';

      alert(name + ' (' + symbol + ') created!');
    } catch (err) {
      alert(err.message);
    }
  });
}

console.log('[Markets] Create button bound');

// ============================================================
// 11. MARKETS LIST (real-time)
// ============================================================

function loadMarkets() {
  if (!marketsList) {
    console.warn('[Markets] marketsList element not found');
    return;
  }

  marketsList.innerHTML = '<p class="loading-text">Loading...</p>';

  if (marketsUnsub) { try { marketsUnsub(); } catch(e) {} }

  marketsUnsub = onSnapshot(collection(db, 'markets'), (snap) => {
    marketsList.innerHTML = '';

    if (snap.empty) {
      marketsList.innerHTML = '<p class="loading-text">No markets</p>';
      updateCandleMarketSelect([]);
      return;
    }

    const markets = [];
    snap.forEach(d => markets.push({ id: d.id, ...d.data() }));
    markets.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    markets.forEach(m => renderMarketItem(m));
    updateCandleMarketSelect(markets);
    console.log('[Markets] Loaded', markets.length, 'markets');
  });
}

function renderMarketItem(market) {
  const div = document.createElement('div');
  div.className = 'market-item' + (market.enabled ? '' : ' disabled');
  div.dataset.marketId = market.id;

  const enabledBadge = market.enabled
    ? '<span class="admin-item-badge badge-win">ACTIVE</span>'
    : '<span class="admin-item-badge badge-rejected">DISABLED</span>';

  div.innerHTML =
    '<div class="market-item-header">' +
      '<div class="market-item-name">' + (market.name || 'no-name') + '</div>' +
      enabledBadge +
    '</div>' +
    '<div class="market-item-info">' +
      '<span>Symbol: <strong>' + (market.symbol || '-') + '</strong></span>' +
      '<span>Base: <strong>$' + (market.basePrice || 0).toFixed(2) + '</strong></span>' +
      '<span>Payout: <strong>' + (market.payout || 85) + '%</strong></span>' +
      '<span>Win Rate: <strong>' + (market.winRate || 50) + '%</strong></span>' +
      '<span>Mode: <strong>' + (market.candleMode || 'random') + '</strong></span>' +
      '<span>Candle: <strong>#' + (market.currentCandleIndex || 0) + '</strong></span>' +
    '</div>' +
    '<div class="market-item-actions">' +
      '<button class="btn-action btn-edit" data-action="edit-market" data-mid="' + market.id + '">Edit</button>' +
      '<button class="btn-action ' + (market.enabled ? 'btn-reject' : 'btn-approve') + '" data-action="toggle-market" data-mid="' + market.id + '" data-enabled="' + market.enabled + '">' + (market.enabled ? 'Disable' : 'Enable') + '</button>' +
      '<button class="btn-action btn-reject" data-action="delete-market" data-mid="' + market.id + '">Delete</button>' +
    '</div>';

  marketsList.appendChild(div);
}

if (marketsList) {
  marketsList.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const mid = btn.dataset.mid;
    if (!mid) return;

    if (action === 'edit-market') await editMarket(mid);
    else if (action === 'toggle-market') await toggleMarket(mid, btn.dataset.enabled === 'true');
    else if (action === 'delete-market') await deleteMarket(mid);
  });
}

async function editMarket(mid) {
  try {
    const marketDoc = await getDoc(doc(db, 'markets', mid));
    if (!marketDoc.exists()) { alert('Not found'); return; }
    const m = marketDoc.data();

    const newName = prompt('Name:', m.name || '');
    if (newName === null) return;

    const newPayout = prompt('Payout %:', m.payout || 85);
    if (newPayout === null) return;

    const newWinRate = prompt('Win Rate %:', m.winRate || 50);
    if (newWinRate === null) return;

    const payoutVal = parseInt(newPayout);
    const winVal = parseInt(newWinRate);

    if (isNaN(payoutVal) || payoutVal < 0 || payoutVal > 200) { alert('Payout 0-200'); return; }
    if (isNaN(winVal) || winVal < 0 || winVal > 100) { alert('Win Rate 0-100'); return; }

    await updateDoc(doc(db, 'markets', mid), {
      name: newName,
      payout: payoutVal,
      winRate: winVal,
      updatedAt: new Date().toISOString()
    });

    alert('Updated');
  } catch (err) {
    alert(err.message);
  }
}

async function toggleMarket(mid, isEnabled) {
  const action = isEnabled ? 'Disable' : 'Enable';
  if (!confirm(action + '?')) return;

  try {
    await updateDoc(doc(db, 'markets', mid), {
      enabled: !isEnabled,
      updatedAt: new Date().toISOString()
    });
    alert(action + ' done');
  } catch (err) {
    alert(err.message);
  }
}

async function deleteMarket(mid) {
  if (!confirm('Delete this market and all candles?')) return;
  if (!confirm('Really delete?')) return;

  try {
    const candlesSnap = await getDocs(collection(db, 'markets', mid, 'candles'));
    for (const c of candlesSnap.docs) {
      await deleteDoc(doc(db, 'markets', mid, 'candles', c.id));
    }
    await deleteDoc(doc(db, 'markets', mid));
    alert('Deleted');
  } catch (err) {
    alert(err.message);
  }
}

function updateCandleMarketSelect(markets) {
  const sel = document.getElementById('candle-market-select');
  if (!sel) return;

  const current = sel.value;
  sel.innerHTML = '<option value="">-- Select Market --</option>';

  markets.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name + ' (' + m.symbol + ')';
    sel.appendChild(opt);
  });

  if (current) sel.value = current;

  // Also populate designer market select
  const dSel = document.getElementById('designer-market-select');
  if (dSel) {
    const dCurrent = dSel.value;
    dSel.innerHTML = '<option value="">-- Select Market --</option>';
    markets.forEach(m => {
      if (m.enabled) {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name + ' (' + m.symbol + ')';
        dSel.appendChild(opt);
      }
    });
    if (dCurrent) dSel.value = dCurrent;
  }
}

// Expose
window.loadMarkets = loadMarkets;
window.updateCandleMarketSelect = updateCandleMarketSelect;

console.log('[Markets] System loaded');

// ============================================================
// 12. STATS
// ============================================================

async function loadStats() {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    if (statUsers) statUsers.textContent = usersSnap.size;

    const activeTradesSnap = await getDocs(query(collection(db, 'trades'), where('status', '==', 'pending')));
    if (statActiveTrades) statActiveTrades.textContent = activeTradesSnap.size;

    const depositsSnap = await getDocs(query(collection(db, 'deposits'), where('status', '==', 'pending')));
    if (statPendingDeposits) statPendingDeposits.textContent = depositsSnap.size;

    const withdrawalsSnap = await getDocs(query(collection(db, 'withdrawals'), where('status', '==', 'pending')));
    if (statPendingWithdrawals) statPendingWithdrawals.textContent = withdrawalsSnap.size;
  } catch (err) {
    console.error('Stats error:', err);
  }
}

window.loadStats = loadStats;

// ============================================================
// 13. USERS
// ============================================================

function loadUsers() {
  if (!usersList) return;

  usersList.innerHTML = '<p class="loading-text">Loading...</p>';
  if (usersUnsub) { try { usersUnsub(); } catch(e) {} }

  usersUnsub = onSnapshot(collection(db, 'users'), (snap) => {
    usersList.innerHTML = '';

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
  const div = document.createElement('div');
  div.className = 'admin-item';

  const roleBadge = user.role === 'admin'
    ? '<span class="admin-item-badge badge-admin">ADMIN</span>'
    : '<span class="admin-item-badge badge-user">USER</span>';

  const demoBal = (user.demoBalance ?? 1000).toFixed(2);
  const realBal = (user.realBalance ?? 0).toFixed(2);
  const joined = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB') : '-';

  div.innerHTML =
    '<div class="admin-item-header">' +
      '<div class="admin-item-title">' + (user.email || 'no-email') + '</div>' +
      roleBadge +
    '</div>' +
    '<div class="admin-item-info">' +
      '<span>Demo: <strong>$' + demoBal + '</strong></span>' +
      '<span>Real: <strong>$' + realBal + '</strong></span>' +
      '<span>Joined: <strong>' + joined + '</strong></span>' +
      '<span>Banned: <strong>' + (user.banned ? 'Yes' : 'No') + '</strong></span>' +
    '</div>' +
    '<div class="admin-item-actions">' +
      '<button class="btn-action btn-edit" data-action="edit-demo" data-uid="' + user.id + '" data-bal="' + (user.demoBalance ?? 1000) + '">Demo</button>' +
      '<button class="btn-action btn-edit" data-action="edit-real" data-uid="' + user.id + '" data-bal="' + (user.realBalance ?? 0) + '">Real</button>' +
      '<button class="btn-action ' + (user.banned ? 'btn-approve' : 'btn-reject') + '" data-action="ban" data-uid="' + user.id + '" data-banned="' + (user.banned ? 'true' : 'false') + '">' + (user.banned ? 'Unban' : 'Ban') + '</button>' +
    '</div>';

  usersList.appendChild(div);
}

if (usersList) {
  usersList.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const uid = btn.dataset.uid;
    if (!uid) return;

    if (action === 'edit-demo') await editBalance(uid, 'demoBalance', btn.dataset.bal);
    else if (action === 'edit-real') await editBalance(uid, 'realBalance', btn.dataset.bal);
    else if (action === 'ban') await toggleBan(uid, btn.dataset.banned === 'true');
  });
}

async function editBalance(uid, field, currentValue) {
  const label = field === 'demoBalance' ? 'Demo' : 'Real';
  const input = prompt(label + ' Balance (current: $' + currentValue + ')', currentValue);
  if (input === null) return;

  const newVal = parseFloat(input);
  if (isNaN(newVal) || newVal < 0) { alert('Invalid value'); return; }

  try {
    await updateDoc(doc(db, 'users', uid), { [field]: newVal });
    alert(label + ': $' + newVal.toFixed(2));
  } catch (err) {
    alert(err.message);
  }
}

async function toggleBan(uid, isBanned) {
  const action = isBanned ? 'Unban' : 'Ban';
  if (!confirm(action + '?')) return;

  try {
    await updateDoc(doc(db, 'users', uid), { banned: !isBanned });
    alert(action + ' done');
  } catch (err) {
    alert(err.message);
  }
}

window.loadUsers = loadUsers;

console.log('[Users] System loaded');

// ============================================================
// 14. TRADES
// ============================================================

function loadTrades() {
  if (!tradesList) return;

  tradesList.innerHTML = '<p class="loading-text">Loading...</p>';
  if (tradesUnsub) { try { tradesUnsub(); } catch(e) {} }

  tradesUnsub = onSnapshot(collection(db, 'trades'), (snap) => {
    tradesList.innerHTML = '';

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
  const div = document.createElement('div');
  div.className = 'admin-item';

  let statusBadge = '';
  if (trade.status === 'pending') statusBadge = '<span class="admin-item-badge badge-pending">PENDING</span>';
  else if (trade.result === 'win') statusBadge = '<span class="admin-item-badge badge-win">WIN</span>';
  else statusBadge = '<span class="admin-item-badge badge-loss">LOSS</span>';

  const entryPrice = (trade.entryPrice || 0).toFixed(2);
  const exitPrice = (trade.exitPrice || 0).toFixed(2);
  const profit = trade.profit ? trade.profit.toFixed(2) : '0.00';
  const created = trade.createdAt ? new Date(trade.createdAt).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-';

  div.innerHTML =
    '<div class="admin-item-header">' +
      '<div class="admin-item-title">' + (trade.userEmail || 'no-email') + '</div>' +
      statusBadge +
    '</div>' +
    '<div class="admin-item-info">' +
      '<span>Type: <strong>' + (trade.type || '').toUpperCase() + '</strong></span>' +
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
  tradesList.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const tid = btn.dataset.tid;
    if (!tid) return;

    if (action === 'force-win') await forceTradeResult(tid, 'win');
    else if (action === 'force-loss') await forceTradeResult(tid, 'loss');
    else if (action === 'force-pending') await forceTradeResult(tid, 'pending');
  });
}

async function forceTradeResult(tradeId, result) {
  if (!confirm('Force ' + result + '?')) return;

  try {
    const tradeRef = doc(db, 'trades', tradeId);
    const tradeDoc = await getDoc(tradeRef);
    if (!tradeDoc.exists()) { alert('Trade not found'); return; }

    const trade = tradeDoc.data();

    if (result === 'pending') {
      await updateDoc(tradeRef, { status: 'pending', result: null, profit: 0 });
      alert('Pending');
      return;
    }

    const payoutRate = currentPayout / 100 + 1;
    const profit = result === 'win' ? trade.amount * payoutRate : 0;

    await updateDoc(tradeRef, {
      status: 'completed',
      result: result,
      profit: profit,
      exitPrice: trade.entryPrice,
      completedAt: new Date().toISOString()
    });

    if (result === 'win') {
      const userRef = doc(db, 'users', trade.userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const field = trade.accountType === 'real' ? 'realBalance' : 'demoBalance';
        const curBal = userData[field] ?? 0;
        await updateDoc(userRef, { [field]: curBal + profit });
      }
    }

    alert(result + ' done');
  } catch (err) {
    alert(err.message);
  }
}

window.loadTrades = loadTrades;

console.log('[Trades] System loaded');

// ============================================================
// END PART 2 of 7
// ============================================================

console.log('===== admin.js v33-clean — PART 2/7 LOADED =====');
// ============================================================
// QUOTEX CLONE — admin.js v33-clean
// Part 3 of 7: Deposits + Withdrawals + Settings
// ============================================================

// ============================================================
// 15. DEPOSITS
// ============================================================

function loadDeposits() {
  if (!depositsList) return;

  depositsList.innerHTML = '<p class="loading-text">Loading...</p>';
  if (depositsUnsub) { try { depositsUnsub(); } catch(e) {} }

  depositsUnsub = onSnapshot(collection(db, 'deposits'), (snap) => {
    depositsList.innerHTML = '';

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
  const div = document.createElement('div');
  div.className = 'admin-item';

  let statusBadge = '';
  if (dep.status === 'pending') statusBadge = '<span class="admin-item-badge badge-pending">PENDING</span>';
  else if (dep.status === 'approved') statusBadge = '<span class="admin-item-badge badge-win">APPROVED</span>';
  else statusBadge = '<span class="admin-item-badge badge-rejected">REJECTED</span>';

  const created = dep.createdAt ? new Date(dep.createdAt).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-';

  div.innerHTML =
    '<div class="admin-item-header">' +
      '<div class="admin-item-title">' + (dep.email || 'no-email') + '</div>' +
      statusBadge +
    '</div>' +
    '<div class="admin-item-info">' +
      '<span>Amount: <strong>$' + dep.amount + '</strong></span>' +
      '<span>Method: <strong>' + (dep.method || 'manual') + '</strong></span>' +
      '<span>TrxID: <strong>' + (dep.txid || '-') + '</strong></span>' +
      '<span>Time: <strong>' + created + '</strong></span>' +
    '</div>' +
    '<div class="admin-item-actions">' +
      '<button class="btn-action btn-approve" data-action="approve-dep" data-did="' + dep.id + '">Approve</button>' +
      '<button class="btn-action btn-reject" data-action="reject-dep" data-did="' + dep.id + '">Reject</button>' +
    '</div>';

  depositsList.appendChild(div);
}

if (depositsList) {
  depositsList.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const did = btn.dataset.did;
    if (!did) return;

    if (action === 'approve-dep') await approveDeposit(did);
    else if (action === 'reject-dep') await rejectDeposit(did);
  });
}

async function approveDeposit(depositId) {
  if (!confirm('Approve?')) return;

  try {
    const depRef = doc(db, 'deposits', depositId);
    const depDoc = await getDoc(depRef);
    if (!depDoc.exists()) { alert('Not found'); return; }

    const dep = depDoc.data();
    if (dep.status === 'approved') { alert('Already approved'); return; }

    const userRef = doc(db, 'users', dep.userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const curReal = userDoc.data().realBalance ?? 0;
      await updateDoc(userRef, { realBalance: curReal + dep.amount });
    }

    await updateDoc(depRef, { status: 'approved', approvedAt: new Date().toISOString() });
    alert('Approved');
    loadStats();
  } catch (err) {
    alert(err.message);
  }
}

async function rejectDeposit(depositId) {
  if (!confirm('Reject?')) return;

  try {
    await updateDoc(doc(db, 'deposits', depositId), {
      status: 'rejected',
      rejectedAt: new Date().toISOString()
    });
    alert('Rejected');
    loadStats();
  } catch (err) {
    alert(err.message);
  }
}

window.loadDeposits = loadDeposits;

console.log('[Deposits] System loaded');

// ============================================================
// 16. WITHDRAWALS
// ============================================================

function loadWithdrawals() {
  if (!withdrawalsList) return;

  withdrawalsList.innerHTML = '<p class="loading-text">Loading...</p>';
  if (withdrawalsUnsub) { try { withdrawalsUnsub(); } catch(e) {} }

  withdrawalsUnsub = onSnapshot(collection(db, 'withdrawals'), (snap) => {
    withdrawalsList.innerHTML = '';

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
  const div = document.createElement('div');
  div.className = 'admin-item';

  let statusBadge = '';
  if (w.status === 'pending') statusBadge = '<span class="admin-item-badge badge-pending">PENDING</span>';
  else if (w.status === 'approved') statusBadge = '<span class="admin-item-badge badge-win">APPROVED</span>';
  else statusBadge = '<span class="admin-item-badge badge-rejected">REJECTED</span>';

  const created = w.createdAt ? new Date(w.createdAt).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-';

  div.innerHTML =
    '<div class="admin-item-header">' +
      '<div class="admin-item-title">' + (w.email || 'no-email') + '</div>' +
      statusBadge +
    '</div>' +
    '<div class="admin-item-info">' +
      '<span>Amount: <strong>$' + w.amount + '</strong></span>' +
      '<span>Method: <strong>' + (w.method || '-') + '</strong></span>' +
      '<span>Number: <strong>' + (w.number || '-') + '</strong></span>' +
      '<span>Time: <strong>' + created + '</strong></span>' +
    '</div>' +
    '<div class="admin-item-actions">' +
      '<button class="btn-action btn-approve" data-action="approve-wd" data-wid="' + w.id + '">Approve</button>' +
      '<button class="btn-action btn-reject" data-action="reject-wd" data-wid="' + w.id + '">Reject</button>' +
    '</div>';

  withdrawalsList.appendChild(div);
}

if (withdrawalsList) {
  withdrawalsList.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const wid = btn.dataset.wid;
    if (!wid) return;

    if (action === 'approve-wd') await approveWithdrawal(wid);
    else if (action === 'reject-wd') await rejectWithdrawal(wid);
  });
}

async function approveWithdrawal(wid) {
  if (!confirm('Approve?')) return;

  try {
    const wRef = doc(db, 'withdrawals', wid);
    const wDoc = await getDoc(wRef);
    if (!wDoc.exists()) { alert('Not found'); return; }

    const w = wDoc.data();
    if (w.status === 'approved') { alert('Already approved'); return; }

    const userRef = doc(db, 'users', w.userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const curReal = userDoc.data().realBalance ?? 0;
      if (curReal < w.amount) { alert('Insufficient balance'); return; }
      await updateDoc(userRef, { realBalance: curReal - w.amount });
    }

    await updateDoc(wRef, { status: 'approved', approvedAt: new Date().toISOString() });
    alert('Approved');
    loadStats();
  } catch (err) {
    alert(err.message);
  }
}

async function rejectWithdrawal(wid) {
  if (!confirm('Reject?')) return;

  try {
    await updateDoc(doc(db, 'withdrawals', wid), {
      status: 'rejected',
      rejectedAt: new Date().toISOString()
    });
    alert('Rejected');
    loadStats();
  } catch (err) {
    alert(err.message);
  }
}

window.loadWithdrawals = loadWithdrawals;

console.log('[Withdrawals] System loaded');

// ============================================================
// 17. SETTINGS LOAD
// ============================================================

async function loadSettings() {
  try {
    const sDoc = await getDoc(doc(db, 'settings', 'global'));

    if (sDoc.exists()) {
      const d = sDoc.data();

      currentWinRate = d.winRate ?? 50;
      currentPayout = d.payout ?? 85;
      currentAutoInterval = d.autoModeInterval ?? 5;

      window.adminSettings.winRate = currentWinRate;
      window.adminSettings.payout = currentPayout;
      window.adminSettings.autoMode = d.autoMode === true;
      window.adminSettings.autoModeInterval = d.autoModeInterval || 5000;

      // Trap/Delay/Reversal
      window.adminSettings.trapRate = d.trapRate ?? 30;
      window.adminSettings.delayRate = d.delayRate ?? 20;
      window.adminSettings.reversalRate = d.reversalRate ?? 15;

      // Live
      window.adminSettings.liveSpeed = d.liveSpeed ?? 500;
      window.adminSettings.autoGenerate24h = d.autoGenerate24h === true;

      // Win/Loss
      window.adminSettings.winPercent = d.winPercent ?? 80;
      window.adminSettings.lossPercent = d.lossPercent ?? 30;

      // SMART (Phase 1)
      window.adminSettings.smartEnabled = d.smartEnabled === true;
      window.adminSettings.profitPercent = d.profitPercent ?? 40;
      window.adminSettings.lossPercentSmart = d.lossPercentSmart ?? 60;
      window.adminSettings.autoAdjust = d.autoAdjust !== false;
      window.adminSettings.favorHouse = d.favorHouse !== false;
      window.adminSettings.maxWinnersPerCandle = d.maxWinnersPerCandle ?? 5;
      window.adminSettings.minWinnersPerCandle = d.minWinnersPerCandle ?? 1;

      // Fill UI inputs
      if (winRateInput) winRateInput.value = currentWinRate;
      if (payoutInput) payoutInput.value = currentPayout;
      if (autoIntervalInput) autoIntervalInput.value = currentAutoInterval;

      var trapInput = document.getElementById('trap-rate-input');
      if (trapInput) trapInput.value = window.adminSettings.trapRate;

      var delayInput = document.getElementById('delay-rate-input');
      if (delayInput) delayInput.value = window.adminSettings.delayRate;

      var revInput = document.getElementById('reversal-rate-input');
      if (revInput) revInput.value = window.adminSettings.reversalRate;

      var winPctInput = document.getElementById('win-percent-input');
      if (winPctInput) winPctInput.value = window.adminSettings.winPercent;

      var lossPctInput = document.getElementById('loss-percent-input');
      if (lossPctInput) lossPctInput.value = window.adminSettings.lossPercent;

      var speedInput = document.getElementById('live-speed-input');
      if (speedInput) speedInput.value = window.adminSettings.liveSpeed;

      // Phase 1 SMART inputs
      var profitInput = document.getElementById('smart-profit-percent');
      if (profitInput) profitInput.value = window.adminSettings.profitPercent;

      var lossSmartInput = document.getElementById('smart-loss-percent');
      if (lossSmartInput) lossSmartInput.value = window.adminSettings.lossPercentSmart;

      var maxWinInput = document.getElementById('smart-max-winners');
      if (maxWinInput) maxWinInput.value = window.adminSettings.maxWinnersPerCandle;

      var minWinInput = document.getElementById('smart-min-winners');
      if (minWinInput) minWinInput.value = window.adminSettings.minWinnersPerCandle;

      var autoAdjToggle = document.getElementById('smart-auto-adjust');
      if (autoAdjToggle) autoAdjToggle.checked = window.adminSettings.autoAdjust;

      var favorToggle = document.getElementById('smart-favor-house');
      if (favorToggle) favorToggle.checked = window.adminSettings.favorHouse;

      var smartToggle = document.getElementById('smart-enabled-toggle');
      if (smartToggle) smartToggle.checked = window.adminSettings.smartEnabled;

      console.log('[Settings] Loaded from Firestore:', window.adminSettings);
    }
  } catch (err) {
    console.error('[Settings] Load error:', err);
  }
}

window.loadSettings = loadSettings;

// ============================================================
// 18. SETTINGS SAVE — Win Rate
// ============================================================

if (saveWinRateBtn) {
  saveWinRateBtn.addEventListener('click', async () => {
    const val = parseInt(winRateInput.value);
    if (isNaN(val) || val < 0 || val > 100) { alert('0-100'); return; }

    try {
      await setDoc(doc(db, 'settings', 'global'), { winRate: val }, { merge: true });
      currentWinRate = val;
      window.adminSettings.winRate = val;
      alert('Win Rate: ' + val + '%');
    } catch (err) {
      alert(err.message);
    }
  });
}

// ============================================================
// 19. SETTINGS SAVE — Payout
// ============================================================

if (savePayoutBtn) {
  savePayoutBtn.addEventListener('click', async () => {
    const val = parseInt(payoutInput.value);
    if (isNaN(val) || val < 0 || val > 200) { alert('0-200'); return; }

    try {
      await setDoc(doc(db, 'settings', 'global'), { payout: val }, { merge: true });
      currentPayout = val;
      window.adminSettings.payout = val;
      alert('Payout: ' + val + '%');
    } catch (err) {
      alert(err.message);
    }
  });
}

// ============================================================
// 20. SETTINGS SAVE — Auto Interval
// ============================================================

if (saveAutoIntervalBtn) {
  saveAutoIntervalBtn.addEventListener('click', async () => {
    const val = parseInt(autoIntervalInput.value);
    if (isNaN(val) || val < 1 || val > 60) { alert('1-60'); return; }

    try {
      await setDoc(doc(db, 'settings', 'global'), { autoModeInterval: val }, { merge: true });
      currentAutoInterval = val;
      window.adminSettings.autoModeInterval = val * 1000;
      alert('Interval: ' + val + ' min');
    } catch (err) {
      alert(err.message);
    }
  });
}

// ============================================================
// 21. SETTINGS SAVE — Trap Rate
// ============================================================

(function bindTrapRate() {
  var btn = document.getElementById('save-trap-rate');
  var input = document.getElementById('trap-rate-input');
  if (!btn || !input) return;

  btn.addEventListener('click', async function() {
    var val = parseInt(input.value);
    if (isNaN(val) || val < 0 || val > 100) { alert('Trap % must be 0-100'); return; }

    try {
      await setDoc(doc(db, 'settings', 'global'), {
        trapRate: val,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      window.adminSettings.trapRate = val;
      console.log('[Settings] Trap Rate saved:', val + '%');
      alert('Trap Rate: ' + val + '%');
    } catch (err) {
      alert(err.message);
    }
  });
})();

// ============================================================
// 22. SETTINGS SAVE — Delay Rate
// ============================================================

(function bindDelayRate() {
  var btn = document.getElementById('save-delay-rate');
  var input = document.getElementById('delay-rate-input');
  if (!btn || !input) return;

  btn.addEventListener('click', async function() {
    var val = parseInt(input.value);
    if (isNaN(val) || val < 0 || val > 100) { alert('Delay % must be 0-100'); return; }

    try {
      await setDoc(doc(db, 'settings', 'global'), {
        delayRate: val,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      window.adminSettings.delayRate = val;
      console.log('[Settings] Delay Rate saved:', val + '%');
      alert('Delay Rate: ' + val + '%');
    } catch (err) {
      alert(err.message);
    }
  });
})();

// ============================================================
// 23. SETTINGS SAVE — Reversal Rate
// ============================================================

(function bindReversalRate() {
  var btn = document.getElementById('save-reversal-rate');
  var input = document.getElementById('reversal-rate-input');
  if (!btn || !input) return;

  btn.addEventListener('click', async function() {
    var val = parseInt(input.value);
    if (isNaN(val) || val < 0 || val > 100) { alert('Reversal % must be 0-100'); return; }

    try {
      await setDoc(doc(db, 'settings', 'global'), {
        reversalRate: val,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      window.adminSettings.reversalRate = val;
      console.log('[Settings] Reversal Rate saved:', val + '%');
      alert('Reversal Rate: ' + val + '%');
    } catch (err) {
      alert(err.message);
    }
  });
})();

// ============================================================
// 24. SETTINGS SAVE — Win Percent
// ============================================================

(function bindWinPercent() {
  var btn = document.getElementById('save-win-percent');
  var input = document.getElementById('win-percent-input');
  if (!btn || !input) return;

  btn.addEventListener('click', async function() {
    var val = parseInt(input.value);
    if (isNaN(val) || val < 0 || val > 100) { alert('Win % must be 0-100'); return; }

    try {
      await setDoc(doc(db, 'settings', 'global'), {
        winPercent: val,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      window.adminSettings.winPercent = val;
      window.adminWinPercent = val;
      console.log('[Settings] Win Percent saved:', val + '%');
      alert('Win %: ' + val + '%');
    } catch (err) {
      alert(err.message);
    }
  });
})();

// ============================================================
// 25. SETTINGS SAVE — Loss Percent
// ============================================================

(function bindLossPercent() {
  var btn = document.getElementById('save-loss-percent');
  var input = document.getElementById('loss-percent-input');
  if (!btn || !input) return;

  btn.addEventListener('click', async function() {
    var val = parseInt(input.value);
    if (isNaN(val) || val < 0 || val > 100) { alert('Loss % must be 0-100'); return; }

    try {
      await setDoc(doc(db, 'settings', 'global'), {
        lossPercent: val,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      window.adminSettings.lossPercent = val;
      window.adminLossPercent = val;
      console.log('[Settings] Loss Percent saved:', val + '%');
      alert('Loss %: ' + val + '%');
    } catch (err) {
      alert(err.message);
    }
  });
})();

// ============================================================
// 26. SETTINGS SAVE — Live Speed
// ============================================================

(function bindLiveSpeed() {
  var btn = document.getElementById('save-live-speed');
  var input = document.getElementById('live-speed-input');
  if (!btn || !input) return;

  btn.addEventListener('click', async function() {
    var val = parseInt(input.value);
    if (isNaN(val) || val < 100 || val > 5000) { alert('Speed 100-5000 ms'); return; }

    try {
      await setDoc(doc(db, 'settings', 'global'), {
        liveSpeed: val,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      window.adminSettings.liveSpeed = val;
      window.liveSpeed = val;
      console.log('[Settings] Live Speed saved:', val + 'ms');
      alert('Live Speed: ' + val + 'ms');
    } catch (err) {
      alert(err.message);
    }
  });
})();

// ============================================================
// 27. SETTINGS SAVE — Win Rate Target (legacy)
// ============================================================

(function bindWinRateTarget() {
  var btn = document.getElementById('save-win-rate-target');
  var input = document.getElementById('win-rate-target');
  if (!btn || !input) return;

  btn.addEventListener('click', async function() {
    var val = parseInt(input.value);
    if (isNaN(val) || val < 0 || val > 100) { alert('0-100'); return; }

    try {
      await setDoc(doc(db, 'settings', 'global'), {
        winRateTarget: val,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      alert('Win Rate Target: ' + val + '%');
    } catch (err) {
      alert(err.message);
    }
  });
})();

// ============================================================
// 28. AUTO 24/7 TOGGLE
// ============================================================

(function bindAuto24h() {
  var btn = document.getElementById('auto-24h-toggle');
  if (!btn) return;

  btn.addEventListener('click', async function() {
    var isActive = btn.classList.contains('active');
    var newState = !isActive;

    try {
      await setDoc(doc(db, 'settings', 'global'), {
        autoGenerate24h: newState,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      window.adminSettings.autoGenerate24h = newState;

      if (newState) {
        btn.classList.add('active');
        btn.textContent = 'Auto 24/7: ON';
        btn.style.background = '#00c853';
        btn.style.color = '#04121a';
      } else {
        btn.classList.remove('active');
        btn.textContent = 'Auto 24/7: OFF';
        btn.style.background = '';
        btn.style.color = '';
      }

      console.log('[Settings] Auto 24/7:', newState ? 'ON' : 'OFF');
      alert('Auto 24/7: ' + (newState ? 'ON' : 'OFF'));
    } catch (err) {
      alert(err.message);
    }
  });

  // Load current state
  (async function loadState() {
    try {
      var sDoc = await getDoc(doc(db, 'settings', 'global'));
      if (sDoc.exists()) {
        var d = sDoc.data();
        if (d.autoGenerate24h) {
          btn.classList.add('active');
          btn.textContent = 'Auto 24/7: ON';
          btn.style.background = '#00c853';
          btn.style.color = '#04121a';
        }
      }
    } catch(e) {}
  })();

  console.log('[Settings] Auto 24/7 toggle bound');
})();

// ============================================================
// 29. LISTEN WIN/LOSS SETTINGS (real-time)
// ============================================================

function listenWinLossSettings() {
  if (typeof db === 'undefined') return;

  try {
    if (settingsUnsub) { try { settingsUnsub(); } catch(e) {} }

    settingsUnsub = onSnapshot(doc(db, 'settings', 'global'), function(snap) {
      if (!snap.exists()) return;

      var d = snap.data();
      window.adminWinPercent = d.winPercent ?? 80;
      window.adminLossPercent = d.lossPercent ?? 30;
      window.liveSpeed = d.liveSpeed ?? 500;

      // Sync adminSettings
      window.adminSettings.winPercent = window.adminWinPercent;
      window.adminSettings.lossPercent = window.adminLossPercent;
      window.adminSettings.liveSpeed = window.liveSpeed;

      console.log(
        '[Settings] Live: Win ' + window.adminWinPercent + '% | ' +
        'Loss ' + window.adminLossPercent + '% | ' +
        'Speed ' + window.liveSpeed + 'ms'
      );
    });
  } catch (err) {
    console.error('[Settings] Listen error:', err.message);
  }
}

window.listenWinLossSettings = listenWinLossSettings;

console.log('[Settings] All listeners bound');

// ============================================================
// END PART 3 of 7
// ============================================================

console.log('===== admin.js v33-clean — PART 3/7 LOADED =====');
// ============================================================
// QUOTEX CLONE — admin.js v33-clean
// Part 4 of 7: Candle Scheduler — Bulk + Table + Save
// ============================================================

// ============================================================
// 30. CANDLE TABLE RENDER
// ============================================================

function renderCandleTable() {
  const tbody = document.getElementById('candle-table-body');
  if (!tbody) return;

  if (window.candleList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12" class="empty-text">No candles</td></tr>';
    if (typeof renderCandlePreview === 'function') renderCandlePreview();
    if (typeof renderDirectionTimeline === 'function') renderDirectionTimeline();
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
        '<button class="row-btn edit" data-i="' + i + '">E</button>' +
        '<button class="row-btn del" data-i="' + i + '">D</button>' +
        '<button class="row-btn copy" data-i="' + i + '">C</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  tbody.querySelectorAll('.row-btn.edit').forEach(b => b.onclick = () => editCandle(Number(b.dataset.i)));
  tbody.querySelectorAll('.row-btn.del').forEach(b => b.onclick = () => deleteCandle(Number(b.dataset.i)));
  tbody.querySelectorAll('.row-btn.copy').forEach(b => b.onclick = () => copyCandle(Number(b.dataset.i)));

  if (typeof renderCandlePreview === 'function') renderCandlePreview();
  if (typeof renderDirectionTimeline === 'function') renderDirectionTimeline();
}

// ============================================================
// 31. ADD CANDLE (single)
// ============================================================

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
      date: date,
      time: time,
      timeframe: document.getElementById('candle-timeframe')?.value || '1m',
      open: open.toFixed(2),
      high: high.toFixed(2),
      low: low.toFixed(2),
      close: close.toFixed(2),
      color: color,
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

// ============================================================
// 32. DELETE / EDIT / COPY CANDLE
// ============================================================

function deleteCandle(index) {
  if (!confirm('Delete candle #' + (index + 1) + '?')) return;
  window.candleList.splice(index, 1);
  renderCandleTable();
}

function editCandle(index) {
  const c = window.candleList[index];
  if (!c) return;

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

// ============================================================
// 33. CLEAR ALL CANDLES
// ============================================================

function clearCandles() {
  if (!confirm('Delete all candles?')) return;
  window.candleList = [];
  window.candleCounter = 0;
  renderCandleTable();
}

// ============================================================
// 34. BIND CANDLE BUTTONS
// ============================================================

function bindCandleButtons() {
  const add = document.getElementById('add-candle-btn');
  if (add && add.dataset.bound !== '1') {
    add.dataset.bound = '1';
    add.onclick = addCandle;
  }

  const clr = document.getElementById('clear-candles-btn');
  if (clr && clr.dataset.bound !== '1') {
    clr.dataset.bound = '1';
    clr.onclick = clearCandles;
  }

  renderCandleTable();
}

// ============================================================
// 35. BIND MARKET SELECT
// ============================================================

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

// ============================================================
// 36. LOAD CANDLES FROM FIRESTORE
// ============================================================

async function loadCandlesFromFirestore(marketId) {
  if (!marketId) return;
  console.log('Loading candles for market:', marketId);

  try {
    const candlesSnap = await getDocs(collection(db, 'markets', marketId, 'candles'));

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

// ============================================================
// 37. SAVE ALL CANDLES TO FIRESTORE
// ============================================================

async function saveAllCandles() {
  if (!window.currentMarketId) { alert('Select market first'); return; }
  if (window.candleList.length === 0) { alert('No candles'); return; }

  const confirmMsg = 'Market: ' + window.currentMarketId + '\n' +
    window.candleList.length + ' candles will be saved.\n\nOverwrite old?';
  if (!confirm(confirmMsg)) return;

  console.log('Saving', window.candleList.length, 'candles...');

  try {
    const oldSnap = await getDocs(collection(db, 'markets', window.currentMarketId, 'candles'));
    for (const d of oldSnap.docs) {
      await deleteDoc(doc(db, 'markets', window.currentMarketId, 'candles', d.id));
    }
    console.log('Deleted', oldSnap.size, 'old candles');

    for (let i = 0; i < window.candleList.length; i++) {
      const c = window.candleList[i];
      const candleId = 'c_' + String(i + 1).padStart(4, '0');
      const dir = c.direction || (Number(c.close) >= Number(c.open) ? 'up' : 'down');

      await setDoc(doc(db, 'markets', window.currentMarketId, 'candles', candleId), {
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

    await updateDoc(doc(db, 'markets', window.currentMarketId), {
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

// ============================================================
// 38. REFRESH CANDLES BUTTON
// ============================================================

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

// ============================================================
// 39. SAVE BUTTON
// ============================================================

function bindSaveButton() {
  const btn = document.getElementById('save-candles-btn');
  if (!btn || btn.dataset.bound === '1') return;

  btn.dataset.bound = '1';
  btn.addEventListener('click', saveAllCandles);
  console.log('Save button bound');
}

// ============================================================
// 40. BIND ALL (Part 6A init)
// ============================================================

function bindPart6A() {
  bindMarketSelect();
  bindRefreshCandles();
  bindSaveButton();
}

// ============================================================
// 41. BULK FORM VALIDATION
// ============================================================

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

// ============================================================
// 42. CONFIRM OVERWRITE
// ============================================================

async function confirmOverwrite() {
  if (!window.currentMarketId) { alert('Select market first'); return false; }

  try {
    const snap = await getDocs(collection(db, 'markets', window.currentMarketId, 'candles'));
    if (snap.size === 0) return true;
    return confirm('This market has ' + snap.size + ' candles. Overwrite?');
  } catch (err) {
    return true;
  }
}

// ============================================================
// 43. CLEAR CURRENT LIST
// ============================================================

function clearCurrentCandleList() {
  window.candleList = [];
  window.candleCounter = 0;
  renderCandleTable();
}

// ============================================================
// 44. PRICE MOVEMENT HELPERS
// ============================================================

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
    number: number,
    date: date,
    time: time,
    endTime: endTime,
    timeframe: timeframe,
    open: open.toFixed(2),
    high: high.toFixed(2),
    low: low.toFixed(2),
    close: close.toFixed(2),
    color: color,
    direction: direction,
    size: sizeType,
    wick: wickScaled.toFixed(0),
    body: bodyScaled.toFixed(0),
    up: 0,
    down: 0
  };
}

// ============================================================
// 45. BULK GENERATE
// ============================================================

async function bulkGenerateCandles() {
  console.log('Bulk Generate clicked');

  const form = validateBulkForm();
  if (!form) return;

  if (!window.currentMarketId) { alert('Select market first'); return; }

  const ok = await confirmOverwrite();
  if (!ok) return;

  const tfSeconds = window.timeframeToSeconds(form.tf);
  const patternLength = form.up + form.down + form.neutral;
  const sizeType = 'medium';

  console.log('Generating', form.count, 'candles');
  clearCurrentCandleList();

  const tempList = [];
  let prevClose = null;
  let upCount = 0, downCount = 0, neutralCount = 0;

  for (let i = 0; i < form.count; i++) {
    const timeInfo = window.calcCandleTime(form.startDate, form.startTime, i, tfSeconds);

    let direction = 'up';
    if (patternLength > 0) {
      const pos = i % patternLength;
      if (pos < form.up) direction = 'up';
      else if (pos < form.up + form.down) direction = 'down';
      else direction = 'neutral';
    }

    const candle = buildCandleWithPrice({
      number: i + 1,
      date: timeInfo.date,
      time: timeInfo.startTime,
      endTime: timeInfo.endTime,
      timeframe: form.tf,
      prevClose: prevClose,
      basePrice: form.base,
      direction: direction,
      wick: form.wick,
      body: form.body,
      sizeType: sizeType
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

  alert(tempList.length + ' candles generated!\n\n' +
    'UP: ' + upCount + ' | DOWN: ' + downCount + ' | NEUTRAL: ' + neutralCount +
    '\nPrice: $' + tempList[0].open + ' -> $' + tempList[tempList.length - 1].close);
}

// ============================================================
// 46. REBIND BULK GENERATE (removes old listeners)
// ============================================================

function rebindBulkGenerate() {
  const btn = document.getElementById('bulk-generate-btn');
  if (!btn) return;

  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', bulkGenerateCandles);
  console.log('Bulk Generate rebound');
}

// ============================================================
// 47. GLOBAL EXPOSE
// ============================================================

window.addCandle = addCandle;
window.clearCandles = clearCandles;
window.renderCandleTable = renderCandleTable;
window.saveAllCandles = saveAllCandles;
window.loadCandlesFromFirestore = loadCandlesFromFirestore;
window.bulkGenerateCandles = bulkGenerateCandles;
window.bindPart6A = bindPart6A;
window.bindCandleButtons = bindCandleButtons;
window.rebindBulkGenerate = rebindBulkGenerate;

console.log('[Scheduler] All exposed');

// ============================================================
// END PART 4 of 7
// ============================================================

console.log('===== admin.js v33-clean — PART 4/7 LOADED =====');
// ============================================================
// QUOTEX CLONE — admin.js v33-clean
// Part 5 of 7: Playback + Preview + Timeline
// ============================================================

// ============================================================
// 48. HIGHLIGHT ACTIVE ROW — CENTRALIZED (A1 FIX)
// ============================================================
// This is the ONLY place where highlightActiveRow is defined.
// No duplicate wraps. No infinite loops.

function highlightActiveRow() {
  // Highlight table row
  var tbody = document.getElementById('candle-table-body');
  if (tbody) {
    var rows = tbody.querySelectorAll('tr');
    rows.forEach(function(row, i) {
      if (i === window.playbackIndex) {
        row.style.background = 'rgba(255, 179, 0, 0.25)';
        row.style.borderLeft = '4px solid #ffb300';
        row.style.fontWeight = 'bold';
        try { row.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e) {}
      } else {
        row.style.background = '';
        row.style.borderLeft = '';
        row.style.fontWeight = '';
      }
    });
  }

  // Update status text
  var status = document.getElementById('playback-status');
  if (status) {
    var total = (window.candleList && window.candleList.length) || 0;
    status.textContent = 'Candle ' + (window.playbackIndex + 1) + ' / ' + total;
  }

  // Re-render preview + timeline (both once, clean)
  if (typeof renderCandlePreview === 'function') renderCandlePreview();
  if (typeof renderDirectionTimeline === 'function') renderDirectionTimeline();
}

// ============================================================
// 49. PLAYBACK CONTROLS
// ============================================================

function playbackPlay() {
  if (!window.candleList || window.candleList.length === 0) {
    alert('No candles to play');
    return;
  }

  if (window.playbackTimer) {
    console.log('Already playing');
    return;
  }

  console.log('Playback START from index', window.playbackIndex);

  if (window.playbackIndex >= window.candleList.length - 1) {
    window.playbackIndex = 0;
  }

  highlightActiveRow();

  window.playbackTimer = setInterval(function() {
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
  if (!window.candleList || window.candleList.length === 0) return;
  if (window.playbackIndex < window.candleList.length - 1) {
    window.playbackIndex++;
    highlightActiveRow();
    console.log('Skip -> candle', window.playbackIndex + 1);
  }
}

function playbackBack() {
  if (!window.candleList || window.candleList.length === 0) return;
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

// ============================================================
// 50. BIND PLAYBACK BUTTONS
// ============================================================

function bindPlaybackButtons() {
  var playBtn = document.getElementById('play-btn');
  var pauseBtn = document.getElementById('pause-btn');
  var skipBtn = document.getElementById('skip-btn');
  var backBtn = document.getElementById('back-btn');
  var resetBtn = document.getElementById('reset-btn');

  if (playBtn && playBtn.dataset.bound !== '1') {
    playBtn.dataset.bound = '1';
    playBtn.onclick = playbackPlay;
  }
  if (pauseBtn && pauseBtn.dataset.bound !== '1') {
    pauseBtn.dataset.bound = '1';
    pauseBtn.onclick = playbackPause;
  }
  if (skipBtn && skipBtn.dataset.bound !== '1') {
    skipBtn.dataset.bound = '1';
    skipBtn.onclick = playbackSkip;
  }
  if (backBtn && backBtn.dataset.bound !== '1') {
    backBtn.dataset.bound = '1';
    backBtn.onclick = playbackBack;
  }
  if (resetBtn && resetBtn.dataset.bound !== '1') {
    resetBtn.dataset.bound = '1';
    resetBtn.onclick = playbackReset;
  }

  console.log('Playback buttons bound');
}

// ============================================================
// 51. BIND SPEED SELECTOR
// ============================================================

function bindSpeedSelector() {
  var sel = document.getElementById('playback-speed');
  if (!sel || sel.dataset.bound === '1') return;

  sel.dataset.bound = '1';
  sel.addEventListener('change', function() {
    playbackSetSpeed(parseInt(sel.value));
  });

  console.log('Speed selector bound');
}

// ============================================================
// 52. RENDER CANDLE PREVIEW
// ============================================================

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

  slice.forEach(function(c) {
    const h = Number(c.high || 0);
    const l = Number(c.low || 0);
    if (h > maxPrice) maxPrice = h;
    if (l < minPrice) minPrice = l;
  });

  if (maxPrice === minPrice) maxPrice = minPrice + 1;
  const range = maxPrice - minPrice;
  const CHART_HEIGHT = 180;

  const barsHTML = slice.map(function(c, idx) {
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

  container.querySelectorAll('.pv-candle').forEach(function(el) {
    el.onclick = function() {
      const idx = Number(el.dataset.idx);
      window.playbackIndex = idx;
      highlightActiveRow();
    };
  });
}

// ============================================================
// 53. RENDER DIRECTION TIMELINE
// ============================================================

function renderDirectionTimeline() {
  const container = document.getElementById('direction-timeline');
  if (!container) return;

  const list = window.candleList || [];

  if (list.length === 0) {
    container.innerHTML = '<span class="empty-text">No timeline data</span>';
    return;
  }

  let upCount = 0, downCount = 0, neutralCount = 0;

  list.forEach(function(c) {
    const dir = c.direction || (Number(c.close) >= Number(c.open) ? 'up' : 'down');
    if (dir === 'up') upCount++;
    else if (dir === 'down') downCount++;
    else neutralCount++;
  });

  const blocks = [];
  let currentBlock = null;

  list.forEach(function(c, i) {
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

  const blocksHTML = blocks.map(function(block) {
    const colorClass = block.dir === 'up' ? 'tl-up' :
                       block.dir === 'down' ? 'tl-down' : 'tl-neutral';

    const squaresHTML = block.candles.map(function(cIdx) {
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

  container.querySelectorAll('.tl-square').forEach(function(el) {
    el.onclick = function() {
      const idx = Number(el.dataset.idx);
      window.playbackIndex = idx;
      highlightActiveRow();
    };
  });
}

// ============================================================
// 54. EXPOSE
// ============================================================

window.highlightActiveRow = highlightActiveRow;
window.playbackPlay = playbackPlay;
window.playbackPause = playbackPause;
window.playbackSkip = playbackSkip;
window.playbackBack = playbackBack;
window.playbackReset = playbackReset;
window.playbackSetSpeed = playbackSetSpeed;
window.bindPlaybackButtons = bindPlaybackButtons;
window.bindSpeedSelector = bindSpeedSelector;
window.renderCandlePreview = renderCandlePreview;
window.renderDirectionTimeline = renderDirectionTimeline;

console.log('[Playback/Preview/Timeline] All exposed');

// ============================================================
// END PART 5 of 7
// ============================================================

console.log('===== admin.js v33-clean — PART 5/7 LOADED =====');
// ============================================================
// QUOTEX CLONE — admin.js v33-clean
// Part 6 of 7: Candle Mode + Auto Mode + Export/Import
// ============================================================

// ============================================================
// 55. CANDLE MODE INFO MAP
// ============================================================

window.CANDLE_MODE_INFO = {
  locked:   '<strong>LOCKED:</strong> Admin-er save kora candle user-er kache exact jabe.',
  random:   '<strong>RANDOM:</strong> Prottek candle randomly generate hobe (up/down/neutral).',
  mixed:    '<strong>MIXED:</strong> Locked candle thakbe, kintu win rate target maintain hobe.',
  schedule: '<strong>SCHEDULE:</strong> Time-based candle generate hobe (schedule onujayi).'
};

// ============================================================
// 56. UPDATE MODE INFO
// ============================================================

function updateCandleModeInfo(mode) {
  const infoEl = document.getElementById('candle-mode-info');
  if (!infoEl) {
    console.warn('[Mode] candle-mode-info element not found');
    return;
  }
  infoEl.innerHTML = window.CANDLE_MODE_INFO[mode] || '';
}

// ============================================================
// 57. UPDATE MODE BUTTONS
// ============================================================

function updateCandleModeButtons(mode) {
  const buttons = document.querySelectorAll('.mode-btn[data-mode]');
  if (!buttons.length) return;

  buttons.forEach(function(btn) {
    if (!btn) return;
    if (btn.getAttribute('data-mode') === mode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// ============================================================
// 58. SET CANDLE MODE (main entry)
// ============================================================

function setCandleMode(mode, skipSave) {
  const validModes = ['locked', 'random', 'mixed', 'schedule'];
  if (validModes.indexOf(mode) === -1) {
    console.error('[Mode] Invalid mode:', mode);
    return;
  }

  const oldMode = window.candleMode;

  // Update both sources (A4 FIX: keep them synced)
  window.candleMode = mode;
  window.adminSettings.candleMode = mode;

  updateCandleModeButtons(mode);
  updateCandleModeInfo(mode);

  console.log('[Mode] Switched: ' + oldMode + ' -> ' + mode);

  if (!skipSave) {
    saveCandleModeToFirestore(mode);
  }
}

// ============================================================
// 59. SAVE MODE TO FIRESTORE
// ============================================================

async function saveCandleModeToFirestore(mode) {
  try {
    await setDoc(
      doc(db, 'settings', 'global'),
      { candleMode: mode, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    console.log('[Mode] Saved to Firestore:', mode);
  } catch (err) {
    console.error('[Mode] Firestore save error:', err.message);
  }
}

// ============================================================
// 60. LOAD MODE FROM FIRESTORE
// ============================================================

async function loadCandleModeFromFirestore() {
  try {
    const docSnap = await getDoc(doc(db, 'settings', 'global'));

    if (docSnap.exists()) {
      const data = docSnap.data();
      const savedMode = data.candleMode || 'locked';
      console.log('[Mode] Loaded from Firestore:', savedMode);
      setCandleMode(savedMode, true);
    } else {
      console.log('[Mode] No settings doc, using default: locked');
      setCandleMode('locked', true);
    }
  } catch (err) {
    console.error('[Mode] Load error:', err.message);
    setCandleMode('locked', true);
  }
}

// ============================================================
// 61. BIND MODE BUTTONS
// ============================================================

function bindCandleModeButtons() {
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

      // Stop auto mode before switching
      if (window.autoModeActive === true) {
        console.log('[Mode] Auto Mode running - stopping before mode switch');
        stopAutoMode();
      }

      setCandleMode(mode);
    });
  });

  console.log('[Mode] Bound ' + buttons.length + ' mode buttons');
}

// ============================================================
// 62. INIT MODE UI
// ============================================================

function initCandleModeUI() {
  console.log('[Mode] Initializing Mode UI...');

  bindCandleModeButtons();
  updateCandleModeButtons(window.candleMode);
  updateCandleModeInfo(window.candleMode);

  console.log('[Mode] Init complete. Current mode:', window.candleMode);

  setTimeout(function() {
    if (window.currentAdmin) {
      loadCandleModeFromFirestore();
    }
  }, 1500);
}

// ============================================================
// 63. AUTO MODE STATE
// ============================================================

window.autoModeMaxCandles = 500;

// ============================================================
// 64. AUTO GENERATE ONE CANDLE
// ============================================================

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
  const tfSeconds = window.timeframeToSeconds(tf);
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
  } else if (mode === 'mixed' || mode === 'schedule') {
    if (patternLength > 0) {
      const pos = idx % patternLength;
      if (pos < upDuration) direction = 'up';
      else direction = 'down';
    }
    console.log('Auto: ' + mode.toUpperCase() + ' mode - direction:', direction);
  }

  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().slice(0, 8);
  const endTimeSec = window.timeToSeconds(timeStr) + tfSeconds;
  const endTimeStr = window.secondsToTime(endTimeSec);

  const prevClose = lastCandle ? parseFloat(lastCandle.close) : null;

  const candle = buildCandleWithPrice({
    number: idx + 1,
    date: date,
    time: timeStr,
    endTime: endTimeStr,
    timeframe: tf,
    prevClose: prevClose,
    basePrice: basePrice,
    direction: direction,
    wick: wick,
    body: body,
    sizeType: 'medium'
  });

  candle.up = upDuration;
  candle.down = downDuration;

  window.candleList.push(candle);
  window.candleCounter = window.candleList.length;

  renderCandleTable();
  console.log('Auto-generated candle #' + candle.number + ' (' + direction + ') price: ' + candle.close);
}

// ============================================================
// 65. START AUTO MODE
// ============================================================

function startAutoMode() {
  if (window.autoModeActive) return;
  if (!window.currentMarketId) { alert('Select a market first'); return; }

  window.autoModeActive = true;
  console.log('Auto Mode STARTED with interval', window.autoModeInterval, 'ms');

  if (window.playbackTimer) playbackPause();

  autoGenerateOneCandle();

  window.autoModeTimer = setInterval(function() {
    autoGenerateOneCandle();
  }, window.autoModeInterval);

  updateAutoModeUI();
}

// ============================================================
// 66. STOP AUTO MODE
// ============================================================

function stopAutoMode() {
  if (!window.autoModeActive) return;

  if (window.autoModeTimer) {
    clearInterval(window.autoModeTimer);
    window.autoModeTimer = null;
  }

  window.autoModeActive = false;
  console.log('Auto Mode STOPPED');
  updateAutoModeUI();
}

// ============================================================
// 67. TOGGLE AUTO MODE
// ============================================================

function toggleAutoMode() {
  if (window.autoModeActive) stopAutoMode();
  else startAutoMode();
}

// ============================================================
// 68. SET AUTO MODE INTERVAL
// ============================================================

function setAutoModeInterval(ms) {
  window.autoModeInterval = ms;
  console.log('Auto interval set to', ms, 'ms');

  if (window.autoModeActive) {
    stopAutoMode();
    startAutoMode();
  }
}

// ============================================================
// 69. UPDATE AUTO MODE UI
// ============================================================

function updateAutoModeUI() {
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

// ============================================================
// 70. BIND AUTO MODE
// ============================================================

function bindAutoMode() {
  const btn = document.getElementById('auto-mode-toggle');
  if (btn && btn.dataset.boundAuto !== '1') {
    btn.dataset.boundAuto = '1';
    btn.onclick = function(e) {
      e.preventDefault();
      toggleAutoMode();
    };
    console.log('Auto Mode toggle bound');
  }

  // Speed selector (create if missing)
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
    sel.onchange = function() {
      setAutoModeInterval(parseInt(sel.value));
    };
    console.log('Auto Mode speed selector bound');
  }
}

// ============================================================
// 71. EXPORT CANDLES AS JSON
// ============================================================

function exportCandles() {
  console.log('[Export] Starting...');

  if (!window.candleList || window.candleList.length === 0) {
    alert('No candles to export. Generate or load candles first.');
    return;
  }

  try {
    const exportData = {
      version: '33',
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

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

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
}

// ============================================================
// 72. IMPORT CANDLES FROM JSON
// ============================================================

function importCandles() {
  console.log('[Import] Opening file picker...');

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

  fileInput.onchange = async function(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      console.log('[Import] No file selected');
      return;
    }

    console.log('[Import] File selected: ' + file.name + ' (' + file.size + ' bytes)');

    try {
      const text = await file.text();
      console.log('[Import] File read, length: ' + text.length);

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        throw new Error('Invalid JSON file: ' + parseErr.message);
      }

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

      const confirmMsg = 'Import ' + data.candles.length + ' candles?\n\n' +
        'From: ' + (data.marketId || 'unknown') + '\n' +
        'Exported: ' + (data.exportedAt || 'unknown') + '\n\n' +
        'This will REPLACE current ' + (window.candleList ? window.candleList.length : 0) + ' candles.';

      if (!confirm(confirmMsg)) {
        console.log('[Import] Cancelled by user');
        return;
      }

      const validCandles = [];
      let invalidCount = 0;

      for (let i = 0; i < data.candles.length; i++) {
        const c = data.candles[i];
        if (!c || typeof c !== 'object') { invalidCount++; continue; }

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

      window.candleList = validCandles;
      window.candleCounter = validCandles.length;
      renderCandleTable();

      if (data.marketId && data.marketId !== 'unknown') {
        const sel = document.getElementById('candle-market-select');
        if (sel) {
          let found = false;
          for (let i = 0; i < sel.options.length; i++) {
            if (sel.options[i].value === data.marketId) {
              sel.value = data.marketId;
              window.currentMarketId = data.marketId;
              found = true;
              break;
            }
          }
          if (found) console.log('[Import] Auto-selected market: ' + data.marketId);
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
      fileInput.value = '';
    }
  };

  fileInput.click();
}

// ============================================================
// 73. BIND EXPORT/IMPORT
// ============================================================

function bindExportImport() {
  const exportBtn = document.getElementById('export-candles-btn');
  if (exportBtn && exportBtn.dataset.bound !== '1') {
    exportBtn.dataset.bound = '1';
    exportBtn.onclick = function(e) {
      e.preventDefault();
      console.log('[Export] Button clicked');
      exportCandles();
    };
    console.log('[Export] Button bound');
  }

  const importBtn = document.getElementById('import-candles-btn');
  if (importBtn && importBtn.dataset.bound !== '1') {
    importBtn.dataset.bound = '1';
    importBtn.onclick = function(e) {
      e.preventDefault();
      console.log('[Import] Button clicked');
      importCandles();
    };
    console.log('[Import] Button bound');
  }
}

// ============================================================
// 74. EXPOSE
// ============================================================

window.setCandleMode = setCandleMode;
window.bindCandleModeButtons = bindCandleModeButtons;
window.initCandleModeUI = initCandleModeUI;
window.saveCandleModeToFirestore = saveCandleModeToFirestore;
window.loadCandleModeFromFirestore = loadCandleModeFromFirestore;
window.updateCandleModeButtons = updateCandleModeButtons;
window.updateCandleModeInfo = updateCandleModeInfo;

window.startAutoMode = startAutoMode;
window.stopAutoMode = stopAutoMode;
window.toggleAutoMode = toggleAutoMode;
window.setAutoModeInterval = setAutoModeInterval;
window.autoGenerateOneCandle = autoGenerateOneCandle;
window.bindAutoMode = bindAutoMode;

window.exportCandles = exportCandles;
window.importCandles = importCandles;
window.bindExportImport = bindExportImport;

console.log('[Mode + Auto + Export/Import] All exposed');

// ============================================================
// END PART 6 of 7
// ============================================================

console.log('===== admin.js v33-clean — PART 6/7 LOADED =====');
// ============================================================
// QUOTEX CLONE — admin.js v33-clean
// Part 7 of 7: Debug + Test + MSG11-18 + Phase 1 SMART
// ============================================================

// ============================================================
// 75. DEBUG SYSTEM
// ============================================================

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
        '<button id="debug-run-tests-btn" style="background:linear-gradient(135deg,#00c853 0%,#00a844 100%);color:#fff;border:none;border-radius:4px;padding:4px 8px;font-size:10px;margin-right:4px;cursor:pointer;font-weight:bold;">Run Tests</button>' +
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
        alert('Logs copied! (' + window.debugLogs.length + ' entries)');
      }).catch(function() {
        alert('Copy failed. Total: ' + window.debugLogs.length);
      });
    } else {
      alert('Clipboard not available. Total: ' + window.debugLogs.length);
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

  document.getElementById('debug-run-tests-btn').onclick = function() {
    window.runTests();
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

  if (open) window.renderDebugPanel();
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

  btn.onclick = function() { window.toggleDebugPanel(); };
  document.body.appendChild(btn);
};

// Global error handlers
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
  let msg = 'Unhandled Promise: ';
  if (reason instanceof Error) msg += reason.message;
  else if (typeof reason === 'string') msg += reason;
  else {
    try { msg += JSON.stringify(reason); } catch (e) { msg += String(reason); }
  }
  window.addDebugLog('error', msg);
});

// Console forwarding (light version)
(function() {
  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  console.log = function() {
    try {
      const msg = Array.prototype.slice.call(arguments).map(function(a) {
        if (typeof a === 'string') return a;
        if (typeof a === 'object') {
          try { return JSON.stringify(a); } catch (e) { return String(a); }
        }
        return String(a);
      }).join(' ');
      window.addDebugLog('info', msg);
    } catch(e) {}
    origLog.apply(console, arguments);
  };

  console.warn = function() {
    try {
      const msg = Array.prototype.slice.call(arguments).map(function(a) {
        if (typeof a === 'string') return a;
        if (typeof a === 'object') {
          try { return JSON.stringify(a); } catch (e) { return String(a); }
        }
        return String(a);
      }).join(' ');
      window.addDebugLog('warn', msg);
    } catch(e) {}
    origWarn.apply(console, arguments);
  };

  console.error = function() {
    try {
      const msg = Array.prototype.slice.call(arguments).map(function(a) {
        if (typeof a === 'string') return a;
        if (a instanceof Error) return a.message;
        if (typeof a === 'object') {
          try { return JSON.stringify(a); } catch (e) { return String(a); }
        }
        return String(a);
      }).join(' ');
      window.addDebugLog('error', msg);
    } catch(e) {}
    origError.apply(console, arguments);
  };
})();

console.log('Part 7 Debug System ready');

// ============================================================
// 76. TEST SYSTEM
// ============================================================

window.recordTest = function(name, status, details) {
  window.testResults.total++;
  if (status === 'pass') window.testResults.pass++;
  else if (status === 'fail') window.testResults.fail++;
  else window.testResults.warn++;

  window.testResults.tests.push({
    name: name, status: status, details: details || ''
  });
};

window.runTests = function() {
  console.log('===== RUN TESTS START =====');
  if (window.addDebugLog) window.addDebugLog('info', '===== RUN TESTS START =====');

  window.testResults = { total: 0, pass: 0, fail: 0, warn: 0, tests: [] };

  // Elements check
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
    if (el) window.recordTest('Element #' + id, 'pass');
    else { window.recordTest('Element #' + id, 'fail', 'MISSING'); missingIds.push(id); }
  });

  if (missingIds.length === 0) console.log('[ELEMENTS] All ' + requiredIds.length + ' elements found');
  else console.warn('[ELEMENTS] Missing: ' + missingIds.join(', '));

  // Mode buttons
  var modeBtns = document.querySelectorAll('.mode-btn[data-mode]');
  if (modeBtns.length === 4) window.recordTest('4 Mode Buttons', 'pass');
  else window.recordTest('4 Mode Buttons', 'fail', 'Found: ' + modeBtns.length);

  // Functions
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
    if (typeof window[fn] === 'function') window.recordTest('Function ' + fn, 'pass');
    else { window.recordTest('Function ' + fn, 'fail', 'MISSING'); missingFns.push(fn); }
  });

  if (missingFns.length === 0) console.log('[FUNCTIONS] All ' + requiredFns.length + ' loaded');
  else console.warn('[FUNCTIONS] Missing: ' + missingFns.join(', '));

  // State
  var stateChecks = [
    { name: 'window.adminSettings', val: window.adminSettings },
    { name: 'window.candleList', val: window.candleList },
    { name: 'window.candleMode', val: window.candleMode },
    { name: 'window.autoModeInterval', val: window.autoModeInterval },
    { name: 'window.playbackSpeed', val: window.playbackSpeed },
    { name: 'window.debugLogs', val: window.debugLogs }
  ];

  stateChecks.forEach(function(c) {
    if (c.val === undefined) window.recordTest('State ' + c.name, 'warn', 'undefined');
    else window.recordTest('State ' + c.name, 'pass');
  });

  // Firebase
  if (window.db) window.recordTest('Firebase db exposed', 'pass');
  else window.recordTest('Firebase db exposed', 'fail', 'window.db undefined');

  if (window.auth) window.recordTest('Firebase auth exposed', 'pass');
  else window.recordTest('Firebase auth exposed', 'fail', 'window.auth undefined');

  // Summary
  var summary = 'PASS: ' + window.testResults.pass +
    ' | FAIL: ' + window.testResults.fail +
    ' | WARN: ' + window.testResults.warn +
    ' | TOTAL: ' + window.testResults.total;

  console.log(summary);
  if (window.addDebugLog) {
    if (window.testResults.fail > 0) window.addDebugLog('error', '[Tests] ' + summary);
    else window.addDebugLog('success', '[Tests] ' + summary);
  }

  var alertMsg = 'TEST RESULTS\n\n' +
    'Total: ' + window.testResults.total + '\n' +
    'Pass: ' + window.testResults.pass + '\n' +
    'Fail: ' + window.testResults.fail + '\n' +
    'Warn: ' + window.testResults.warn + '\n\n';

  if (window.testResults.fail === 0) alertMsg += 'ALL TESTS PASSED!';
  else {
    alertMsg += 'Check Debug Panel for failures.';
    var fails = window.testResults.tests.filter(function(t) { return t.status === 'fail'; });
    fails.forEach(function(f) {
      if (window.addDebugLog) window.addDebugLog('error', '[FAIL] ' + f.name + ' - ' + f.details);
    });
  }

  alert(alertMsg);
  return window.testResults;
};

console.log('Part 7 Test System ready');

// ============================================================
// 77. LIVE MOVEMENT + AUTO CANDLE + ANALYSIS (MSG11)
// ============================================================

function startLiveMovement() {
  if (window.liveMovementInterval) clearInterval(window.liveMovementInterval);

  window.liveMovementInterval = setInterval(function() {
    if (typeof candleSeries === 'undefined' || !candleSeries) return;
    if (typeof currentPrice === 'undefined') return;

    var drift = (Math.random() - 0.5) * 30;
    currentPrice = Math.max(100, currentPrice + drift);
    window.currentPrice = currentPrice;

    if (typeof currentPriceEl !== 'undefined' && currentPriceEl) {
      currentPriceEl.textContent = currentPrice.toFixed(2);
      currentPriceEl.style.color = drift >= 0 ? '#00c853' : '#ff5252';
    }

    var now = Math.floor(Date.now() / 1000);
    var candleTime = Math.floor(now / 60) * 60;

    if (candleTime > window.currentCandleTime) {
      window.currentCandleTime = candleTime;
      window.currentCandleOpen = currentPrice;
    }

    try {
      candleSeries.update({
        time: window.currentCandleTime,
        open: window.currentCandleOpen,
        high: Math.max(window.currentCandleOpen, currentPrice) + Math.random() * 5,
        low: Math.min(window.currentCandleOpen, currentPrice) - Math.random() * 5,
        close: currentPrice
      });
    } catch(e) {}
  }, 500);

  console.log('[MSG11] Live movement started');
}

function startAutoCandleGeneration() {
  if (window.autoCandleInterval) clearInterval(window.autoCandleInterval);

  window.autoCandleInterval = setInterval(function() {
    if (typeof candleSeries === 'undefined' || !candleSeries) return;
    if (!window.currentAdmin) return;

    var mode = window.candleMode || 'random';
    if (mode === 'locked') return;

    var now = Math.floor(Date.now() / 1000);
    var candleTime = Math.floor(now / 60) * 60;
    var openP = currentPrice;
    var move = (Math.random() - 0.5) * 200;
    var closeP = openP + move;

    try {
      candleSeries.update({
        time: candleTime,
        open: openP,
        high: Math.max(openP, closeP) + Math.random() * 50,
        low: Math.min(openP, closeP) - Math.random() * 50,
        close: closeP
      });
      currentPrice = closeP;
      window.currentPrice = closeP;
      window.currentCandleTime = candleTime;
      window.currentCandleOpen = closeP;
    } catch(e) {}
  }, 60000);

  console.log('[MSG11] Auto candle generation started');
}

async function analyzeActiveTrades() {
  if (!window.currentAdmin) return;

  try {
    var q = query(collection(db, 'trades'), where('status', '==', 'pending'));
    var snap = await getDocs(q);

    if (snap.empty) {
      window.tradeAnalysis = {
        totalCall: 0, totalPut: 0, callCount: 0, putCount: 0,
        callUsers: [], putUsers: [], suggestedDirection: 'neutral'
      };
      return;
    }

    var callTotal = 0, putTotal = 0, callCount = 0, putCount = 0;
    var callUsers = [], putUsers = [];

    snap.forEach(function(d) {
      var t = d.data();
      if (t.type === 'call') {
        callTotal += t.amount;
        callCount++;
        callUsers.push({ id: d.id, userId: t.userId, amount: t.amount });
      } else if (t.type === 'put') {
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
      suggestedDirection: callTotal > putTotal ? 'down' : (putTotal > callTotal ? 'up' : 'neutral')
    };

    // Update live counter UI (if Phase 1 UI exists)
    if (typeof updateLiveCounterUI === 'function') updateLiveCounterUI();
  } catch (err) {
    console.error('[Analyzer] Error:', err.message);
  }
}

function startTradeAnalysis() {
  if (window.analyzerInterval) clearInterval(window.analyzerInterval);
  window.analyzerInterval = setInterval(analyzeActiveTrades, 2000);
  console.log('[MSG11] Trade analyzer started');
}

console.log('Part 7 MSG11 loaded');

// ============================================================
// 78. FUTURE CANDLE DESIGNER (MSG13)
// ============================================================

function bindDesignerSave() {
  var btn = document.getElementById('designer-save-btn');
  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';

  btn.addEventListener('click', async function() {
    var marketId = document.getElementById('designer-market-select').value;
    if (!marketId) { alert('Select market first'); return; }

    var data = {
      direction: document.getElementById('designer-direction').value,
      type: document.getElementById('designer-type').value,
      bodySize: parseInt(document.getElementById('designer-body').value) || 60,
      wickLength: parseInt(document.getElementById('designer-wick').value) || 20,
      open: parseFloat(document.getElementById('designer-open').value) || 50000,
      close: parseFloat(document.getElementById('designer-close').value) || 50100,
      high: parseFloat(document.getElementById('designer-high').value) || 50150,
      low: parseFloat(document.getElementById('designer-low').value) || 49950,
      savedAt: new Date().toISOString()
    };

    if (data.close > data.open) data.direction = 'up';
    else if (data.close < data.open) data.direction = 'down';
    else data.direction = 'neutral';

    try {
      await setDoc(doc(db, 'markets', marketId), {
        designerCandle: data,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      alert('Designer saved for ' + marketId);
    } catch(err) {
      alert(err.message);
    }
  });
}

function bindDesignerApply() {
  var btn = document.getElementById('designer-apply-btn');
  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';

  btn.addEventListener('click', async function() {
    var marketId = document.getElementById('designer-market-select').value;
    if (!marketId) { alert('Select market first'); return; }

    var data = {
      direction: document.getElementById('designer-direction').value,
      type: document.getElementById('designer-type').value,
      bodySize: parseInt(document.getElementById('designer-body').value) || 60,
      wickLength: parseInt(document.getElementById('designer-wick').value) || 20,
      open: parseFloat(document.getElementById('designer-open').value) || 50000,
      close: parseFloat(document.getElementById('designer-close').value) || 50100,
      high: parseFloat(document.getElementById('designer-high').value) || 50150,
      low: parseFloat(document.getElementById('designer-low').value) || 49950,
      applyToNext: true,
      appliedAt: new Date().toISOString()
    };

    if (data.close > data.open) data.direction = 'up';
    else if (data.close < data.open) data.direction = 'down';
    else data.direction = 'neutral';

    try {
      await setDoc(doc(db, 'markets', marketId), {
        designerCandle: data,
        applyNextAt: Date.now(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      alert('Next candle will use your design!');
    } catch(err) {
      alert(err.message);
    }
  });
}

function bindDesignerReset() {
  var btn = document.getElementById('designer-reset-btn');
  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';

  btn.addEventListener('click', function() {
    document.getElementById('designer-direction').value = 'up';
    document.getElementById('designer-type').value = 'medium';
    document.getElementById('designer-body').value = 60;
    document.getElementById('designer-wick').value = 20;
    document.getElementById('designer-open').value = 50000;
    document.getElementById('designer-close').value = 50100;
    document.getElementById('designer-high').value = 50150;
    document.getElementById('designer-low').value = 49950;
    alert('Designer reset');
  });
}

console.log('Part 7 Designer loaded');

// ============================================================
// 79. ADMIN CHAT (MSG14)
// ============================================================

function loadChatUsers() {
  var container = document.getElementById('chat-user-list');
  if (!container) return;

  try {
    onSnapshot(collection(db, 'users'), function(snap) {
      var users = [];
      snap.forEach(function(d) {
        var u = d.data();
        if (u.role !== 'admin') {
          users.push({ id: d.id, email: u.email || 'no-email' });
        }
      });

      users.sort(function(a, b) {
        return (a.email || '').localeCompare(b.email || '');
      });

      window.chatAllUsers = users;

      container.innerHTML = '';
      if (users.length === 0) {
        container.innerHTML = '<p class="loading-text">No users</p>';
        return;
      }

      users.forEach(function(u) {
        var div = document.createElement('div');
        div.className = 'chat-user-item';
        div.dataset.uid = u.id;
        div.textContent = u.email;
        if (window.chatUnreadCounts[u.id] > 0) {
          var dot = document.createElement('span');
          dot.className = 'unread-dot';
          div.appendChild(dot);
        }
        div.onclick = function() { selectChatUser(u.id, u.email); };
        container.appendChild(div);
      });

      console.log('[Chat] Users loaded:', users.length);
    });
  } catch (err) {
    console.error('[Chat] Users error:', err.message);
  }
}

function selectChatUser(userId, userEmail) {
  window.chatCurrentUserId = userId;

  var headerEl = document.getElementById('chat-current-user');
  if (headerEl) headerEl.textContent = userEmail;

  document.querySelectorAll('.chat-user-item').forEach(function(el) {
    el.classList.toggle('active', el.dataset.uid === userId);
  });

  window.chatUnreadCounts[userId] = 0;

  if (window.chatMessagesUnsub) {
    window.chatMessagesUnsub();
    window.chatMessagesUnsub = null;
  }

  var messagesEl = document.getElementById('chat-messages');
  if (!messagesEl) return;
  messagesEl.innerHTML = '<p class="empty-text">Loading messages...</p>';

  try {
    var q = query(
      collection(db, 'chats', userId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    window.chatMessagesUnsub = onSnapshot(q, function(snap) {
      messagesEl.innerHTML = '';
      if (snap.empty) {
        messagesEl.innerHTML = '<p class="empty-text">No messages yet</p>';
        return;
      }

      snap.forEach(function(d) {
        var m = d.data();
        var div = document.createElement('div');
        div.className = 'chat-msg ' + (m.from === 'admin' ? 'from-admin' : 'from-user');

        var textNode = document.createTextNode(m.text || '');
        div.appendChild(textNode);

        var timeSpan = document.createElement('span');
        timeSpan.className = 'chat-msg-time';
        var ts = m.timestamp ? new Date(m.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-';
        timeSpan.textContent = ts;
        div.appendChild(timeSpan);

        messagesEl.appendChild(div);
      });

      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  } catch (err) {
    console.error('[Chat] Messages error:', err.message);
    messagesEl.innerHTML = '<p class="empty-text">Error: ' + err.message + '</p>';
  }
}

async function sendChatMessage() {
  if (!window.chatCurrentUserId) { alert('Select a user first'); return; }

  var input = document.getElementById('chat-input');
  if (!input) return;
  var text = input.value.trim();
  if (!text) return;

  input.value = '';

  try {
    await addDoc(collection(db, 'chats', window.chatCurrentUserId, 'messages'), {
      from: 'admin',
      text: text,
      timestamp: new Date().toISOString()
    });

    console.log('[Chat] Sent to:', window.chatCurrentUserId);
  } catch (err) {
    console.error('[Chat] Send error:', err.message);
    alert('Send failed: ' + err.message);
  }
}

function bindChatSend() {
  var sendBtn = document.getElementById('chat-send-btn');
  if (sendBtn && sendBtn.dataset.bound !== '1') {
    sendBtn.dataset.bound = '1';
    sendBtn.onclick = sendChatMessage;
  }

  var input = document.getElementById('chat-input');
  if (input && input.dataset.bound !== '1') {
    input.dataset.bound = '1';
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }
}

console.log('Part 7 Chat loaded');

// ============================================================
// 80. TOURNAMENTS (MSG18)
// ============================================================

function bindTourCreate() {
  var btn = document.getElementById('tour-create-btn');
  if (!btn || btn.dataset.boundTour === '1') return;
  btn.dataset.boundTour = '1';

  btn.addEventListener('click', async function () {
    var name = document.getElementById('tour-name').value.trim();
    var entryFee = parseFloat(document.getElementById('tour-entry-fee').value) || 0;
    var prizePool = parseFloat(document.getElementById('tour-prize-pool').value) || 100;
    var maxPlayers = parseInt(document.getElementById('tour-max-players').value) || 50;
    var startInMin = parseInt(document.getElementById('tour-start-in').value) || 60;
    var durationMin = parseInt(document.getElementById('tour-duration').value) || 60;
    var status = document.getElementById('tour-status').value;

    if (!name) { alert('Tournament name required'); return; }
    if (entryFee < 0) { alert('Entry fee must be >= 0'); return; }

    var now = Date.now();
    var startTime = now + startInMin * 60 * 1000;
    var endTime = startTime + durationMin * 60 * 1000;

    try {
      var tourId = 'tour_' + now;
      await setDoc(doc(db, 'tournaments', tourId), {
        id: tourId,
        name: name,
        entryFee: entryFee,
        prizePool: prizePool,
        maxPlayers: maxPlayers,
        currentPlayers: 0,
        startTime: startTime,
        endTime: endTime,
        status: status,
        createdAt: new Date().toISOString(),
        createdBy: window.currentAdmin ? window.currentAdmin.email : 'admin'
      });

      console.log('[Tournament] Created:', tourId);
      alert('Tournament "' + name + '" created!');

      document.getElementById('tour-name').value = '';
    } catch (err) {
      console.error('[Tournament] Create error:', err);
      alert('Error: ' + err.message);
    }
  });
}

function loadAdminTournaments() {
  var list = document.getElementById('admin-tour-list');
  if (!list) return;

  list.innerHTML = '<p class="loading-text">Loading...</p>';

  if (window.adminTourUnsub) {
    try { window.adminTourUnsub(); } catch (e) {}
  }

  try {
    window.adminTourUnsub = onSnapshot(collection(db, 'tournaments'), function (snap) {
      list.innerHTML = '';

      if (snap.empty) {
        list.innerHTML = '<p class="loading-text">No tournaments yet</p>';
        return;
      }

      var tours = [];
      snap.forEach(function (d) {
        tours.push({ id: d.id, ...d.data() });
      });

      tours.sort(function (a, b) {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });

      tours.forEach(function (t) {
        list.appendChild(buildAdminTourItem(t));
      });
    }, function (err) {
      console.error('[Tournament] List error:', err.message);
      list.innerHTML = '<p class="loading-text">Error: ' + err.message + '</p>';
    });
  } catch (err) {
    console.error('[Tournament] Listen error:', err.message);
  }
}

function buildAdminTourItem(t) {
  var div = document.createElement('div');
  div.className = 'tour-admin-item';

  var statusClass = t.status || 'upcoming';
  var entryFee = Number(t.entryFee) || 0;
  var prizePool = Number(t.prizePool) || 0;
  var currentPlayers = Number(t.currentPlayers) || 0;
  var maxPlayers = Number(t.maxPlayers) || 0;

  var startStr = t.startTime ? new Date(t.startTime).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  }) : '-';

  div.innerHTML =
    '<div class="tour-admin-header">' +
      '<div class="tour-admin-title">' + (t.name || 'Unknown') + '</div>' +
      '<span class="tour-admin-badge ' + statusClass + '">' + statusClass.toUpperCase() + '</span>' +
    '</div>' +
    '<div class="tour-admin-info">' +
      '<span>Entry: <strong>$' + entryFee.toFixed(2) + '</strong></span>' +
      '<span>Prize: <strong>$' + prizePool.toFixed(2) + '</strong></span>' +
      '<span>Players: <strong>' + currentPlayers + ' / ' + maxPlayers + '</strong></span>' +
      '<span>Starts: <strong>' + startStr + '</strong></span>' +
    '</div>' +
    '<div class="tour-admin-actions">' +
      '<button class="btn-action tour-admin-tog" data-tid="' + t.id + '" data-action="toggle">' +
        (t.status === 'live' ? 'End' : (t.status === 'upcoming' ? 'Go Live' : 'Restart')) +
      '</button>' +
      '<button class="btn-action tour-admin-fin" data-tid="' + t.id + '" data-action="finish">Finish</button>' +
      '<button class="btn-action tour-admin-del" data-tid="' + t.id + '" data-action="delete">Delete</button>' +
    '</div>';

  return div;
}

function bindTourListActions() {
  var list = document.getElementById('admin-tour-list');
  if (!list || list.dataset.actionsBound === '1') return;
  list.dataset.actionsBound = '1';

  list.addEventListener('click', async function (e) {
    var btn = e.target.closest('button[data-action]');
    if (!btn) return;

    var tid = btn.dataset.tid;
    var action = btn.dataset.action;

    if (action === 'toggle') await toggleTournamentStatus(tid);
    else if (action === 'finish') await finishTournament(tid);
    else if (action === 'delete') await deleteTournament(tid);
  });
}

async function toggleTournamentStatus(tid) {
  if (!confirm('Change tournament status?')) return;

  try {
    var tDoc = await getDoc(doc(db, 'tournaments', tid));
    if (!tDoc.exists()) { alert('Not found'); return; }

    var t = tDoc.data();
    var newStatus = 'upcoming';
    if (t.status === 'upcoming') newStatus = 'live';
    else if (t.status === 'live') newStatus = 'finished';

    await updateDoc(doc(db, 'tournaments', tid), {
      status: newStatus,
      updatedAt: new Date().toISOString()
    });

    console.log('[Tournament] Status:', tid, '->', newStatus);
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function finishTournament(tid) {
  if (!confirm('Finish tournament and distribute prizes?')) return;

  try {
    var entriesSnap = await getDocs(query(
      collection(db, 'tournamentEntries'),
      where('tournamentId', '==', tid)
    ));

    var entries = [];
    entriesSnap.forEach(function (d) {
      entries.push({ id: d.id, ...d.data() });
    });

    if (entries.length === 0) {
      await updateDoc(doc(db, 'tournaments', tid), {
        status: 'finished',
        finishedAt: new Date().toISOString()
      });
      alert('Tournament finished (no players)');
      return;
    }

    entries.sort(function (a, b) {
      return (Number(b.profit) || 0) - (Number(a.profit) || 0);
    });

    var tDoc = await getDoc(doc(db, 'tournaments', tid));
    var t = tDoc.data();
    var prizePool = Number(t.prizePool) || 0;
    var splits = [0.5, 0.3, 0.2];

    for (var i = 0; i < Math.min(3, entries.length); i++) {
      var e = entries[i];
      var prize = prizePool * splits[i];

      try {
        var userRef = doc(db, 'users', e.userId);
        var userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          var uData = userDoc.data();
          var field = e.accountType === 'real' ? 'realBalance' : 'demoBalance';
          var curBal = uData[field] || 0;
          await updateDoc(userRef, {
            [field]: curBal + prize,
            balance: curBal + prize
          });
        }

        await updateDoc(doc(db, 'tournamentEntries', e.id), {
          rank: i + 1,
          prize: prize,
          completedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error('[Tournament] Prize error:', err.message);
      }
    }

    await updateDoc(doc(db, 'tournaments', tid), {
      status: 'finished',
      finishedAt: new Date().toISOString()
    });

    alert('Tournament finished! Prizes distributed to top 3.');
  } catch (err) {
    console.error('[Tournament] Finish error:', err);
    alert('Error: ' + err.message);
  }
}

async function deleteTournament(tid) {
  if (!confirm('DELETE tournament and all entries?')) return;
  if (!confirm('Are you ABSOLUTELY sure?')) return;

  try {
    var entriesSnap = await getDocs(query(
      collection(db, 'tournamentEntries'),
      where('tournamentId', '==', tid)
    ));

    for (var i = 0; i < entriesSnap.docs.length; i++) {
      await deleteDoc(doc(db, 'tournamentEntries', entriesSnap.docs[i].id));
    }

    await deleteDoc(doc(db, 'tournaments', tid));
    alert('Deleted');
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function initAdminTournaments() {
  bindTourCreate();
  bindTourListActions();
  loadAdminTournaments();
  console.log('[Tournament] System initialized');
}

console.log('Part 7 Tournaments loaded');

// ============================================================
// 81. 🆕 PHASE 1 — SMART WIN/LOSS SYSTEM
// ============================================================
// Admin sets profit/loss %
// System auto-decides based on live user positions
// Position-based close

// Live trade counter from trades collection
window.liveTradeCounter = {
  callCount: 0,
  putCount: 0,
  callAmount: 0,
  putAmount: 0,
  totalCount: 0,
  totalAmount: 0,
  targetWinners: 0,
  suggestedWinningSide: null,
  actualWinPercent: 0,
  lastUpdated: 0
};

// ============================================================
// 82. DECISION ENGINE — Core algorithm
// ============================================================

function decideCandleClose(callCount, putCount, callAmount, putAmount) {
  var total = callCount + putCount;

  if (total === 0) {
    return {
      winningSide: null,
      reason: 'no_trades',
      callCount: 0, putCount: 0,
      callAmount: 0, putAmount: 0,
      targetWinners: 0,
      actualWinPercent: 0
    };
  }

  var profitPercent = window.adminSettings.profitPercent;
  var favorHouse = window.adminSettings.favorHouse;
  var autoAdjust = window.adminSettings.autoAdjust;
  var maxWinners = window.adminSettings.maxWinnersPerCandle;
  var minWinners = window.adminSettings.minWinnersPerCandle;

  // Target number of winners
  var targetWinners = Math.round(total * profitPercent / 100);

  // Cap
  if (targetWinners > maxWinners) targetWinners = maxWinners;
  if (targetWinners < minWinners) targetWinners = minWinners;

  var winningSide;
  var reason = '';

  // Decide based on majority/minority
  if (callCount > putCount) {
    // More CALL users
    if (targetWinners < callCount) {
      // Minority wins (PUT)
      winningSide = 'put';
      reason = 'minority_wins_put';
    } else {
      // Majority wins (CALL)
      winningSide = 'call';
      reason = 'majority_wins_call';
    }
  } else if (putCount > callCount) {
    // More PUT users
    if (targetWinners < putCount) {
      winningSide = 'call';
      reason = 'minority_wins_call';
    } else {
      winningSide = 'put';
      reason = 'majority_wins_put';
    }
  } else {
    // Tie
    winningSide = 'call';
    reason = 'tie_default_call';
  }

  // If favorHouse, prefer side with fewer winners
  if (favorHouse) {
    var callWinners = (winningSide === 'call') ? callCount : putCount;
    var oppositeWinners = (winningSide === 'call') ? putCount : callCount;
    var callPayout = callAmount * 1.85;
    var putPayout = putAmount * 1.85;

    // Admin profit if CALL wins: putAmount (losers) - callPayout (winners)
    var profitIfCallWins = putAmount - callPayout;
    // Admin profit if PUT wins: callAmount (losers) - putPayout (winners)
    var profitIfPutWins = callAmount - putPayout;

    if (profitIfPutWins > profitIfCallWins && winningSide === 'call') {
      winningSide = 'put';
      reason = 'favor_house_switched_to_put';
    } else if (profitIfCallWins > profitIfPutWins && winningSide === 'put') {
      winningSide = 'call';
      reason = 'favor_house_switched_to_call';
    }
  }

  // Actual winners
  var actualWinners = (winningSide === 'call') ? callCount : putCount;
  var actualWinPercent = Math.round((actualWinners / total) * 100);

  return {
    winningSide: winningSide,
    reason: reason,
    callCount: callCount,
    putCount: putCount,
    callAmount: callAmount,
    putAmount: putAmount,
    targetWinners: targetWinners,
    actualWinners: actualWinners,
    actualWinPercent: actualWinPercent,
    total: total
  };
}

// ============================================================
// 83. UPDATE LIVE COUNTER UI
// ============================================================

function updateLiveCounterUI() {
  var analysis = window.tradeAnalysis;
  if (!analysis) return;

  var counter = window.liveTradeCounter;
  counter.callCount = analysis.callCount || 0;
  counter.putCount = analysis.putCount || 0;
  counter.callAmount = analysis.totalCall || 0;
  counter.putAmount = analysis.totalPut || 0;
  counter.totalCount = counter.callCount + counter.putCount;
  counter.totalAmount = counter.callAmount + counter.putAmount;
  counter.lastUpdated = Date.now();

  // Run decision
  if (counter.totalCount > 0) {
    var decision = decideCandleClose(
      counter.callCount, counter.putCount,
      counter.callAmount, counter.putAmount
    );
    counter.suggestedWinningSide = decision.winningSide;
    counter.targetWinners = decision.targetWinners;
    counter.actualWinPercent = decision.actualWinPercent;
    counter.decisionReason = decision.reason;
    counter.actualWinners = decision.actualWinners;
  } else {
    counter.suggestedWinningSide = null;
    counter.targetWinners = 0;
    counter.actualWinPercent = 0;
  }

  // Update DOM
  var el;
  el = document.getElementById('live-call-count');
  if (el) el.textContent = counter.callCount;
  el = document.getElementById('live-put-count');
  if (el) el.textContent = counter.putCount;
  el = document.getElementById('live-call-amount');
  if (el) el.textContent = '$' + counter.callAmount.toFixed(2);
  el = document.getElementById('live-put-amount');
  if (el) el.textContent = '$' + counter.putAmount.toFixed(2);
  el = document.getElementById('live-total-count');
  if (el) el.textContent = counter.totalCount;
  el = document.getElementById('live-total-amount');
  if (el) el.textContent = '$' + counter.totalAmount.toFixed(2);
  el = document.getElementById('live-target-winners');
  if (el) el.textContent = counter.targetWinners;
  el = document.getElementById('live-actual-percent');
  if (el) el.textContent = counter.actualWinPercent + '%';

  el = document.getElementById('live-winning-side');
  if (el) {
    if (counter.suggestedWinningSide === 'call') {
      el.textContent = 'CALL (UP)';
      el.style.color = '#00c853';
    } else if (counter.suggestedWinningSide === 'put') {
      el.textContent = 'PUT (DOWN)';
      el.style.color = '#ff5252';
    } else {
      el.textContent = '-';
      el.style.color = '#6b7a90';
    }
  }

  el = document.getElementById('live-reason');
  if (el) el.textContent = counter.decisionReason || '-';
}

// ============================================================
// 84. BIND SMART SETTINGS SAVE
// ============================================================

function bindSmartSettings() {
  // Profit %
  var profitBtn = document.getElementById('save-smart-profit');
  var profitInput = document.getElementById('smart-profit-percent');
  if (profitBtn && profitInput && profitBtn.dataset.bound !== '1') {
    profitBtn.dataset.bound = '1';
    profitBtn.addEventListener('click', async function() {
      var val = parseInt(profitInput.value);
      if (isNaN(val) || val < 10 || val > 90) { alert('Profit % must be 10-90'); return; }

      try {
        await setDoc(doc(db, 'settings', 'global'), {
          profitPercent: val,
          lossPercentSmart: 100 - val,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        window.adminSettings.profitPercent = val;
        window.adminSettings.lossPercentSmart = 100 - val;

        var lossInput = document.getElementById('smart-loss-percent');
        if (lossInput) lossInput.value = 100 - val;

        alert('Profit: ' + val + '% | Loss: ' + (100 - val) + '%');
      } catch(err) {
        alert(err.message);
      }
    });
  }

  // Loss %
  var lossBtn = document.getElementById('save-smart-loss');
  var lossInput = document.getElementById('smart-loss-percent');
  if (lossBtn && lossInput && lossBtn.dataset.bound !== '1') {
    lossBtn.dataset.bound = '1';
    lossBtn.addEventListener('click', async function() {
      var val = parseInt(lossInput.value);
      if (isNaN(val) || val < 10 || val > 90) { alert('Loss % must be 10-90'); return; }

      try {
        await setDoc(doc(db, 'settings', 'global'), {
          lossPercentSmart: val,
          profitPercent: 100 - val,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        window.adminSettings.lossPercentSmart = val;
        window.adminSettings.profitPercent = 100 - val;

        var pInput = document.getElementById('smart-profit-percent');
        if (pInput) pInput.value = 100 - val;

        alert('Loss: ' + val + '% | Profit: ' + (100 - val) + '%');
      } catch(err) {
        alert(err.message);
      }
    });
  }

  // Max winners
  var maxBtn = document.getElementById('save-smart-max-winners');
  var maxInput = document.getElementById('smart-max-winners');
  if (maxBtn && maxInput && maxBtn.dataset.bound !== '1') {
    maxBtn.dataset.bound = '1';
    maxBtn.addEventListener('click', async function() {
      var val = parseInt(maxInput.value);
      if (isNaN(val) || val < 1 || val > 1000) { alert('Max winners 1-1000'); return; }

      try {
        await setDoc(doc(db, 'settings', 'global'), {
          maxWinnersPerCandle: val,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        window.adminSettings.maxWinnersPerCandle = val;
        alert('Max winners: ' + val);
      } catch(err) {
        alert(err.message);
      }
    });
  }

  // Min winners
  var minBtn = document.getElementById('save-smart-min-winners');
  var minInput = document.getElementById('smart-min-winners');
  if (minBtn && minInput && minBtn.dataset.bound !== '1') {
    minBtn.dataset.bound = '1';
    minBtn.addEventListener('click', async function() {
      var val = parseInt(minInput.value);
      if (isNaN(val) || val < 0 || val > 100) { alert('Min winners 0-100'); return; }

      try {
        await setDoc(doc(db, 'settings', 'global'), {
          minWinnersPerCandle: val,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        window.adminSettings.minWinnersPerCandle = val;
        alert('Min winners: ' + val);
      } catch(err) {
        alert(err.message);
      }
    });
  }

  // Auto adjust toggle
  var autoAdjInput = document.getElementById('smart-auto-adjust');
  if (autoAdjInput && autoAdjInput.dataset.bound !== '1') {
    autoAdjInput.dataset.bound = '1';
    autoAdjInput.addEventListener('change', async function() {
      try {
        await setDoc(doc(db, 'settings', 'global'), {
          autoAdjust: autoAdjInput.checked,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        window.adminSettings.autoAdjust = autoAdjInput.checked;
        console.log('Auto Adjust:', autoAdjInput.checked);
      } catch(err) {
        console.error('Auto adjust save error:', err.message);
      }
    });
  }

  // Favor house toggle
  var favorInput = document.getElementById('smart-favor-house');
  if (favorInput && favorInput.dataset.bound !== '1') {
    favorInput.dataset.bound = '1';
    favorInput.addEventListener('change', async function() {
      try {
        await setDoc(doc(db, 'settings', 'global'), {
          favorHouse: favorInput.checked,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        window.adminSettings.favorHouse = favorInput.checked;
        console.log('Favor House:', favorInput.checked);
      } catch(err) {
        console.error('Favor house save error:', err.message);
      }
    });
  }

  // Enable SMART toggle
  var smartEnabledInput = document.getElementById('smart-enabled-toggle');
  if (smartEnabledInput && smartEnabledInput.dataset.bound !== '1') {
    smartEnabledInput.dataset.bound = '1';
    smartEnabledInput.addEventListener('change', async function() {
      try {
        await setDoc(doc(db, 'settings', 'global'), {
          smartEnabled: smartEnabledInput.checked,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        window.adminSettings.smartEnabled = smartEnabledInput.checked;
        console.log('SMART Enabled:', smartEnabledInput.checked);
        alert('SMART System: ' + (smartEnabledInput.checked ? 'ON' : 'OFF'));
      } catch(err) {
        console.error('SMART enable save error:', err.message);
      }
    });
  }

  console.log('[SMART] Settings bound');
}

// ============================================================
// 85. BIND OVERRIDE BUTTONS
// ============================================================

function bindOverrideButtons() {
  var forceCallBtn = document.getElementById('override-force-call');
  var forcePutBtn = document.getElementById('override-force-put');
  var autoBtn = document.getElementById('override-auto');

  if (forceCallBtn && forceCallBtn.dataset.bound !== '1') {
    forceCallBtn.dataset.bound = '1';
    forceCallBtn.addEventListener('click', function() {
      window.liveTradeCounter.suggestedWinningSide = 'call';
      window.liveTradeCounter.manualOverride = 'call';
      updateLiveCounterUI();
      alert('Override: CALL wins next candle');
    });
  }

  if (forcePutBtn && forcePutBtn.dataset.bound !== '1') {
    forcePutBtn.dataset.bound = '1';
    forcePutBtn.addEventListener('click', function() {
      window.liveTradeCounter.suggestedWinningSide = 'put';
      window.liveTradeCounter.manualOverride = 'put';
      updateLiveCounterUI();
      alert('Override: PUT wins next candle');
    });
  }

  if (autoBtn && autoBtn.dataset.bound !== '1') {
    autoBtn.dataset.bound = '1';
    autoBtn.addEventListener('click', function() {
      delete window.liveTradeCounter.manualOverride;
      analyzeActiveTrades();
      alert('Override cleared - auto mode');
    });
  }

  console.log('[SMART] Override buttons bound');
}

// ============================================================
// 86. INIT DEBUG + ALL SYSTEMS
// ============================================================

function initDebugAndSystems() {
  // Create debug UI
  window.createDebugButton();
  window.createDebugPanel();
  window.addDebugLog('success', 'admin.js v33-clean fully loaded');

  // Bind designer
  bindDesignerSave();
  bindDesignerApply();
  bindDesignerReset();

  // Bind chat
  bindChatSend();

  // Bind SMART
  bindSmartSettings();
  bindOverrideButtons();

  console.log('[Init] All systems initialized');
}

// Init on ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDebugAndSystems);
} else {
  initDebugAndSystems();
}

// Delayed init for elements that load later
setTimeout(initDebugAndSystems, 2000);
setTimeout(initDebugAndSystems, 4000);

// Start live movement + auto candle + analysis after login
setTimeout(function() {
  if (window.currentAdmin) {
    startLiveMovement();
    startAutoCandleGeneration();
    startTradeAnalysis();
  }
}, 5000);

// ============================================================
// 87. EXPOSE ALL
// ============================================================

window.decideCandleClose = decideCandleClose;
window.updateLiveCounterUI = updateLiveCounterUI;
window.bindSmartSettings = bindSmartSettings;
window.bindOverrideButtons = bindOverrideButtons;
window.analyzeActiveTrades = analyzeActiveTrades;
window.startLiveMovement = startLiveMovement;
window.startAutoCandleGeneration = startAutoCandleGeneration;
window.startTradeAnalysis = startTradeAnalysis;
window.loadChatUsers = loadChatUsers;
window.selectChatUser = selectChatUser;
window.sendChatMessage = sendChatMessage;
window.initAdminTournaments = initAdminTournaments;
window.loadAdminTournaments = loadAdminTournaments;

// ============================================================
// END PART 7 of 7 — FULL FILE COMPLETE
// ============================================================

console.log('===== admin.js v33-clean — PART 7/7 LOADED =====');
console.log('===== ✅ admin.js FULLY LOADED — v33-clean =====');
console.log('===== Try: window.runTests() =====');
// ============================================================
// admin.js v33-clean — DESIGNER EXTRA
// Quick Setup + Candle Designer + Scheduled List
// ============================================================

// ============================================================
// D1. QUICK SETUP — Create 10 Realistic Markets
// ============================================================

var QUICK_SETUP_MARKETS = [
  { name: 'BTC/USD',  symbol: 'BTCUSDT', basePrice: 95000,  payout: 85, winRate: 50 },
  { name: 'ETH/USD',  symbol: 'ETHUSDT', basePrice: 3400,   payout: 85, winRate: 50 },
  { name: 'BNB/USD',  symbol: 'BNBUSDT', basePrice: 620,    payout: 85, winRate: 50 },
  { name: 'SOL/USD',  symbol: 'SOLUSDT', basePrice: 180,    payout: 85, winRate: 50 },
  { name: 'XRP/USD',  symbol: 'XRPUSDT', basePrice: 2.20,   payout: 85, winRate: 50 },
  { name: 'EUR/USD',  symbol: 'EURUSD',  basePrice: 1.0850, payout: 85, winRate: 50 },
  { name: 'GBP/USD',  symbol: 'GBPUSD',  basePrice: 1.2650, payout: 85, winRate: 50 },
  { name: 'XAU/USD',  symbol: 'XAUUSD',  basePrice: 2650,   payout: 85, winRate: 50 },
  { name: 'XAG/USD',  symbol: 'XAGUSD',  basePrice: 30.50,  payout: 85, winRate: 50 },
  { name: 'USOIL',    symbol: 'USOIL',   basePrice: 75.50,  payout: 85, winRate: 50 }
];

async function runQuickSetup() {
  var btn = document.getElementById('quick-setup-btn');
  var status = document.getElementById('quick-setup-status');

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Creating markets...';
  }
  if (status) {
    status.textContent = 'Please wait...';
    status.style.color = '#2196f3';
  }

  var created = 0;
  var failed = 0;

  for (var i = 0; i < QUICK_SETUP_MARKETS.length; i++) {
    var m = QUICK_SETUP_MARKETS[i];

    try {
      // Check if market exists
      var existingSnap = await getDocs(collection(db, 'markets'));
      var exists = false;
      existingSnap.forEach(function(d) {
        var data = d.data();
        if (data.symbol === m.symbol) exists = true;
      });

      if (exists) {
        console.log('[QuickSetup] Already exists:', m.symbol);
        continue;
      }

      var marketId = m.symbol.toLowerCase() + '_' + Date.now() + '_' + i;

      await setDoc(doc(db, 'markets', marketId), {
        id: marketId,
        name: m.name,
        symbol: m.symbol,
        basePrice: m.basePrice,
        currentPrice: m.basePrice,
        enabled: true,
        payout: m.payout,
        winRate: m.winRate,
        candleMode: 'locked',
        currentCandleIndex: 0,
        autoModeInterval: 5000,
        profitLossSettings: {
          profitPercent: 40,
          lossPercent: 60,
          autoAdjust: true,
          favorHouse: true,
          maxWinnersPerCandle: 5,
          minWinnersPerCandle: 1
        },
        behaviorSettings: {
          enabledBehaviors: [
            'normal', 'hard', 'extremely-hard',
            'flat', 'big', 'small', 'doji',
            'hammer', 'shooting-star',
            'trend-up', 'trend-down',
            'spike', 'range', 'falti'
          ]
        },
        sizePresets: {
          small: 5,
          normal: 20,
          medium: 40,
          big: 80,
          huge: 200
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      created++;
      console.log('[QuickSetup] Created:', m.symbol, '@ $' + m.basePrice);

    } catch (err) {
      failed++;
      console.error('[QuickSetup] Failed:', m.symbol, err.message);
    }
  }

  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Create 10 Markets';
  }

  if (status) {
    if (failed === 0) {
      status.style.color = '#00c853';
      status.textContent = 'Created ' + created + ' markets!';
    } else {
      status.style.color = '#ffb300';
      status.textContent = 'Created: ' + created + ' | Failed: ' + failed;
    }
  }

  alert('Quick Setup Done!\n\nCreated: ' + created + '\nAlready existing: ' + (10 - created - failed) + '\nFailed: ' + failed);
}

// Bind Quick Setup button
(function bindQuickSetup() {
  var btn = document.getElementById('quick-setup-btn');
  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    if (!confirm('Create 10 realistic markets?\n\nBTC, ETH, BNB, SOL, XRP, EUR/USD, GBP/USD, Gold, Silver, Oil')) return;
    runQuickSetup();
  });
  console.log('[QuickSetup] Button bound');
})();

// ============================================================
// D2. CANDLE DESIGNER — Save to Schedule
// ============================================================

async function saveDesignerCandle() {
  var marketId = document.getElementById('designer-market')?.value;
  var date = document.getElementById('designer-date')?.value;
  var time = document.getElementById('designer-time')?.value;
  var timeframe = document.getElementById('designer-timeframe')?.value;
  var direction = document.getElementById('designer-direction')?.value;
  var behavior = document.getElementById('designer-behavior')?.value;
  var size = document.getElementById('designer-size')?.value;
  var exactClose = document.getElementById('designer-exact')?.value;
  var status = document.getElementById('designer-status');

  function setStatus(text, color) {
    if (status) {
      status.textContent = text;
      status.style.color = color || '#6b7a90';
    }
  }

  // Validation
  if (!marketId) { setStatus('Select a market', '#ff5252'); return; }
  if (!date) { setStatus('Select date', '#ff5252'); return; }
  if (!time) { setStatus('Select time', '#ff5252'); return; }

  // Build datetime
  var datetimeStr = date + 'T' + time + ':00';
  var datetimeMs = new Date(datetimeStr).getTime();

  if (isNaN(datetimeMs)) { setStatus('Invalid date/time', '#ff5252'); return; }
  if (datetimeMs < Date.now() - 60000) { setStatus('Time is in the past', '#ff5252'); return; }

  var scheduledId = 'sc_' + datetimeMs + '_' + Math.random().toString(36).substr(2, 6);

  var scheduledData = {
    id: scheduledId,
    datetime: datetimeStr,
    datetimeMs: datetimeMs,
    date: date,
    time: time,
    timeframe: timeframe,
    direction: direction,
    behavior: behavior,
    size: size,
    exactClose: exactClose ? parseFloat(exactClose) : null,
    applied: false,
    createdAt: new Date().toISOString()
  };

  try {
    setStatus('Saving...', '#2196f3');

    await setDoc(
      doc(db, 'markets', marketId, 'scheduledCandles', scheduledId),
      scheduledData
    );

    setStatus('Saved! ' + direction.toUpperCase() + ' / ' + behavior, '#00c853');
    console.log('[Designer] Saved:', scheduledData);

    // Clear exact close input only
    var exactInput = document.getElementById('designer-exact');
    if (exactInput) exactInput.value = '';

    // Auto-load scheduled list
    setTimeout(loadScheduledList, 500);

  } catch (err) {
    setStatus('Error: ' + err.message, '#ff5252');
    console.error('[Designer] Save error:', err);
  }
}

// Bind Designer add button
(function bindDesignerAdd() {
  var btn = document.getElementById('designer-add-btn');
  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    saveDesignerCandle();
  });
  console.log('[Designer] Add button bound');
})();

// ============================================================
// D3. POPULATE DESIGNER MARKET DROPDOWN
// ============================================================

function populateDesignerMarkets() {
  var sel = document.getElementById('designer-market');
  if (!sel) return;

  onSnapshot(collection(db, 'markets'), function(snap) {
    var current = sel.value;
    sel.innerHTML = '<option value="">-- Select Market --</option>';

    var markets = [];
    snap.forEach(function(d) {
      markets.push({ id: d.id, ...d.data() });
    });
    markets.sort(function(a, b) {
      return (a.name || '').localeCompare(b.name || '');
    });

    markets.forEach(function(m) {
      if (!m.enabled) return;
      var opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name + ' (' + m.symbol + ')';
      sel.appendChild(opt);
    });

    if (current) sel.value = current;
    console.log('[Designer] Markets loaded:', markets.length);
  });
}

// ============================================================
// D4. LOAD SCHEDULED CANDLES LIST
// ============================================================

async function loadScheduledList() {
  var container = document.getElementById('scheduled-list');
  var marketId = document.getElementById('designer-market')?.value;

  if (!container) return;

  if (!marketId) {
    container.innerHTML = '<p style="color:#6b7a90;text-align:center;padding:10px;">Select a market first</p>';
    return;
  }

  container.innerHTML = '<p style="color:#2196f3;text-align:center;padding:10px;">Loading...</p>';

  try {
    var snap = await getDocs(collection(db, 'markets', marketId, 'scheduledCandles'));

    if (snap.empty) {
      container.innerHTML = '<p style="color:#6b7a90;text-align:center;padding:10px;">No scheduled candles</p>';
      return;
    }

    var list = [];
    snap.forEach(function(d) {
      list.push({ id: d.id, ...d.data() });
    });

    list.sort(function(a, b) {
      return (a.datetimeMs || 0) - (b.datetimeMs || 0);
    });

    var html = '';
    list.slice(0, 50).forEach(function(s) {
      var dirColor = s.direction === 'up' ? '#00c853'
                   : s.direction === 'down' ? '#ff5252'
                   : s.direction === 'smart' ? '#2196f3'
                   : '#ffb300';

      var appliedBadge = s.applied
        ? '<span style="color:#6b7a90;font-size:10px;">[APPLIED]</span>'
        : '<span style="color:#00c853;font-size:10px;">[PENDING]</span>';

      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:#0b1220;border-radius:6px;margin-bottom:6px;border-left:3px solid ' + dirColor + ';">' +
        '<div>' +
          '<div style="color:#fff;font-weight:700;font-size:12px;">' + (s.date || '') + ' ' + (s.time || '') + '</div>' +
          '<div style="color:' + dirColor + ';font-size:11px;font-weight:600;">' + (s.direction || '').toUpperCase() + ' / ' + (s.behavior || '') + '</div>' +
          '<div style="color:#6b7a90;font-size:10px;">Size: ' + (s.size || '') + (s.exactClose ? ' | Exact: ' + s.exactClose : '') + '</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
          appliedBadge +
          '<button onclick="deleteScheduled(\'' + marketId + '\',\'' + s.id + '\')" style="display:block;margin-top:4px;background:#3a1220;color:#ff5252;border:1px solid #ff5252;border-radius:4px;padding:3px 8px;font-size:10px;cursor:pointer;">Delete</button>' +
        '</div>' +
      '</div>';
    });

    container.innerHTML = html;
    console.log('[Designer] Loaded', list.length, 'scheduled candles');

  } catch (err) {
    container.innerHTML = '<p style="color:#ff5252;text-align:center;padding:10px;">Error: ' + err.message + '</p>';
    console.error('[Designer] Load error:', err);
  }
}

// Bind load scheduled button
(function bindLoadScheduled() {
  var btn = document.getElementById('load-scheduled-btn');
  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    loadScheduledList();
  });
  console.log('[Designer] Load button bound');
})();

// ============================================================
// D5. DELETE SCHEDULED CANDLE
// ============================================================

window.deleteScheduled = async function(marketId, scheduledId) {
  if (!confirm('Delete this scheduled candle?')) return;
  try {
    await deleteDoc(doc(db, 'markets', marketId, 'scheduledCandles', scheduledId));
    console.log('[Designer] Deleted:', scheduledId);
    loadScheduledList();
  } catch (err) {
    alert('Delete failed: ' + err.message);
  }
};

// ============================================================
// D6. AUTO-FILL DESIGNER DATE/TIME
// ============================================================

function autoFillDesignerDateTime() {
  var dateInput = document.getElementById('designer-date');
  var timeInput = document.getElementById('designer-time');

  if (dateInput && !dateInput.value) {
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = yyyy + '-' + mm + '-' + dd;
  }

  if (timeInput && !timeInput.value) {
    var now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    var hh = String(now.getHours()).padStart(2, '0');
    var min = String(now.getMinutes()).padStart(2, '0');
    timeInput.value = hh + ':' + min;
  }
}

// ============================================================
// D7. INIT DESIGNER
// ============================================================

function initDesigner() {
  populateDesignerMarkets();
  autoFillDesignerDateTime();

  // Reload scheduled list when market changes
  var marketSel = document.getElementById('designer-market');
  if (marketSel && marketSel.dataset.boundDesigner !== '1') {
    marketSel.dataset.boundDesigner = '1';
    marketSel.addEventListener('change', function() {
      loadScheduledList();
    });
  }

  console.log('[Designer] Initialized');
}

// Init on ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initDesigner, 1500);
  });
} else {
  setTimeout(initDesigner, 1500);
}

setTimeout(initDesigner, 3000);
setTimeout(initDesigner, 5000);

// ============================================================
// D8. EXPOSE
// ============================================================

window.runQuickSetup = runQuickSetup;
window.saveDesignerCandle = saveDesignerCandle;
window.loadScheduledList = loadScheduledList;
window.deleteScheduled = window.deleteScheduled;
window.initDesigner = initDesigner;

console.log('===== admin.js v33-clean — DESIGNER EXTRA LOADED =====');
// ============================================================
// admin.js v33-clean — AUTO RUNNER 24/7
// Step 1 of Priority Plan
// ============================================================

// ============================================================
// AR1. AUTO-RUNNER STATE
// ============================================================

window.autoRunnerState = {
  active: false,
  marketId: null,
  timeframe: '1m',
  interval: 60000,        // candle duration in ms
  timer: null,            // setInterval handle
  currentCandleStart: 0,  // timestamp of candle start
  currentCandleOpen: 0,   // open price of current candle
  currentCandleClose: 0,  // live close (updates)
  nextCandlePreview: null,// preview of next candle
  behavior: 'normal',
  direction: 'auto',
  size: 'normal',
  priceMovementInterval: null,  // sub-tick updater
  tickCount: 0
};

// ============================================================
// AR2. TIMEFRAME TO MS
// ============================================================

function timeframeToMs(tf) {
  var map = {
    '5s': 5000, '10s': 10000, '15s': 15000, '30s': 30000,
    '1m': 60000, '2m': 120000, '3m': 180000, '5m': 300000,
    '10m': 600000, '15m': 900000, '30m': 1800000,
    '1h': 3600000, '4h': 14400000, '1d': 86400000
  };
  return map[tf] || 60000;
}

// ============================================================
// AR3. PRICE MOVEMENT PER BEHAVIOR
// ============================================================

function getBehaviorParams(behavior, size) {
  // Size multiplier
  var sizeMultiplier = {
    'small': 0.3,
    'normal': 1.0,
    'medium': 2.0,
    'big': 4.0,
    'huge': 8.0
  }[size] || 1.0;

  // Base ranges per behavior (in pips relative to basePrice)
  var behaviors = {
    'normal':         { body: 30,  wick: 15,  target: 0.5 },
    'hard':           { body: 50,  wick: 25,  target: 1.0 },
    'extremely-hard': { body: 80,  wick: 40,  target: 1.5 },
    'flat':           { body: 5,   wick: 3,   target: 0.05 },
    'big':            { body: 150, wick: 30,  target: 2.0 },
    'small':          { body: 10,  wick: 5,   target: 0.1 },
    'doji':           { body: 2,   wick: 40,  target: 0.02 },
    'hammer':         { body: 15,  wick: 60,  target: 0.3 },
    'shooting-star':  { body: 15,  wick: 60,  target: -0.3 },
    'trend-up':       { body: 40,  wick: 15,  target: 1.0 },
    'trend-down':     { body: 40,  wick: 15,  target: -1.0 },
    'spike':          { body: 250, wick: 40,  target: 3.0 },
    'range':          { body: 25,  wick: 15,  target: 0.3 },
    'falti':          { body: 60,  wick: 20,  target: 1.2 }
  };

  var b = behaviors[behavior] || behaviors['normal'];

  return {
    bodySize: b.body * sizeMultiplier,
    wickSize: b.wick * sizeMultiplier,
    targetMultiplier: b.target
  };
}

// ============================================================
// AR4. CREATE NEW CANDLE DATA
// ============================================================

function createNewCandle(prevClose, behavior, direction, size, basePrice, exactClose) {
  var params = getBehaviorParams(behavior, size);
  var open = prevClose || basePrice;

  // If exactClose provided, use it
  if (exactClose && !isNaN(exactClose)) {
    var close = exactClose;
    var high = Math.max(open, close) + params.wickSize;
    var low = Math.min(open, close) - params.wickSize;
    return {
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      direction: close >= open ? 'up' : 'down',
      behavior: behavior,
      size: size
    };
  }

  // Auto direction
  if (direction === 'auto' || direction === 'smart') {
    direction = Math.random() > 0.5 ? 'up' : 'down';
  }

  var sign = direction === 'up' ? 1 : -1;
  var movement = params.bodySize * (0.5 + Math.random() * 0.5);

  var close = open + (sign * movement);
  var high = Math.max(open, close) + (params.wickSize * Math.random());
  var low = Math.min(open, close) - (params.wickSize * Math.random());

  return {
    open: Number(open.toFixed(2)),
    high: Number(high.toFixed(2)),
    low: Number(low.toFixed(2)),
    close: Number(close.toFixed(2)),
    direction: direction,
    behavior: behavior,
    size: size
  };
}

// ============================================================
// AR5. WRITE LIVE CANDLE TO FIRESTORE
// ============================================================

async function writeLiveCandle(candleData, candleStartMs) {
  var state = window.autoRunnerState;
  if (!state.marketId) return;

  try {
    var liveCandleId = 'live_' + candleStartMs;

    await setDoc(
      doc(db, 'markets', state.marketId, 'liveCandles', liveCandleId),
      {
        id: liveCandleId,
        marketId: state.marketId,
        startTime: candleStartMs,
        endTime: candleStartMs + state.interval,
        open: candleData.open,
        high: candleData.high,
        low: candleData.low,
        close: candleData.close,
        direction: candleData.direction,
        behavior: candleData.behavior,
        size: candleData.size,
        updatedAt: Date.now()
      },
      { merge: true }
    );
  } catch (err) {
    console.error('[AutoRunner] Firestore write error:', err.message);
  }
}

// ============================================================
// AR6. UPDATE CANDLE PRICE (live movement)
// ============================================================

async function updateCandlePrice() {
  var state = window.autoRunnerState;
  if (!state.active || !state.marketId) return;

  state.tickCount++;

  var params = getBehaviorParams(state.behavior, state.size);
  var targetClose = state.currentCandleClose;
  var progress = state.tickCount / 20; // 20 ticks per candle

  // Smooth movement towards target
  var open = state.currentCandleOpen;
  var diff = targetClose - open;
  var currentStep = open + (diff * Math.min(progress, 1.0));

  // Add noise
  var noise = (Math.random() - 0.5) * params.bodySize * 0.3;
  var livePrice = currentStep + noise;

  // Update high/low
  var high = Math.max(state.currentCandleHigh || open, livePrice);
  var low = Math.min(state.currentCandleLow || open, livePrice);

  state.currentCandleHigh = high;
  state.currentCandleLow = low;

  // Update Firestore (throttled - every 3 ticks)
  if (state.tickCount % 3 === 0) {
    await writeLiveCandle({
      open: state.currentCandleOpen,
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(livePrice.toFixed(2)),
      direction: livePrice >= open ? 'up' : 'down',
      behavior: state.behavior,
      size: state.size
    }, state.currentCandleStart);
  }
}

// ============================================================
// AR7. START NEW CANDLE
// ============================================================

async function startNewCandle() {
  var state = window.autoRunnerState;
  if (!state.active || !state.marketId) return;

  // Get market data
  var marketSnap = await getDoc(doc(db, 'markets', state.marketId));
  if (!marketSnap.exists()) {
    console.error('[AutoRunner] Market not found:', state.marketId);
    stopAutoRunner();
    return;
  }

  var market = marketSnap.data();
  var basePrice = market.basePrice || 50000;
  var currentPrice = market.currentPrice || basePrice;

  // Calculate candle time
  var now = Date.now();
  var alignedStart = Math.floor(now / state.interval) * state.interval;

  state.currentCandleStart = alignedStart;
  state.currentCandleOpen = currentPrice;
  state.currentCandleHigh = currentPrice;
  state.currentCandleLow = currentPrice;
  state.tickCount = 0;

  // Read scheduler settings (behavior/direction/size)
  var behavior = 'normal';
  var direction = 'auto';
  var size = 'normal';
  var exactClose = null;

  try {
    var schedSnap = await getDocs(collection(db, 'markets', state.marketId, 'scheduledCandles'));
    schedSnap.forEach(function(d) {
      var s = d.data();
      if (s.applied) return;
      if (Math.abs(s.datetimeMs - alignedStart) < 30000) {
        behavior = s.behavior || 'normal';
        direction = s.direction || 'auto';
        size = s.size || 'normal';
        exactClose = s.exactClose || null;
        console.log('[AutoRunner] Using scheduled candle:', s.datetimeMs);
      }
    });
  } catch(e) {}

  state.behavior = behavior;
  state.direction = direction;
  state.size = size;

  // Create candle
  var candle = createNewCandle(currentPrice, behavior, direction, size, basePrice, exactClose);

  state.currentCandleClose = candle.close;

  // Write to Firestore
  await writeLiveCandle(candle, alignedStart);

  // Update market currentPrice
  try {
    await updateDoc(doc(db, 'markets', state.marketId), {
      currentPrice: candle.close,
      updatedAt: new Date().toISOString()
    });
  } catch(e) {}

  console.log('[AutoRunner] New candle:', {
    start: alignedStart,
    open: candle.open,
    close: candle.close,
    behavior: behavior,
    direction: candle.direction
  });
}

// ============================================================
// AR8. START AUTO-RUNNER
// ============================================================

async function startAutoRunner(marketId, timeframe) {
  var state = window.autoRunnerState;

  if (state.active) {
    console.log('[AutoRunner] Already running');
    return;
  }

  if (!marketId) {
    alert('Select a market first');
    return;
  }

  state.marketId = marketId;
  state.timeframe = timeframe || '1m';
  state.interval = timeframeToMs(state.timeframe);
  state.active = true;

  console.log('[AutoRunner] Started:', marketId, '@', state.timeframe);

  // Start first candle
  await startNewCandle();

  // Candle loop
  state.timer = setInterval(async function() {
    await startNewCandle();
  }, state.interval);

  // Price movement loop (every 200ms)
  state.priceMovementInterval = setInterval(function() {
    updateCandlePrice();
  }, 200);

  updateAutoRunnerUI();
}

// ============================================================
// AR9. STOP AUTO-RUNNER
// ============================================================

function stopAutoRunner() {
  var state = window.autoRunnerState;

  if (!state.active) return;

  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
  if (state.priceMovementInterval) {
    clearInterval(state.priceMovementInterval);
    state.priceMovementInterval = null;
  }

  state.active = false;
  console.log('[AutoRunner] Stopped');

  updateAutoRunnerUI();
}

// ============================================================
// AR10. TOGGLE AUTO-RUNNER
// ============================================================

function toggleAutoRunner() {
  var state = window.autoRunnerState;

  if (state.active) {
    stopAutoRunner();
  } else {
    var marketId = document.getElementById('auto-runner-market')?.value;
    var timeframe = document.getElementById('auto-runner-timeframe')?.value || '1m';

    if (!marketId) {
      alert('Select a market for auto-runner');
      return;
    }

    startAutoRunner(marketId, timeframe);
  }
}

// ============================================================
// AR11. UPDATE UI
// ============================================================

function updateAutoRunnerUI() {
  var state = window.autoRunnerState;
  var btn = document.getElementById('auto-runner-toggle');
  var status = document.getElementById('auto-runner-status');

  if (btn) {
    if (state.active) {
      btn.textContent = 'STOP Auto-Runner';
      btn.style.background = 'linear-gradient(135deg, #ff5252 0%, #d32f2f 100%)';
    } else {
      btn.textContent = 'START Auto-Runner';
      btn.style.background = 'linear-gradient(135deg, #00c853 0%, #00a844 100%)';
    }
  }

  if (status) {
    if (state.active) {
      status.textContent = 'RUNNING: ' + (state.marketId || '') + ' @ ' + state.timeframe;
      status.style.color = '#00c853';
    } else {
      status.textContent = 'IDLE';
      status.style.color = '#6b7a90';
    }
  }
}

// ============================================================
// AR12. POPULATE MARKET DROPDOWN
// ============================================================

function populateAutoRunnerMarkets() {
  var sel = document.getElementById('auto-runner-market');
  if (!sel) return;

  onSnapshot(collection(db, 'markets'), function(snap) {
    var current = sel.value;
    sel.innerHTML = '<option value="">-- Select Market --</option>';

    var markets = [];
    snap.forEach(function(d) {
      markets.push({ id: d.id, ...d.data() });
    });
    markets.sort(function(a, b) {
      return (a.name || '').localeCompare(b.name || '');
    });

    markets.forEach(function(m) {
      if (!m.enabled) return;
      var opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name + ' (' + m.symbol + ')';
      sel.appendChild(opt);
    });

    if (current) sel.value = current;
  });
}

// ============================================================
// AR13. BIND AUTO-RUNNER BUTTONS
// ============================================================

function bindAutoRunner() {
  var toggleBtn = document.getElementById('auto-runner-toggle');
  if (toggleBtn && toggleBtn.dataset.bound !== '1') {
    toggleBtn.dataset.bound = '1';
    toggleBtn.addEventListener('click', function(e) {
      e.preventDefault();
      toggleAutoRunner();
    });
    console.log('[AutoRunner] Toggle bound');
  }

  populateAutoRunnerMarkets();
}

// ============================================================
// AR14. INIT
// ============================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(bindAutoRunner, 2000);
  });
} else {
  setTimeout(bindAutoRunner, 2000);
}

setTimeout(bindAutoRunner, 4000);

// ============================================================
// AR15. EXPOSE
// ============================================================

window.autoRunnerState = window.autoRunnerState;
window.startAutoRunner = startAutoRunner;
window.stopAutoRunner = stopAutoRunner;
window.toggleAutoRunner = toggleAutoRunner;
window.bindAutoRunner = bindAutoRunner;
window.populateAutoRunnerMarkets = populateAutoRunnerMarkets;
window.timeframeToMs = timeframeToMs;
window.getBehaviorParams = getBehaviorParams;
window.createNewCandle = createNewCandle;

console.log('===== admin.js v33-clean — AUTO RUNNER LOADED =====');

// ============================================================
// CLEANUP SYSTEM — Auto-delete old candles
// Keep only last N candles per market (Firestore free-friendly)
// ============================================================

window.cleanupState = {
  active: false,
  interval: null,
  maxCandlesPerMarket: 1000,
  checkIntervalMs: 60000,
  lastCleanup: {},
  totalDeleted: 0
};

// ============================================================
// CLEANUP 1 — Single Market
// ============================================================

async function cleanupMarketCandles(marketId) {
  if (!marketId) return 0;

  try {
    var snap = await getDocs(
      collection(db, 'markets', marketId, 'liveCandles')
    );

    if (snap.size <= window.cleanupState.maxCandlesPerMarket) {
      return 0;
    }

    var candles = [];
    snap.forEach(function(d) {
      var data = d.data();
      candles.push({
        id: d.id,
        startTime: data.startTime || 0
      });
    });

    candles.sort(function(a, b) {
      return a.startTime - b.startTime;
    });

    var keep = window.cleanupState.maxCandlesPerMarket;
    var toDelete = candles.slice(0, candles.length - keep);

    if (toDelete.length === 0) return 0;

    var deleted = 0;
    var batchSize = 100;

    for (var i = 0; i < toDelete.length; i += batchSize) {
      var batch = toDelete.slice(i, i + batchSize);
      var promises = batch.map(function(c) {
        return deleteDoc(doc(db, 'markets', marketId, 'liveCandles', c.id));
      });

      try {
        await Promise.all(promises);
        deleted += batch.length;
      } catch (err) {
        console.error('[Cleanup] Batch delete error:', err.message);
      }
    }

    window.cleanupState.totalDeleted += deleted;
    window.cleanupState.lastCleanup[marketId] = Date.now();

    console.log('[Cleanup] ' + marketId + ': deleted ' + deleted + ' old candles (kept ' + keep + ')');
    return deleted;
  } catch (err) {
    console.error('[Cleanup] Market error:', err.message);
    return 0;
  }
}

// ============================================================
// CLEANUP 2 — All Markets
// ============================================================

async function cleanupAllMarkets() {
  try {
    var marketsSnap = await getDocs(collection(db, 'markets'));
    var totalDeleted = 0;

    for (var i = 0; i < marketsSnap.docs.length; i++) {
      var marketId = marketsSnap.docs[i].id;
      var deleted = await cleanupMarketCandles(marketId);
      totalDeleted += deleted;
    }

    if (totalDeleted > 0) {
      console.log('[Cleanup] Total deleted across all markets:', totalDeleted);
    }

    return totalDeleted;
  } catch (err) {
    console.error('[Cleanup] All markets error:', err.message);
    return 0;
  }
}

// ============================================================
// CLEANUP 3 — Start Auto-Cleanup
// ============================================================

function startAutoCleanup() {
  if (window.cleanupState.active) {
    console.log('[Cleanup] Already running');
    return;
  }

  window.cleanupState.active = true;
  console.log('[Cleanup] Started — every ' + (window.cleanupState.checkIntervalMs / 1000) + 's');

  // Initial cleanup after 10s
  setTimeout(function() {
    cleanupAllMarkets();
  }, 10000);

  // Loop
  window.cleanupState.interval = setInterval(function() {
    cleanupAllMarkets();
  }, window.cleanupState.checkIntervalMs);

  updateCleanupUI();
}

// ============================================================
// CLEANUP 4 — Stop Auto-Cleanup
// ============================================================

function stopAutoCleanup() {
  if (!window.cleanupState.active) return;

  if (window.cleanupState.interval) {
    clearInterval(window.cleanupState.interval);
    window.cleanupState.interval = null;
  }

  window.cleanupState.active = false;
  console.log('[Cleanup] Stopped');
  updateCleanupUI();
}

// ============================================================
// CLEANUP 5 — Toggle
// ============================================================

function toggleAutoCleanup() {
  if (window.cleanupState.active) stopAutoCleanup();
  else startAutoCleanup();
}

// ============================================================
// CLEANUP 6 — Update UI
// ============================================================

function updateCleanupUI() {
  var btn = document.getElementById('cleanup-toggle');
  var status = document.getElementById('cleanup-status');
  var deletedEl = document.getElementById('cleanup-deleted');

  if (btn) {
    if (window.cleanupState.active) {
      btn.textContent = 'STOP Cleanup';
      btn.style.background = 'linear-gradient(135deg, #ff5252 0%, #d32f2f 100%)';
    } else {
      btn.textContent = 'START Cleanup';
      btn.style.background = 'linear-gradient(135deg, #00c853 0%, #00a844 100%)';
    }
  }

  if (status) {
    status.textContent = window.cleanupState.active ? 'ACTIVE' : 'IDLE';
    status.style.color = window.cleanupState.active ? '#00c853' : '#6b7a90';
  }

  if (deletedEl) {
    deletedEl.textContent = window.cleanupState.totalDeleted;
  }
}

// ============================================================
// CLEANUP 7 — Save Max Candles
// ============================================================

async function saveCleanupMax() {
  var input = document.getElementById('cleanup-max-input');
  if (!input) return;

  var val = parseInt(input.value);
  if (isNaN(val) || val < 100 || val > 10000) {
    alert('Max candles: 100-10000');
    return;
  }

  window.cleanupState.maxCandlesPerMarket = val;

  try {
    await setDoc(
      doc(db, 'settings', 'global'),
      { maxCandlesPerMarket: val, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    alert('Max candles saved: ' + val);
  } catch (err) {
    alert('Save error: ' + err.message);
  }

  updateCleanupUI();
}

// ============================================================
// CLEANUP 8 — Load Setting
// ============================================================

async function loadCleanupSetting() {
  try {
    var sDoc = await getDoc(doc(db, 'settings', 'global'));
    if (sDoc.exists()) {
      var d = sDoc.data();
      if (d.maxCandlesPerMarket) {
        window.cleanupState.maxCandlesPerMarket = d.maxCandlesPerMarket;
      }
    }
  } catch (err) {
    console.error('[Cleanup] Load error:', err.message);
  }

  var input = document.getElementById('cleanup-max-input');
  if (input) {
    input.value = window.cleanupState.maxCandlesPerMarket;
  }
  updateCleanupUI();
}

// ============================================================
// CLEANUP 9 — Bind Buttons
// ============================================================

function bindCleanupButtons() {
  var toggleBtn = document.getElementById('cleanup-toggle');
  if (toggleBtn && toggleBtn.dataset.bound !== '1') {
    toggleBtn.dataset.bound = '1';
    toggleBtn.addEventListener('click', function(e) {
      e.preventDefault();
      toggleAutoCleanup();
    });
    console.log('[Cleanup] Toggle bound');
  }

  var saveBtn = document.getElementById('save-cleanup-max');
  if (saveBtn && saveBtn.dataset.bound !== '1') {
    saveBtn.dataset.bound = '1';
    saveBtn.addEventListener('click', function(e) {
      e.preventDefault();
      saveCleanupMax();
    });
    console.log('[Cleanup] Save button bound');
  }

  var runNowBtn = document.getElementById('run-cleanup-now');
  if (runNowBtn && runNowBtn.dataset.bound !== '1') {
    runNowBtn.dataset.bound = '1';
    runNowBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      runNowBtn.disabled = true;
      runNowBtn.textContent = 'Running...';
      var deleted = await cleanupAllMarkets();
      runNowBtn.disabled = false;
      runNowBtn.textContent = 'Run Cleanup Now';
      updateCleanupUI();
      alert('Cleanup done!\n\nDeleted: ' + deleted + ' candles\nTotal deleted so far: ' + window.cleanupState.totalDeleted);
    });
    console.log('[Cleanup] Run-now button bound');
  }
}

// ============================================================
// CLEANUP 10 — Auto-Init
// ============================================================

setTimeout(function() {
  loadCleanupSetting();
  bindCleanupButtons();
}, 3000);

setTimeout(function() {
  loadCleanupSetting();
  bindCleanupButtons();
}, 6000);

// ============================================================
// CLEANUP 11 — Expose
// ============================================================

window.cleanupState = window.cleanupState;
window.cleanupMarketCandles = cleanupMarketCandles;
window.cleanupAllMarkets = cleanupAllMarkets;
window.startAutoCleanup = startAutoCleanup;
window.stopAutoCleanup = stopAutoCleanup;
window.toggleAutoCleanup = toggleAutoCleanup;
window.saveCleanupMax = saveCleanupMax;
window.bindCleanupButtons = bindCleanupButtons;

console.log('===== CLEANUP SYSTEM LOADED =====');
// ============================================================
// FIX: Expose all Firebase functions to window
// ============================================================

window.getDocs = getDocs;
window.collection = collection;
window.doc = doc;
window.setDoc = setDoc;
window.getDoc = getDoc;
window.updateDoc = updateDoc;
window.deleteDoc = deleteDoc;
window.addDoc = addDoc;
window.query = query;
window.where = where;
window.onSnapshot = onSnapshot;
window.orderBy = orderBy;

console.log('===== [FIX] Firebase functions exposed to window =====');
console.log('  getDocs:', typeof window.getDocs);
console.log('  collection:', typeof window.collection);
console.log('  doc:', typeof window.doc);
console.log('  updateDoc:', typeof window.updateDoc);
console.log('  setDoc:', typeof window.setDoc);
console.log('  getDoc:', typeof window.getDoc);
