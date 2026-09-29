// ============================================
// SAFE TEXT GUARD — must run FIRST
// ============================================
(function safeTextGuard() {
  if (window.__safeTextGuard) return;
  window.__safeTextGuard = true;

  window.safeSetTextDirect = function(el, text) {
    if (!el) return;
    try { el.textContent = text; } catch(e) {}
  };

  window.safeSetTextById = function(id, text) {
    var el = document.getElementById(id);
    if (!el) return;
    try { el.textContent = text; } catch(e) {}
  };

  console.log("[SAFE-GUARD] Safe text helpers active");
})();

// ============================================
// GLOBAL NULL-GUARD — must run FIRST
// ============================================
(function() {
  if (window.__globalNullSafe) return;
  window.__globalNullSafe = true;

  var origGetById = document.getElementById.bind(document);

  document.getElementById = function(id) {
    var el = origGetById(id);
    if (!el) {
      return {
        addEventListener: function() {},
        removeEventListener: function() {},
        classList: {
          add: function() {}, remove: function() {},
          toggle: function() {}, contains: function() { return false; }
        },
        style: {},
        dataset: {},
        setAttribute: function() {},
        getAttribute: function() { return null; },
        appendChild: function() {},
        removeChild: function() {},
        querySelector: function() { return null; },
        querySelectorAll: function() { return []; },
        innerHTML: '',
        textContent: '',
        value: '',
        onclick: null,
        remove: function() {},
        focus: function() {},
        blur: function() {},
        _isNullGuard: true
      };
    }
    return el;
  };

  console.log('[NULL-GUARD] Active');
})();

// ============================================
// IMPORTS
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ============================================
// SAFE TEXT REPLACEMENT — sob textContent safe
// ============================================
(function safeTextReplacement() {
  if (window.__safeTextReplacement) return;
  window.__safeTextReplacement = true;

  var originalTextContent = null;

  try {
    originalTextContent = Object.getOwnPropertyDescriptor(
      Element.prototype, "textContent"
    );
  } catch(e) {}

  if (!originalTextContent || !originalTextContent.set) {
    try {
      originalTextContent = Object.getOwnPropertyDescriptor(
        Node.prototype, "textContent"
      );
    } catch(e) {}
  }

  if (!originalTextContent || !originalTextContent.set) {
    console.warn("[SAFE-TEXT] Descriptor nei, manual fallback");
    return;
  }

  try {
    Object.defineProperty(HTMLElement.prototype, "textContent", {
      get: function() {
        try {
          if (this === null || this === undefined) return "";
          return originalTextContent.get.call(this);
        } catch(e) { return ""; }
      },
      set: function(value) {
        try {
          if (this === null || this === undefined) return;
          originalTextContent.set.call(this, value);
        } catch(e) {}
      },
      configurable: true
    });

    console.log("[SAFE-TEXT] Global textContent safety active");
  } catch(e) {
    console.warn("[SAFE-TEXT] Cannot override:", e.message);
  }
})();

// ============================================
// FIREBASE CONFIG
// ============================================
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

// ============================================
// DOM ELEMENTS
// ============================================
const loginPage = document.getElementById("login-page");
const dashboardPage = document.getElementById("dashboard-page");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");
const message = document.getElementById("message");

var balanceEl = null;
function getBalanceEl() {
  if (!balanceEl || !balanceEl.textContent) {
    balanceEl = document.getElementById("balance");
  }
  return balanceEl;
}
const balanceChip = document.getElementById("balance-chip");
const balancePopup = document.getElementById("balance-popup");
const balancePopupClose = document.getElementById("balance-popup-close");
const balancePopupOverlay = document.getElementById("balance-popup-overlay");
const balancePopupValue = document.getElementById("balance-popup-value");

const accountPopup = document.getElementById("account-popup");
const accountPopupOverlay = document.getElementById("account-popup-overlay");
const accountPopupClose = document.getElementById("account-popup-close");
const accountToggleBtn = document.getElementById("account-toggle");
const accountOptions = document.querySelectorAll(".account-option");
const accBtnsPopup = document.querySelectorAll(".acc-btn-popup");

const depositPopup = document.getElementById("deposit-popup");
const depositPopupOverlay = document.getElementById("deposit-popup-overlay");
const depositPopupClose = document.getElementById("deposit-popup-close");
const depositBtn = document.getElementById("deposit-btn");
const depositAmount = document.getElementById("deposit-amount");
const depositTxid = document.getElementById("deposit-txid");
const depositSubmit = document.getElementById("deposit-submit");
const depositMessage = document.getElementById("deposit-message");

const withdrawPopup = document.getElementById("withdraw-popup");
const withdrawPopupOverlay = document.getElementById("withdraw-popup-overlay");
const withdrawPopupClose = document.getElementById("withdraw-popup-close");
const withdrawBtn = document.getElementById("withdraw-btn");
const withdrawAmount = document.getElementById("withdraw-amount");
const withdrawMethod = document.getElementById("withdraw-method");
const withdrawNumber = document.getElementById("withdraw-number");
const withdrawSubmit = document.getElementById("withdraw-submit");
const withdrawMessage = document.getElementById("withdraw-message");

const assetSelect = document.getElementById("asset-select");
const currentPriceEl = document.getElementById("current-price");
const priceArrowEl = document.getElementById("price-arrow");
const chartEl = document.getElementById("chart");
const chartWrapper = document.getElementById("chart-wrapper");
const drawingCanvas = document.getElementById("drawing-canvas");

const tradeAmountInput = document.getElementById("trade-amount");
const callBtn = document.getElementById("call-btn");
const putBtn = document.getElementById("put-btn");
const tradeMessage = document.getElementById("trade-message");
const bigTimer = document.getElementById("big-timer");

const activeTradesList = document.getElementById("active-trades-list");
const historyList = document.getElementById("history-list");
const activeCount = document.getElementById("active-count");

// ============================================
// GLOBALS
// ============================================
let currentUser = null;
let userBalance = 0;
let currentPrice = 50000;
let prevPrice = 50000;
let selectedTime = 60;
let selectedTimeframe = "1m";
let selectedAsset = "BTCUSDT";
let accountType = "demo";
let activeTradesUnsub = null;
let historyUnsub = null;
let activeTradesLocal = [];
let lastTradeTime = 0;
let livePriceWS = null;
let chart = null;
let candleSeries = null;
let currentDrawingTool = "cursor";
let drawings = [];
let isDrawing = false;
let drawStartPoint = null;

// ============================================
// SOUNDS
// ============================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  try {
    if (audioCtx.state === "suspended") audioCtx.resume();
    if (type === "click") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.frequency.value = 800; osc.type = "sine";
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === "win") {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.value = freq; osc.type = "sine";
        const t = audioCtx.currentTime + i * 0.1;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t); osc.stop(t + 0.3);
      });
    } else if (type === "loss") {
      [392, 329.63, 261.63].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.value = freq; osc.type = "sawtooth";
        const t = audioCtx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.start(t); osc.stop(t + 0.35);
      });
    }
  } catch (e) {}
}

function showResultFlash(result) {
  const flash = document.createElement("div");
  flash.className = `result-flash ${result}`;
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 700);
}

function animateBalanceChange(amount) {
  const chip = balanceChip;
  if (!chip) return;
  const balAmount = chip.querySelector(".balance-amount");
  if (!balAmount) return;
  if (amount > 0) {
    chip.style.color = "#00c853";
    balAmount.textContent = `+$${amount.toFixed(2)}`;
  } else {
    chip.style.color = "#ff5252";
    balAmount.textContent = `-$${Math.abs(amount).toFixed(2)}`;
  }
  setTimeout(() => {
    chip.style.color = "#00c853";
    balAmount.textContent = `$${userBalance.toFixed(2)}`;
  }, 2000);
}
// ============================================
// Part 2: Auth + Popups + Account + Deposit/Withdraw
// ============================================

signupBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) { message.textContent = "ইমেইল ও পাসওয়ার্ড দিন"; return; }
  if (password.length < 6) { message.textContent = "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর"; return; }
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", userCred.user.uid), {
      email: email, balance: 1000, demoBalance: 1000, realBalance: 0,
      accountType: "demo", role: "user",
      createdAt: new Date().toISOString(), referralEarned: 0
    });
    if (typeof applyReferralOnSignup === "function") {
      await applyReferralOnSignup(userCred.user.uid, email);
    }
    message.style.color = "#00c853";
    message.textContent = "রেজিস্ট্রেশন সফল! ব্যালেন্স $1000";
  } catch (error) {
    message.style.color = "#ff5252";
    message.textContent = error.message;
  }
});

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) { message.textContent = "ইমেইল ও পাসওয়ার্ড দিন"; return; }
  try {
    await signInWithEmailAndPassword(auth, email, password);
    message.style.color = "#00c853";
    message.textContent = "লগইন সফল!";
  } catch (error) {
    message.style.color = "#ff5252";
    message.textContent = error.message;
  }
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => { await signOut(auth); });
}

document.querySelectorAll(".qx-inc-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    let val = parseFloat(tradeAmountInput.value) || 0;
    if (btn.dataset.action === "plus") val += 1;
    else val = Math.max(1, val - 1);
    tradeAmountInput.value = val;
  });
});

document.querySelectorAll(".amount-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    let val = parseFloat(tradeAmountInput.value) || 0;
    if (btn.dataset.action === "plus") val += 5;
    else val = Math.max(1, val - 5);
    tradeAmountInput.value = val;
  });
});

document.querySelectorAll(".time-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".time-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedTime = parseInt(btn.dataset.time);
  });
});

// ===== TIMEFRAME DROPDOWN (Quotex-style) =====
(function initTfDropdown() {
  var menuBtn = document.getElementById("chart-menu-btn");
  var dropdown = document.getElementById("tf-dropdown");
  var activeLabel = document.getElementById("qx-tf-active");
  if (!dropdown) return;

  // Toggle dropdown
  if (menuBtn) {
    menuBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      dropdown.classList.toggle("active");
    });
  }

  // Close on outside click
  document.addEventListener("click", function(e) {
    if (!dropdown.contains(e.target) && e.target !== menuBtn) {
      dropdown.classList.remove("active");
    }
  });

  // Timeframe item click
  dropdown.querySelectorAll(".qx-tf-item").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      dropdown.querySelectorAll(".qx-tf-item").forEach(function(b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      var tf = btn.dataset.tf;
      selectedTimeframe = tf;
      if (activeLabel) activeLabel.textContent = tf;
      if (typeof loadCandles === "function") {
        await loadCandles();
      }
      if (currentUser && typeof startLivePrice === "function") {
        startLivePrice();
      }
      dropdown.classList.remove("active");
      console.log("[TF] Changed to:", tf);
    });
  });

  console.log("[TF] Dropdown initialized");
})();

if (assetSelect) {
  assetSelect.addEventListener("change", async () => {
    selectedAsset = assetSelect.value;
    await loadCandles();
    if (currentUser) startLivePrice();
  });
}

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
    var activeTab = document.getElementById("active-trades-list");
    var historyTab = document.getElementById("history-list");
    if (btn.dataset.tab === "active" && activeTab) activeTab.classList.add("active");
    else if (historyTab) historyTab.classList.add("active");
  });
});

document.querySelectorAll(".drawing-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tool = btn.dataset.tool;
    if (tool === "Eraser") {
      if (typeof clearAllDrawings === "function") clearAllDrawings();
      return;
    }
    document.querySelectorAll(".drawing-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentDrawingTool = tool;
    if (drawingCanvas) {
      if (tool === "cursor") drawingCanvas.classList.remove("active");
      else drawingCanvas.classList.add("active");
    }
  });
});

function openPopup(popup, overlay) {
  if (!popup) return;
  popup.classList.remove("hidden");
  if (overlay) overlay.onclick = () => closePopup(popup);
}

function closePopup(popup) {
  if (!popup) return;
  popup.classList.add("hidden");
}

if (balanceChip) {
  balanceChip.addEventListener("click", () => {
    if (balancePopupValue) balancePopupValue.textContent = userBalance.toFixed(2);
    if (balancePopup) openPopup(balancePopup, balancePopupOverlay);
    else openPopup(accountPopup, accountPopupOverlay);
  });
}
if (balancePopupClose) balancePopupClose.addEventListener("click", () => closePopup(balancePopup));

if (accountToggleBtn) {
  accountToggleBtn.addEventListener("click", () => openPopup(accountPopup, accountPopupOverlay));
}
if (accountPopupClose) accountPopupClose.addEventListener("click", () => closePopup(accountPopup));

if (depositBtn) {
  depositBtn.addEventListener("click", () => {
    if (balancePopup) closePopup(balancePopup);
    openPopup(depositPopup, depositPopupOverlay);
  });
}
if (depositPopupClose) depositPopupClose.addEventListener("click", () => closePopup(depositPopup));

if (withdrawBtn) {
  withdrawBtn.addEventListener("click", () => {
    if (balancePopup) closePopup(balancePopup);
    openPopup(withdrawPopup, withdrawPopupOverlay);
  });
}
if (withdrawPopupClose) withdrawPopupClose.addEventListener("click", () => closePopup(withdrawPopup));

async function switchAccount(type) {
  accountType = type;
  document.querySelectorAll(".acc-btn-popup").forEach(b => b.classList.toggle("active", b.dataset.acc === type));
  document.querySelectorAll(".account-option").forEach(b => b.classList.toggle("active", b.dataset.acc === type));
  if (!currentUser) return;
  try {
    const userRef = doc(db, "users", currentUser.uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      userBalance = type === "demo" ? (data.demoBalance ?? 1000) : (data.realBalance ?? 0);
      safeSetTextById("balance", userBalance.toFixed(2));
      safeSetTextById("balance-popup-value", userBalance.toFixed(2));
    }
    await updateDoc(userRef, { accountType: type });
  } catch (err) { console.error("Switch account error:", err); }
  closePopup(accountPopup);
}

if (accBtnsPopup) accBtnsPopup.forEach(btn => btn.addEventListener("click", () => switchAccount(btn.dataset.acc)));
if (accountOptions) accountOptions.forEach(btn => btn.addEventListener("click", () => switchAccount(btn.dataset.acc)));

if (depositSubmit) {
  depositSubmit.addEventListener("click", async () => {
    if (!currentUser) return;
    const amount = parseFloat(depositAmount.value);
    const txid = depositTxid.value.trim();
    if (!amount || amount < 1) { depositMessage.style.color = "#ff5252"; depositMessage.textContent = "সর্বনিম্ন $1 দিন"; return; }
    if (!txid) { depositMessage.style.color = "#ff5252"; depositMessage.textContent = "TrxID দিন"; return; }
    try {
      await addDoc(collection(db, "deposits"), {
        userId: currentUser.uid, email: currentUser.email, amount: amount,
        txid: txid, method: "manual", status: "pending",
        createdAt: new Date().toISOString()
      });
      depositMessage.style.color = "#00c853";
      depositMessage.textContent = "রিকোয়েস্ট পাঠানো হয়েছে!";
      depositAmount.value = ""; depositTxid.value = "";
      setTimeout(() => { closePopup(depositPopup); depositMessage.textContent = ""; }, 1500);
    } catch (err) { depositMessage.style.color = "#ff5252"; depositMessage.textContent = err.message; }
  });
}

if (withdrawSubmit) {
  withdrawSubmit.addEventListener("click", async () => {
    if (!currentUser) return;
    const amount = parseFloat(withdrawAmount.value);
    const method = withdrawMethod.value;
    const number = withdrawNumber.value.trim();
    if (!amount || amount < 1) { withdrawMessage.style.color = "#ff5252"; withdrawMessage.textContent = "সর্বনিম্ন $1 দিন"; return; }
    if (amount > userBalance) { withdrawMessage.style.color = "#ff5252"; withdrawMessage.textContent = "পর্যাপ্ত ব্যালেন্স নেই"; return; }
    if (!number) { withdrawMessage.style.color = "#ff5252"; withdrawMessage.textContent = "একাউন্ট নাম্বার দিন"; return; }
    try {
      await addDoc(collection(db, "withdrawals"), {
        userId: currentUser.uid, email: currentUser.email, amount: amount,
        method: method, number: number, status: "pending",
        createdAt: new Date().toISOString()
      });
      withdrawMessage.style.color = "#00c853";
      withdrawMessage.textContent = "রিকোয়েস্ট পাঠানো হয়েছে!";
      withdrawAmount.value = ""; withdrawNumber.value = "";
      setTimeout(() => { closePopup(withdrawPopup); withdrawMessage.textContent = ""; }, 1500);
    } catch (err) { withdrawMessage.style.color = "#ff5252"; withdrawMessage.textContent = err.message; }
  });
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    loginPage.classList.add("hidden");
    dashboardPage.classList.remove("hidden");
    message.textContent = "";
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        accountType = data.accountType || "demo";
        userBalance = accountType === "demo" ? (data.demoBalance ?? data.balance ?? 1000) : (data.realBalance ?? 0);
        safeSetTextById("balance", userBalance.toFixed(2));
        safeSetTextById("balance-popup-value", userBalance.toFixed(2));
      }
    } catch (err) { console.error(err); }
    initChart();
    await loadCandles();
    startLivePrice();
    loadActiveTrades();
    loadHistory();
  } else {
    currentUser = null;
    loginPage.classList.remove("hidden");
    dashboardPage.classList.add("hidden");
    emailInput.value = ""; passwordInput.value = "";
    stopLivePrice();
    if (activeTradesUnsub) activeTradesUnsub();
    if (historyUnsub) historyUnsub();
    activeTradesLocal = [];
  }
});
// ============================================
// Part 3: Chart Init + Candles + WebSocket
// ============================================

function initChart() {
  if (!chartEl) return;

  chartEl.innerHTML = "";

  if (chart) {
    try { chart.remove(); } catch (e) {}
    chart = null;
  }

  const wrapperHeight = chartWrapper ? chartWrapper.clientHeight : 290;

  chart = LightweightCharts.createChart(chartEl, {
    width: chartEl.clientWidth,
    height: wrapperHeight,
    layout: {
      background: { color: "#0a0f1a" },
      textColor: "#6b7a90",
      fontSize: 11
    },
    grid: {
      vertLines: { color: "#131a26", style: 0 },
      horzLines: { color: "#131a26", style: 0 }
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
      vertLine: {
        color: "#58a6ff",
        width: 1,
        style: 2,
        labelBackgroundColor: "#1f6feb"
      },
      horzLine: {
        color: "#58a6ff",
        width: 1,
        style: 2,
        labelBackgroundColor: "#1f6feb"
      }
    },
    rightPriceScale: {
      borderColor: "#1f2a3d",
      scaleMargins: { top: 0.1, bottom: 0.1 }
    },
    timeScale: {
      borderColor: "#1f2a3d",
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 5,
      barSpacing: 8,
      fixLeftEdge: false,
      lockVisibleTimeRangeOnResize: true,
      rightBarStaysOnScroll: true,
      borderVisible: false,
      visible: false
    },
    handleScroll: {
      mouseWheel: true,
      pressedMouseMove: true,
      horzTouchDrag: true,
      vertTouchDrag: false
    },
    handleScale: {
      axisPressedMouseMove: true,
      mouseWheel: true,
      pinch: true
    }
  });

  candleSeries = chart.addCandlestickSeries({
    upColor: "#00c853",
    downColor: "#ff5252",
    borderUpColor: "#00c853",
    borderDownColor: "#ff5252",
    wickUpColor: "#00c853",
    wickDownColor: "#ff5252",
    priceLineVisible: false,
    lastValueVisible: false
  });

  // ===== QUOTEX WATERMARK =====
  try {
    var chartWatermark = document.createElement("div");
    chartWatermark.className = "qx-chart-watermark";
    chartWatermark.innerHTML = "QUOTEX";
    chartEl.appendChild(chartWatermark);
  } catch(e) {}

  // ===== TIME LABELS (Quotex-style) =====
  try {
    var timeLabels = document.createElement("div");
    timeLabels.className = "qx-time-labels";
    timeLabels.id = "qx-time-labels";
    chartEl.appendChild(timeLabels);
  } catch(e) {}

  // ===== PRICE DOT (Quotex-style) =====
  try {
    var priceDot = document.createElement("div");
    priceDot.id = "qx-price-dot";
    priceDot.className = "qx-price-dot";
    chartEl.appendChild(priceDot);
  } catch(e) {}

  // Update time labels
  setInterval(function() {
    try {
      var labelsEl = document.getElementById("qx-time-labels");
      if (!labelsEl) return;
      var now = new Date();
      var labels = [];
      for (var i = -2; i <= 2; i++) {
        var t = new Date(now.getTime() + i * 2 * 60 * 1000);
        var hh = String(t.getHours()).padStart(2, "0");
        var mm = String(t.getMinutes()).padStart(2, "0");
        labels.push(hh + ":" + mm);
      }
      labelsEl.innerHTML = labels.map(function(l, i) {
        return '<span class="qx-time-label' + (i === 2 ? " active" : "") + '">' + l + '</span>';
      }).join("");
    } catch(e) {}
  }, 1000);

  chart.timeScale().subscribeVisibleTimeRangeChange(() => {
    if (typeof redrawDrawings === "function") redrawDrawings();
  });

  if (typeof initDrawingSystem === "function") initDrawingSystem();

  window.addEventListener("resize", () => {
    if (chart && chartWrapper) {
      chart.applyOptions({
        width: chartEl.clientWidth,
        height: chartWrapper.clientHeight
      });
      if (typeof resizeDrawingCanvas === "function") resizeDrawingCanvas();
    }
  });
}

function convertTimeframe(tf) {
  const map = { "5s": "5s", "10s": "10s", "15s": "15s", "30s": "30s",
    "1m": "1m", "5m": "5m", "15m": "15m", "1h": "1h", "4h": "4h" };
  return map[tf] || "1m";
}

async function loadCandles() {
  console.log("[Candles] SHURU — asset:", selectedAsset);
  try {
    if (!candleSeries) { setTimeout(loadCandles, 500); return; }
    var isRealSymbol = /^(BTC|ETH|BNB|ADA|SOL|XRP|DOGE|MATIC|LTC|DOT)/i.test(selectedAsset);
    if (!isRealSymbol) { if (candleSeries) candleSeries.setData([]); return; }
    const interval = convertTimeframe(selectedTimeframe);
    const limit = interval.includes("s") ? 200 : 150;
    const url = "https://api.binance.com/api/v3/klines?symbol=" + selectedAsset + "&interval=" + interval + "&limit=" + limit;
    console.log("[Candles] Fetch:", url);
    const res = await fetch(url);
    const data = await res.json();
    if (!Array.isArray(data)) { console.error("[Candles] Binance error"); return; }
    var candleData = data.map(function(k) {
      return { time: Math.floor(k[0] / 1000), open: parseFloat(k[1]),
        high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]) };
    }).filter(function(c) {
      return c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0 &&
        !isNaN(c.open) && !isNaN(c.close) && c.high >= c.low;
    });
    console.log("[Candles] Valo candle:", candleData.length);
    if (candleData.length > 0 && candleSeries) {
      candleSeries.setData(candleData);
      chart.timeScale().fitContent();
      currentPrice = candleData[candleData.length - 1].close;
      prevPrice = currentPrice;
      if (currentPriceEl) currentPriceEl.textContent = currentPrice.toFixed(2);
      console.log("[Candles] " + candleData.length + " candle chart e boso");
    }
  } catch (err) { console.error("[Candles] Error:", err); }
}

function startLivePrice() {
  stopLivePrice();
  const interval = convertTimeframe(selectedTimeframe);
  const streamName = selectedAsset.toLowerCase() + "@kline_" + interval;
  const url = `wss://stream.binance.com:9443/ws/${streamName}`;
  try {
    livePriceWS = new WebSocket(url);
    livePriceWS.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (!msg.k) return;
        const k = msg.k;
        const price = parseFloat(k.c);
        prevPrice = currentPrice;
        currentPrice = price;
        if (currentPriceEl) currentPriceEl.textContent = currentPrice.toFixed(2);
        if (currentPrice >= prevPrice) {
          currentPriceEl.style.color = "#00c853";
          priceArrowEl.textContent = "▲";
        } else {
          currentPriceEl.style.color = "#ff5252";
          priceArrowEl.textContent = "▼";
        }
                if (candleSeries) {
          candleSeries.update({
            time: Math.floor(k.t / 1000), open: parseFloat(k.o),
            high: parseFloat(k.h), low: parseFloat(k.l), close: parseFloat(k.c)
          });
        }

        // ===== PRICE DOT UPDATE (Quotex-style) =====
        try {
          var priceDot = document.getElementById("qx-price-dot");
          if (priceDot && candleSeries) {
            var yPos = candleSeries.priceToCoordinate(currentPrice);
            if (yPos !== null && yPos !== undefined) {
              priceDot.style.top = yPos + "px";
              priceDot.style.display = "block";
              priceDot.className = "qx-price-dot " + (currentPrice >= prevPrice ? "up" : "down");
            }
          }
        } catch(e) {}

        checkExpiredTrades();
        updateBigTimer();
      } catch (err) {}
    };
    livePriceWS.onerror = () => {};
    livePriceWS.onclose = () => { setTimeout(() => { if (currentUser) startLivePrice(); }, 3000); };
  } catch (e) { console.log("WS init error:", e); }
}

function stopLivePrice() {
  if (livePriceWS) { try { livePriceWS.close(); } catch (e) {} livePriceWS = null; }
}

function formatPrice(price) {
  if (!price && price !== 0) return "0.00";
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(3);
  return price.toFixed(5);
}
// ============================================
// Part 4: Drawing System
// ============================================
let drawingCtx = null;

function initDrawingSystem() {
  if (!drawingCanvas || !chart || !candleSeries) return;
  drawingCtx = drawingCanvas.getContext("2d");
  resizeDrawingCanvas();
  drawingCanvas.addEventListener("touchstart", handleDrawStart, { passive: false });
  drawingCanvas.addEventListener("touchmove", handleDrawMove, { passive: false });
  drawingCanvas.addEventListener("touchend", handleDrawEnd, { passive: false });
  drawingCanvas.addEventListener("mousedown", handleDrawStart);
  drawingCanvas.addEventListener("mousemove", handleDrawMove);
  drawingCanvas.addEventListener("mouseup", handleDrawEnd);
  chart.timeScale().subscribeVisibleLogicalRangeChange(() => { redrawDrawings(); });
}

function resizeDrawingCanvas() {
  if (!drawingCanvas || !chartWrapper) return;
  const rect = chartWrapper.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  drawingCanvas.width = rect.width * dpr;
  drawingCanvas.height = rect.height * dpr;
  drawingCanvas.style.width = rect.width + "px";
  drawingCanvas.style.height = rect.height + "px";
  if (drawingCtx) drawingCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  redrawDrawings();
}

function getCanvasPoint(event) {
  const rect = drawingCanvas.getBoundingClientRect();
  let clientX, clientY;
  if (event.touches && event.touches.length > 0) {
    clientX = event.touches[0].clientX; clientY = event.touches[0].clientY;
  } else if (event.changedTouches && event.changedTouches.length > 0) {
    clientX = event.changedTouches[0].clientX; clientY = event.changedTouches[0].clientY;
  } else {
    clientX = event.clientX; clientY = event.clientY;
  }
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function pixelToData(x, y) {
  if (!chart || !candleSeries) return null;
  try {
    const time = chart.timeScale().coordinateToTime(x);
    const price = candleSeries.coordinateToPrice(y);
    if (time === null || price === null) return null;
    return { time, price, x, y };
  } catch (e) { return null; }
}

function dataToPixel(time, price) {
  if (!chart || !candleSeries) return null;
  try {
    const x = chart.timeScale().timeToCoordinate(time);
    const y = candleSeries.priceToCoordinate(price);
    if (x === null || y === null) return null;
    return { x, y };
  } catch (e) { return null; }
}

function handleDrawStart(event) {
  if (currentDrawingTool === "cursor") return;
  event.preventDefault();
  const point = getCanvasPoint(event);
  const data = pixelToData(point.x, point.y);
  if (!data) return;
  isDrawing = true;
  drawStartPoint = data;
  if (currentDrawingTool === "HorizontalLine" || currentDrawingTool === "VerticalLine") {
    saveDrawing({ tool: currentDrawingTool, points: [data] });
    isDrawing = false; drawStartPoint = null; return;
  }
  if (currentDrawingTool === "TextAnnotation") {
    const text = prompt("লেখা লিখুন:");
    if (text) saveDrawing({ tool: "TextAnnotation", points: [data], text: text });
    isDrawing = false; drawStartPoint = null; return;
  }
}

function handleDrawMove(event) {
  if (!isDrawing || !drawStartPoint) return;
  event.preventDefault();
  const point = getCanvasPoint(event);
  const data = pixelToData(point.x, point.y);
  if (!data) return;
  redrawDrawings();
  drawPreview({ tool: currentDrawingTool, points: [drawStartPoint, data] });
}

function handleDrawEnd(event) {
  if (!isDrawing || !drawStartPoint) return;
  event.preventDefault();
  const point = getCanvasPoint(event);
  const data = pixelToData(point.x, point.y);
  if (data && (Math.abs(data.x - drawStartPoint.x) > 5 || Math.abs(data.y - drawStartPoint.y) > 5)) {
    saveDrawing({ tool: currentDrawingTool, points: [drawStartPoint, data] });
  }
  isDrawing = false; drawStartPoint = null; redrawDrawings();
}

function saveDrawing(drawing) { drawings.push(drawing); redrawDrawings(); }

function clearAllDrawings() {
  drawings = [];
  if (drawingCtx && drawingCanvas) drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
}

function redrawDrawings() {
  if (!drawingCtx || !drawingCanvas) return;
  drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
  drawings.forEach(drawing => { drawShape(drawing); });
}

function drawPreview(drawing) {
  if (!drawingCtx) return;
  drawingCtx.save();
  drawingCtx.globalAlpha = 0.6;
  drawShape(drawing);
  drawingCtx.restore();
}

function drawShape(drawing) {
  if (!drawingCtx) return;
  const { tool, points, text } = drawing;
  if (!points || points.length === 0) return;
  const color = "#2196f3";
  drawingCtx.strokeStyle = color;
  drawingCtx.fillStyle = color;
  drawingCtx.lineWidth = 1.5;
  drawingCtx.font = "12px Arial";
  drawingCtx.textBaseline = "middle";

  if (tool === "HorizontalLine") {
    const p = dataToPixel(points[0].time, points[0].price);
    if (!p) return;
    drawingCtx.beginPath(); drawingCtx.moveTo(0, p.y);
    drawingCtx.lineTo(drawingCanvas.width, p.y); drawingCtx.stroke();
  } else if (tool === "VerticalLine") {
    const p = dataToPixel(points[0].time, points[0].price);
    if (!p) return;
    drawingCtx.beginPath(); drawingCtx.moveTo(p.x, 0);
    drawingCtx.lineTo(p.x, drawingCanvas.height); drawingCtx.stroke();
  } else if (tool === "TextAnnotation") {
    const p = dataToPixel(points[0].time, points[0].price);
    if (!p) return;
    drawingCtx.fillStyle = "#fff";
    drawingCtx.font = "bold 13px Arial";
    drawingCtx.fillText(text || "", p.x, p.y);
  } else if (points.length >= 2) {
    const p1 = dataToPixel(points[0].time, points[0].price);
    const p2 = dataToPixel(points[1].time, points[1].price);
    if (!p1 || !p2) return;
    if (tool === "TrendLine") {
      drawingCtx.beginPath(); drawingCtx.moveTo(p1.x, p1.y);
      drawingCtx.lineTo(p2.x, p2.y); drawingCtx.stroke();
    } else if (tool === "Rectangle") {
      drawingCtx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
    } else if (tool === "FibRetracement") {
      drawFibonacci(p1, p2);
    }
  }
}

function drawFibonacci(p1, p2) {
  const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const colors = ["#6b7a90", "#ff5252", "#ffb300", "#00c853", "#2196f3", "#9c27b0", "#6b7a90"];
  const height = p2.y - p1.y;
  const leftX = Math.min(p1.x, p2.x);
  const rightX = Math.max(p1.x, p2.x);
  levels.forEach((level, i) => {
    const y = p1.y + height * level;
    drawingCtx.strokeStyle = colors[i];
    drawingCtx.lineWidth = 1;
    drawingCtx.beginPath();
    drawingCtx.moveTo(leftX, y);
    drawingCtx.lineTo(rightX, y);
    drawingCtx.stroke();
    drawingCtx.fillStyle = colors[i];
    drawingCtx.font = "10px Arial";
    drawingCtx.fillText((level * 100).toFixed(1) + "%", rightX + 4, y);
  });
}
// ============================================
// Part 5: Trade Logic + Timer + History
// ============================================

function updateBigTimer() {
  var timerEl = document.getElementById("big-timer");
  if (!timerEl) return;
  if (activeTradesLocal.length === 0) {
    timerEl.classList.remove("hidden");
    var time = (typeof selectedTime !== "undefined") ? selectedTime : 60;
    var mm = Math.floor(time / 60);
    var ss = time % 60;
    timerEl.textContent = String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
    return;
  }
  let soonest = activeTradesLocal[0].expiresAt;
  activeTradesLocal.forEach(t => { if (t.expiresAt < soonest) soonest = t.expiresAt; });
  const remaining = Math.max(0, Math.ceil((soonest - Date.now()) / 1000));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  timerEl.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  timerEl.classList.remove("hidden");
  if (remaining <= 5) {
    timerEl.style.borderColor = "#ff5252"; timerEl.style.color = "#ff5252";
  } else {
    timerEl.style.borderColor = "#1f6feb"; timerEl.style.color = "#58a6ff";
  }
}

function updateTradeMarkers() {
  if (!candleSeries) return;
  const markers = [];
  activeTradesLocal.forEach((trade) => {
    if (!trade.entryTime) return;
    const entryTimeSec = Math.floor(new Date(trade.entryTime).getTime() / 1000);
    markers.push({
      time: entryTimeSec,
      position: trade.type === "call" ? "belowBar" : "aboveBar",
      color: trade.type === "call" ? "#00c853" : "#ff5252",
      shape: trade.type === "call" ? "arrowUp" : "arrowDown",
      text: `${trade.type.toUpperCase()} $${trade.amount}`
    });
  });
  markers.sort((a, b) => a.time - b.time);
  try { candleSeries.setMarkers(markers); } catch (e) {}
}

function drawEntryMarker(type, entryPrice, amount) {
  if (!window.candleSeries) return;
  var now = Math.floor(Date.now() / 1000);
  var isCall = (type === "call");
  var color = isCall ? "#00c853" : "#ff5252";

  // ===== DOT DOT DOT ARROW MARKER (Quotex-style) =====
  var dotMarkers = [];
  for (var i = 0; i < 4; i++) {
    dotMarkers.push({
      time: now - (4 - i) * 1,
      position: isCall ? "belowBar" : "aboveBar",
      color: color,
      shape: "circle",
      text: ""
    });
  }

  var arrowMarker = {
    time: now,
    position: isCall ? "belowBar" : "aboveBar",
    color: color,
    shape: isCall ? "arrowUp" : "arrowDown",
    text: (isCall ? "BUY" : "SELL") + " $" + amount
  };

  try {
    var existingMarkers = window.__tradeMarkers || [];
    var allNewMarkers = dotMarkers.concat([arrowMarker]);
    existingMarkers = existingMarkers.concat(allNewMarkers);
    existingMarkers.sort(function(a, b) { return a.time - b.time; });
    window.__tradeMarkers = existingMarkers;
    window.candleSeries.setMarkers(existingMarkers);
    console.log("[Marker] Dot-dot-arrow added");
  } catch (e) {
    console.error("[Marker] Error:", e.message);
  }

  // ===== ENTRY PRICE LINE =====
  try {
    if (window.candleSeries.createPriceLine) {
      if (window.__entryLines && window.__entryLines.length > 0) {
        window.__entryLines.forEach(function(line) {
          try { window.candleSeries.removePriceLine(line); } catch(e) {}
        });
      }
      window.__entryLines = [];
      var priceLine = window.candleSeries.createPriceLine({
        price: entryPrice,
        color: color,
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: ""
      });
      window.__entryLines.push(priceLine);
    }
  } catch (e) {
    console.error("[Marker] Line error:", e.message);
  }
}

async function placeTrade(type) {
  if (!currentUser) return;
  const now = Date.now();
  if (now - lastTradeTime < 500) return;
  lastTradeTime = now;

  var amountInput = document.getElementById("trade-amount");
  var amount = amountInput ? parseFloat(amountInput.value) : 1;

  function showMsg(text, color) {
    try {
      var msgEl = document.getElementById("trade-message");
      if (msgEl && msgEl.textContent !== undefined) {
        msgEl.style.color = color || "#ff5252";
        msgEl.textContent = text;
      }
    } catch(e) {}
    console.log("[Trade]", text);
  }

  if (!amount || amount < 1) { showMsg("সর্বনিম্ন $1 ট্রেড করুন", "#ff5252"); return; }
  if (amount > userBalance) { showMsg("পর্যাপ্ত ব্যালেন্স নেই", "#ff5252"); return; }

  playSound("click");
  var entryPrice = currentPrice;
  var expiresAt = Date.now() + selectedTime * 1000;
  var entryTime = new Date().toISOString();

  try {
    var newBalance = userBalance - amount;
    var balanceField = accountType === "demo" ? "demoBalance" : "realBalance";
    await updateDoc(doc(db, "users", currentUser.uid), {
      [balanceField]: newBalance, balance: newBalance
    });
    userBalance = newBalance;
    window.userBalance = newBalance;

    try {
      var balEl = document.getElementById("balance");
      if (balEl && balEl.textContent !== undefined) balEl.textContent = userBalance.toFixed(2);
    } catch(e) {}
    try {
      var bpvEl = document.getElementById("balance-popup-value");
      if (bpvEl && bpvEl.textContent !== undefined) bpvEl.textContent = userBalance.toFixed(2);
    } catch(e) {}

    if (typeof animateBalanceChange === "function") animateBalanceChange(-amount);

    await addDoc(collection(db, "trades"), {
      userId: currentUser.uid, userEmail: currentUser.email, type: type,
      amount: amount, entryPrice: entryPrice, expiresAt: expiresAt,
      entryTime: entryTime, asset: selectedAsset, accountType: accountType,
      status: "pending", result: null, profit: 0, createdAt: entryTime
    });

    showMsg(type.toUpperCase() + " $" + amount + " প্লেস হয়েছে",
      type === "call" ? "#00c853" : "#ff5252");

    setTimeout(function() {
      try {
        var tm = document.getElementById("trade-message");
        if (tm && tm.textContent !== undefined) tm.textContent = "";
      } catch(e) {}
    }, 2000);

    drawEntryMarker(type, entryPrice, amount);
    console.log("[Trade] Placed:", type, "$" + amount, "@ $" + entryPrice.toFixed(2));
  } catch (error) {
    showMsg(error.message, "#ff5252");
    console.error("[Trade] Error:", error);
  }
}

function bindTradeButtons() {
  var callBtnEl = document.getElementById("call-btn");
  var putBtnEl = document.getElementById("put-btn");
  if (callBtnEl && callBtnEl.dataset.tradeBound !== "1") {
    callBtnEl.dataset.tradeBound = "1";
    callBtnEl.addEventListener("click", function(e) {
      e.preventDefault();
      console.log("[Trade] CALL button clicked");
      placeTrade("call");
    });
  }
  if (putBtnEl && putBtnEl.dataset.tradeBound !== "1") {
    putBtnEl.dataset.tradeBound = "1";
    putBtnEl.addEventListener("click", function(e) {
      e.preventDefault();
      console.log("[Trade] PUT button clicked");
      placeTrade("put");
    });
  }
}

bindTradeButtons();
setTimeout(bindTradeButtons, 1500);
setTimeout(bindTradeButtons, 3000);

async function checkExpiredTrades() {
  if (!currentUser) return;
  const now = Date.now();
  for (const trade of activeTradesLocal) {
    if (trade.expiresAt <= now && trade.status === "pending") {
      const exitPrice = currentPrice;
      const entryPrice = trade.entryPrice;
      let result = "loss";
      if (trade.type === "call" && exitPrice > entryPrice) result = "win";
      else if (trade.type === "put" && exitPrice < entryPrice) result = "win";
      const payout = 1.85;
      const profit = result === "win" ? trade.amount * payout : 0;
      try {
        await updateDoc(doc(db, "trades", trade.id), {
          status: "completed", result: result, exitPrice: exitPrice,
          profit: profit, completedAt: new Date().toISOString()
        });
        if (result === "win") {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          const currentBal = userDoc.data().balance || 0;
          const newBal = currentBal + profit;
          const balanceField = accountType === "demo" ? "demoBalance" : "realBalance";
          await updateDoc(doc(db, "users", currentUser.uid), {
            [balanceField]: newBal, balance: newBal
          });
          userBalance = newBal;
          safeSetTextById("balance", userBalance.toFixed(2));
          safeSetTextById("balance-popup-value", userBalance.toFixed(2));
          animateBalanceChange(profit);
          showResultFlash("win");
          playSound("win");
          var tm1 = document.getElementById("trade-message");
          if (tm1) { tm1.style.color = "#00c853"; tm1.textContent = "🎉 জিতেছেন! +$" + profit.toFixed(2); }
        } else {
          showResultFlash("loss");
          playSound("loss");
          var tm2 = document.getElementById("trade-message");
          if (tm2) { tm2.style.color = "#ff5252"; tm2.textContent = "😔 হেরেছেন -$" + trade.amount.toFixed(2); }
        }
        setTimeout(function() {
          var tm3 = document.getElementById("trade-message");
          if (tm3) tm3.textContent = "";
        }, 3500);
      } catch (error) { console.error("Trade expire error:", error); }
    }
  }
}

function loadActiveTrades() {
  if (!currentUser) return;
  const q = query(collection(db, "trades"),
    where("userId", "==", currentUser.uid),
    where("status", "==", "pending"));
  activeTradesUnsub = onSnapshot(q, (snapshot) => {
    activeTradesLocal = [];
    if (activeTradesList) activeTradesList.innerHTML = "";
    if (snapshot.empty) {
      if (activeTradesList) activeTradesList.innerHTML = '<p class="empty-text">No active trades</p>';
      if (activeCount) activeCount.textContent = "0";
      if (bigTimer) bigTimer.classList.add("hidden");
      updateTradeMarkers();
      return;
    }
    snapshot.forEach((docSnap) => {
      const trade = { id: docSnap.id, ...docSnap.data() };
      activeTradesLocal.push(trade);
      const remaining = Math.max(0, Math.ceil((trade.expiresAt - Date.now()) / 1000));
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      const timeStr = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      const div = document.createElement("div");
      div.className = `trade-item ${trade.type}`;
      div.innerHTML = `<div class="trade-info">
        <span class="trade-type ${trade.type}">${trade.type.toUpperCase()}</span>
        <span class="trade-time">$${trade.amount} @ ${Number(trade.entryPrice).toFixed(2)}</span>
      </div><div class="trade-result pending">${timeStr}</div>`;
      if (activeTradesList) activeTradesList.appendChild(div);
    });
    if (activeCount) activeCount.textContent = activeTradesLocal.length;
    updateBigTimer();
    updateTradeMarkers();
  });
}

function loadHistory() {
  if (!currentUser) return;
  const q = query(collection(db, "trades"),
    where("userId", "==", currentUser.uid),
    where("status", "==", "completed"));
  historyUnsub = onSnapshot(q, (snapshot) => {
    if (historyList) historyList.innerHTML = "";
    if (snapshot.empty) {
      if (historyList) historyList.innerHTML = '<p class="empty-text">No trade history yet</p>';
      return;
    }
    const trades = [];
    snapshot.forEach((docSnap) => { trades.push({ id: docSnap.id, ...docSnap.data() }); });
    trades.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    trades.slice(0, 30).forEach((trade) => {
      const div = document.createElement("div");
      div.className = `trade-item ${trade.result}`;
      const entryTime = new Date(trade.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      const exitTime = trade.completedAt ? new Date(trade.completedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "-";
      div.innerHTML = `<div class="trade-info">
        <span class="trade-type ${trade.type}">${trade.type.toUpperCase()} ${trade.result === "win" ? "✓" : "✗"}</span>
        <span class="trade-time">Entry: $${trade.entryPrice.toFixed(2)} (${entryTime})</span>
        <span class="trade-time">Exit: $${(trade.exitPrice || 0).toFixed(2)} (${exitTime})</span>
        <span class="trade-time">Amount: $${trade.amount}</span>
      </div><div class="trade-result ${trade.result}">
        ${trade.result === "win" ? "+$" + trade.profit.toFixed(2) : "-$" + trade.amount.toFixed(2)}
      </div>`;
      if (historyList) historyList.appendChild(div);
    });
  });
}

setInterval(() => {
  if (currentUser && activeTradesLocal.length > 0) {
    updateBigTimer();
    updateTradeMarkers();
  }
}, 1000);

window.placeTrade = placeTrade;
window.drawEntryMarker = drawEntryMarker;
window.bindTradeButtons = bindTradeButtons;
window.updateBigTimer = updateBigTimer;
window.updateTradeMarkers = updateTradeMarkers;
window.loadActiveTrades = loadActiveTrades;
window.loadHistory = loadHistory;
window.checkExpiredTrades = checkExpiredTrades;
// ============================================
// Part 6: Admin Settings + Win Rate + Payout
// ============================================

let adminWinRate = 50;
let adminPayout = 85;
let adminForceMarket = 0;
let adminForceMarketAt = 0;
let adminAutoMode = false;
let lastForceMarket = 0;
let settingsUnsub = null;

function listenAdminSettings() {
  if (settingsUnsub) settingsUnsub();
  try {
    settingsUnsub = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      adminWinRate = data.winRate ?? 50;
      adminPayout = data.payout ?? 85;
      adminAutoMode = data.autoMode ?? false;
      const newForce = data.forceMarket ?? 0;
      const newForceAt = data.forceMarketAt ?? 0;
      if (newForce !== lastForceMarket && newForceAt > adminForceMarketAt) {
        const diff = newForce - lastForceMarket;
        applyMarketForce(diff);
        lastForceMarket = newForce;
        adminForceMarketAt = newForceAt;
      } else {
        lastForceMarket = newForce;
        adminForceMarketAt = newForceAt;
      }
      adminForceMarket = newForce;
      console.log(`⚙️ Admin — WinRate: ${adminWinRate}%, Payout: ${adminPayout}%, Auto: ${adminAutoMode}, Force: ${adminForceMarket}`);
    });
  } catch (err) { console.error("Settings listen error:", err); }
}

function applyMarketForce(diff) {
  if (!diff) return;
  const moveAmount = diff * 50;
  currentPrice += moveAmount;
  if (currentPriceEl) currentPriceEl.textContent = currentPrice.toFixed(2);
  if (moveAmount > 0) { currentPriceEl.style.color = "#00c853"; priceArrowEl.textContent = "▲"; }
  else { currentPriceEl.style.color = "#ff5252"; priceArrowEl.textContent = "▼"; }
  if (candleSeries) {
    const now = Math.floor(Date.now() / 1000);
    try {
      candleSeries.update({
        time: now, open: currentPrice - moveAmount,
        high: Math.max(currentPrice, currentPrice - moveAmount) + 5,
        low: Math.min(currentPrice, currentPrice - moveAmount) - 5,
        close: currentPrice
      });
    } catch (e) {}
  }
}

setTimeout(() => { if (currentUser) listenAdminSettings(); }, 2000);
setInterval(() => {
  if (currentUser && !settingsUnsub) listenAdminSettings();
  if (!currentUser && settingsUnsub) { settingsUnsub(); settingsUnsub = null; }
}, 3000);

async function checkExpiredTradesAdmin() {
  if (!currentUser) return;
  const now = Date.now();
  for (const trade of activeTradesLocal) {
    if (trade.expiresAt <= now && trade.status === "pending") {
      const exitPrice = currentPrice;
      const entryPrice = trade.entryPrice;
      let realResult = "loss";
      if (trade.type === "call" && exitPrice > entryPrice) realResult = "win";
      else if (trade.type === "put" && exitPrice < entryPrice) realResult = "win";
      let finalResult = realResult;
      let userWinRate = adminWinRate;
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.winRate !== undefined && userData.winRate !== null) userWinRate = userData.winRate;
        }
      } catch (e) {}
      const random = Math.random() * 100;
      if (random < userWinRate) finalResult = "win";
      else finalResult = "loss";
      const payoutRate = adminPayout / 100 + 1;
      const profit = finalResult === "win" ? trade.amount * payoutRate : 0;
      try {
        await updateDoc(doc(db, "trades", trade.id), {
          status: "completed", result: finalResult, exitPrice: exitPrice,
          profit: profit, completedAt: new Date().toISOString(), adminProcessed: true
        });
        if (finalResult === "win") {
          const userRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userRef);
          const userData = userDoc.data();
          const balanceField = accountType === "demo" ? "demoBalance" : "realBalance";
          const currentBal = userData[balanceField] ?? 0;
          const newBal = currentBal + profit;
          await updateDoc(userRef, { [balanceField]: newBal, balance: newBal });
          userBalance = newBal;
          safeSetTextById("balance", userBalance.toFixed(2));
          safeSetTextById("balance-popup-value", userBalance.toFixed(2));
          animateBalanceChange(profit);
          showResultFlash("win");
          playSound("win");
          var tm4 = document.getElementById("trade-message");
          if (tm4) { tm4.style.color = "#00c853"; tm4.textContent = "🎉 জিতেছেন! +$" + profit.toFixed(2); }
        } else {
          showResultFlash("loss");
          playSound("loss");
          var tm5 = document.getElementById("trade-message");
          if (tm5) { tm5.style.color = "#ff5252"; tm5.textContent = "😔 হেরেছেন -$" + trade.amount.toFixed(2); }
        }
        setTimeout(function() {
          var tm6 = document.getElementById("trade-message");
          if (tm6) tm6.textContent = "";
        }, 3500);
      } catch (error) { console.error("Admin trade expire error:", error); }
    }
  }
}

window.originalCheckExpired = checkExpiredTrades;
setInterval(() => {
  if (currentUser && activeTradesLocal.length > 0) checkExpiredTradesAdmin();
}, 1500);
console.log("✅ Admin Trade Checker চালু হয়েছে");

let autoModePriceInterval = null;

function startAutoModeDrift() {
  if (autoModePriceInterval) { clearInterval(autoModePriceInterval); autoModePriceInterval = null; }
  autoModePriceInterval = setInterval(() => {
    if (!adminAutoMode) return;
    if (!currentUser) return;
    let drift = (Math.random() - 0.5) * 40;
    if (adminForceMarket > 0) drift += Math.random() * 30;
    else if (adminForceMarket < 0) drift -= Math.random() * 30;
    currentPrice = Math.max(100, currentPrice + drift);
    if (currentPriceEl) currentPriceEl.textContent = currentPrice.toFixed(2);
    if (drift >= 0) { currentPriceEl.style.color = "#00c853"; priceArrowEl.textContent = "▲"; }
    else { currentPriceEl.style.color = "#ff5252"; priceArrowEl.textContent = "▼"; }
    if (candleSeries) {
      const now = Math.floor(Date.now() / 1000);
      const openP = currentPrice - drift;
      try {
        candleSeries.update({
          time: now, open: openP,
          high: Math.max(currentPrice, openP) + Math.abs(drift) * 0.5 + 2,
          low: Math.min(currentPrice, openP) - Math.abs(drift) * 0.5 - 2,
          close: currentPrice
        });
      } catch (e) {}
    }
    updateBigTimer();
  }, 1000);
}

setInterval(() => {
  if (currentUser && !autoModePriceInterval) startAutoModeDrift();
  if (!currentUser && autoModePriceInterval) { clearInterval(autoModePriceInterval); autoModePriceInterval = null; }
}, 2000);

let lastKnownForce = 0;
setInterval(() => {
  if (adminForceMarket !== lastKnownForce && currentUser) {
    const diff = adminForceMarket - lastKnownForce;
    applyMarketForce(diff);
    lastKnownForce = adminForceMarket;
  }
}, 500);

function updatePayoutLabels() {
  const labels = document.querySelectorAll(".btn-payout");
  labels.forEach(label => { label.textContent = `+${adminPayout}%`; });
}
setInterval(() => { if (currentUser) updatePayoutLabels(); }, 5000);

window.addEventListener("load", () => {
  setTimeout(() => {
    if (currentUser) { listenAdminSettings(); console.log("✅ Admin Settings লোড হয়েছে"); }
  }, 2500);
});

setInterval(async () => {
  if (!currentUser) return;
  if (adminForceMarket === 0) return;
  const now = Date.now();
  if (adminForceMarketAt > 0 && now - adminForceMarketAt > 300000) {
    try {
      await setDoc(doc(db, "settings", "global"), { forceMarket: 0, forceMarketAt: Date.now() }, { merge: true });
      console.log("🔄 Force auto reset (৫ মিনিট)");
    } catch (e) {}
  }
}, 60000);

console.log("🎉 Admin Control Integration সম্পূর্ণ!");
// ============================================
// Part 7: Dynamic Market + Candle Render
// ============================================

window.userMarkets = [];
window.marketsUnsub = null;
window.selectedMarketId = null;

async function loadUserMarketsFromFirestore() {
  try {
    const snap = await getDocs(collection(db, "markets"));
    const markets = [];
    snap.forEach(function(docSnap) {
      const m = docSnap.data();
      if (m.enabled === true) {
        markets.push({
          id: docSnap.id, name: m.name || "Unknown", symbol: m.symbol || "",
          basePrice: m.basePrice || 50000, payout: m.payout || 85,
          winRate: m.winRate || 50, candleMode: m.candleMode || "locked",
          currentCandleIndex: m.currentCandleIndex || 0
        });
      }
    });
    markets.sort(function(a, b) { return (a.name || "").localeCompare(b.name || ""); });
    console.log("[Markets] Loaded " + markets.length + " user markets");
    return markets;
  } catch (err) { console.error("[Markets] Load error:", err.message); return []; }
}

function populateAssetSelect(markets) {
  const sel = document.getElementById("asset-select");
  if (!sel) return;
  if (!markets || markets.length === 0) {
    sel.innerHTML = '<option value="BTCUSDT">BTC/USDT</option><option value="ETHUSDT">ETH/USDT</option><option value="BNBUSDT">BNB/USDT</option>';
    selectedAsset = "BTCUSDT";
    return;
  }
  const currentValue = sel.value;
  sel.innerHTML = "";
  var validCount = 0;
  markets.forEach(function(m) {
    if (!m.symbol || m.symbol.length < 3) return;
    const opt = document.createElement("option");
    opt.value = m.symbol;
    opt.textContent = m.name + (m.payout ? " +" + m.payout + "%" : "");
    opt.dataset.marketId = m.id;
    opt.dataset.basePrice = m.basePrice;
    opt.dataset.payout = m.payout;
    opt.dataset.winRate = m.winRate;
    sel.appendChild(opt);
    validCount++;
  });
  if (validCount === 0) {
    sel.innerHTML = '<option value="BTCUSDT">BTC/USDT</option><option value="ETHUSDT">ETH/USDT</option><option value="BNBUSDT">BNB/USDT</option>';
    selectedAsset = "BTCUSDT";
    return;
  }
  let found = false;
  for (let i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === currentValue) { sel.value = currentValue; found = true; break; }
  }
  if (!found && sel.options.length > 0) sel.selectedIndex = 0;
  if (sel.value) {
    selectedAsset = sel.value;
    window.selectedAsset = sel.value;
    window.selectedMarketId = sel.options[sel.selectedIndex]?.dataset.marketId || null;
  } else {
    selectedAsset = "BTCUSDT";
    window.selectedAsset = "BTCUSDT";
  }
  console.log("[Markets] " + validCount + " market boso. Selected: " + selectedAsset);
}

function listenUserMarkets() {
  if (window.marketsUnsub) { window.marketsUnsub(); window.marketsUnsub = null; }
  try {
    window.marketsUnsub = onSnapshot(collection(db, "markets"), function(snap) {
      const markets = [];
      snap.forEach(function(docSnap) {
        const m = docSnap.data();
        if (m.enabled === true) {
          markets.push({ id: docSnap.id, name: m.name || "Unknown", symbol: m.symbol || "",
            basePrice: m.basePrice || 50000, payout: m.payout || 85, winRate: m.winRate || 50 });
        }
      });
      markets.sort(function(a, b) { return (a.name || "").localeCompare(b.name || ""); });
      window.userMarkets = markets;
      populateAssetSelect(markets);
      console.log("[Markets] Real-time: " + markets.length + " markets");
    }, function(err) { console.error("[Markets] Listener error:", err.message); });
  } catch (err) { console.error("[Markets] Listen error:", err.message); }
}

function initUserMarkets() {
  console.log("[Markets] Initializing user markets...");
  loadUserMarketsFromFirestore().then(function(markets) {
    populateAssetSelect(markets);
  });
  listenUserMarkets();
}

(function() {
  setInterval(function() {
    if (window.currentUser && !window.marketsUnsub) initUserMarkets();
    if (!window.currentUser && window.marketsUnsub) {
      window.marketsUnsub();
      window.marketsUnsub = null;
    }
  }, 2000);
})();

window.db = db;
window.auth = auth;
window.getDocs = getDocs;
window.collection = collection;
window.doc = doc;
window.setDoc = setDoc;
window.updateDoc = updateDoc;
window.query = query;
window.where = where;
window.onSnapshot = onSnapshot;
window.addDoc = addDoc;
window.getDoc = getDoc;
console.log("✅ Firebase functions exposed to window");
console.log("Part 7A (Dynamic Market Load) loaded");

// ============================================
// PART 7B: CANDLE RENDER FROM FIRESTORE
// ============================================

window.userCandles = [];
window.userCandlesUnsub = null;

async function loadAdminCandlesFromFirestore(marketId) {
  if (!marketId) return [];
  try {
    const candlesRef = collection(db, "markets", marketId, "candles");
    const snap = await getDocs(candlesRef);
    if (snap.empty) return [];
    const candles = [];
    snap.forEach(function(docSnap) {
      const c = docSnap.data();
      candles.push({
        id: docSnap.id, number: c.number || 0, date: c.date || "",
        startTime: c.startTime || c.time || "", endTime: c.endTime || "",
        timeframe: c.timeframe || "1m", open: Number(c.open) || 0,
        high: Number(c.high) || 0, low: Number(c.low) || 0, close: Number(c.close) || 0
      });
    });
    candles.sort(function(a, b) { return (a.number || 0) - (b.number || 0); });
    return candles;
  } catch (err) { console.error("[Candles] Load error:", err.message); return []; }
}

function convertAdminCandleToChart(candle, baseIndex) {
  try {
    const dateStr = candle.date || "2026-01-01";
    const timeStr = candle.startTime || "00:00:00";
    const dateTimeStr = dateStr + "T" + timeStr + "Z";
    let timestamp = Math.floor(new Date(dateTimeStr).getTime() / 1000);
    if (isNaN(timestamp) || timestamp <= 0) {
      timestamp = Math.floor(Date.now() / 1000) - (baseIndex * 60);
    }
    return { time: timestamp, open: candle.open, high: candle.high, low: candle.low, close: candle.close };
  } catch (err) { return null; }
}

function renderAdminCandlesOnChart(candles) {
  if (!candleSeries || !candles || candles.length === 0) return;
  const chartData = [];
  candles.forEach(function(c, i) {
    const chartCandle = convertAdminCandleToChart(c, i);
    if (chartCandle && chartCandle.open > 0) chartData.push(chartCandle);
  });
  if (chartData.length === 0) return;
  chartData.sort(function(a, b) { return a.time - b.time; });
  const uniqueData = [];
  let lastTime = 0;
  chartData.forEach(function(c) {
    if (c.time > lastTime) { uniqueData.push(c); lastTime = c.time; }
  });
  try {
    candleSeries.setData(uniqueData);
    chart.timeScale().fitContent();
    const lastCandle = uniqueData[uniqueData.length - 1];
    if (lastCandle) {
      currentPrice = lastCandle.close;
      prevPrice = currentPrice;
      if (currentPriceEl) currentPriceEl.textContent = currentPrice.toFixed(2);
    }
    console.log("[Candles] Rendered " + uniqueData.length + " candles on chart");
  } catch (err) { console.error("[Candles] Render error:", err.message); }
}

async function loadUserCandlesSmart() {
  const marketId = window.selectedMarketId;
  if (marketId) {
    try {
      const adminCandles = await loadAdminCandlesFromFirestore(marketId);
      if (adminCandles.length > 0) {
        renderAdminCandlesOnChart(adminCandles);
        console.log("[Candles] Using ADMIN candles (" + adminCandles.length + ")");
        return;
      }
    } catch (err) { console.error("[Candles] Admin load error:", err.message); }
  }
  if (typeof loadCandles === "function") await loadCandles();
}

console.log("Part 7B (Candle Render from Firestore) loaded");
// ============================================
// MSG 10: Countdown + Entry Line + Trade Result
// ============================================

window.countdownInterval = null;

function updateTopCountdown() {
  var timerEl = document.getElementById("top-countdown-timer");
  var trades = (typeof activeTradesLocal !== "undefined" && Array.isArray(activeTradesLocal)) ? activeTradesLocal : [];
  if (trades.length === 0) {
    if (timerEl) timerEl.classList.add("hidden");
    return;
  }
  var soonest = trades[0];
  for (var i = 1; i < trades.length; i++) {
    if (trades[i].expiresAt < soonest.expiresAt) soonest = trades[i];
  }
  var remaining = Math.max(0, Math.ceil((soonest.expiresAt - Date.now()) / 1000));
  var mm = Math.floor(remaining / 60);
  var ss = remaining % 60;
  var timeStr = String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
  if (timerEl) {
    timerEl.classList.remove("hidden");
    var timeEl = document.getElementById("countdown-time");
    if (timeEl) timeEl.textContent = timeStr;
  }
}

function startCountdownInterval() {
  if (window.countdownInterval) return;
  window.countdownInterval = setInterval(updateTopCountdown, 200);
}
startCountdownInterval();

function renderTradeMarkers() {
  if (typeof candleSeries === "undefined" || !candleSeries) return;
  var trades = (typeof activeTradesLocal !== "undefined" && Array.isArray(activeTradesLocal)) ? activeTradesLocal : [];
  var markers = [];
  for (var i = 0; i < trades.length; i++) {
    var t = trades[i];
    if (!t.entryTime) continue;
    var entrySec = Math.floor(new Date(t.entryTime).getTime() / 1000);
    markers.push({
      time: entrySec,
      position: t.type === "call" ? "belowBar" : "aboveBar",
      color: t.type === "call" ? "#00c853" : "#ff5252",
      shape: t.type === "call" ? "arrowUp" : "arrowDown",
      text: String(t.type).toUpperCase() + " $" + t.amount
    });
  }
  markers.sort(function(a, b) { return a.time - b.time; });
  try { candleSeries.setMarkers(markers); } catch(e) {}
}
setInterval(renderTradeMarkers, 2000);

// ============================================
// MSG 11: Live Movement + Auto Candle + Analysis
// ============================================

window.adminWinPercent = 80;
window.adminLossPercent = 30;
window.liveSpeed = 500;
window.currentCandleTime = Math.floor(Date.now() / 1000);
window.currentCandleOpen = currentPrice;

function startLiveMovement() {
  setInterval(function() {
    if (typeof candleSeries === "undefined" || !candleSeries) return;
    var drift = (Math.random() - 0.5) * 30;
    currentPrice = Math.max(100, currentPrice + drift);
    window.currentPrice = currentPrice;
    if (currentPriceEl) {
      currentPriceEl.textContent = currentPrice.toFixed(2);
      currentPriceEl.style.color = drift >= 0 ? "#00c853" : "#ff5252";
    }
  }, 500);
}

setTimeout(function() {
  startLiveMovement();
  console.log("[MSG11] Live movement started");
}, 4000);

// ============================================
// MSG 12: Candle Manipulator + Trap + Delay
// ============================================

window.trapEngine = { trapRate: 30, delayRate: 20, reversalRate: 15 };

setTimeout(function() {
  onSnapshot(doc(db, "settings", "global"), function(snap) {
    if (!snap.exists()) return;
    var d = snap.data();
    window.trapEngine.trapRate = d.trapRate ?? 30;
    window.trapEngine.delayRate = d.delayRate ?? 20;
    window.trapEngine.reversalRate = d.reversalRate ?? 15;
  });
}, 3000);

// ============================================
// MSG 13: Auto 24/7 + Designer
// ============================================

window.autoGenerate24h = false;
window.designerCandle = null;
window.applyNextAt = 0;

setTimeout(function() {
  onSnapshot(doc(db, "settings", "global"), function(snap) {
    if (!snap.exists()) return;
    var d = snap.data();
    window.autoGenerate24h = d.autoGenerate24h === true;
  });
}, 3500);

// ============================================
// MSG 14: User Chat
// ============================================

window.userChatUnsub = null;

function openUserChat() {
  var popup = document.getElementById("chat-popup");
  var overlay = document.getElementById("chat-popup-overlay");
  if (!popup) return;
  popup.classList.remove("hidden");
  if (overlay) overlay.onclick = function() { closeUserChat(); };
  startUserChatListener();
}

function closeUserChat() {
  var popup = document.getElementById("chat-popup");
  if (!popup) return;
  popup.classList.add("hidden");
}

function startUserChatListener() {
  if (!currentUser) return;
  if (window.userChatUnsub) { try { window.userChatUnsub(); } catch(e) {} }
  try {
    var q = query(collection(db, "chats", currentUser.uid, "messages"), orderBy("timestamp", "asc"));
    window.userChatUnsub = onSnapshot(q, function(snap) {
      var messagesEl = document.getElementById("user-chat-messages");
      if (!messagesEl) return;
      messagesEl.innerHTML = "";
      if (snap.empty) { messagesEl.innerHTML = '<p class="empty-text">Send a message to admin...</p>'; return; }
      snap.forEach(function(d) {
        var m = d.data();
        var div = document.createElement("div");
        div.className = "user-chat-msg " + (m.from === "user" ? "from-user" : "from-admin");
        div.textContent = m.text || "";
        messagesEl.appendChild(div);
      });
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  } catch (err) { console.error("[MSG14] User chat error:", err.message); }
}

setTimeout(function() {
  var chatBtn = document.getElementById("chat-btn");
  if (chatBtn && chatBtn.dataset.bound !== "1") {
    chatBtn.dataset.bound = "1";
    chatBtn.onclick = openUserChat;
  }
  var closeBtn = document.getElementById("chat-popup-close");
  if (closeBtn && closeBtn.dataset.bound !== "1") {
    closeBtn.dataset.bound = "1";
    closeBtn.onclick = closeUserChat;
  }
}, 3000);

// ============================================
// AUTO FIX SYSTEM
// ============================================

(function autoFixNullText() {
  if (window.__autoFixNullText) return;
  window.__autoFixNullText = true;
  setInterval(function() {
    try {
      var bal = document.getElementById("balance");
      if (bal && window.userBalance !== undefined) {
        var expected = Number(window.userBalance).toFixed(2);
        if (bal.textContent === "" || bal.textContent === "0" || bal.textContent === "0.00") {
          bal.textContent = expected;
        }
      }
    } catch(e) {}
    try {
      var timer = document.getElementById("big-timer");
      if (timer && (!timer.textContent || timer.textContent.trim() === "")) {
        var time = (typeof selectedTime !== "undefined") ? selectedTime : 60;
        var m = Math.floor(time / 60);
        var s = time % 60;
        timer.textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
      }
    } catch(e) {}
  }, 500);
  console.log("[AUTO-FIX] Null text error auto fix active");
})();

// ============================================
// CHART RESIZE FORCE
// ============================================
setInterval(function() {
  try {
    if (window.chart && typeof window.chart.applyOptions === "function") {
      var wrap = document.getElementById("chart-wrapper");
      if (wrap && wrap.clientWidth > 0 && wrap.clientHeight > 0) {
        window.chart.applyOptions({ width: wrap.clientWidth, height: wrap.clientHeight });
      }
    }
  } catch(e) {}
}, 2000);

console.log("===== ALL PARTS LOADED =====");
console.log("===== Part 5: Trade Logic + Timer + History + Entry Marker loaded =====");
// ===== QUOTEX-STYLE TIME LABELS =====
try {
  var timeLabels = document.createElement("div");
  timeLabels.className = "qx-time-labels";
  timeLabels.id = "qx-time-labels";
  chartEl.appendChild(timeLabels);
} catch(e) {}

// Update time labels every 1s
setInterval(function() {
  try {
    var labelsEl = document.getElementById("qx-time-labels");
    if (!labelsEl) return;
    var now = new Date();
    var labels = [];
    for (var i = -2; i <= 2; i++) {
      var t = new Date(now.getTime() + i * 2 * 60 * 1000);
      var hh = String(t.getHours()).padStart(2, "0");
      var mm = String(t.getMinutes()).padStart(2, "0");
      labels.push(hh + ":" + mm);
    }
    labelsEl.innerHTML = labels.map(function(l, i) {
      return '<span class="qx-time-label' + (i === 2 ? " active" : "") + '">' + l + '</span>';
    }).join("");
  } catch(e) {}
}, 1000);
// ============================================
// MSG 4: TRADE LIST + TOAST + TRADES TAB
// ============================================

window.__toastTimeout = null;

function showToast(text, type) {
  try {
    var existing = document.querySelector(".qx-toast");
    if (existing) existing.remove();
    if (window.__toastTimeout) clearTimeout(window.__toastTimeout);

    var toast = document.createElement("div");
    toast.className = "qx-toast " + (type || "opened");
    toast.textContent = text;
    document.body.appendChild(toast);

    setTimeout(function() { toast.classList.add("show"); }, 50);

    window.__toastTimeout = setTimeout(function() {
      toast.classList.remove("show");
      setTimeout(function() { if (toast.parentNode) toast.remove(); }, 400);
    }, 3000);
  } catch(e) { console.error("[Toast] Error:", e); }
}

function formatDateBadge(dateStr) {
  try {
    var d = dateStr ? new Date(dateStr) : new Date();
    var months = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
      "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
    return d.getDate() + " " + months[d.getMonth()];
  } catch(e) { return "TODAY"; }
}

function renderTradeCard(trade, isHistory) {
  var card = document.createElement("div");
  card.className = "qx-trade-card";

  var symbol = trade.asset || "BTC/USDT";
  var type = (trade.type || "").toUpperCase();
  var entryPrice = Number(trade.entryPrice || 0).toFixed(2);

  var timeStr = "--:--";
  try {
    var t = new Date(trade.createdAt || trade.entryTime);
    timeStr = String(t.getHours()).padStart(2, "0") + ":" + String(t.getMinutes()).padStart(2, "0");
  } catch(e) {}

  var rightHtml = "";
  if (isHistory) {
    card.classList.add(trade.result);
    var pl = trade.result === "win"
      ? "+$" + Number(trade.profit || 0).toFixed(2)
      : "-$" + Number(trade.amount || 0).toFixed(2);
    rightHtml = '<div class="qx-tc-pl ' + trade.result + '">' + pl + '</div>' +
      '<div class="qx-tc-time">' + timeStr + '</div>';
  } else {
    var remaining = Math.max(0, Math.ceil((trade.expiresAt - Date.now()) / 1000));
    var m = Math.floor(remaining / 60);
    var s = remaining % 60;
    var timerStr = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    rightHtml = '<div class="qx-tc-timer" data-expires="' + trade.expiresAt + '">' + timerStr + '</div>' +
      '<div class="qx-tc-amount">$' + Number(trade.amount || 0).toFixed(2) + '</div>';
  }

  card.innerHTML =
    '<div class="qx-tc-left">' +
      '<div class="qx-tc-symbol">' + symbol +
        '<span class="qx-tc-type-badge ' + trade.type + '">' + type + '</span>' +
      '</div>' +
      '<div class="qx-tc-time">Entry: $' + entryPrice + '</div>' +
    '</div>' +
    '<div class="qx-tc-right">' + rightHtml + '</div>';

  return card;
}

setInterval(function() {
  try {
    var timers = document.querySelectorAll(".qx-tc-timer[data-expires]");
    timers.forEach(function(el) {
      var expires = parseInt(el.dataset.expires);
      var remaining = Math.max(0, Math.ceil((expires - Date.now()) / 1000));
      var m = Math.floor(remaining / 60);
      var s = remaining % 60;
      el.textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    });
  } catch(e) {}
}, 500);

(function initTradesTabs() {
  var tabs = document.querySelectorAll(".qx-trades-tab");
  var activePane = document.getElementById("qx-trades-active-pane");
  var historyPane = document.getElementById("qx-trades-history-pane");

  tabs.forEach(function(tab) {
    tab.addEventListener("click", function() {
      tabs.forEach(function(t) { t.classList.remove("active"); });
      tab.classList.add("active");
      var which = tab.dataset.tradesTab;
      if (activePane) activePane.classList.toggle("active", which === "active");
      if (historyPane) historyPane.classList.toggle("active", which === "history");
    });
  });

  console.log("[MSG4] Trades tabs initialized");
})();

function updateDateBadge() {
  try {
    var today = formatDateBadge(new Date().toISOString());

    var dateLabel = document.getElementById("qx-date-label");
    var dateCount = document.getElementById("qx-date-count");
    if (dateLabel) dateLabel.textContent = today;
    if (dateCount) dateCount.textContent = activeTradesLocal.length;

    var hDateLabel = document.getElementById("qx-history-date-label");
    var hDateCount = document.getElementById("qx-history-date-count");
    if (hDateLabel) hDateLabel.textContent = today;

    var badge = document.getElementById("trades-count-badge");
    if (badge) badge.textContent = activeTradesLocal.length;
  } catch(e) {}
}
setInterval(updateDateBadge, 1500);

// ===== OVERRIDE loadActiveTrades (Quotex card render) =====
(function patchLoadActiveTrades() {
  if (typeof window.loadActiveTrades !== "function") return;

  var _origLoadActiveTrades = window.loadActiveTrades;

  window.loadActiveTrades = function() {
    if (!currentUser) return;
    var q = query(collection(db, "trades"),
      where("userId", "==", currentUser.uid),
      where("status", "==", "pending"));
    if (activeTradesUnsub) { try { activeTradesUnsub(); } catch(e) {} }
    activeTradesUnsub = onSnapshot(q, function(snapshot) {
      activeTradesLocal = [];
      if (activeTradesList) activeTradesList.innerHTML = "";
      if (snapshot.empty) {
        if (activeTradesList) activeTradesList.innerHTML = '<p class="empty-text">No active trades</p>';
        if (activeCount) activeCount.textContent = "0";
        if (bigTimer) bigTimer.classList.add("hidden");
        updateTradeMarkers();
        return;
      }
      snapshot.forEach(function(docSnap) {
        var trade = Object.assign({ id: docSnap.id }, docSnap.data());
        activeTradesLocal.push(trade);
        if (activeTradesList) activeTradesList.appendChild(renderTradeCard(trade, false));
      });
      if (activeCount) activeCount.textContent = activeTradesLocal.length;
      updateBigTimer();
      updateTradeMarkers();
    });
  };
  console.log("[MSG4] loadActiveTrades patched");
})();

// ===== OVERRIDE loadHistory (Quotex card render) =====
(function patchLoadHistory() {
  if (typeof window.loadHistory !== "function") return;
  window.loadHistory = function() {
    if (!currentUser) return;
    var q = query(collection(db, "trades"),
      where("userId", "==", currentUser.uid),
      where("status", "==", "completed"));
    if (historyUnsub) { try { historyUnsub(); } catch(e) {} }
    historyUnsub = onSnapshot(q, function(snapshot) {
      if (historyList) historyList.innerHTML = "";
      if (snapshot.empty) {
        if (historyList) historyList.innerHTML = '<p class="empty-text">No trade history yet</p>';
        return;
      }
      var trades = [];
      snapshot.forEach(function(docSnap) {
        trades.push(Object.assign({ id: docSnap.id }, docSnap.data()));
      });
      trades.sort(function(a, b) {
        return new Date(b.completedAt || 0) - new Date(a.completedAt || 0);
      });
      var hCount = document.getElementById("qx-history-date-count");
      if (hCount) hCount.textContent = trades.length;
      trades.slice(0, 30).forEach(function(trade) {
        if (historyList) historyList.appendChild(renderTradeCard(trade, true));
      });
    });
  };
  console.log("[MSG4] loadHistory patched");
})();

// ===== OVERRIDE placeTrade → Toast =====
(function patchPlaceTrade() {
  if (typeof window.placeTrade !== "function") return;
  var _origPlace = window.placeTrade;

  window.placeTrade = async function(type) {
    var before = activeTradesLocal.length;
    await _origPlace(type);
    setTimeout(function() {
      if (activeTradesLocal.length > before) {
        var last = activeTradesLocal[activeTradesLocal.length - 1];
        if (last) {
          var sym = last.asset || "BTC/USDT";
          var price = Number(last.entryPrice || 0).toFixed(2);
          showToast("Trade opened with price: " + price + " " + sym, "opened");
        }
      }
    }, 700);
  };
  console.log("[MSG4] placeTrade wrapped");
})();

// ===== OVERRIDE showResultFlash → Toast =====
(function patchResultToast() {
  var _origFlash = window.showResultFlash;
  window.showResultFlash = function(result) {
    try { if (_origFlash) _origFlash(result); } catch(e) {}
    if (result === "win") showToast("RESULT (P/L) + WIN", "win");
    else if (result === "loss") showToast("RESULT (P/L) - LOSS", "loss");
  };
  console.log("[MSG4] Result toast wrapped");
})();

window.renderTradeCard = renderTradeCard;
window.showToast = showToast;
window.formatDateBadge = formatDateBadge;
window.updateDateBadge = updateDateBadge;

console.log("===== MSG 4: Trade List + Toast + Trades Tab LOADED =====");
// ============================================
// MSG 5: TOP BAR + BONUS BANNER + BOTTOM NAV
// ============================================

// ===== BONUS BANNER CLOSE =====
(function initBonusBanner() {
  var closeBtn = document.getElementById("bonus-close");
  var banner = document.getElementById("bonus-banner");
  if (closeBtn && banner) {
    closeBtn.addEventListener("click", function() {
      banner.classList.add("hidden");
      try { localStorage.setItem("bonusBannerClosed", "1"); } catch(e) {}
      console.log("[MSG5] Bonus banner closed");
    });
    try {
      if (localStorage.getItem("bonusBannerClosed") === "1") {
        banner.classList.add("hidden");
      }
    } catch(e) {}
  }
  console.log("[MSG5] Bonus banner initialized");
})();

// ===== BOTTOM NAV BUTTONS =====
(function initBottomNav() {
  var navBtns = document.querySelectorAll(".qx-nav-btn");

  navBtns.forEach(function(btn) {
    btn.addEventListener("click", function() {
      var nav = btn.dataset.nav;

      // Active state
      navBtns.forEach(function(b) { b.classList.remove("active"); });
      btn.classList.add("active");

      // Actions
      if (nav === "more") {
        var moreMenu = document.getElementById("more-menu");
        if (moreMenu) moreMenu.classList.remove("hidden");
      } else if (nav === "tournament") {
        var tourPopup = document.getElementById("tournament-popup");
        if (tourPopup) tourPopup.classList.remove("hidden");
      } else if (nav === "help") {
        var chatPopup = document.getElementById("chat-popup");
        if (chatPopup) chatPopup.classList.remove("hidden");
      } else if (nav === "history") {
        // Scroll to trades section
        var tradesSection = document.querySelector(".qx-trades-section");
        if (tradesSection) tradesSection.scrollIntoView({ behavior: "smooth" });
      }

      console.log("[MSG5] Nav clicked:", nav);
    });
  });

  console.log("[MSG5] Bottom nav initialized");
})();

// ===== TOP BAR — NOTIFICATION BELL =====
(function initNotifBell() {
  var bellBtn = document.getElementById("notif-btn");
  if (!bellBtn) return;

  bellBtn.addEventListener("click", function() {
    var badge = document.getElementById("notif-badge");
    if (badge) {
      badge.textContent = "0";
      badge.style.display = "none";
    }
    console.log("[MSG5] Notifications cleared");
  });

  console.log("[MSG5] Notif bell initialized");
})();

// ===== UPDATE ACCOUNT TYPE BADGE (DEMO/REAL) =====
setInterval(function() {
  try {
    var badge = document.getElementById("qx-account-type");
    if (badge && typeof accountType !== "undefined") {
      badge.textContent = accountType === "demo" ? "DEMO" : "LIVE";
      badge.style.background = accountType === "demo"
        ? "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)"
        : "linear-gradient(135deg, #00c853 0%, #00a844 100%)";
    }
  } catch(e) {}
}, 1500);

// ===== BALANCE UPDATE =====
setInterval(function() {
  try {
    var balEl = document.getElementById("balance");
    if (balEl && typeof userBalance !== "undefined" && userBalance !== null) {
      var expected = Number(userBalance).toFixed(2);
      if (balEl.textContent !== expected) {
        balEl.textContent = expected;
      }
    }
  } catch(e) {}
}, 1000);

console.log("===== MSG 5: Top Bar + Bonus Banner + Bottom Nav LOADED =====");
// ============================================
// MSG 5 FIX: FORCE BUTTON BINDING
// (Sob button kaj korbe — trade chara)
// ============================================

(function forceBindAllButtons() {
  console.log("[FIX] Force binding all buttons...");

  // ===== 1. BOTTOM NAV BUTTONS =====
  var navBtns = document.querySelectorAll(".qx-nav-btn");
  navBtns.forEach(function(btn) {
    // Purono listener remove korte na parleo, notun listener add korbo
    var newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
  });

  // Re-query after clone
  var freshNavBtns = document.querySelectorAll(".qx-nav-btn");
  freshNavBtns.forEach(function(btn) {
    btn.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();

      var nav = btn.dataset.nav;
      console.log("[FIX] Nav clicked:", nav);

      // Active state
      freshNavBtns.forEach(function(b) { b.classList.remove("active"); });
      btn.classList.add("active");

      // ===== ACTIONS =====
      if (nav === "more") {
        var moreMenu = document.getElementById("more-menu");
        if (moreMenu) {
          moreMenu.classList.remove("hidden");
          console.log("[FIX] More menu opened");
        } else {
          console.warn("[FIX] more-menu element not found");
        }
      } 
      else if (nav === "tournament") {
        var tourPopup = document.getElementById("tournament-popup");
        if (tourPopup) {
          tourPopup.classList.remove("hidden");
          console.log("[FIX] Tournament popup opened");
        } else {
          console.warn("[FIX] tournament-popup not found");
        }
      } 
      else if (nav === "help") {
        var chatPopup = document.getElementById("chat-popup");
        if (chatPopup) {
          chatPopup.classList.remove("hidden");
          console.log("[FIX] Chat popup opened");
        } else {
          console.warn("[FIX] chat-popup not found");
        }
      } 
      else if (nav === "history") {
        var tradesSection = document.querySelector(".qx-trades-section");
        if (tradesSection) {
          tradesSection.scrollIntoView({ behavior: "smooth" });
        } else {
          // Fallback: history tab e switch
          var historyTab = document.querySelector('[data-trades-tab="history"]');
          if (historyTab) historyTab.click();
        }
      } 
      else if (nav === "profile") {
        var accountPopup = document.getElementById("account-popup");
        if (accountPopup) {
          accountPopup.classList.remove("hidden");
          console.log("[FIX] Account popup opened");
        }
      }
    });
  });

  // ===== 2. BONUS BANNER CLOSE =====
  var bonusClose = document.getElementById("bonus-close");
  var bonusBanner = document.getElementById("bonus-banner");
  if (bonusClose && bonusBanner) {
    var newClose = bonusClose.cloneNode(true);
    bonusClose.parentNode.replaceChild(newClose, bonusClose);
    newClose.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      bonusBanner.classList.add("hidden");
      try { localStorage.setItem("bonusBannerClosed", "1"); } catch(err) {}
      console.log("[FIX] Bonus banner closed");
    });
    // Auto hide if already closed
    try {
      if (localStorage.getItem("bonusBannerClosed") === "1") {
        bonusBanner.classList.add("hidden");
      }
    } catch(err) {}
  }

  // ===== 3. NOTIFICATION BELL =====
  var bellBtn = document.getElementById("notif-btn");
  if (bellBtn) {
    var newBell = bellBtn.cloneNode(true);
    bellBtn.parentNode.replaceChild(newBell, bellBtn);
    newBell.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      var badge = document.getElementById("notif-badge");
      if (badge) {
        badge.textContent = "0";
        badge.style.display = "none";
      }
      console.log("[FIX] Notifications cleared");
    });
  }

  // ===== 4. BALANCE CHIP (POPUP) =====
  var balanceChip = document.getElementById("balance-chip");
  if (balanceChip) {
    var newChip = balanceChip.cloneNode(true);
    balanceChip.parentNode.replaceChild(newChip, balanceChip);
    newChip.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      var accPopup = document.getElementById("account-popup");
      var balPopup = document.getElementById("balance-popup");
      if (balPopup) {
        var bpv = document.getElementById("balance-popup-value");
        if (bpv && typeof userBalance !== "undefined") {
          bpv.textContent = Number(userBalance).toFixed(2);
        }
        balPopup.classList.remove("hidden");
      } else if (accPopup) {
        accPopup.classList.remove("hidden");
      }
      console.log("[FIX] Balance chip clicked");
    });
  }

  // ===== 5. DEPOSIT BUTTON =====
  var depositBtn = document.getElementById("deposit-btn");
  if (depositBtn) {
    var newDeposit = depositBtn.cloneNode(true);
    depositBtn.parentNode.replaceChild(newDeposit, depositBtn);
    newDeposit.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      var depPopup = document.getElementById("deposit-popup");
      if (depPopup) {
        depPopup.classList.remove("hidden");
        console.log("[FIX] Deposit popup opened");
      }
    });
  }

  console.log("[FIX] All buttons force-bound successfully");
})();

// ===== RE-BIND AFTER 2 SECONDS (jodi dynamic content load hoy) =====
setTimeout(function() {
  console.log("[FIX] Re-binding buttons after 2s...");
  
  // Re-bind More Menu Close
  var moreClose = document.getElementById("more-menu-close");
  var moreMenu = document.getElementById("more-menu");
  if (moreClose && moreMenu && moreClose.dataset.bound !== "1") {
    moreClose.dataset.bound = "1";
    moreClose.addEventListener("click", function(e) {
      e.preventDefault();
      moreMenu.classList.add("hidden");
    });
  }

  // Re-bind More Menu Items
  var menuItems = document.querySelectorAll(".more-menu-item");
  menuItems.forEach(function(item) {
    if (item.dataset.bound === "1") return;
    item.dataset.bound = "1";
    item.addEventListener("click", function(e) {
      e.preventDefault();
      var menu = item.dataset.menu;
      console.log("[FIX] Menu item:", menu);
      
      if (moreMenu) moreMenu.classList.add("hidden");

      if (menu === "deposit") {
        var dp = document.getElementById("deposit-popup");
        if (dp) dp.classList.remove("hidden");
      } else if (menu === "withdraw") {
        var wp = document.getElementById("withdraw-popup");
        if (wp) wp.classList.remove("hidden");
      } else if (menu === "referral") {
        var rp = document.getElementById("referral-popup");
        if (rp) rp.classList.remove("hidden");
      } else if (menu === "chat") {
        var cp = document.getElementById("chat-popup");
        if (cp) cp.classList.remove("hidden");
      } else if (menu === "trades") {
        var ts = document.querySelector(".qx-trades-section");
        if (ts) ts.scrollIntoView({ behavior: "smooth" });
      } else if (menu === "logout") {
        if (typeof auth !== "undefined" && typeof signOut === "function") {
          signOut(auth);
        }
      }
    });
  });

  // Re-bind popup overlays (click outside to close)
  document.querySelectorAll(".popup-overlay, .more-menu-overlay").forEach(function(overlay) {
    if (overlay.dataset.bound === "1") return;
    overlay.dataset.bound = "1";
    overlay.addEventListener("click", function() {
      var parent = overlay.closest(".popup, .more-menu");
      if (parent) parent.classList.add("hidden");
    });
  });

  // Re-bind popup close buttons
  document.querySelectorAll(".popup-close").forEach(function(btn) {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", function() {
      var parent = btn.closest(".popup");
      if (parent) parent.classList.add("hidden");
    });
  });

  console.log("[FIX] Re-binding complete");
}, 2000);

console.log("===== MSG 5 FIX: Force Button Binding LOADED =====");
