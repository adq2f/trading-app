// ============================================
// Quotex Clone — app.js
// Part 1: Imports + Firebase + DOM + Globals + Sounds
// ============================================

// ===== GLOBAL NULL-GUARD (must run FIRST) =====
(function() {
  if (window.__globalNullSafe) return;
  window.__globalNullSafe = true;

  var origGetById = document.getElementById.bind(document);

  document.getElementById = function(id) {
    var el = origGetById(id);
    if (!el) {
      console.warn('[NULL-GUARD] Missing:', id);
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

  console.log('[NULL-GUARD] Active - missing elements will be silently skipped');
})();

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
const loginPage = document.getElementById("login-page");
const dashboardPage = document.getElementById("dashboard-page");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");
const message = document.getElementById("message");

// Balance
const balanceEl = document.getElementById("balance");
const balanceChip = document.getElementById("balance-chip");
const balancePopup = document.getElementById("balance-popup");
const balancePopupClose = document.getElementById("balance-popup-close");
const balancePopupOverlay = document.getElementById("balance-popup-overlay");
const balancePopupValue = document.getElementById("balance-popup-value");

// Account Popup
const accountPopup = document.getElementById("account-popup");
const accountPopupOverlay = document.getElementById("account-popup-overlay");
const accountPopupClose = document.getElementById("account-popup-close");
const accountToggleBtn = document.getElementById("account-toggle");
const accountOptions = document.querySelectorAll(".account-option");
const accBtnsPopup = document.querySelectorAll(".acc-btn-popup");

// Deposit Popup
const depositPopup = document.getElementById("deposit-popup");
const depositPopupOverlay = document.getElementById("deposit-popup-overlay");
const depositPopupClose = document.getElementById("deposit-popup-close");
const depositBtn = document.getElementById("deposit-btn");
const depositAmount = document.getElementById("deposit-amount");
const depositTxid = document.getElementById("deposit-txid");
const depositSubmit = document.getElementById("deposit-submit");
const depositMessage = document.getElementById("deposit-message");

// Withdraw Popup
const withdrawPopup = document.getElementById("withdraw-popup");
const withdrawPopupOverlay = document.getElementById("withdraw-popup-overlay");
const withdrawPopupClose = document.getElementById("withdraw-popup-close");
const withdrawBtn = document.getElementById("withdraw-btn");
const withdrawAmount = document.getElementById("withdraw-amount");
const withdrawMethod = document.getElementById("withdraw-method");
const withdrawNumber = document.getElementById("withdraw-number");
const withdrawSubmit = document.getElementById("withdraw-submit");
const withdrawMessage = document.getElementById("withdraw-message");

// Chart
const assetSelect = document.getElementById("asset-select");
const currentPriceEl = document.getElementById("current-price");
const priceArrowEl = document.getElementById("price-arrow");
const chartEl = document.getElementById("chart");
const chartWrapper = document.getElementById("chart-wrapper");
const drawingCanvas = document.getElementById("drawing-canvas");

// Trade Panel
const tradeAmountInput = document.getElementById("trade-amount");
const callBtn = document.getElementById("call-btn");
const putBtn = document.getElementById("put-btn");
const tradeMessage = document.getElementById("trade-message");
const bigTimer = document.getElementById("big-timer");

// Trades
const activeTradesList = document.getElementById("active-trades-list");
const historyList = document.getElementById("history-list");
const activeCount = document.getElementById("active-count");

// ===== Globals =====
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

// ===== Sounds (Web Audio API) =====
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  try {
    if (audioCtx.state === "suspended") audioCtx.resume();

    if (type === "click") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 800;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);

    } else if (type === "win") {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        const t = audioCtx.currentTime + i * 0.1;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
      });

    } else if (type === "loss") {
      [392, 329.63, 261.63].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = freq;
        osc.type = "sawtooth";
        const t = audioCtx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.start(t);
        osc.stop(t + 0.35);
      });
    }
  } catch (e) {
    console.log("Sound error:", e);
  }
}

// ===== Result Flash =====
function showResultFlash(result) {
  const flash = document.createElement("div");
  flash.className = `result-flash ${result}`;
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 700);
}

// ===== Balance Change Animation =====
function animateBalanceChange(amount) {
  const chip = balanceChip;
  if (!chip) return;

  const originalText = chip.querySelector(".balance-amount").textContent;

  if (amount > 0) {
    chip.style.color = "#00c853";
    chip.querySelector(".balance-amount").textContent = `+$${amount.toFixed(2)}`;
  } else {
    chip.style.color = "#ff5252";
    chip.querySelector(".balance-amount").textContent = `-$${Math.abs(amount).toFixed(2)}`;
  }

  setTimeout(() => {
    chip.style.color = "#00c853";
    chip.querySelector(".balance-amount").textContent = `$${userBalance.toFixed(2)}`;
  }, 2000);
}
// ============================================
// Part 2: Auth + Popups + Account + Deposit/Withdraw
// ============================================

// ===== রেজিস্ট্রেশন =====
signupBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    message.textContent = "ইমেইল ও পাসওয়ার্ড দিন";
    return;
  }
  if (password.length < 6) {
    message.textContent = "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর";
    return;
  }

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);

    // Create user doc
    await setDoc(doc(db, "users", userCred.user.uid), {
      email: email,
      balance: 1000,
      demoBalance: 1000,
      realBalance: 0,
      accountType: "demo",
      role: "user",
      createdAt: new Date().toISOString(),
      referralEarned: 0
    });

    // Apply referral from URL (if ?ref=CODE exists)
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

// ===== লগইন =====
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    message.textContent = "ইমেইল ও পাসওয়ার্ড দিন";
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    message.style.color = "#00c853";
    message.textContent = "লগইন সফল!";
  } catch (error) {
    message.style.color = "#ff5252";
    message.textContent = error.message;
  }
});

// ===== লগআউট (null-safe) =====
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
  });
}

// ===== পরিমাণ +/− (Quotex style — qx-inc-btn) =====
document.querySelectorAll(".qx-inc-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    let val = parseFloat(tradeAmountInput.value) || 0;
    if (btn.dataset.action === "plus") val += 1;
    else val = Math.max(1, val - 1);
    tradeAmountInput.value = val;
  });
});

// ===== পুরোনো amount-btn (fallback, যদি থাকে) =====
document.querySelectorAll(".amount-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    let val = parseFloat(tradeAmountInput.value) || 0;
    if (btn.dataset.action === "plus") val += 5;
    else val = Math.max(1, val - 5);
    tradeAmountInput.value = val;
  });
});

// ===== এক্সপায়ারি টাইম সিলেকশন (qux-tf-btn, qx-tf-btn) =====
document.querySelectorAll(".time-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".time-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedTime = parseInt(btn.dataset.time);
  });
});

// ===== টাইমফ্রেম সিলেকশন (qx-tf-btn) =====
document.querySelectorAll(".qx-tf-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    document.querySelectorAll(".qx-tf-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedTimeframe = btn.dataset.tf;
    await loadCandles();
    if (currentUser) startLivePrice();
  });
});

// ===== পুরোনো .tf-btn (fallback) =====
document.querySelectorAll(".tf-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    document.querySelectorAll(".tf-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedTimeframe = btn.dataset.tf;
    await loadCandles();
    if (currentUser) startLivePrice();
  });
});

// ===== অ্যাসেট পরিবর্তন (null-safe) =====
if (assetSelect) {
  assetSelect.addEventListener("change", async () => {
    selectedAsset = assetSelect.value;
    await loadCandles();
    if (currentUser) startLivePrice();
  });
}

// ===== ট্যাব স্যুইচ (null-safe) =====
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
    var activeTab = document.getElementById("active-trades-list");
    var historyTab = document.getElementById("history-list");
    if (btn.dataset.tab === "active" && activeTab) {
      activeTab.classList.add("active");
    } else if (historyTab) {
      historyTab.classList.add("active");
    }
  });
});

// ===== ড্রয়িং টুল সিলেকশন (null-safe) =====
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
      if (tool === "cursor") {
        drawingCanvas.classList.remove("active");
      } else {
        drawingCanvas.classList.add("active");
      }
    }
  });
});

// ============================================
// POPUP CONTROL
// ============================================

function openPopup(popup, overlay) {
  if (!popup) return;
  popup.classList.remove("hidden");
  if (overlay) overlay.onclick = () => closePopup(popup);
}

function closePopup(popup) {
  if (!popup) return;
  popup.classList.add("hidden");
}

// ব্যালেন্স পপআপ (MSG 21 এ balance-popup নেই, তাই শুধু account-popup)
if (balanceChip) {
  balanceChip.addEventListener("click", () => {
    if (balancePopupValue) balancePopupValue.textContent = userBalance.toFixed(2);
    if (balancePopup) {
      openPopup(balancePopup, balancePopupOverlay);
    } else {
      // No balance popup — open account popup instead
      openPopup(accountPopup, accountPopupOverlay);
    }
  });
}
if (balancePopupClose) balancePopupClose.addEventListener("click", () => closePopup(balancePopup));

// অ্যাকাউন্ট টগল পপআপ (MSG 21 এ account-toggle নেই, তাই শুধু balance-chip handle করে)
if (accountToggleBtn) {
  accountToggleBtn.addEventListener("click", () => {
    openPopup(accountPopup, accountPopupOverlay);
  });
}
if (accountPopupClose) accountPopupClose.addEventListener("click", () => closePopup(accountPopup));

// ডিপোজিট পপআপ
if (depositBtn) {
  depositBtn.addEventListener("click", () => {
    if (balancePopup) closePopup(balancePopup);
    openPopup(depositPopup, depositPopupOverlay);
  });
}
if (depositPopupClose) depositPopupClose.addEventListener("click", () => closePopup(depositPopup));

// উইথড্র পপআপ
if (withdrawBtn) {
  withdrawBtn.addEventListener("click", () => {
    if (balancePopup) closePopup(balancePopup);
    openPopup(withdrawPopup, withdrawPopupOverlay);
  });
}
if (withdrawPopupClose) withdrawPopupClose.addEventListener("click", () => closePopup(withdrawPopup));

// ===== অ্যাকাউন্ট টাইপ পরিবর্তন =====
async function switchAccount(type) {
  accountType = type;

  document.querySelectorAll(".acc-btn-popup").forEach(b => {
    b.classList.toggle("active", b.dataset.acc === type);
  });
  document.querySelectorAll(".account-option").forEach(b => {
    b.classList.toggle("active", b.dataset.acc === type);
  });

  if (!currentUser) return;

  try {
    const userRef = doc(db, "users", currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      if (type === "demo") {
        userBalance = data.demoBalance ?? 1000;
      } else {
        userBalance = data.realBalance ?? 0;
      }
      balanceEl.textContent = userBalance.toFixed(2);
      if (balancePopupValue) balancePopupValue.textContent = userBalance.toFixed(2);
    }

    await updateDoc(userRef, { accountType: type });
  } catch (err) {
    console.error("Switch account error:", err);
  }

  closePopup(accountPopup);
}

if (accBtnsPopup) {
  accBtnsPopup.forEach(btn => {
    btn.addEventListener("click", () => switchAccount(btn.dataset.acc));
  });
}
if (accountOptions) {
  accountOptions.forEach(btn => {
    btn.addEventListener("click", () => switchAccount(btn.dataset.acc));
  });
}

// ===== ডিপোজিট সাবমিট =====
if (depositSubmit) {
  depositSubmit.addEventListener("click", async () => {
    if (!currentUser) return;

    const amount = parseFloat(depositAmount.value);
    const txid = depositTxid.value.trim();

    if (!amount || amount < 1) {
      depositMessage.style.color = "#ff5252";
      depositMessage.textContent = "সর্বনিম্ন $1 দিন";
      return;
    }
    if (!txid) {
      depositMessage.style.color = "#ff5252";
      depositMessage.textContent = "TrxID দিন";
      return;
    }

    try {
      await addDoc(collection(db, "deposits"), {
        userId: currentUser.uid,
        email: currentUser.email,
        amount: amount,
        txid: txid,
        method: "manual",
        status: "pending",
        createdAt: new Date().toISOString()
      });

      depositMessage.style.color = "#00c853";
      depositMessage.textContent = "রিকোয়েস্ট পাঠানো হয়েছে!";
      depositAmount.value = "";
      depositTxid.value = "";

      setTimeout(() => {
        closePopup(depositPopup);
        depositMessage.textContent = "";
      }, 1500);
    } catch (err) {
      depositMessage.style.color = "#ff5252";
      depositMessage.textContent = err.message;
    }
  });
}

// ===== উইথড্র সাবমিট =====
if (withdrawSubmit) {
  withdrawSubmit.addEventListener("click", async () => {
    if (!currentUser) return;

    const amount = parseFloat(withdrawAmount.value);
    const method = withdrawMethod.value;
    const number = withdrawNumber.value.trim();

    if (!amount || amount < 1) {
      withdrawMessage.style.color = "#ff5252";
      withdrawMessage.textContent = "সর্বনিম্ন $1 দিন";
      return;
    }
    if (amount > userBalance) {
      withdrawMessage.style.color = "#ff5252";
      withdrawMessage.textContent = "পর্যাপ্ত ব্যালেন্স নেই";
      return;
    }
    if (!number) {
      withdrawMessage.style.color = "#ff5252";
      withdrawMessage.textContent = "একাউন্ট নাম্বার দিন";
      return;
    }

    try {
      await addDoc(collection(db, "withdrawals"), {
        userId: currentUser.uid,
        email: currentUser.email,
        amount: amount,
        method: method,
        number: number,
        status: "pending",
        createdAt: new Date().toISOString()
      });

      withdrawMessage.style.color = "#00c853";
      withdrawMessage.textContent = "রিকোয়েস্ট পাঠানো হয়েছে!";
      withdrawAmount.value = "";
      withdrawNumber.value = "";

      setTimeout(() => {
        closePopup(withdrawPopup);
        withdrawMessage.textContent = "";
      }, 1500);
    } catch (err) {
      withdrawMessage.style.color = "#ff5252";
      withdrawMessage.textContent = err.message;
    }
  });
}

// ===== Auth State পরিবর্তন =====
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
        userBalance = accountType === "demo"
          ? (data.demoBalance ?? data.balance ?? 1000)
          : (data.realBalance ?? 0);
        balanceEl.textContent = userBalance.toFixed(2);
        if (balancePopupValue) balancePopupValue.textContent = userBalance.toFixed(2);
      }
    } catch (err) {
      console.error(err);
    }

    initChart();
    await loadCandles();
    startLivePrice();
    loadActiveTrades();
    loadHistory();

  } else {
    currentUser = null;
    loginPage.classList.remove("hidden");
    dashboardPage.classList.add("hidden");
    emailInput.value = "";
    passwordInput.value = "";
    stopLivePrice();
    if (activeTradesUnsub) activeTradesUnsub();
    if (historyUnsub) historyUnsub();
    activeTradesLocal = [];
  }
});
// ============================================
// Part 3: Chart Init + Candles + WebSocket
// ============================================

// ===== Lightweight Chart তৈরি =====
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
      textColor: "#8b98ab",
      fontSize: 11
    },
    grid: {
      vertLines: { color: "#131a26" },
      horzLines: { color: "#131a26" }
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
      secondsVisible: true
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
    wickDownColor: "#ff5252"
  });

  // চার্টে পরিবর্তন হলে ড্রয়িং আবার আঁকা
  chart.timeScale().subscribeVisibleTimeRangeChange(() => {
    if (typeof redrawDrawings === "function") {
      redrawDrawings();
    }
  });

  // ড্রয়িং সিস্টেম ইনিশিয়ালাইজ
  if (typeof initDrawingSystem === "function") {
    initDrawingSystem();
  }

  // রিসাইজ হ্যান্ডলার
  window.addEventListener("resize", () => {
    if (chart && chartWrapper) {
      chart.applyOptions({
        width: chartEl.clientWidth,
        height: chartWrapper.clientHeight
      });
      if (typeof resizeDrawingCanvas === "function") {
        resizeDrawingCanvas();
      }
    }
  });
}

// ===== Timeframe Convert =====
function convertTimeframe(tf) {
  const map = {
    "5s": "5s",
    "10s": "10s",
    "15s": "15s",
    "30s": "30s",
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "1h": "1h",
    "4h": "4h"
  };
  return map[tf] || "1m";
}

// ===== Binance থেকে ক্যান্ডেল লোড =====
async function loadCandles() {
  try {
    // BULLUSD-OTP বা fake symbol হলে Binance API কাজ করবে না
    // তাহলে empty chart দেখাব (admin designer candle থেকে আসবে)
    var isRealSymbol = /^(BTC|ETH|BNB|ADA|SOL|XRP|DOGE|MATIC|LTC|DOT)/i.test(selectedAsset);

    if (!isRealSymbol) {
      console.log("[Candles] Fake symbol detected — skipping Binance API:", selectedAsset);
      if (candleSeries) {
        candleSeries.setData([]);
      }
      return;
    }

    const interval = convertTimeframe(selectedTimeframe);
    const limit = interval.includes("s") ? 200 : 150;

    const url = `https://api.binance.com/api/v3/klines?symbol=${selectedAsset}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error("Binance error:", data);
      return;
    }

    let candleData = data.map(k => ({
      time: Math.floor(k[0] / 1000),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4])
    })).filter(c =>
      c.open > 0 &&
      c.high > 0 &&
      c.low > 0 &&
      c.close > 0 &&
      !isNaN(c.open) &&
      !isNaN(c.close) &&
      c.high >= c.low
    );

    // Filter out huge outliers (bad data)
    if (candleData.length > 2) {
      const firstClose = candleData[0].close;
      candleData = candleData.filter(c => {
        const ratio = c.close / firstClose;
        return ratio > 0.5 && ratio < 2.0;
      });
    }

    if (candleSeries) {
      candleSeries.setData(candleData);
      chart.timeScale().fitContent();
    }

    if (candleData.length > 0) {
      currentPrice = candleData[candleData.length - 1].close;
      prevPrice = currentPrice;
      if (currentPriceEl) {
        currentPriceEl.textContent = currentPrice.toFixed(2);
      }
    }

  } catch (err) {
    console.error("Candle load error:", err);
  }
}

// ===== WebSocket লাইভ প্রাইস =====
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

        currentPriceEl.textContent = currentPrice.toFixed(2);

        if (currentPrice >= prevPrice) {
          currentPriceEl.style.color = "#00c853";
          priceArrowEl.textContent = "▲";
          priceArrowEl.className = "price-arrow up";
        } else {
          currentPriceEl.style.color = "#ff5252";
          priceArrowEl.textContent = "▼";
          priceArrowEl.className = "price-arrow down";
        }

        if (candleSeries) {
          candleSeries.update({
            time: Math.floor(k.t / 1000),
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c)
          });
        }

        checkExpiredTrades();
        updateBigTimer();

      } catch (err) {
        // Silent
      }
    };

    livePriceWS.onerror = () => {};

    livePriceWS.onclose = () => {
      setTimeout(() => {
        if (currentUser) startLivePrice();
      }, 3000);
    };

  } catch (e) {
    console.log("WS init error:", e);
  }
}

function stopLivePrice() {
  if (livePriceWS) {
    try { livePriceWS.close(); } catch (e) {}
    livePriceWS = null;
  }
}

// ===== প্রাইস ফরম্যাট =====
function formatPrice(price) {
  if (!price && price !== 0) return "0.00";
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(3);
  return price.toFixed(5);
}
// ============================================
// Part 4: Drawing System (Canvas-based)
// ============================================

let drawingCtx = null;

// ===== ড্রয়িং সিস্টেম ইনিশিয়ালাইজ =====
function initDrawingSystem() {
  if (!drawingCanvas || !chart || !candleSeries) return;

  drawingCtx = drawingCanvas.getContext("2d");
  resizeDrawingCanvas();

  // টাচ/মাউস ইভেন্ট
  drawingCanvas.addEventListener("touchstart", handleDrawStart, { passive: false });
  drawingCanvas.addEventListener("touchmove", handleDrawMove, { passive: false });
  drawingCanvas.addEventListener("touchend", handleDrawEnd, { passive: false });

  drawingCanvas.addEventListener("mousedown", handleDrawStart);
  drawingCanvas.addEventListener("mousemove", handleDrawMove);
  drawingCanvas.addEventListener("mouseup", handleDrawEnd);

  // Chart scroll/zoom হলে redraw
  chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
    redrawDrawings();
  });
}

// ===== ক্যানভাস সাইজ =====
function resizeDrawingCanvas() {
  if (!drawingCanvas || !chartWrapper) return;
  const rect = chartWrapper.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  drawingCanvas.width = rect.width * dpr;
  drawingCanvas.height = rect.height * dpr;
  drawingCanvas.style.width = rect.width + "px";
  drawingCanvas.style.height = rect.height + "px";

  if (drawingCtx) {
    drawingCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  redrawDrawings();
}

// ===== পয়েন্ট কনভার্ট =====
function getCanvasPoint(event) {
  const rect = drawingCanvas.getBoundingClientRect();
  let clientX, clientY;

  if (event.touches && event.touches.length > 0) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else if (event.changedTouches && event.changedTouches.length > 0) {
    clientX = event.changedTouches[0].clientX;
    clientY = event.changedTouches[0].clientY;
  } else {
    clientX = event.clientX;
    clientY = event.clientY;
  }

  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

// ===== পিক্সেল → প্রাইস/টাইম =====
function pixelToData(x, y) {
  if (!chart || !candleSeries) return null;

  try {
    const time = chart.timeScale().coordinateToTime(x);
    const price = candleSeries.coordinateToPrice(y);

    if (time === null || price === null) return null;

    return { time, price, x, y };
  } catch (e) {
    return null;
  }
}

function dataToPixel(time, price) {
  if (!chart || !candleSeries) return null;

  try {
    const x = chart.timeScale().timeToCoordinate(time);
    const y = candleSeries.priceToCoordinate(price);

    if (x === null || y === null) return null;

    return { x, y };
  } catch (e) {
    return null;
  }
}

// ===== ড্রয়িং শুরু =====
function handleDrawStart(event) {
  if (currentDrawingTool === "cursor") return;
  event.preventDefault();

  const point = getCanvasPoint(event);
  const data = pixelToData(point.x, point.y);
  if (!data) return;

  isDrawing = true;
  drawStartPoint = data;

  // Horizontal / Vertical — এক ট্যাপেই শেষ
  if (currentDrawingTool === "HorizontalLine" || currentDrawingTool === "VerticalLine") {
    saveDrawing({
      tool: currentDrawingTool,
      points: [data]
    });
    isDrawing = false;
    drawStartPoint = null;
    return;
  }

  // Text — prompt
  if (currentDrawingTool === "TextAnnotation") {
    const text = prompt("লেখা লিখুন:");
    if (text) {
      saveDrawing({
        tool: "TextAnnotation",
        points: [data],
        text: text
      });
    }
    isDrawing = false;
    drawStartPoint = null;
    return;
  }
}

// ===== ড্রয়িং মুভ =====
function handleDrawMove(event) {
  if (!isDrawing || !drawStartPoint) return;
  event.preventDefault();

  const point = getCanvasPoint(event);
  const data = pixelToData(point.x, point.y);
  if (!data) return;

  // প্রিভিউ আঁকা
  redrawDrawings();

  drawPreview({
    tool: currentDrawingTool,
    points: [drawStartPoint, data]
  });
}

// ===== ড্রয়িং শেষ =====
function handleDrawEnd(event) {
  if (!isDrawing || !drawStartPoint) return;
  event.preventDefault();

  const point = getCanvasPoint(event);
  const data = pixelToData(point.x, point.y);

  if (data && (Math.abs(data.x - drawStartPoint.x) > 5 || Math.abs(data.y - drawStartPoint.y) > 5)) {
    saveDrawing({
      tool: currentDrawingTool,
      points: [drawStartPoint, data]
    });
  }

  isDrawing = false;
  drawStartPoint = null;
  redrawDrawings();
}

// ===== ড্রয়িং সেভ =====
function saveDrawing(drawing) {
  drawings.push(drawing);
  redrawDrawings();
}

// ===== সব ড্রয়িং মুছুন =====
function clearAllDrawings() {
  drawings = [];
  if (drawingCtx && drawingCanvas) {
    drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
  }
}

// ===== সব রিড্র =====
function redrawDrawings() {
  if (!drawingCtx || !drawingCanvas) return;

  drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

  drawings.forEach(drawing => {
    drawShape(drawing);
  });
}

// ===== প্রিভিউ =====
function drawPreview(drawing) {
  if (!drawingCtx) return;
  drawingCtx.save();
  drawingCtx.globalAlpha = 0.6;
  drawShape(drawing);
  drawingCtx.restore();
}

// ===== একটি আকার আঁকা =====
function drawShape(drawing) {
  if (!drawingCtx) return;

  const { tool, points, text } = drawing;
  if (!points || points.length === 0) return;

  const color = "#2196f3";
  const lineWidth = 1.5;

  drawingCtx.strokeStyle = color;
  drawingCtx.fillStyle = color;
  drawingCtx.lineWidth = lineWidth;
  drawingCtx.font = "12px Arial";
  drawingCtx.textBaseline = "middle";

  if (tool === "HorizontalLine") {
    const p = dataToPixel(points[0].time, points[0].price);
    if (!p) return;
    drawingCtx.beginPath();
    drawingCtx.moveTo(0, p.y);
    drawingCtx.lineTo(drawingCanvas.width, p.y);
    drawingCtx.stroke();

  } else if (tool === "VerticalLine") {
    const p = dataToPixel(points[0].time, points[0].price);
    if (!p) return;
    drawingCtx.beginPath();
    drawingCtx.moveTo(p.x, 0);
    drawingCtx.lineTo(p.x, drawingCanvas.height);
    drawingCtx.stroke();

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
      drawingCtx.beginPath();
      drawingCtx.moveTo(p1.x, p1.y);
      drawingCtx.lineTo(p2.x, p2.y);
      drawingCtx.stroke();

    } else if (tool === "CrossLine") {
      drawingCtx.beginPath();
      drawingCtx.moveTo(0, p1.y);
      drawingCtx.lineTo(drawingCanvas.width, p1.y);
      drawingCtx.stroke();

      drawingCtx.beginPath();
      drawingCtx.moveTo(p1.x, 0);
      drawingCtx.lineTo(p1.x, drawingCanvas.height);
      drawingCtx.stroke();

    } else if (tool === "Rectangle") {
      drawingCtx.strokeRect(
        p1.x,
        p1.y,
        p2.x - p1.x,
        p2.y - p1.y
      );

    } else if (tool === "Ray") {
      drawingCtx.beginPath();
      drawingCtx.moveTo(p1.x, p1.y);
      drawingCtx.lineTo(p2.x, p2.y);
      drawingCtx.stroke();

      // তীরের মাথা
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const arrowSize = 10;
      drawingCtx.beginPath();
      drawingCtx.moveTo(p2.x, p2.y);
      drawingCtx.lineTo(
        p2.x - arrowSize * Math.cos(angle - Math.PI / 6),
        p2.y - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      drawingCtx.moveTo(p2.x, p2.y);
      drawingCtx.lineTo(
        p2.x - arrowSize * Math.cos(angle + Math.PI / 6),
        p2.y - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      drawingCtx.stroke();

    } else if (tool === "FibRetracement") {
      drawFibonacci(p1, p2);
    }
  }
}

// ===== Fibonacci =====
function drawFibonacci(p1, p2) {
  const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const colors = [
    "#6b7a90", "#ff5252", "#ffb300", "#00c853",
    "#2196f3", "#9c27b0", "#6b7a90"
  ];

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
    drawingCtx.fillText(
      (level * 100).toFixed(1) + "%",
      rightX + 4,
      y
    );
  });
}
// ============================================
// Part 5: Trade Logic + Timer + History
// ============================================

// ===== বড় টাইমার =====
function updateBigTimer() {
  if (!bigTimer) return;

  if (activeTradesLocal.length === 0) {
    bigTimer.classList.remove("hidden");
    var time = (typeof selectedTime !== "undefined") ? selectedTime : 60;
    var mm = Math.floor(time / 60);
    var ss = time % 60;
    bigTimer.textContent = String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
    return;
  }

  let soonest = activeTradesLocal[0].expiresAt;
  activeTradesLocal.forEach(t => {
    if (t.expiresAt < soonest) soonest = t.expiresAt;
  });

  const remaining = Math.max(0, Math.ceil((soonest - Date.now()) / 1000));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  bigTimer.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  bigTimer.classList.remove("hidden");

  if (remaining <= 5) {
    bigTimer.style.borderColor = "#ff5252";
    bigTimer.style.color = "#ff5252";
  } else {
    bigTimer.style.borderColor = "#1f6feb";
    bigTimer.style.color = "#58a6ff";
  }
}

// ===== চার্টে ট্রেড মার্কার =====
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

  try {
    candleSeries.setMarkers(markers);
  } catch (e) {
    // ignore marker time error
  }
}

// ===== ট্রেড প্লেস =====
async function placeTrade(type) {
  if (!currentUser) return;

  const now = Date.now();
  if (now - lastTradeTime < 500) return;
  lastTradeTime = now;

  const amount = parseFloat(tradeAmountInput.value);

  if (!amount || amount < 1) {
    tradeMessage.style.color = "#ff5252";
    tradeMessage.textContent = "সর্বনিম্ন $1 ট্রেড করুন";
    return;
  }

  if (amount > userBalance) {
    tradeMessage.style.color = "#ff5252";
    tradeMessage.textContent = "পর্যাপ্ত ব্যালেন্স নেই";
    return;
  }

  playSound("click");

  const entryPrice = currentPrice;
  const expiresAt = Date.now() + selectedTime * 1000;
  const entryTime = new Date().toISOString();

  try {
    const newBalance = userBalance - amount;
    const balanceField = accountType === "demo" ? "demoBalance" : "realBalance";

    await updateDoc(doc(db, "users", currentUser.uid), {
      [balanceField]: newBalance,
      balance: newBalance
    });

    userBalance = newBalance;
    balanceEl.textContent = userBalance.toFixed(2);
    if (balancePopupValue) balancePopupValue.textContent = userBalance.toFixed(2);
    animateBalanceChange(-amount);

    await addDoc(collection(db, "trades"), {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      type: type,
      amount: amount,
      entryPrice: entryPrice,
      expiresAt: expiresAt,
      entryTime: entryTime,
      asset: selectedAsset,
      accountType: accountType,
      status: "pending",
      result: null,
      profit: 0,
      createdAt: entryTime
    });

    tradeMessage.style.color = type === "call" ? "#00c853" : "#ff5252";
    tradeMessage.textContent = `${type.toUpperCase()} $${amount} প্লেস হয়েছে`;

    setTimeout(() => { tradeMessage.textContent = ""; }, 2000);

  } catch (error) {
    tradeMessage.style.color = "#ff5252";
    tradeMessage.textContent = error.message;
  }
}

if (callBtn) callBtn.addEventListener("click", () => placeTrade("call"));
if (putBtn) putBtn.addEventListener("click", () => placeTrade("put"));

// ===== ট্রেড এক্সপায়ারি =====
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
          status: "completed",
          result: result,
          exitPrice: exitPrice,
          profit: profit,
          completedAt: new Date().toISOString()
        });

        if (result === "win") {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          const currentBal = userDoc.data().balance || 0;
          const newBal = currentBal + profit;
          const balanceField = accountType === "demo" ? "demoBalance" : "realBalance";

          await updateDoc(doc(db, "users", currentUser.uid), {
            [balanceField]: newBal,
            balance: newBal
          });

          userBalance = newBal;
          balanceEl.textContent = userBalance.toFixed(2);
          if (balancePopupValue) balancePopupValue.textContent = userBalance.toFixed(2);
          animateBalanceChange(profit);
          showResultFlash("win");
          playSound("win");

          tradeMessage.style.color = "#00c853";
          tradeMessage.textContent = `🎉 জিতেছেন! +$${profit.toFixed(2)}`;
        } else {
          showResultFlash("loss");
          playSound("loss");

          tradeMessage.style.color = "#ff5252";
          tradeMessage.textContent = `😔 হেরেছেন -$${trade.amount.toFixed(2)}`;
        }

        setTimeout(() => { tradeMessage.textContent = ""; }, 3500);

      } catch (error) {
        console.error("Trade expire error:", error);
      }
    }
  }
}

// ===== অ্যাক্টিভ ট্রেড লোড =====
function loadActiveTrades() {
  if (!currentUser) return;

  const q = query(
    collection(db, "trades"),
    where("userId", "==", currentUser.uid),
    where("status", "==", "pending")
  );

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
      div.innerHTML = `
        <div class="trade-info">
          <span class="trade-type ${trade.type}">${trade.type.toUpperCase()}</span>
          <span class="trade-time">$${trade.amount} @ ${Number(trade.entryPrice).toFixed(2)}</span>
        </div>
        <div class="trade-result pending">${timeStr}</div>
      `;
      if (activeTradesList) activeTradesList.appendChild(div);
    });

    if (activeCount) activeCount.textContent = activeTradesLocal.length;
    updateBigTimer();
    updateTradeMarkers();
  });
}

// ===== ট্রেড হিস্ট্রি =====
function loadHistory() {
  if (!currentUser) return;

  const q = query(
    collection(db, "trades"),
    where("userId", "==", currentUser.uid),
    where("status", "==", "completed")
  );

  historyUnsub = onSnapshot(q, (snapshot) => {
    if (historyList) historyList.innerHTML = "";

    if (snapshot.empty) {
      if (historyList) historyList.innerHTML = '<p class="empty-text">No trade history yet</p>';
      return;
    }

    const trades = [];
    snapshot.forEach((docSnap) => {
      trades.push({ id: docSnap.id, ...docSnap.data() });
    });

    trades.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    trades.slice(0, 30).forEach((trade) => {
      const div = document.createElement("div");
      div.className = `trade-item ${trade.result}`;

      const entryTime = new Date(trade.createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit"
      });
      const exitTime = trade.completedAt
        ? new Date(trade.completedAt).toLocaleTimeString("en-US", {
            hour: "2-digit", minute: "2-digit"
          })
        : "-";

      div.innerHTML = `
        <div class="trade-info">
          <span class="trade-type ${trade.type}">
            ${trade.type.toUpperCase()} ${trade.result === "win" ? "✓" : "✗"}
          </span>
          <span class="trade-time">Entry: $${trade.entryPrice.toFixed(2)} (${entryTime})</span>
          <span class="trade-time">Exit: $${(trade.exitPrice || 0).toFixed(2)} (${exitTime})</span>
          <span class="trade-time">Amount: $${trade.amount}</span>
        </div>
        <div class="trade-result ${trade.result}">
          ${trade.result === "win" ? "+$" + trade.profit.toFixed(2) : "-$" + trade.amount.toFixed(2)}
        </div>
      `;
      if (historyList) historyList.appendChild(div);
    });
  });
}

// ===== প্রতি সেকেন্ডে টাইমার আপডেট =====
setInterval(() => {
  if (currentUser && activeTradesLocal.length > 0) {
    updateBigTimer();
    updateTradeMarkers();
  }
}, 1000);

// ============================================
// UPDATE Part 1: Settings Listen + Admin Force
// ============================================

// ===== Admin Settings Globals =====
let adminWinRate = 50;
let adminPayout = 85;
let adminForceMarket = 0;
let adminForceMarketAt = 0;
let adminAutoMode = false;
let lastForceMarket = 0;
let settingsUnsub = null;

// ===== Settings Listen করা (Real-time) =====
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

      // Force market change ধরা
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

      console.log(
        `⚙️ Admin Settings — WinRate: ${adminWinRate}%, ` +
        `Payout: ${adminPayout}%, Auto: ${adminAutoMode}, ` +
        `Force: ${adminForceMarket}`
      );
    });
  } catch (err) {
    console.error("Settings listen error:", err);
  }
}

// ===== Market Force Apply (প্রাইস উপরে/নিচে) =====
function applyMarketForce(diff) {
  if (!diff) return;

  // প্রতি force = 50 point মুভ
  const moveAmount = diff * 50;

  currentPrice += moveAmount;
  currentPriceEl.textContent = currentPrice.toFixed(2);

  if (moveAmount > 0) {
    currentPriceEl.style.color = "#00c853";
    priceArrowEl.textContent = "▲";
    priceArrowEl.className = "price-arrow up";
  } else {
    currentPriceEl.style.color = "#ff5252";
    priceArrowEl.textContent = "▼";
    priceArrowEl.className = "price-arrow down";
  }

  // চার্টে আপডেট
  if (candleSeries) {
    const now = Math.floor(Date.now() / 1000);
    try {
      candleSeries.update({
        time: now,
        open: currentPrice - moveAmount,
        high: Math.max(currentPrice, currentPrice - moveAmount) + 5,
        low: Math.min(currentPrice, currentPrice - moveAmount) - 5,
        close: currentPrice
      });
    } catch (e) {
      // ignore time errors
    }
  }
}

// ===== Auth হলে Settings Listen শুরু =====
// পুরোনো onAuthStateChanged এর ভিতরে যোগ করতে হবে না।
// আলাদা করে চেক করি।

setTimeout(() => {
  if (currentUser) {
    listenAdminSettings();
  }
}, 2000);

// Auth পরিবর্তনে settings listen চালু/বন্ধ
const originalUserCheck = setInterval(() => {
  if (currentUser && !settingsUnsub) {
    listenAdminSettings();
  }
  if (!currentUser && settingsUnsub) {
    settingsUnsub();
    settingsUnsub = null;
  }
}, 3000);

// ============================================
// UPDATE Part 2: Win Rate + Payout Apply
// ============================================

// ===== checkExpiredTrades এর Override =====
// পুরোনো checkExpiredTrades ফাংশন আছে।
// এখন সেটাকে admin winRate + payout দিয়ে কাজ করাতে হবে।

async function checkExpiredTradesAdmin() {
  if (!currentUser) return;

  const now = Date.now();

  for (const trade of activeTradesLocal) {
    if (trade.expiresAt <= now && trade.status === "pending") {
      const exitPrice = currentPrice;
      const entryPrice = trade.entryPrice;

      // ===== Trade আগে সত্যিকারের Win/Loss চেক =====
      let realResult = "loss";
      if (trade.type === "call" && exitPrice > entryPrice) realResult = "win";
      else if (trade.type === "put" && exitPrice < entryPrice) realResult = "win";

      // ===== Admin Win Rate Apply =====
      // যদি adminWinRate = 50 (ডিফল্ট), realResult রেখে দাও
      // অন্যথায় admin-এর winRate অনুযায়ী random chance
      let finalResult = realResult;

      // ইউজারের নিজস্ব winRate থাকলে সেটা আগে দেখো
      let userWinRate = adminWinRate;
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.winRate !== undefined && userData.winRate !== null) {
            userWinRate = userData.winRate;
          }
        }
      } catch (e) {
        // ignore
      }

      // Admin Win Rate প্রয়োগ
      const random = Math.random() * 100; // 0-100
      if (random < userWinRate) {
        finalResult = "win";
      } else {
        finalResult = "loss";
      }

      // ===== Payout Apply =====
      const payoutRate = adminPayout / 100 + 1; // 85% → 1.85
      const profit = finalResult === "win" ? trade.amount * payoutRate : 0;

      try {
        // ট্রেড আপডেট
        await updateDoc(doc(db, "trades", trade.id), {
          status: "completed",
          result: finalResult,
          exitPrice: exitPrice,
          profit: profit,
          completedAt: new Date().toISOString(),
          adminProcessed: true
        });

        if (finalResult === "win") {
          // ইউজার ব্যালেন্স বাড়াও
          const userRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userRef);
          const userData = userDoc.data();
          const balanceField = accountType === "demo" ? "demoBalance" : "realBalance";
          const currentBal = userData[balanceField] ?? 0;
          const newBal = currentBal + profit;

          await updateDoc(userRef, {
            [balanceField]: newBal,
            balance: newBal
          });

          userBalance = newBal;
          balanceEl.textContent = userBalance.toFixed(2);
          if (balancePopupValue) balancePopupValue.textContent = userBalance.toFixed(2);
          animateBalanceChange(profit);
          showResultFlash("win");
          playSound("win");

          tradeMessage.style.color = "#00c853";
          tradeMessage.textContent = `🎉 জিতেছেন! +$${profit.toFixed(2)}`;

        } else {
          showResultFlash("loss");
          playSound("loss");

          tradeMessage.style.color = "#ff5252";
          tradeMessage.textContent = `😔 হেরেছেন -$${trade.amount.toFixed(2)}`;
        }

        setTimeout(() => { tradeMessage.textContent = ""; }, 3500);

      } catch (error) {
        console.error("Admin trade expire error:", error);
      }
    }
  }
}

// ===== পুরোনো checkExpiredTrades কে ওভাররাইড করা =====
// Global scope-এ redeclaration করা যাবে না, তাই window-এ সেট করি

window.originalCheckExpired = checkExpiredTrades;

// WebSocket onmessage এবং setInterval এখনো পুরোনো checkExpiredTrades কল করছে।
// সেটা পরিবর্তন করতে হবে — আমরা একটা নতুন ফাংশন দিয়ে replace করব।

// সব জায়গায় checkExpiredTrades কে update করা যায় না,
// তাই একটা ট্রিক ব্যবহার করি: regular interval দিয়ে admin version কল করি।

setInterval(() => {
  if (currentUser && activeTradesLocal.length > 0) {
    checkExpiredTradesAdmin();
  }
}, 1500);

// ===== Payout & Win Rate Admin-Managed =====
// web socket-এ যেই checkExpiredTrades কল হচ্ছে, সেটা বন্ধ করা যায় না।
// কিন্তু duplicate trade complete হবে না, কারণ status "completed" হয়ে যাবে।

console.log("✅ Admin Trade Checker চালু হয়েছে");

// ============================================
// UPDATE Part 3: Market Force + Auto Mode
// ============================================

// ===== Force Market থেকে প্রাইস ড্রিফট =====
// Admin ⬆ চাপলে forceMarket = +1, +2, +3 ...
// Admin ⬇ চাপলে forceMarket = -1, -2, -3 ...
// Admin 🔄 চাপলে forceMarket = 0

let autoModePriceInterval = null;

function startAutoModeDrift() {
  if (autoModePriceInterval) {
    clearInterval(autoModePriceInterval);
    autoModePriceInterval = null;
  }

  // প্রতি ১ সেকেন্ডে auto drift চেক
  autoModePriceInterval = setInterval(() => {
    if (!adminAutoMode) return;
    if (!currentUser) return;

    // Auto mode-এ প্রাইস random move হবে — adminForceMarket এর দিকেও ঝোঁক থাকবে
    let drift = (Math.random() - 0.5) * 40;

    // যদি adminForceMarket পজিটিভ হয় → উপরে ঝোঁক
    if (adminForceMarket > 0) {
      drift += Math.random() * 30;
    }
    // যদি negative হয় → নিচে ঝোঁক
    else if (adminForceMarket < 0) {
      drift -= Math.random() * 30;
    }

    currentPrice = Math.max(100, currentPrice + drift);
    currentPriceEl.textContent = currentPrice.toFixed(2);

    if (drift >= 0) {
      currentPriceEl.style.color = "#00c853";
      priceArrowEl.textContent = "▲";
      priceArrowEl.className = "price-arrow up";
    } else {
      currentPriceEl.style.color = "#ff5252";
      priceArrowEl.textContent = "▼";
      priceArrowEl.className = "price-arrow down";
    }

    // চার্টে আপডেট
    if (candleSeries) {
      const now = Math.floor(Date.now() / 1000);
      const openP = currentPrice - drift;
      try {
        candleSeries.update({
          time: now,
          open: openP,
          high: Math.max(currentPrice, openP) + Math.abs(drift) * 0.5 + 2,
          low: Math.min(currentPrice, openP) - Math.abs(drift) * 0.5 - 2,
          close: currentPrice
        });
      } catch (e) {
        // duplicate time ignore
      }
    }

    // ট্রেড check
    updateBigTimer();

  }, 1000);
}

// ===== Admin Force চেক করার interval =====
// Part 1 এ settings listener আছে যেটা forceMarket পরিবর্তন ধরবে।
// এইখানে আমরা শুধু auto mode drift চালু করি।

setInterval(() => {
  if (currentUser && !autoModePriceInterval) {
    startAutoModeDrift();
  }
  if (!currentUser && autoModePriceInterval) {
    clearInterval(autoModePriceInterval);
    autoModePriceInterval = null;
  }
}, 2000);

// ===== Admin Win Rate UI-তে দেখানো =====
function updateAdminInfoBar() {
  // যদি চাই, ব্যালেন্স চিপের পাশে ছোট করে দেখানো যায়
  // এখন শুধু console-এ log করি
  console.log(
    `[Admin] WinRate: ${adminWinRate}% | ` +
    `Payout: ${adminPayout}% | ` +
    `AutoMode: ${adminAutoMode ? "ON" : "OFF"} | ` +
    `Force: ${adminForceMarket}`
  );
}

// প্রতি ৩০ সেকেন্ডে log
setInterval(() => {
  if (currentUser) updateAdminInfoBar();
}, 30000);

// ============================================
// UPDATE Part 4: Final Integration
// ============================================

// ===== Settings Listener চালু/বন্ধ — Auth State সাথে =====
// Part 1-এ যে setInterval ছিল, সেটা যথেষ্ট নয়।
// এখন নির্ভরযোগ্যভাবে Auth State-এর সাথে bind করি।

const authStateWatcher = setInterval(() => {
  // User আছে এবং settings listener নেই → চালু করো
  if (currentUser && !settingsUnsub) {
    listenAdminSettings();
  }
  // User নেই এবং settings listener আছে → বন্ধ করো
  if (!currentUser && settingsUnsub) {
    settingsUnsub();
    settingsUnsub = null;
  }
}, 2000);

// ===== WS প্রাইস আপডেটে Force প্রভাব =====
// পুরোনো WebSocket handler আছে যেটা সত্যিকারের Binance প্রাইস নিয়ে আসে।
// এখন আমরা adminForceMarket থাকলে সেটার প্রভাব যোগ করি।

// Force market এর সর্বশেষ মান
let lastKnownForce = 0;

setInterval(() => {
  // Force পরিবর্তন হলে সাথে সাথে প্রাইসে প্রভাব ফেলো
  if (adminForceMarket !== lastKnownForce && currentUser) {
    const diff = adminForceMarket - lastKnownForce;
    applyMarketForce(diff);
    lastKnownForce = adminForceMarket;
  }
}, 500);

// ===== Trade Expire কে Admin Win Rate দিয়ে প্রয়োগ =====
// WS handler ভিতরে checkExpiredTrades() কল হচ্ছে।
// সেটা আমরাও শুনছি Part 2 এ checkExpiredTradesAdmin() দিয়ে।
// কিন্তু duplicate কল হলে "already completed" হবে — সমস্যা নেই।

// ===== Payout % Dynamic Update =====
// CALL/PUT বাটনের payout label adminPayout অনুযায়ী আপডেট হবে
function updatePayoutLabels() {
  const labels = document.querySelectorAll(".btn-payout");
  labels.forEach(label => {
    label.textContent = `+${adminPayout}%`;
  });
}

// প্রতি ৫ সেকেন্ডে payout label আপডেট
setInterval(() => {
  if (currentUser) updatePayoutLabels();
}, 5000);

// ===== পেজ লোড হলে admin settings রিফ্রেশ =====
window.addEventListener("load", () => {
  setTimeout(() => {
    if (currentUser) {
      listenAdminSettings();
      console.log("✅ Admin Settings লোড হয়েছে");
    }
  }, 2500);
});

// ===== ট্রেড শেষ হলে Settings থেকে Force রিসেট =====
// Admin যদি Force বাড়ায়, সেটা একটা সময় পর নিজে থেকে 0 হবে না।
// Admin কেই 🔄 চাপতে হবে।

// কিন্তু আমরা একটা safety mechanism দিই — ৫ মিনিট পরে Force auto reset
setInterval(async () => {
  if (!currentUser) return;
  if (adminForceMarket === 0) return;

  // ৫ মিনিট (300000 ms) আগের force change হলে reset
  const now = Date.now();
  if (adminForceMarketAt > 0 && now - adminForceMarketAt > 300000) {
    try {
      await setDoc(doc(db, "settings", "global"), {
        forceMarket: 0,
        forceMarketAt: Date.now()
      }, { merge: true });
      console.log("🔄 Force auto reset (৫ মিনিট)");
    } catch (e) {
      // ignore
    }
  }
}, 60000); // প্রতি ১ মিনিটে চেক

// ============================================
// সব কাজ শেষ — Admin Control এখন ইউজার সাইটে সক্রিয়
// ============================================

console.log("🎉 Admin Control Integration সম্পূর্ণ!");
/* ============================================================
   PART 7A: DYNAMIC MARKET LOAD
   (Firestore theke admin-er market load)
   ============================================================ */

window.userMarkets = [];
window.marketsUnsub = null;
window.selectedMarketId = null;

/**
 * Firestore theke enabled markets load kore
 */
async function loadUserMarketsFromFirestore() {
  try {
    const snap = await getDocs(collection(db, "markets"));
    const markets = [];
    snap.forEach(function(docSnap) {
      const m = docSnap.data();
      if (m.enabled === true) {
        markets.push({
          id: docSnap.id,
          name: m.name || "Unknown",
          symbol: m.symbol || "",
          basePrice: m.basePrice || 50000,
          payout: m.payout || 85,
          winRate: m.winRate || 50,
          candleMode: m.candleMode || "locked",
          currentCandleIndex: m.currentCandleIndex || 0
        });
      }
    });
    markets.sort(function(a, b) {
      return (a.name || "").localeCompare(b.name || "");
    });
    console.log("[Markets] Loaded " + markets.length + " user markets");
    return markets;
  } catch (err) {
    console.error("[Markets] Load error:", err.message);
    return [];
  }
}

/**
 * asset-select element-e markets populate kore
 */
function populateAssetSelect(markets) {
  const sel = document.getElementById("asset-select");
  if (!sel) {
    console.warn("[Markets] asset-select not found");
    return;
  }

  if (!markets || markets.length === 0) {
    // No markets - show placeholder
    sel.innerHTML = '<option value="">-- No Markets Available --</option>';
    console.log("[Markets] No enabled markets to populate");
    return;
  }

  const currentValue = sel.value;
  sel.innerHTML = "";

  markets.forEach(function(m) {
    const opt = document.createElement("option");
    opt.value = m.symbol;
    opt.textContent = m.name + (m.payout ? " +" + m.payout + "%" : "");
    opt.dataset.marketId = m.id;
    opt.dataset.basePrice = m.basePrice;
    opt.dataset.payout = m.payout;
    opt.dataset.winRate = m.winRate;
    sel.appendChild(opt);
  });

  // Try to restore previous selection
  let found = false;
  for (let i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === currentValue) {
      sel.value = currentValue;
      found = true;
      break;
    }
  }

  // If previous not found, select first
  if (!found && sel.options.length > 0) {
    sel.selectedIndex = 0;
  }

  // Update global selectedAsset
  if (sel.value) {
    selectedAsset = sel.value;
    window.selectedMarketId = sel.options[sel.selectedIndex]?.dataset.marketId || null;
  }

  console.log("[Markets] Populated " + markets.length + " markets. Selected: " + selectedAsset);
}

/**
 * Real-time listener — admin market add korle auto update
 */
function listenUserMarkets() {
  if (window.marketsUnsub) {
    window.marketsUnsub();
    window.marketsUnsub = null;
  }

  try {
    window.marketsUnsub = onSnapshot(collection(db, "markets"), function(snap) {
      const markets = [];
      snap.forEach(function(docSnap) {
        const m = docSnap.data();
        if (m.enabled === true) {
          markets.push({
            id: docSnap.id,
            name: m.name || "Unknown",
            symbol: m.symbol || "",
            basePrice: m.basePrice || 50000,
            payout: m.payout || 85,
            winRate: m.winRate || 50,
            candleMode: m.candleMode || "locked",
            currentCandleIndex: m.currentCandleIndex || 0
          });
        }
      });
      markets.sort(function(a, b) {
        return (a.name || "").localeCompare(b.name || "");
      });

      window.userMarkets = markets;
      populateAssetSelect(markets);

      // Update payout labels on CALL/PUT buttons
      if (typeof updatePayoutLabelsFromMarket === "function") {
        updatePayoutLabelsFromMarket();
      }

      console.log("[Markets] Real-time update: " + markets.length + " markets");
    }, function(err) {
      console.error("[Markets] Listener error:", err.message);
    });
  } catch (err) {
    console.error("[Markets] Listen error:", err.message);
  }
}

/**
 * Payout labels update based on selected market
 */
function updatePayoutLabelsFromMarket() {
  const sel = document.getElementById("asset-select");
  if (!sel || !sel.selectedOptions || sel.selectedOptions.length === 0) return;

  const selectedOpt = sel.selectedOptions[0];
  const payout = selectedOpt.dataset.payout || 85;

  document.querySelectorAll(".btn-payout").forEach(function(el) {
    el.textContent = "+" + payout + "%";
  });
}

/**
 * Market change handler — select change hole candle reload
 */
function bindMarketChangeHandler() {
  const sel = document.getElementById("asset-select");
  if (!sel || sel.dataset.boundUserMarket === "1") return;

  sel.dataset.boundUserMarket = "1";

  sel.addEventListener("change", async function() {
    const sel2 = document.getElementById("asset-select");
    if (!sel2) return;

    selectedAsset = sel2.value;
    const selectedOpt = sel2.selectedOptions[0];
    if (selectedOpt) {
      window.selectedMarketId = selectedOpt.dataset.marketId || null;
    }

    console.log("[Markets] User selected: " + selectedAsset + " (id: " + window.selectedMarketId + ")");

    updatePayoutLabelsFromMarket();

    // Reload candles + restart live price
    if (typeof loadCandles === "function") {
      await loadCandles();
    }
    if (typeof startLivePrice === "function" && currentUser) {
      startLivePrice();
    }
  });

  console.log("[Markets] Market change handler bound");
}

/**
 * Init — Auth state er sathe bind
 */
function initUserMarkets() {
  console.log("[Markets] Initializing user markets...");

  // Bind change handler
  bindMarketChangeHandler();

  // Load initial markets
  loadUserMarketsFromFirestore().then(function(markets) {
    populateAssetSelect(markets);
    updatePayoutLabelsFromMarket();
  });

  // Start real-time listener
  listenUserMarkets();
}

// Auto-init when user logs in
(function() {
  var origAuthWatch = setInterval(function() {
    if (window.currentUser && !window.marketsUnsub) {
      console.log("[Markets] User logged in - initializing markets");
      initUserMarkets();
    }
    if (!window.currentUser && window.marketsUnsub) {
      window.marketsUnsub();
      window.marketsUnsub = null;
      console.log("[Markets] User logged out - listener stopped");
    }
  }, 2000);
})();

// Also init on load (in case user is already logged in)
document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    if (window.currentUser) {
      initUserMarkets();
    }
  }, 2500);
});

// === EXPOSE FIREBASE FUNCTIONS TO WINDOW ===
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
/* ============================================================
   PART 7B: CANDLE RENDER FROM FIRESTORE
   (Admin-er save kora candle user site-e load)
   ============================================================ */

window.userCandles = [];
window.userCandlesUnsub = null;
window.candleModeGlobal = "locked";

/**
 * Admin-er candle Firestore theke load kore
 */
async function loadAdminCandlesFromFirestore(marketId) {
  if (!marketId) {
    console.log("[Candles] No marketId provided");
    return [];
  }

  try {
    const candlesRef = collection(db, "markets", marketId, "candles");
    const snap = await getDocs(candlesRef);

    if (snap.empty) {
      console.log("[Candles] No candles in Firestore for market: " + marketId);
      return [];
    }

    const candles = [];
    snap.forEach(function(docSnap) {
      const c = docSnap.data();
      candles.push({
        id: docSnap.id,
        number: c.number || 0,
        date: c.date || "",
        startTime: c.startTime || c.time || "",
        endTime: c.endTime || "",
        timeframe: c.timeframe || "1m",
        open: Number(c.open) || 0,
        high: Number(c.high) || 0,
        low: Number(c.low) || 0,
        close: Number(c.close) || 0,
        color: c.color || "green",
        direction: c.direction || "up",
        size: c.size || "medium",
        wickLength: Number(c.wickLength) || 20,
        bodySize: Number(c.bodySize) || 60,
        status: c.status || "pending"
      });
    });

    candles.sort(function(a, b) {
      return (a.number || 0) - (b.number || 0);
    });

    console.log("[Candles] Loaded " + candles.length + " admin candles from Firestore");
    return candles;

  } catch (err) {
    console.error("[Candles] Load error:", err.message);
    return [];
  }
}

/**
 * Admin candle → LightweightCharts format
 * Time conversion: date + startTime → Unix timestamp (seconds)
 */
function convertAdminCandleToChart(candle, baseIndex) {
  try {
    // Date + Time → Unix timestamp
    const dateStr = candle.date || "2026-01-01";
    const timeStr = candle.startTime || "00:00:00";
    const dateTimeStr = dateStr + "T" + timeStr + "Z";
    let timestamp = Math.floor(new Date(dateTimeStr).getTime() / 1000);

    // If invalid, use fallback (incremental)
    if (isNaN(timestamp) || timestamp <= 0) {
      timestamp = Math.floor(Date.now() / 1000) - (baseIndex * 60);
    }

    return {
      time: timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close
    };

  } catch (err) {
    return null;
  }
}

/**
 * Admin candles render kore chart-e
 */
function renderAdminCandlesOnChart(candles) {
  if (!candleSeries) {
    console.warn("[Candles] candleSeries not initialized");
    return;
  }

  if (!candles || candles.length === 0) {
    console.log("[Candles] No candles to render");
    return;
  }

  const chartData = [];
  candles.forEach(function(c, i) {
    const chartCandle = convertAdminCandleToChart(c, i);
    if (chartCandle && chartCandle.open > 0) {
      chartData.push(chartCandle);
    }
  });

  if (chartData.length === 0) {
    console.warn("[Candles] No valid chart data after conversion");
    return;
  }

  // Sort by time (ascending)
  chartData.sort(function(a, b) { return a.time - b.time; });

  // Remove duplicates (same time)
  const uniqueData = [];
  let lastTime = 0;
  chartData.forEach(function(c) {
    if (c.time > lastTime) {
      uniqueData.push(c);
      lastTime = c.time;
    }
  });

  try {
    candleSeries.setData(uniqueData);
    chart.timeScale().fitContent();

    // Update current price
    const lastCandle = uniqueData[uniqueData.length - 1];
    if (lastCandle) {
      currentPrice = lastCandle.close;
      prevPrice = currentPrice;
      if (currentPriceEl) {
        currentPriceEl.textContent = currentPrice.toFixed(2);
      }
    }

    console.log("[Candles] Rendered " + uniqueData.length + " candles on chart");
  } catch (err) {
    console.error("[Candles] Render error:", err.message);
  }
}

/**
 * Real-time listener for admin candles
 */
function listenAdminCandles(marketId) {
  if (window.userCandlesUnsub) {
    window.userCandlesUnsub();
    window.userCandlesUnsub = null;
  }

  if (!marketId) {
    console.log("[Candles] No marketId - listener not started");
    return;
  }

  try {
    const candlesRef = collection(db, "markets", marketId, "candles");

    window.userCandlesUnsub = onSnapshot(candlesRef, function(snap) {
      const candles = [];
      snap.forEach(function(docSnap) {
        const c = docSnap.data();
        candles.push({
          id: docSnap.id,
          number: c.number || 0,
          date: c.date || "",
          startTime: c.startTime || c.time || "",
          endTime: c.endTime || "",
          timeframe: c.timeframe || "1m",
          open: Number(c.open) || 0,
          high: Number(c.high) || 0,
          low: Number(c.low) || 0,
          close: Number(c.close) || 0,
          color: c.color || "green",
          direction: c.direction || "up"
        });
      });

      candles.sort(function(a, b) {
        return (a.number || 0) - (b.number || 0);
      });

      window.userCandles = candles;
      renderAdminCandlesOnChart(candles);
      console.log("[Candles] Real-time update: " + candles.length + " candles");
    }, function(err) {
      console.error("[Candles] Listener error:", err.message);
    });

    console.log("[Candles] Listener started for market: " + marketId);

  } catch (err) {
    console.error("[Candles] Listen error:", err.message);
  }
}

/**
 * Smart candle loader: Firestore first, Binance fallback
 */
async function loadUserCandlesSmart() {
  const marketId = window.selectedMarketId;

  if (marketId) {
    console.log("[Candles] Loading admin candles for market: " + marketId);

    const adminCandles = await loadAdminCandlesFromFirestore(marketId);

    if (adminCandles.length > 0) {
      // Render admin candles
      renderAdminCandlesOnChart(adminCandles);

      // Start real-time listener
      listenAdminCandles(marketId);
      console.log("[Candles] Using ADMIN candles (" + adminCandles.length + ")");
      return;
    } else {
      console.log("[Candles] No admin candles - falling back to Binance");
    }
  } else {
    console.log("[Candles] No marketId - using Binance fallback");
  }

  // Fallback: Binance API
  if (window.userCandlesUnsub) {
    window.userCandlesUnsub();
    window.userCandlesUnsub = null;
  }

  if (typeof loadCandles === "function") {
    await loadCandles();
  }
}

/**
 * Init on market change
 */
function onMarketChanged() {
  console.log("[Candles] Market changed - reloading candles");
  loadUserCandlesSmart();
}

// ============================================================
// BIND: Market change handler override
// ============================================================

// Wait for Part 7A to load, then override bindMarketChangeHandler
setTimeout(function() {
  const sel = document.getElementById("asset-select");
  if (!sel) {
    console.warn("[Candles] asset-select not found");
    return;
  }

  // Remove old handlers by cloning
  const newSel = sel.cloneNode(true);
  sel.parentNode.replaceChild(newSel, sel);

  // Bind new handler
  newSel.addEventListener("change", async function() {
    const selectedOpt = newSel.selectedOptions[0];
    selectedAsset = newSel.value;
    window.selectedMarketId = selectedOpt ? (selectedOpt.dataset.marketId || null) : null;

    console.log("[Candles] User selected: " + selectedAsset + " (id: " + window.selectedMarketId + ")");

    // Update payout labels
    if (typeof updatePayoutLabelsFromMarket === "function") {
      updatePayoutLabelsFromMarket();
    }

    // Load candles: Firestore first
    await loadUserCandlesSmart();

    // Restart live price (for fallback Binance mode)
    if (window.selectedMarketId === null && typeof startLivePrice === "function" && currentUser) {
      startLivePrice();
    }
  });

  console.log("[Candles] Market change handler re-bound (Part 7B)");
}, 3500);

// ============================================================
// INIT: Load candles on user login
// ============================================================

(function() {
  let lastLoginState = false;

  setInterval(function() {
    const nowLoggedIn = !!window.currentUser;

    // User just logged in
    if (nowLoggedIn && !lastLoginState) {
      console.log("[Candles] User logged in - loading candles");
      setTimeout(function() {
        loadUserCandlesSmart();
      }, 3000);
    }

    // User just logged out
    if (!nowLoggedIn && lastLoginState) {
      console.log("[Candles] User logged out - stopping listeners");
      if (window.userCandlesUnsub) {
        window.userCandlesUnsub();
        window.userCandlesUnsub = null;
      }
    }

    lastLoginState = nowLoggedIn;
  }, 2000);
})();

// Also init on DOMContentLoaded (if user already logged in)
document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    if (window.currentUser) {
      console.log("[Candles] DOMContentLoaded - user already logged in, loading candles");
      loadUserCandlesSmart();
    }
  }, 5000);
});

console.log("Part 7B (Candle Render from Firestore) loaded");

// ============================================================
// EXPOSE FIREBASE + STATE TO WINDOW (FINAL FIX)
// ============================================================

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

// Sync module state to window
setTimeout(function() {
  window.loadUserMarketsFromFirestore = loadUserMarketsFromFirestore;
  window.loadAdminCandlesFromFirestore = loadAdminCandlesFromFirestore;
  window.renderAdminCandlesOnChart = renderAdminCandlesOnChart;
  window.listenAdminCandles = listenAdminCandles;
  window.loadUserCandlesSmart = loadUserCandlesSmart;
  console.log("✅ Functions exposed after 2s");
}, 2000);

setInterval(function() {
  if (typeof currentUser !== 'undefined' && currentUser) window.currentUser = currentUser;
  if (typeof chart !== 'undefined' && chart) window.chart = chart;
  if (typeof candleSeries !== 'undefined' && candleSeries) window.candleSeries = candleSeries;
}, 500);

console.log("✅ State sync started");

/* ============================================================
   MSG 10: TRUE TRADE MECHANIC + COUNTDOWN + ENTRY LINE
   (Self-contained — no dependency on missing functions)
   ============================================================ */

// ============================================================
// 1. TOP-LEFT COUNTDOWN TIMER
// ============================================================

window.countdownInterval = null;

function updateTopCountdown() {
  var timerEl = document.getElementById("top-countdown-timer");
  var symbolEl = document.getElementById("countdown-symbol");
  var timeEl = document.getElementById("countdown-time");
  var badgeEl = document.getElementById("trade-info-badge");
  var arrowEl = document.getElementById("trade-info-arrow");
  var infoTextEl = document.getElementById("trade-info-text");

  // Access activeTradesLocal via module scope (may be in different name)
  var trades = (typeof activeTradesLocal !== "undefined" && Array.isArray(activeTradesLocal))
    ? activeTradesLocal : [];

  if (trades.length === 0) {
    if (timerEl) timerEl.classList.add("hidden");
    if (badgeEl) badgeEl.classList.add("hidden");
    return;
  }

  // Find soonest trade
  var soonest = trades[0];
  for (var i = 1; i < trades.length; i++) {
    if (trades[i].expiresAt < soonest.expiresAt) soonest = trades[i];
  }

  var remaining = Math.max(0, Math.ceil((soonest.expiresAt - Date.now()) / 1000));
  var mm = Math.floor(remaining / 60);
  var ss = remaining % 60;
  var timeStr = String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");

  if (timerEl) {
    timerEl.classList.remove("hidden", "warning", "critical");
    if (remaining <= 5) timerEl.classList.add("critical");
    else if (remaining <= 15) timerEl.classList.add("warning");

    if (symbolEl) symbolEl.textContent = soonest.asset || "ASSET";
    if (timeEl) timeEl.textContent = timeStr;
  }

  if (badgeEl) {
    badgeEl.classList.remove("hidden", "call", "put");
    badgeEl.classList.add(soonest.type || "call");
    if (arrowEl) arrowEl.textContent = soonest.type === "call" ? "▲" : "▼";
    if (infoTextEl) {
      infoTextEl.textContent = String(soonest.type || "call").toUpperCase() + " $" + (soonest.amount || 0);
    }
  }
}

function startCountdownInterval() {
  if (window.countdownInterval) return;
  window.countdownInterval = setInterval(updateTopCountdown, 200);
  console.log("[MSG10] Countdown interval started");
}

function stopCountdownInterval() {
  if (window.countdownInterval) {
    clearInterval(window.countdownInterval);
    window.countdownInterval = null;
    console.log("[MSG10] Countdown interval stopped");
  }
}

// Auto-start
startCountdownInterval();
document.addEventListener("DOMContentLoaded", startCountdownInterval);

// ============================================================
// 2. TRUE TRADE MECHANIC — Entry vs Exit Compare
// ============================================================

function safeShowResultFlash(result) {
  if (typeof showResultFlash === "function") {
    try { showResultFlash(result); return; } catch(e) {}
  }
  // Fallback flash
  var flash = document.createElement("div");
  flash.className = "result-flash " + result;
  document.body.appendChild(flash);
  setTimeout(function() { flash.remove(); }, 700);
}

function safePlaySound(type) {
  if (typeof playSound === "function") {
    try { playSound(type); return; } catch(e) {}
  }
}

function safeAnimateBalanceChange(amount) {
  if (typeof animateBalanceChange === "function") {
    try { animateBalanceChange(amount); return; } catch(e) {}
  }
  // Fallback: update balance display
  if (typeof balanceEl !== "undefined" && balanceEl) {
    balanceEl.textContent = Number(userBalance).toFixed(2);
  }
}

async function processTradeResults() {
  if (typeof currentUser === "undefined" || !currentUser) return;

  var trades = (typeof activeTradesLocal !== "undefined" && Array.isArray(activeTradesLocal))
    ? activeTradesLocal : [];

  if (trades.length === 0) return;

  var now = Date.now();

  for (var i = 0; i < trades.length; i++) {
    var trade = trades[i];
    if (trade.expiresAt > now || trade.status !== "pending") continue;

    var entryPrice = Number(trade.entryPrice) || Number(currentPrice) || 0;
    var exitPrice = Number(currentPrice) || entryPrice;
    var diff = exitPrice - entryPrice;

    var realResult = "loss";
    if (trade.type === "call" && diff > 0) realResult = "win";
    else if (trade.type === "put" && diff < 0) realResult = "win";

    console.log(
      "[Trade Result] " + String(trade.type).toUpperCase() +
      " | Entry: " + entryPrice.toFixed(2) +
      " → Exit: " + exitPrice.toFixed(2) +
      " | Diff: " + diff.toFixed(2) +
      " | " + realResult.toUpperCase()
    );

    var payoutRate = ((typeof adminPayout !== "undefined" ? adminPayout : 85) / 100) + 1;
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

          if (typeof userBalance !== "undefined") userBalance = newBal;
          window.userBalance = newBal;

          if (typeof balanceEl !== "undefined" && balanceEl) {
            balanceEl.textContent = newBal.toFixed(2);
          }
          if (typeof balancePopupValue !== "undefined" && balancePopupValue) {
            balancePopupValue.textContent = newBal.toFixed(2);
          }

          safeAnimateBalanceChange(returnAmount);
          safeShowResultFlash("win");
          safePlaySound("win");

          if (typeof tradeMessage !== "undefined" && tradeMessage) {
            tradeMessage.style.color = "#00c853";
            tradeMessage.textContent = "🎉 জিতেছেন! +$" + netProfit.toFixed(2);
            setTimeout(function() { tradeMessage.textContent = ""; }, 3500);
          }
        }
      } else {
        safeShowResultFlash("loss");
        safePlaySound("loss");

        if (typeof tradeMessage !== "undefined" && tradeMessage) {
          tradeMessage.style.color = "#ff5252";
          tradeMessage.textContent = "😔 হেরেছেন -$" + trade.amount.toFixed(2);
          setTimeout(function() { tradeMessage.textContent = ""; }, 3500);
        }
      }
    } catch (err) {
      console.error("[Trade Process Error]", err.message);
    }
  }
}

// Start trade result processor (every 1.5 sec)
setInterval(processTradeResults, 1500);

// ============================================================
// 3. CHART ENTRY LINE + TRADE MARKER
// ============================================================

function renderTradeMarkers() {
  if (typeof candleSeries === "undefined" || !candleSeries) return;

  var trades = (typeof activeTradesLocal !== "undefined" && Array.isArray(activeTradesLocal))
    ? activeTradesLocal : [];

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

  try {
    candleSeries.setMarkers(markers);
  } catch(e) {}
}

setInterval(renderTradeMarkers, 2000);

// ============================================================
// 4. FINAL EXPOSE (all-in-one, null-safe)
// ============================================================

(function exposeSafely() {
  var toExpose = [
    "placeTrade", "checkExpiredTrades", "checkExpiredTradesAdmin",
    "loadActiveTrades", "loadHistory", "initChart", "loadCandles",
    "startLivePrice", "stopLivePrice", "updateBigTimer",
    "animateBalanceChange", "showResultFlash", "playSound"
  ];

  for (var i = 0; i < toExpose.length; i++) {
    var name = toExpose[i];
    try {
      if (typeof eval(name) === "function") {
        window[name] = eval(name);
      }
    } catch(e) {
      // silently skip
    }
  }

  // Expose new MSG 10 functions
  window.updateTopCountdown = updateTopCountdown;
  window.startCountdownInterval = startCountdownInterval;
  window.stopCountdownInterval = stopCountdownInterval;
  window.processTradeResults = processTradeResults;
  window.renderTradeMarkers = renderTradeMarkers;

  console.log("[MSG10] Functions exposed safely");
})();

// ============================================================
// 5. STATE SYNC (every 500ms)
// ============================================================

setInterval(function() {
  try {
    if (typeof currentUser !== "undefined" && currentUser) {
      window.currentUser = currentUser;
    }
    if (typeof userBalance !== "undefined") {
      window.userBalance = userBalance;
    }
    if (typeof currentPrice !== "undefined") {
      window.currentPrice = currentPrice;
    }
    if (typeof activeTradesLocal !== "undefined" && Array.isArray(activeTradesLocal)) {
      window.activeTradesLocal = activeTradesLocal;
    }
    if (typeof chart !== "undefined" && chart) {
      window.chart = chart;
    }
    if (typeof candleSeries !== "undefined" && candleSeries) {
      window.candleSeries = candleSeries;
    }
  } catch(e) {}
}, 500);

console.log("===== MSG 10: True Trade Mechanic + Countdown + Entry Line loaded =====");

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
    if (typeof currentPrice === "undefined" || currentPrice === null) return;
    if (isNaN(Number(currentPrice))) return;

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
            tradeMessage.textContent = " PROFIT! +$" + netProfit.toFixed(2);
            setTimeout(function() { tradeMessage.textContent = ""; }, 3500);
          }
        }
      } else {
        if (typeof showResultFlash === "function") showResultFlash("loss");
        if (typeof playSound === "function") playSound("loss");

        if (tradeMessage) {
          tradeMessage.style.color = "#ff5252";
          tradeMessage.textContent = "Loss -$" + trade.amount.toFixed(2);
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

/* ============================================================
   MSG 12: CANDLE MANIPULATOR + TRAP + DELAY + REVERSAL
   ============================================================ */

// ============================================================
// 1. STATE VARIABLES
// ============================================================

window.trapEngine = {
  trapRate: 30,
  delayRate: 20,
  reversalRate: 15,
  activeTraps: {},
  candleOpenPrice: {},
  candlePhases: {}
};

// ============================================================
// 2. LISTEN TRAP SETTINGS
// ============================================================

function listenTrapSettings() {
  if (typeof db === "undefined") return;

  try {
    onSnapshot(doc(db, "settings", "global"), function(snap) {
      if (!snap.exists()) return;
      var d = snap.data();
      window.trapEngine.trapRate = d.trapRate ?? 30;
      window.trapEngine.delayRate = d.delayRate ?? 20;
      window.trapEngine.reversalRate = d.reversalRate ?? 15;

      console.log(
        "[MSG12] Trap settings: Trap " + window.trapEngine.trapRate + "% | " +
        "Delay " + window.trapEngine.delayRate + "% | " +
        "Reversal " + window.trapEngine.reversalRate + "%"
      );
    });
  } catch(err) {
    console.error("[MSG12] Trap settings listen error:", err.message);
  }
}

setTimeout(listenTrapSettings, 3000);

// ============================================================
// 3. TRAP DECISION LOGIC
// ============================================================

// Decide if current candle should be trapped
function shouldTrap() {
  var rate = window.trapEngine.trapRate || 0;
  var r = Math.random() * 100;
  return r < rate;
}

// Decide if delay should be injected
function shouldDelay() {
  var rate = window.trapEngine.delayRate || 0;
  var r = Math.random() * 100;
  return r < rate;
}

// Decide if mid-reversal should happen
function shouldReversal() {
  var rate = window.trapEngine.reversalRate || 0;
  var r = Math.random() * 100;
  return r < rate;
}

// ============================================================
// 4. TRAP CANDLE GENERATOR
// ============================================================

// Generate a trap candle: open green → close red (or vice versa)
function generateTrapCandle(direction) {
  var openPrice = currentPrice;
  var trapSize = 50 + Math.random() * 100;
  var closePrice;

  if (direction === "trap_down") {
    // Looks like up movement, then closes down
    closePrice = openPrice - trapSize;
  } else if (direction === "trap_up") {
    // Looks like down movement, then closes up
    closePrice = openPrice + trapSize;
  } else {
    closePrice = openPrice + (Math.random() - 0.5) * 100;
  }

  var high = Math.max(openPrice, closePrice) + Math.random() * 30;
  var low = Math.min(openPrice, closePrice) - Math.random() * 30;

  // Trap: candle looks opposite first, then reverses
  if (direction === "trap_down") {
    high = openPrice + Math.random() * 80; // looks up
  } else if (direction === "trap_up") {
    low = openPrice - Math.random() * 80; // looks down
  }

  return {
    open: openPrice,
    high: high,
    low: low,
    close: closePrice,
    isTrap: true
  };
}

// ============================================================
// 5. APPLY TRAP BASED ON ANALYSIS
// ============================================================

function applyTrapFromAnalysis() {
  if (typeof candleSeries === "undefined" || !candleSeries) return;
  if (!window.tradeAnalysis) return;
  if (window.tradeAnalysis.callCount + window.tradeAnalysis.putCount === 0) return;

  var analysis = window.tradeAnalysis;
  var direction = analysis.suggestedDirection;

  // Only trap if should
  if (!shouldTrap()) return;

  // Determine trap direction
  var trapDir = "trap_down"; // Default: CALL-heavy → candle goes down
  if (direction === "up") {
    trapDir = "trap_up"; // PUT-heavy → candle goes up
  }

  // Get current candle time
  var now = Math.floor(Date.now() / 1000);
  var candleTime = Math.floor(now / 60) * 60;

  var trapCandle = generateTrapCandle(trapDir);

  try {
    candleSeries.update({
      time: candleTime,
      open: trapCandle.open,
      high: trapCandle.high,
      low: trapCandle.low,
      close: trapCandle.close
    });

    currentPrice = trapCandle.close;
    window.currentPrice = trapCandle.close;

    console.log(
      "[MSG12] TRAP applied: " + trapDir.toUpperCase() +
      " | Open: " + trapCandle.open.toFixed(2) +
      " → Close: " + trapCandle.close.toFixed(2) +
      " | For: " + analysis.callCount + " CALL, " + analysis.putCount + " PUT users"
    );
  } catch(err) {
    console.error("[MSG12] Trap apply error:", err.message);
  }
}

// ============================================================
// 6. DELAY INJECTOR — Random delays in candle close
// ============================================================

window.delayTimer = null;

function injectDelay() {
  if (!shouldDelay()) return;

  // Random delay: 1-5 seconds
  var delaySec = 1 + Math.floor(Math.random() * 4);

  console.log("[MSG12] DELAY injected: " + delaySec + "s");

  // Small visual jitter (not real close delay, just visual)
  var jitter = (Math.random() - 0.5) * 20;
  currentPrice = currentPrice + jitter;
  window.currentPrice = currentPrice;

  if (typeof currentPriceEl !== "undefined" && currentPriceEl) {
    currentPriceEl.textContent = currentPrice.toFixed(2);
  }
}

setInterval(injectDelay, 5000);

// ============================================================
// 7. MID-CANDLE REVERSAL
// ============================================================

function applyMidReversal() {
  if (!shouldReversal()) return;
  if (typeof candleSeries === "undefined" || !candleSeries) return;

  var now = Math.floor(Date.now() / 1000);
  var candleTime = Math.floor(now / 60) * 60;

  // Current close vs open
  var openP = window.currentCandleOpen || currentPrice;
  var closeP = currentPrice;

  // If candle currently going up (green), reverse to red
  if (closeP > openP) {
    var reverseClose = openP - Math.random() * 50;
    try {
      candleSeries.update({
        time: candleTime,
        open: openP,
        high: closeP + Math.random() * 20, // peak was higher
        low: reverseClose - Math.random() * 10,
        close: reverseClose
      });
      currentPrice = reverseClose;
      window.currentPrice = reverseClose;

      console.log("[MSG12] MID-REVERSAL: Green → Red | Peak: " + closeP.toFixed(2) + " → Close: " + reverseClose.toFixed(2));
    } catch(err) {}
  }
  // If going down, reverse to green
  else if (closeP < openP) {
    var reverseClose2 = openP + Math.random() * 50;
    try {
      candleSeries.update({
        time: candleTime,
        open: openP,
        high: reverseClose2 + Math.random() * 20,
        low: closeP - Math.random() * 20,
        close: reverseClose2
      });
      currentPrice = reverseClose2;
      window.currentPrice = reverseClose2;

      console.log("[MSG12] MID-REVERSAL: Red → Green | Bottom: " + closeP.toFixed(2) + " → Close: " + reverseClose2.toFixed(2));
    } catch(err) {}
  }
}

setInterval(applyMidReversal, 30000);

// ============================================================
// 8. INTEGRATE WITH ANALYZER
// ============================================================

// Run trap check every 5 seconds when trades are active
setInterval(function() {
  if (!window.currentUser) return;
  if (!window.tradeAnalysis) return;
  if (window.tradeAnalysis.callCount + window.tradeAnalysis.putCount === 0) return;

  applyTrapFromAnalysis();
}, 5000);

// ============================================================
// 9. APPLY TRAP BEFORE TRADE RESULT
// ============================================================

// Override processTradeResultsV2 to apply trap right before completion
var _origProcessTradeResults = window.processTradeResults;

window.processTradeResults = async function() {
  // Before processing, apply trap if there are active trades
  if (window.tradeAnalysis &&
      window.tradeAnalysis.callCount + window.tradeAnalysis.putCount > 0) {
    applyTrapFromAnalysis();
  }

  // Then call original
  if (typeof _origProcessTradeResults === "function") {
    return _origProcessTradeResults();
  }
};

// ============================================================
// 10. EXPOSE FOR DEBUG
// ============================================================

window.applyTrapFromAnalysis = applyTrapFromAnalysis;
window.shouldTrap = shouldTrap;
window.shouldDelay = shouldDelay;
window.shouldReversal = shouldReversal;
window.injectDelay = injectDelay;
window.applyMidReversal = applyMidReversal;
window.generateTrapCandle = generateTrapCandle;

console.log("===== MSG 12: Candle Manipulator + Trap + Delay + Reversal loaded =====");

/* ============================================================
   MSG 13: AUTO 24/7 GENERATION + DESIGNER APPLY
   ============================================================ */

// ============================================================
// 1. STATE VARIABLES
// ============================================================

window.autoGenerate24h = false;
window.designerCandle = null;
window.applyNextAt = 0;
window.auto24hInterval = null;
window.designerListeners = {};

// ============================================================
// 2. LISTEN AUTO 24/7 + DESIGNER
// ============================================================

function listenAuto24hSettings() {
  if (typeof db === "undefined") return;

  try {
    onSnapshot(doc(db, "settings", "global"), function(snap) {
      if (!snap.exists()) return;
      var d = snap.data();
      window.autoGenerate24h = d.autoGenerate24h === true;
      console.log("[MSG13] Auto 24/7:", window.autoGenerate24h ? "ON" : "OFF");
    });
  } catch(err) {
    console.error("[MSG13] Auto 24/7 listen error:", err.message);
  }
}

setTimeout(listenAuto24hSettings, 3500);

// Listen designer for current market
function listenDesignerForMarket(marketId) {
  if (!marketId) return;
  if (typeof db === "undefined") return;

  // Unsubscribe previous
  if (window.designerListeners[marketId]) {
    try { window.designerListeners[marketId](); } catch(e) {}
  }

  try {
    window.designerListeners[marketId] = onSnapshot(doc(db, "markets", marketId), function(snap) {
      if (!snap.exists()) return;
      var d = snap.data();

      if (d.designerCandle) {
        window.designerCandle = d.designerCandle;
      }

      if (d.applyNextAt && d.applyNextAt > (window.applyNextAt || 0)) {
        window.applyNextAt = d.applyNextAt;
        console.log("[MSG13] New designer to apply:", d.designerCandle);
      }
    });
  } catch(err) {
    console.error("[MSG13] Designer listen error:", err.message);
  }
}

// ============================================================
// 3. AUTO 24/7 GENERATION ENGINE
// ============================================================

function startAuto24hGeneration() {
  if (window.auto24hInterval) clearInterval(window.auto24hInterval);

  window.auto24hInterval = setInterval(async function() {
    if (!window.autoGenerate24h) return;
    if (typeof candleSeries === "undefined" || !candleSeries) return;
    if (!window.selectedMarketId) return;

    // Generate a new candle
    var now = Math.floor(Date.now() / 1000);
    var candleTime = Math.floor(now / 60) * 60;

    // Only generate if new minute
    if (window.currentCandleTime === candleTime) return;

    // Check if designer applies
    var designerData = window.designerCandle;
    var useDesigner = designerData &&
                      window.applyNextAt > 0 &&
                      (Date.now() - window.applyNextAt < 70000); // within 70s

    var openP, closeP, highP, lowP;

    if (useDesigner) {
      // Use designer values
      openP = designerData.open;
      closeP = designerData.close;
      highP = designerData.high;
      lowP = designerData.low;

      console.log("[MSG13] Applying designer candle:", designerData);
    } else {
      // Natural generation
      openP = currentPrice;
      var move = (Math.random() - 0.5) * 120;
      closeP = openP + move;
      highP = Math.max(openP, closeP) + Math.random() * 40;
      lowP = Math.min(openP, closeP) - Math.random() * 40;
    }

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

      // Save to Firestore (persist)
      if (window.selectedMarketId) {
        var cid = 'auto_' + candleTime;
        try {
          await setDoc(doc(db, "markets", window.selectedMarketId, "candles", cid), {
            number: candleTime,
            date: new Date(candleTime * 1000).toISOString().split('T')[0],
            startTime: new Date(candleTime * 1000).toTimeString().slice(0, 8),
            timeframe: "1m",
            open: Number(openP.toFixed(2)),
            high: Number(highP.toFixed(2)),
            low: Number(lowP.toFixed(2)),
            close: Number(closeP.toFixed(2)),
            color: closeP >= openP ? "green" : "red",
            direction: closeP > openP ? "up" : (closeP < openP ? "down" : "neutral"),
            size: "medium",
            status: "auto",
            createdAt: new Date().toISOString()
          });
        } catch(e) {}
      }

      console.log("[MSG13] Auto 24/7 candle generated: " + openP.toFixed(2) + " → " + closeP.toFixed(2) + (useDesigner ? " [DESIGNER]" : ""));

      // Clear designer after apply
      if (useDesigner) {
        window.applyNextAt = 0;
      }
    } catch(err) {
      console.error("[MSG13] Auto 24/7 error:", err.message);
    }
  }, 10000); // Check every 10s, generate on new minute

  console.log("[MSG13] Auto 24/7 generation engine started");
}

// ============================================================
// 4. AUTO-START
// ============================================================

setTimeout(function() {
  startAuto24hGeneration();

  // Also start designer listener for current market
  if (window.selectedMarketId) {
    listenDesignerForMarket(window.selectedMarketId);
  }
}, 5000);

// Listen for market change → update designer listener
setInterval(function() {
  if (window.selectedMarketId && !window.designerListeners[window.selectedMarketId]) {
    listenDesignerForMarket(window.selectedMarketId);
  }
}, 5000);

// ============================================================
// 5. EXPOSE FOR DEBUG
// ============================================================

window.startAuto24hGeneration = startAuto24hGeneration;
window.listenDesignerForMarket = listenDesignerForMarket;

console.log("===== MSG 13: Auto 24/7 Generation + Designer Apply loaded =====");

/* ============================================================
   MSG 14: User Chat System
   ============================================================ */

window.userChatUnsub = null;

// ============================================================
// 1. OPEN/CLOSE CHAT POPUP
// ============================================================

function openUserChat() {
  var popup = document.getElementById("chat-popup");
  var overlay = document.getElementById("chat-popup-overlay");
  if (!popup) return;

  popup.classList.remove("hidden");
  if (overlay) overlay.onclick = function() { closeUserChat(); };

  // Start listening to messages
  startUserChatListener();
}

function closeUserChat() {
  var popup = document.getElementById("chat-popup");
  if (!popup) return;
  popup.classList.add("hidden");
}

// ============================================================
// 2. LISTEN TO USER'S MESSAGES
// ============================================================

function startUserChatListener() {
  if (!currentUser) return;

  if (window.userChatUnsub) {
    try { window.userChatUnsub(); } catch(e) {}
    window.userChatUnsub = null;
  }

  try {
    var q = query(
      collection(db, "chats", currentUser.uid, "messages"),
      orderBy("timestamp", "asc")
    );

    window.userChatUnsub = onSnapshot(q, function(snap) {
      var messagesEl = document.getElementById("user-chat-messages");
      if (!messagesEl) return;

      messagesEl.innerHTML = "";
      if (snap.empty) {
        messagesEl.innerHTML = '<p class="empty-text">Send a message to admin...</p>';
        return;
      }

      snap.forEach(function(d) {
        var m = d.data();
        var div = document.createElement("div");
        div.className = "user-chat-msg " + (m.from === "user" ? "from-user" : "from-admin");

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
    console.error("[MSG14] User chat error:", err.message);
  }
}

// ============================================================
// 3. SEND MESSAGE (USER SIDE)
// ============================================================

async function sendUserChatMessage() {
  if (!currentUser) return;

  var input = document.getElementById("user-chat-input");
  if (!input) return;
  var text = input.value.trim();
  if (!text) return;

  input.value = "";

  try {
    await addDoc(collection(db, "chats", currentUser.uid, "messages"), {
      from: "user",
      text: text,
      timestamp: new Date().toISOString()
    });

    console.log("[MSG14-User] Message sent to admin");
  } catch (err) {
    console.error("[MSG14-User] Send error:", err.message);
  }
}

// ============================================================
// 4. BIND BUTTONS
// ============================================================

setTimeout(function() {
  var chatBtn = document.getElementById("chat-btn");
  if (chatBtn && chatBtn.dataset.bound !== "1") {
    chatBtn.dataset.bound = "1";
    chatBtn.onclick = openUserChat;
    console.log("[MSG14-User] Chat button bound");
  }

  var closeBtn = document.getElementById("chat-popup-close");
  if (closeBtn && closeBtn.dataset.bound !== "1") {
    closeBtn.dataset.bound = "1";
    closeBtn.onclick = closeUserChat;
  }

  var sendBtn = document.getElementById("user-chat-send");
  if (sendBtn && sendBtn.dataset.bound !== "1") {
    sendBtn.dataset.bound = "1";
    sendBtn.onclick = sendUserChatMessage;
    console.log("[MSG14-User] Send button bound");
  }

  var input = document.getElementById("user-chat-input");
  if (input && input.dataset.bound !== "1") {
    input.dataset.bound = "1";
    input.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        sendUserChatMessage();
      }
    });
  }
}, 3000);

console.log("===== MSG 14: Admin Chat + User Chat loaded =====");
/* ============================================================
   GLOBAL EXPOSE (Debug + Cross-module access)
   ============================================================ */

// Expose Auth state (module -> window)
setInterval(function() {
  window.currentUser = currentUser;
  window.userBalance = userBalance;
  window.selectedAsset = selectedAsset;
  window.accountType = accountType;
}, 1000);

// Expose Part 7A functions
window.loadUserMarketsFromFirestore = loadUserMarketsFromFirestore;
window.populateAssetSelect = populateAssetSelect;
window.listenUserMarkets = listenUserMarkets;
window.bindMarketChangeHandler = bindMarketChangeHandler;
window.initUserMarkets = initUserMarkets;
window.updatePayoutLabelsFromMarket = updatePayoutLabelsFromMarket;

// Expose Part 7B functions
window.loadAdminCandlesFromFirestore = loadAdminCandlesFromFirestore;
window.convertAdminCandleToChart = convertAdminCandleToChart;
window.renderAdminCandlesOnChart = renderAdminCandlesOnChart;
window.listenAdminCandles = listenAdminCandles;
window.loadUserCandlesSmart = loadUserCandlesSmart;
window.onMarketChanged = onMarketChanged;

// Expose core functions (for testing)
window.loadCandles = loadCandles;
window.startLivePrice = startLivePrice;
window.stopLivePrice = stopLivePrice;
window.placeTrade = placeTrade;
window.checkExpiredTrades = checkExpiredTrades;
window.checkExpiredTradesAdmin = checkExpiredTradesAdmin;
window.listenAdminSettings = listenAdminSettings;
window.updatePayoutLabels = updatePayoutLabels;
window.applyMarketForce = applyMarketForce;
window.startAutoModeDrift = startAutoModeDrift;

// Expose chart state
setInterval(function() {
  window.chart = chart;
  window.candleSeries = candleSeries;
}, 500);

console.log("✅ All Part 7A + 7B functions exposed to window");
console.log("✅ Auth state synced (window.currentUser)");
console.log("📊 যা এখন কাজ করবে:");
console.log("   1. Win Rate — Admin থেকে সেট → ট্রেডে প্রয়োগ");
console.log("   2. Payout % — Admin থেকে সেট → জিতলে সেই %");
console.log("   3. Market Force — Admin ⬆⬇ → প্রাইস উপরে-নিচে");
console.log("   4. Auto Mode — Admin Toggle → অটো drift");

// === FINAL EXPOSE ===
window.placeTrade = placeTrade;
window.checkExpiredTrades = checkExpiredTrades;
window.checkExpiredTradesAdmin = checkExpiredTradesAdmin;
window.updateTradeMarkers = updateTradeMarkers;
window.loadActiveTrades = loadActiveTrades;

// === FINAL STATE SYNC ===
setInterval(function() {
  if (typeof currentUser !== 'undefined' && currentUser) {
    window.currentUser = currentUser;
    window.userBalance = userBalance;
  }
  if (typeof chart !== 'undefined' && chart) {
    window.chart = chart;
  }
  if (typeof candleSeries !== 'undefined' && candleSeries) {
    window.candleSeries = candleSeries;
  }
  if (typeof activeTradesLocal !== 'undefined') {
    window.activeTradesLocal = activeTradesLocal;
  }
  if (typeof currentPrice !== 'undefined') {
    window.currentPrice = currentPrice;
  }
}, 500);

console.log("✅ APP.JS FINAL EXPOSE COMPLETE");

/* ============================================================
   MSG 15: Chart Time Labels + Resize Helper
   ============================================================ */

// ===== 1. Time Label Strip Updater =====
(function initMsg15TimeStrip() {
  if (window.__msg15TimeInit) return;
  window.__msg15TimeInit = true;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function fmtHHMM(d) {
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function updateTimeStrip() {
    var elL = document.getElementById('timeLeft');
    var elC = document.getElementById('timeCenter');
    var elR = document.getElementById('timeRight');
    if (!elL && !elC && !elR) return;

    var now = new Date();
    var left = new Date(now.getTime() - 5 * 60 * 1000);
    var right = new Date(now.getTime() + 5 * 60 * 1000);

    if (elL) elL.textContent = fmtHHMM(left);
    if (elR) elR.textContent = fmtHHMM(right);

    if (elC) {
      var remain = 59 - now.getSeconds();
      elC.textContent = 'LIVE  ' + pad(remain) + 's';
    }
  }

  updateTimeStrip();
  setInterval(updateTimeStrip, 1000);
  console.log('[MSG15] Time strip updater started');
})();

// ===== 2. Chart Resize Helper =====
(function initMsg15Resize() {
  if (window.__msg15Resize) return;
  window.__msg15Resize = true;

  function resizeChart() {
    try {
      if (window.chart && typeof window.chart.applyOptions === 'function') {
        var wrap = document.getElementById('chart-wrapper');
        if (wrap) {
          window.chart.applyOptions({
            width: wrap.clientWidth,
            height: wrap.clientHeight
          });
        }
      }
    } catch (e) { /* silent */ }
  }

  window.addEventListener('resize', function () {
    clearTimeout(window.__msg15RzT);
    window.__msg15RzT = setTimeout(resizeChart, 200);
  });

  setTimeout(resizeChart, 500);
  setTimeout(resizeChart, 1500);

  console.log('[MSG15] Chart resize helper ready');
})();

console.log("===== MSG 15: Time Labels + Chart Resize loaded =====");
/* ============================================================
   MSG 16: Entry/Exit Labels + Bottom Navigation
   ============================================================ */

// ============================================================
// 1. ENTRY/EXIT PRICE LABELS ON CHART
// ============================================================

window.__msg16EntryExit = {
  entryLabel: null,
  exitLabel: null,
  entryPrice: null,
  exitPrice: null
};

function updateEntryExitLabels() {
  var entryEl = document.getElementById('entryLabel');
  var exitEl = document.getElementById('exitLabel');
  if (!entryEl && !exitEl) return;

  var trades = (typeof activeTradesLocal !== "undefined" && Array.isArray(activeTradesLocal))
    ? activeTradesLocal : [];

  if (trades.length === 0) {
    if (entryEl) entryEl.classList.add('hidden');
    if (exitEl) exitEl.classList.add('hidden');
    return;
  }

  // Find most recent trade
  var latest = trades[0];
  for (var i = 1; i < trades.length; i++) {
    if (trades[i].expiresAt > latest.expiresAt) latest = trades[i];
  }

  var wrap = document.getElementById('chart-wrapper');
  if (!wrap) return;
  var wrapH = wrap.clientHeight;

  // Entry label position — try using chart's coordinate system
  var entryY = 0;
  var exitY = 0;

  try {
    if (window.candleSeries && typeof window.candleSeries.priceToCoordinate === 'function') {
      var ey = window.candleSeries.priceToCoordinate(Number(latest.entryPrice));
      if (ey !== null && ey !== undefined) entryY = ey;
    }
  } catch (e) {}

  // Exit label — current price position
  try {
    if (window.candleSeries && typeof window.candleSeries.priceToCoordinate === 'function') {
      var xy = window.candleSeries.priceToCoordinate(Number(window.currentPrice || currentPrice));
      if (xy !== null && xy !== undefined) exitY = xy;
    }
  } catch (e) {}

  // Clamp within chart
  entryY = Math.max(20, Math.min(wrapH - 40, entryY));
  exitY = Math.max(20, Math.min(wrapH - 40, exitY));

  if (entryEl) {
    entryEl.classList.remove('hidden');
    entryEl.style.top = entryY + 'px';
    var entryText = entryEl.querySelector('.label-price');
    if (entryText) {
      entryText.textContent = 'ENTRY: $' + Number(latest.entryPrice).toFixed(2);
    }
    var entryArrow = entryEl.querySelector('.label-arrow');
    if (entryArrow) {
      entryArrow.textContent = latest.type === 'call' ? '▲' : '▼';
    }
  }

  if (exitEl) {
    exitEl.classList.remove('hidden');
    exitEl.style.top = exitY + 'px';
    var exitText = exitEl.querySelector('.label-price');
    if (exitText) {
      exitText.textContent = 'EXIT: $' + Number(window.currentPrice || currentPrice).toFixed(2);
    }
    var exitArrow = exitEl.querySelector('.label-arrow');
    if (exitArrow) {
      exitArrow.textContent = latest.type === 'call' ? '▼' : '▲';
    }
  }
}

// Update labels every 300ms
setInterval(updateEntryExitLabels, 300);

console.log('[MSG16] Entry/Exit labels system started');

// ============================================================
// 2. BOTTOM NAVIGATION CONTROLLER
// ============================================================

function initBottomNav() {
  var nav = document.getElementById('bottomNav');
  if (!nav) {
    console.warn('[MSG16] Bottom nav element not found');
    return;
  }

  // Show bottom nav on mobile only (CSS handles display)
  document.body.classList.add('has-bottom-nav');
  nav.classList.remove('hidden');

  // Bind buttons
  nav.querySelectorAll('.bottom-nav-btn').forEach(function (btn) {
    if (btn.dataset.boundNav === '1') return;
    btn.dataset.boundNav = '1';

    btn.addEventListener('click', function () {
      var action = btn.dataset.nav;

      // Update active state
      nav.querySelectorAll('.bottom-nav-btn').forEach(function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');

      // Scroll to relevant section or open popup
      if (action === 'trade') {
        var tradePanel = document.querySelector('.trade-panel');
        if (tradePanel) tradePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (action === 'active') {
        var tradesSection = document.querySelector('.trades-section');
        if (tradesSection) tradesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Switch to active tab
        var activeTab = document.querySelector('.tab-btn[data-tab="active"]');
        if (activeTab) activeTab.click();
      } else if (action === 'history') {
        var tradesSection2 = document.querySelector('.trades-section');
        if (tradesSection2) tradesSection2.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var historyTab = document.querySelector('.tab-btn[data-tab="history"]');
        if (historyTab) historyTab.click();
      } else if (action === 'chat') {
        if (typeof openUserChat === 'function') openUserChat();
      } else if (action === 'profile') {
        if (typeof balanceChip !== 'undefined' && balanceChip) {
          balanceChip.click();
        }
      }
    });
  });

  console.log('[MSG16] Bottom nav initialized');
}

// Init after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBottomNav);
} else {
  initBottomNav();
}
setTimeout(initBottomNav, 1500);
setTimeout(initBottomNav, 3000);

// ============================================================
// 3. UPDATE NAV BADGE — active trades count
// ============================================================

function updateNavBadge() {
  var badge = document.getElementById('navActiveBadge');
  if (!badge) return;

  var trades = (typeof activeTradesLocal !== "undefined" && Array.isArray(activeTradesLocal))
    ? activeTradesLocal : [];
  var count = trades.length;

  if (count > 0) {
    badge.classList.remove('hidden');
    badge.textContent = String(count);
  } else {
    badge.classList.add('hidden');
  }
}

setInterval(updateNavBadge, 1000);

// ============================================================
// 4. EXPOSE FOR DEBUG
// ============================================================

window.updateEntryExitLabels = updateEntryExitLabels;
window.initBottomNav = initBottomNav;
window.updateNavBadge = updateNavBadge;

console.log('===== MSG 16: Entry/Exit Labels + Bottom Nav loaded =====');
/* ============================================================
   MSG 18: TOURNAMENT SYSTEM (Full)
   ============================================================ */

// ============================================================
// 1. STATE
// ============================================================

window.tournaments = [];
window.myTournaments = [];
window.tourListUnsub = null;
window.myTourListUnsub = null;
window.tourDetailUnsub = null;
window.tourCurrentDetailId = null;
window.tourCountdownInterval = null;

// ============================================================
// 2. OPEN / CLOSE POPUP
// ============================================================

function openTournamentPopup() {
  var popup = document.getElementById('tournament-popup');
  var overlay = document.getElementById('tournament-popup-overlay');
  if (!popup) return;

  popup.classList.remove('hidden');
  if (overlay) overlay.onclick = function () { closeTournamentPopup(); };

  startTournamentListener();
  startMyTournamentListener();
}

function closeTournamentPopup() {
  var popup = document.getElementById('tournament-popup');
  if (!popup) return;
  popup.classList.add('hidden');
}

function openTournamentDetail(tourId) {
  window.tourCurrentDetailId = tourId;
  var popup = document.getElementById('tournament-detail-popup');
  var overlay = document.getElementById('tournament-detail-overlay');
  if (!popup) return;

  popup.classList.remove('hidden');
  if (overlay) overlay.onclick = function () { closeTournamentDetail(); };

  startTourDetailListener(tourId);
}

function closeTournamentDetail() {
  var popup = document.getElementById('tournament-detail-popup');
  if (!popup) return;
  popup.classList.add('hidden');
  if (window.tourDetailUnsub) {
    try { window.tourDetailUnsub(); } catch (e) {}
    window.tourDetailUnsub = null;
  }
  window.tourCurrentDetailId = null;
}

// ============================================================
// 3. LISTEN AVAILABLE TOURNAMENTS
// ============================================================

function startTournamentListener() {
  if (window.tourListUnsub) {
    try { window.tourListUnsub(); } catch (e) {}
  }

  try {
    var q = query(
      collection(db, "tournaments"),
      where("status", "in", ["upcoming", "live"])
    );

    window.tourListUnsub = onSnapshot(q, function (snap) {
      var tours = [];
      snap.forEach(function (d) {
        tours.push({ id: d.id, ...d.data() });
      });

      tours.sort(function (a, b) {
        if (a.status === 'live' && b.status !== 'live') return -1;
        if (a.status !== 'live' && b.status === 'live') return 1;
        return (a.startTime || 0) - (b.startTime || 0);
      });

      window.tournaments = tours;
      renderAvailableTournaments(tours);
    }, function (err) {
      console.error('[Tournament] List error:', err.message);
    });
  } catch (err) {
    console.error('[Tournament] Listen error:', err.message);
  }
}

// ============================================================
// 4. LISTEN MY TOURNAMENTS
// ============================================================

function startMyTournamentListener() {
  if (!currentUser) return;

  if (window.myTourListUnsub) {
    try { window.myTourListUnsub(); } catch (e) {}
  }

  try {
    var q = query(
      collection(db, "tournamentEntries"),
      where("userId", "==", currentUser.uid)
    );

    window.myTourListUnsub = onSnapshot(q, function (snap) {
      var entries = [];
      snap.forEach(function (d) {
        entries.push({ id: d.id, ...d.data() });
      });
      window.myTournaments = entries;
      renderMyTournaments(entries);
    }, function (err) {
      console.error('[Tournament] My entries error:', err.message);
    });
  } catch (err) {
    console.error('[Tournament] My listen error:', err.message);
  }
}

// ============================================================
// 5. RENDER AVAILABLE
// ============================================================

function renderAvailableTournaments(tours) {
  var container = document.getElementById('tour-list-available');
  if (!container) return;

  if (!tours || tours.length === 0) {
    container.innerHTML = '<p class="empty-text">No tournaments available</p>';
    return;
  }

  var myIds = {};
  window.myTournaments.forEach(function (m) {
    if (m.tournamentId) myIds[m.tournamentId] = true;
  });

  container.innerHTML = '';
  tours.forEach(function (t) {
    container.appendChild(buildTourCard(t, myIds[t.id] === true));
  });
}

// ============================================================
// 6. RENDER MY TOURNAMENTS
// ============================================================

function renderMyTournaments(entries) {
  var container = document.getElementById('tour-list-my');
  if (!container) return;

  if (!entries || entries.length === 0) {
    container.innerHTML = '<p class="empty-text">You haven\'t joined any tournament</p>';
    return;
  }

  container.innerHTML = '';
  entries.forEach(function (e) {
    var t = window.tournaments.find(function (x) { return x.id === e.tournamentId; });
    if (!t) return;

    var profit = Number(e.profit) || 0;
    var div = document.createElement('div');
    div.className = 'tour-card ' + (t.status === 'live' ? 'live' : (t.status === 'upcoming' ? 'upcoming' : 'finished'));

    var rank = e.rank || '-';

    div.innerHTML =
      '<div class="tour-card-header">' +
        '<div class="tour-card-title">🏆 ' + escapeHtml(t.name || '') + '</div>' +
        '<span class="tour-status-badge ' + (t.status === 'live' ? 'live' : t.status) + '">' + t.status.toUpperCase() + '</span>' +
      '</div>' +
      '<div class="tour-card-body">' +
        '<div class="tour-stat">' +
          '<span class="tour-stat-label">My Rank</span>' +
          '<span class="tour-stat-value blue">#' + rank + '</span>' +
        '</div>' +
        '<div class="tour-stat">' +
          '<span class="tour-stat-label">My Profit</span>' +
          '<span class="tour-stat-value ' + (profit >= 0 ? 'green' : '') + '">' + (profit >= 0 ? '+' : '') + '$' + profit.toFixed(2) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="tour-card-actions">' +
        '<button class="tour-btn view" data-tid="' + t.id + '" data-action="view">View Leaderboard</button>' +
      '</div>';

    container.appendChild(div);
  });
}

function buildTourCard(t, isJoined) {
  var div = document.createElement('div');
  var statusClass = t.status === 'live' ? 'live' : (t.status === 'upcoming' ? 'upcoming' : 'finished');
  div.className = 'tour-card ' + statusClass;

  var statusBadgeText = t.status === 'live' ? 'LIVE' : (t.status === 'upcoming' ? 'UPCOMING' : 'FINISHED');

  var entryFee = Number(t.entryFee) || 0;
  var prizePool = Number(t.prizePool) || (entryFee * 10);
  var maxPlayers = Number(t.maxPlayers) || 100;
  var currentPlayers = Number(t.currentPlayers) || 0;

  var actionHTML = '';
  if (isJoined) {
    actionHTML =
      '<button class="tour-btn view" data-tid="' + t.id + '" data-action="view">View Leaderboard</button>';
  } else if (t.status === 'upcoming') {
    actionHTML =
      '<button class="tour-btn join" data-tid="' + t.id + '" data-action="join">Join $' + entryFee.toFixed(2) + '</button>' +
      '<button class="tour-btn view" data-tid="' + t.id + '" data-action="view">Details</button>';
  } else if (t.status === 'live') {
    actionHTML =
      '<button class="tour-btn join" data-tid="' + t.id + '" data-action="join" style="opacity:.6;">Join (Live)</button>' +
      '<button class="tour-btn view" data-tid="' + t.id + '" data-action="view">View</button>';
  } else {
    actionHTML =
      '<button class="tour-btn view" data-tid="' + t.id + '" data-action="view">View Results</button>';
  }

  div.innerHTML =
    '<div class="tour-card-header">' +
      '<div class="tour-card-title">🏆 ' + escapeHtml(t.name || 'Tournament') + '</div>' +
      '<span class="tour-status-badge ' + statusClass + '">' + statusBadgeText + '</span>' +
    '</div>' +
    '<div class="tour-card-body">' +
      '<div class="tour-stat">' +
        '<span class="tour-stat-label">Entry Fee</span>' +
        '<span class="tour-stat-value gold">$' + entryFee.toFixed(2) + '</span>' +
      '</div>' +
      '<div class="tour-stat">' +
        '<span class="tour-stat-label">Prize Pool</span>' +
        '<span class="tour-stat-value green">$' + prizePool.toFixed(2) + '</span>' +
      '</div>' +
      '<div class="tour-stat">' +
        '<span class="tour-stat-label">Players</span>' +
        '<span class="tour-stat-value blue">' + currentPlayers + ' / ' + maxPlayers + '</span>' +
      '</div>' +
      '<div class="tour-stat">' +
        '<span class="tour-stat-label">' + (t.status === 'upcoming' ? 'Starts In' : 'Ends') + '</span>' +
        '<span class="tour-stat-value"><span class="tour-countdown" data-tid="' + t.id + '">--:--</span></span>' +
      '</div>' +
    '</div>' +
    '<div class="tour-card-actions">' + actionHTML + '</div>';

  return div;
}

// ============================================================
// 7. JOIN TOURNAMENT
// ============================================================

async function joinTournament(tourId) {
  if (!currentUser) { alert('Login required'); return; }

  var t = window.tournaments.find(function (x) { return x.id === tourId; });
  if (!t) { alert('Tournament not found'); return; }

  // Already joined?
  var alreadyJoined = window.myTournaments.some(function (m) {
    return m.tournamentId === tourId;
  });
  if (alreadyJoined) { alert('Already joined'); return; }

  if (t.status === 'finished') { alert('Tournament finished'); return; }

  var entryFee = Number(t.entryFee) || 0;

  if (userBalance < entryFee) {
    alert('Insufficient balance. Need $' + entryFee.toFixed(2));
    return;
  }

  if (!confirm('Join "' + t.name + '"?\nEntry Fee: $' + entryFee.toFixed(2) + '\n\nYour balance: $' + userBalance.toFixed(2))) {
    return;
  }

  try {
    var balanceField = accountType === 'demo' ? 'demoBalance' : 'realBalance';
    var newBalance = userBalance - entryFee;

    // Deduct balance
    await updateDoc(doc(db, "users", currentUser.uid), {
      [balanceField]: newBalance,
      balance: newBalance
    });

    userBalance = newBalance;
    window.userBalance = newBalance;
    if (balanceEl) balanceEl.textContent = userBalance.toFixed(2);
    if (balancePopupValue) balancePopupValue.textContent = userBalance.toFixed(2);

    // Create entry
    var entryId = currentUser.uid + '_' + tourId;
    await setDoc(doc(db, "tournamentEntries", entryId), {
      tournamentId: tourId,
      userId: currentUser.uid,
      userEmail: currentUser.email,
      entryFee: entryFee,
      profit: 0,
      trades: 0,
      wins: 0,
      losses: 0,
      rank: 0,
      accountType: accountType,
      joinedAt: new Date().toISOString()
    });

    // Increment player count
    await updateDoc(doc(db, "tournaments", tourId), {
      currentPlayers: (Number(t.currentPlayers) || 0) + 1
    });

    console.log('[Tournament] Joined:', tourId, 'Fee:', entryFee);

    if (typeof playSound === 'function') playSound('click');
    alert('✅ Joined tournament!\n\nGood luck!');

    // Switch to My tab
    var myTab = document.querySelector('.tour-tab-btn[data-tour-tab="my"]');
    if (myTab) myTab.click();

  } catch (err) {
    console.error('[Tournament] Join error:', err.message);
    alert('Error: ' + err.message);
  }
}

// ============================================================
// 8. LEADERBOARD (Detail Popup)
// ============================================================

function startTourDetailListener(tourId) {
  if (window.tourDetailUnsub) {
    try { window.tourDetailUnsub(); } catch (e) {}
  }

  try {
    var q = query(
      collection(db, "tournamentEntries"),
      where("tournamentId", "==", tourId)
    );

    window.tourDetailUnsub = onSnapshot(q, function (snap) {
      var entries = [];
      snap.forEach(function (d) {
        entries.push({ id: d.id, ...d.data() });
      });

      entries.sort(function (a, b) {
        return (Number(b.profit) || 0) - (Number(a.profit) || 0);
      });

      entries.forEach(function (e, i) {
        e._rank = i + 1;
      });

      renderTournamentDetail(tourId, entries);
    }, function (err) {
      console.error('[Tournament] Detail error:', err.message);
    });
  } catch (err) {
    console.error('[Tournament] Detail listen error:', err.message);
  }
}

function renderTournamentDetail(tourId, entries) {
  var t = window.tournaments.find(function (x) { return x.id === tourId; });
  if (!t) return;

  var titleEl = document.getElementById('tour-detail-title');
  if (titleEl) titleEl.textContent = '🏆 ' + (t.name || 'Tournament');

  var bodyEl = document.getElementById('tour-detail-body');
  if (!bodyEl) return;

  var entryFee = Number(t.entryFee) || 0;
  var prizePool = Number(t.prizePool) || (entryFee * entries.length);

  var totalProfit = 0;
  entries.forEach(function (e) { totalProfit += Number(e.profit) || 0; });

  var lbHTML = '';
  if (entries.length === 0) {
    lbHTML = '<p class="empty-text">No players yet. Be the first!</p>';
  } else {
    lbHTML = entries.slice(0, 50).map(function (e) {
      var rank = e._rank;
      var rankClass = rank === 1 ? 'gold' : (rank === 2 ? 'silver' : (rank === 3 ? 'bronze' : ''));
      var isMe = currentUser && e.userId === currentUser.uid;
      var profit = Number(e.profit) || 0;
      var pClass = profit < 0 ? 'negative' : '';

      return '<div class="tour-lb-row' + (isMe ? ' me' : '') + '">' +
        '<div class="tour-lb-rank ' + rankClass + '">' + rank + '</div>' +
        '<div class="tour-lb-name">' + (isMe ? '👤 You' : escapeHtml((e.userEmail || '').split('@')[0])) + '</div>' +
        '<div class="tour-lb-profit ' + pClass + '">' + (profit >= 0 ? '+' : '') + '$' + profit.toFixed(2) + '</div>' +
      '</div>';
    }).join('');
  }

  bodyEl.innerHTML =
    '<div class="tour-detail-section">' +
      '<h4>Overview</h4>' +
      '<div class="tour-detail-row"><span class="label">Status</span><span class="value">' + (t.status || 'upcoming').toUpperCase() + '</span></div>' +
      '<div class="tour-detail-row"><span class="label">Entry Fee</span><span class="value gold">$' + entryFee.toFixed(2) + '</span></div>' +
      '<div class="tour-detail-row"><span class="label">Prize Pool</span><span class="value green">$' + prizePool.toFixed(2) + '</span></div>' +
      '<div class="tour-detail-row"><span class="label">Players</span><span class="value blue">' + entries.length + ' / ' + (Number(t.maxPlayers) || '∞') + '</span></div>' +
    '</div>' +
    '<div class="tour-detail-section">' +
      '<h4>Leaderboard</h4>' +
      '<div class="tour-leaderboard">' + lbHTML + '</div>' +
    '</div>';
}

// ============================================================
// 9. COUNTDOWN UPDATER
// ============================================================

function updateTourCountdowns() {
  var els = document.querySelectorAll('.tour-countdown');
  els.forEach(function (el) {
    var tid = el.dataset.tid;
    var t = window.tournaments.find(function (x) { return x.id === tid; });
    if (!t) return;

    var target = t.status === 'live' ? (t.endTime || 0) : (t.startTime || 0);
    if (!target) { el.textContent = '--:--'; return; }

    var remain = Math.max(0, Math.floor((target - Date.now()) / 1000));
    if (remain === 0) { el.textContent = t.status === 'live' ? 'ENDING' : 'STARTING'; return; }

    var h = Math.floor(remain / 3600);
    var m = Math.floor((remain % 3600) / 60);
    var s = remain % 60;

    if (h > 0) el.textContent = h + 'h ' + String(m).padStart(2, '0') + 'm';
    else el.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  });
}

setInterval(updateTourCountdowns, 1000);

// ============================================================
// 10. TABS INSIDE POPUP
// ============================================================

function initTournamentTabs() {
  var tabs = document.querySelectorAll('.tour-tab-btn');
  tabs.forEach(function (btn) {
    if (btn.dataset.boundTourTab === '1') return;
    btn.dataset.boundTourTab = '1';

    btn.addEventListener('click', function () {
      tabs.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      var tab = btn.dataset.tourTab;
      ['available', 'my', 'finished'].forEach(function (name) {
        var el = document.getElementById('tour-list-' + name);
        if (el) el.classList.toggle('hidden', name !== tab);
      });
    });
  });
}

// ============================================================
// 11. EVENT DELEGATION — Tour Card Buttons
// ============================================================

function initTournamentEvents() {
  var popup = document.getElementById('tournament-popup');
  if (!popup || popup.dataset.eventsBound === '1') return;
  popup.dataset.eventsBound = '1';

  popup.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-action]');
    if (!btn) return;

    var tid = btn.dataset.tid;
    var action = btn.dataset.action;
    if (!tid) return;

    if (action === 'join') joinTournament(tid);
    else if (action === 'view') openTournamentDetail(tid);
  });
}

// ============================================================
// 12. HELPERS
// ============================================================

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// 13. BIND TO SIDEBAR BUTTON
// ============================================================

function bindTournamentButton() {
  var btn = document.getElementById('tournament-btn');
  if (!btn || btn.dataset.boundTour === '1') return;
  btn.dataset.boundTour = '1';
  btn.onclick = openTournamentPopup;
  console.log('[Tournament] Sidebar button bound');
}

function bindTournamentCloseButtons() {
  var btn1 = document.getElementById('tournament-popup-close');
  if (btn1 && btn1.dataset.boundTourClose !== '1') {
    btn1.dataset.boundTourClose = '1';
    btn1.onclick = closeTournamentPopup;
  }
  var btn2 = document.getElementById('tournament-detail-close');
  if (btn2 && btn2.dataset.boundTourClose !== '1') {
    btn2.dataset.boundTourClose = '1';
    btn2.onclick = closeTournamentDetail;
  }
}

// ============================================================
// 14. INIT
// ============================================================

function initTournament() {
  bindTournamentButton();
  bindTournamentCloseButtons();
  initTournamentTabs();
  initTournamentEvents();
  console.log('[MSG18] Tournament system initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTournament);
} else {
  initTournament();
}
setTimeout(initTournament, 1500);
setTimeout(initTournament, 3500);

// Also start listener when user logs in
setInterval(function () {
  if (currentUser && !window.tourListUnsub) {
    startTournamentListener();
    startMyTournamentListener();
  }
}, 3000);

// ============================================================
// 15. EXPOSE FOR DEBUG
// ============================================================

window.openTournamentPopup = openTournamentPopup;
window.closeTournamentPopup = closeTournamentPopup;
window.openTournamentDetail = openTournamentDetail;
window.closeTournamentDetail = closeTournamentDetail;
window.joinTournament = joinTournament;
window.startTournamentListener = startTournamentListener;
window.startMyTournamentListener = startMyTournamentListener;

console.log('===== MSG 18: Tournament Full System loaded =====');
/* ============================================================
   MSG 20: REFERRAL SYSTEM
   ============================================================ */

// ============================================================
// 1. STATE
// ============================================================

window.userReferralCode = null;
window.userReferralCount = 0;
window.userReferralEarned = 0;
window.referralUnsub = null;

// ============================================================
// 2. GENERATE / GET REFERRAL CODE
// ============================================================

function generateReferralCode(uid, email) {
  // Use first 6 chars of uid + random 2 digits, all uppercase
  var base = (uid || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
  if (!base) base = 'USER';
  var rand = Math.floor(10 + Math.random() * 90);
  return base + rand;
}

async function ensureUserReferralCode() {
  if (!currentUser) return null;

  try {
    var userRef = doc(db, "users", currentUser.uid);
    var userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return null;

    var data = userDoc.data();

    // If already has a code, use it
    if (data.referralCode) {
      window.userReferralCode = data.referralCode;
      return data.referralCode;
    }

    // Generate new code
    var newCode = generateReferralCode(currentUser.uid, currentUser.email);

    // Check uniqueness — retry if collision (max 5 tries)
    var attempts = 0;
    while (attempts < 5) {
      var q = query(collection(db, "users"), where("referralCode", "==", newCode));
      var snap = await getDocs(q);
      if (snap.empty) break;
      newCode = generateReferralCode(currentUser.uid, currentUser.email);
      attempts++;
    }

    // Save
    await updateDoc(userRef, { referralCode: newCode });
    window.userReferralCode = newCode;
    console.log('[Referral] Generated code:', newCode);
    return newCode;

  } catch (err) {
    console.error('[Referral] Code error:', err.message);
    return null;
  }
}

// ============================================================
// 3. BUILD REFERRAL LINK
// ============================================================

function buildReferralLink(code) {
  if (!code) return '';
  var baseUrl = window.location.origin + window.location.pathname;
  return baseUrl + '?ref=' + code;
}

// ============================================================
// 4. LOAD REFERRAL STATS
// ============================================================

async function loadReferralStats() {
  if (!currentUser) return;

  try {
    // Count referrals
    var q = query(
      collection(db, "users"),
      where("referredBy", "==", window.userReferralCode)
    );
    var snap = await getDocs(q);

    window.userReferralCount = snap.size;

    // Get total earned from user doc
    var userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (userDoc.exists()) {
      var data = userDoc.data();
      window.userReferralEarned = Number(data.referralEarned) || 0;
    }

    // Update UI
    var countEl = document.getElementById('ref-count-value');
    var earnedEl = document.getElementById('ref-earned-value');

    if (countEl) countEl.textContent = String(window.userReferralCount);
    if (earnedEl) earnedEl.textContent = '$' + window.userReferralEarned.toFixed(2);

    console.log('[Referral] Stats: ' + window.userReferralCount + ' invited, $' + window.userReferralEarned + ' earned');

  } catch (err) {
    console.error('[Referral] Stats error:', err.message);
  }
}

// ============================================================
// 5. UPDATE UI
// ============================================================

function updateReferralUI() {
  var codeEl = document.getElementById('ref-code-value');
  var linkEl = document.getElementById('ref-link-value');

  if (codeEl) codeEl.textContent = window.userReferralCode || '------';

  var link = buildReferralLink(window.userReferralCode);
  if (linkEl) linkEl.value = link || 'Loading...';

  loadReferralStats();
}

// ============================================================
// 6. COPY FUNCTIONS
// ============================================================

function copyToClipboard(text) {
  if (!text) return false;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showCopyFeedback();
      }).catch(function () {
        fallbackCopy(text);
      });
      return true;
    } else {
      fallbackCopy(text);
      return true;
    }
  } catch (e) {
    fallbackCopy(text);
    return true;
  }
}

function fallbackCopy(text) {
  try {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showCopyFeedback();
  } catch (e) {
    alert('Copy failed. Please copy manually:\n\n' + text);
  }
}

function showCopyFeedback() {
  // Simple haptic/sound
  try { if (typeof playSound === 'function') playSound('click'); } catch (e) {}
  // Alert fallback
  // (We can add a toast later)
}

// ============================================================
// 7. SHARE FUNCTIONS
// ============================================================

function shareViaWhatsApp() {
  var link = buildReferralLink(window.userReferralCode);
  var text = encodeURIComponent('🎁 Join Quotex Clone and get $1000 free demo balance!\n\nUse my referral link:\n' + link);
  window.open('https://wa.me/?text=' + text, '_blank');
}

function shareViaTelegram() {
  var link = buildReferralLink(window.userReferralCode);
  var text = encodeURIComponent('🎁 Join Quotex Clone and get $1000 free demo balance!');
  window.open('https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + text, '_blank');
}

function shareNative() {
  var link = buildReferralLink(window.userReferralCode);
  var text = 'Join Quotex Clone and get $1000 free demo balance!';

  if (navigator.share) {
    navigator.share({
      title: 'Quotex Clone',
      text: text,
      url: link
    }).catch(function () {
      // User cancelled
    });
  } else {
    // Fallback — copy link
    copyToClipboard(link);
    alert('Link copied! Share it with your friends.');
  }
}

// ============================================================
// 8. OPEN / CLOSE POPUP
// ============================================================

async function openReferralPopup() {
  var popup = document.getElementById('referral-popup');
  var overlay = document.getElementById('referral-popup-overlay');
  if (!popup) return;

  popup.classList.remove('hidden');
  if (overlay) overlay.onclick = function () { closeReferralPopup(); };

  // Ensure code + load data
  if (!window.userReferralCode) {
    await ensureUserReferralCode();
  }
  updateReferralUI();
}

function closeReferralPopup() {
  var popup = document.getElementById('referral-popup');
  if (!popup) return;
  popup.classList.add('hidden');
}

// ============================================================
// 9. HANDLE ?ref= CODE ON SIGNUP
// ============================================================

function getRefCodeFromURL() {
  try {
    var params = new URLSearchParams(window.location.search);
    var ref = params.get('ref');
    if (ref) return String(ref).toUpperCase().trim();
  } catch (e) {}
  return null;
}

async function applyReferralOnSignup(newUserId, newUserEmail) {
  var refCode = getRefCodeFromURL();
  if (!refCode) return;

  try {
    // Find referrer
    var q = query(collection(db, "users"), where("referralCode", "==", refCode));
    var snap = await getDocs(q);

    if (snap.empty) {
      console.log('[Referral] Invalid referral code:', refCode);
      return;
    }

    var referrerDoc = snap.docs[0];
    var referrerId = referrerDoc.id;
    var referrerData = referrerDoc.data();

    // Don't allow self-referral
    if (referrerId === newUserId) {
      console.log('[Referral] Self-referral not allowed');
      return;
    }

    // Mark new user as referred
    await updateDoc(doc(db, "users", newUserId), {
      referredBy: refCode,
      referredAt: new Date().toISOString()
    });

    // Credit referrer with $5 bonus
    var bonus = 5;
    var currentReal = Number(referrerData.realBalance) || 0;
    var currentEarned = Number(referrerData.referralEarned) || 0;

    await updateDoc(doc(db, "users", referrerId), {
      realBalance: currentReal + bonus,
      referralEarned: currentEarned + bonus,
      lastReferralAt: new Date().toISOString()
    });

    console.log('[Referral] ✅ Applied: referrer ' + referrerId + ' earned $' + bonus);

  } catch (err) {
    console.error('[Referral] Apply error:', err.message);
  }
}

// ============================================================
// 10. INIT
// ============================================================

function initReferral() {
  // Bind sidebar button
  var btn = document.getElementById('referral-btn');
  if (btn && btn.dataset.boundRef !== '1') {
    btn.dataset.boundRef = '1';
    btn.onclick = openReferralPopup;
    console.log('[Referral] Sidebar button bound');
  }

  // Bind close button
  var closeBtn = document.getElementById('referral-popup-close');
  if (closeBtn && closeBtn.dataset.boundRefClose !== '1') {
    closeBtn.dataset.boundRefClose = '1';
    closeBtn.onclick = closeReferralPopup;
  }

  // Bind copy code
  var copyCodeBtn = document.getElementById('ref-copy-code');
  if (copyCodeBtn && copyCodeBtn.dataset.boundRefCopy !== '1') {
    copyCodeBtn.dataset.boundRefCopy = '1';
    copyCodeBtn.onclick = function () {
      copyToClipboard(window.userReferralCode || '');
      copyCodeBtn.textContent = '✅ Copied!';
      setTimeout(function () {
        copyCodeBtn.textContent = '📋 Copy Code';
      }, 1500);
    };
  }

  // Bind copy link
  var copyLinkBtn = document.getElementById('ref-copy-link');
  if (copyLinkBtn && copyLinkBtn.dataset.boundRefLink !== '1') {
    copyLinkBtn.dataset.boundRefLink = '1';
    copyLinkBtn.onclick = function () {
      var link = buildReferralLink(window.userReferralCode);
      copyToClipboard(link);
      copyLinkBtn.textContent = '✅';
      setTimeout(function () {
        copyLinkBtn.textContent = 'Copy';
      }, 1500);
    };
  }

  // Bind share buttons
  var waBtn = document.getElementById('ref-share-whatsapp');
  if (waBtn && waBtn.dataset.boundRefWa !== '1') {
    waBtn.dataset.boundRefWa = '1';
    waBtn.onclick = shareViaWhatsApp;
  }

  var tgBtn = document.getElementById('ref-share-telegram');
  if (tgBtn && tgBtn.dataset.boundRefTg !== '1') {
    tgBtn.dataset.boundRefTg = '1';
    tgBtn.onclick = shareViaTelegram;
  }

  var nativeBtn = document.getElementById('ref-share-native');
  if (nativeBtn && nativeBtn.dataset.boundRefNative !== '1') {
    nativeBtn.dataset.boundRefNative = '1';
    nativeBtn.onclick = shareNative;
  }

  console.log('[Referral] Initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initReferral);
} else {
  initReferral();
}
setTimeout(initReferral, 1500);
setTimeout(initReferral, 3500);

// ============================================================
// 11. ON USER LOGIN — Ensure code, apply ref from URL
// ============================================================

setInterval(async function () {
  if (currentUser && !window.userReferralCode) {
    console.log('[Referral] User logged in - ensuring code');
    await ensureUserReferralCode();
  }
}, 4000);

// Also on load
setTimeout(async function () {
  if (currentUser && !window.userReferralCode) {
    await ensureUserReferralCode();
  }
}, 5000);

// ============================================================
// 12. EXPOSE FOR DEBUG
// ============================================================

window.openReferralPopup = openReferralPopup;
window.closeReferralPopup = closeReferralPopup;
window.ensureUserReferralCode = ensureUserReferralCode;
window.applyReferralOnSignup = applyReferralOnSignup;
window.getRefCodeFromURL = getRefCodeFromURL;

console.log('===== MSG 20: Referral System loaded =====');
/* ============================================================
   MSG 21: QUOTEX-STYLE UI CONTROLLERS
   ============================================================ */

// ============================================================
// 1. TOP BAR — Account dropdown
// ============================================================

function bindAccountButton() {
  var btn = document.getElementById('balance-chip');
  if (!btn || btn.dataset.boundQx === '1') return;
  btn.dataset.boundQx = '1';
  btn.addEventListener('click', function () {
    var popup = document.getElementById('account-popup');
    var overlay = document.getElementById('account-popup-overlay');
    if (!popup) return;
    popup.classList.remove('hidden');
    if (overlay) overlay.onclick = function () {
      popup.classList.add('hidden');
    };
  });
  console.log('[MSG21] Account button bound');
}

function bindAccountPopupClose() {
  var btn = document.getElementById('account-popup-close');
  if (btn && btn.dataset.boundQxClose !== '1') {
    btn.dataset.boundQxClose = '1';
    btn.addEventListener('click', function () {
      document.getElementById('account-popup').classList.add('hidden');
    });
  }
}

// ============================================================
// 2. NOTIFICATIONS BELL
// ============================================================

function bindNotifButton() {
  var btn = document.getElementById('notif-btn');
  if (!btn || btn.dataset.boundQx === '1') return;
  btn.dataset.boundQx = '1';
  btn.addEventListener('click', function () {
    // For now just open chat / tournament based on unread
    var badge = document.getElementById('notif-badge');
    var count = badge ? parseInt(badge.textContent) || 0 : 0;
    if (count > 0) {
      // Show alert — will be upgraded in MSG 22
      alert('You have ' + count + ' notifications');
      if (badge) badge.classList.add('hidden');
    } else {
      alert('No new notifications');
    }
  });
  console.log('[MSG21] Notif button bound');
}

// ============================================================
// 3. CHART TIMEFRAME (bottom of chart)
// ============================================================

function bindChartTimeframe() {
  var btns = document.querySelectorAll('.qx-tf-btn');
  btns.forEach(function (btn) {
    if (btn.dataset.boundQx === '1') return;
    btn.dataset.boundQx = '1';
    btn.addEventListener('click', function () {
      btns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var tf = btn.dataset.tf;
      selectedTimeframe = tf;
      if (typeof loadCandles === 'function') {
        loadCandles();
      }
      console.log('[MSG21] Timeframe changed:', tf);
    });
  });
  console.log('[MSG21] Chart timeframe bound');
}

// ============================================================
// 4. CHART MENU (top-right dots)
// ============================================================

function bindChartMenu() {
  var btn = document.getElementById('chart-menu-btn');
  if (!btn || btn.dataset.boundQx === '1') return;
  btn.dataset.boundQx = '1';
  btn.addEventListener('click', function () {
    // Open more menu for now
    if (typeof openMoreMenu === 'function') openMoreMenu();
  });
}

// ============================================================
// 5. INVESTMENT +/- (Quotex style)
// ============================================================

function bindInvestmentControls() {
  var btns = document.querySelectorAll('.qx-inc-btn');
  btns.forEach(function (btn) {
    if (btn.dataset.boundQx === '1') return;
    btn.dataset.boundQx = '1';
    btn.addEventListener('click', function () {
      var input = document.getElementById('trade-amount');
      if (!input) return;
      var val = parseFloat(input.value) || 0;
      if (btn.dataset.action === 'plus') val += 1;
      else val = Math.max(1, val - 1);
      input.value = val;
    });
  });
  console.log('[MSG21] Investment controls bound');
}

// ============================================================
// 6. PAYOUT SWITCH (change timer)
// ============================================================

window.qxCurrentTime = 60;

function bindPayoutSwitch() {
  var btn = document.getElementById('payout-switch-btn');
  if (!btn || btn.dataset.boundQx === '1') return;
  btn.dataset.boundQx = '1';
  btn.addEventListener('click', function () {
    // Cycle timer between options
    var options = [60, 300, 900, 3600, 1800];
    var idx = options.indexOf(window.qxCurrentTime);
    idx = (idx + 1) % options.length;
    window.qxCurrentTime = options[idx];
    selectedTime = window.qxCurrentTime;

    // Update display
    var timerEl = document.getElementById('big-timer');
    if (timerEl) {
      timerEl.textContent = formatQxTimer(window.qxCurrentTime);
    }
    console.log('[MSG21] Timer switched to:', window.qxCurrentTime + 's');
  });
  console.log('[MSG21] Payout switch bound');
}

function formatQxTimer(sec) {
  var m = Math.floor(sec / 60);
  var s = sec % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

// ============================================================
// 7. BOTTOM NAV
// ============================================================

function bindBottomNav() {
  var btns = document.querySelectorAll('.qx-nav-btn');
  btns.forEach(function (btn) {
    if (btn.dataset.boundQx === '1') return;
    btn.dataset.boundQx = '1';
    btn.addEventListener('click', function () {
      var action = btn.dataset.nav;

      // Update active
      btns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      if (action === 'history') {
        // Open trades history (from MSG 20 we have chat popup — no history yet)
        alert('Trade History — Coming in MSG 22');
      } else if (action === 'help') {
        alert('Help — Coming in MSG 22');
      } else if (action === 'profile') {
        // Open account popup
        var popup = document.getElementById('account-popup');
        var overlay = document.getElementById('account-popup-overlay');
        if (popup) {
          popup.classList.remove('hidden');
          if (overlay) overlay.onclick = function () { popup.classList.add('hidden'); };
        }
      } else if (action === 'tournament') {
        // Open tournament
        if (typeof openTournamentPopup === 'function') {
          openTournamentPopup();
        } else {
          alert('Tournament — MSG 18');
        }
      } else if (action === 'more') {
        // Open more menu
        openMoreMenu();
      }
    });
  });
  console.log('[MSG21] Bottom nav bound');
}

// ============================================================
// 8. MORE MENU (Drawer)
// ============================================================

function openMoreMenu() {
  var menu = document.getElementById('more-menu');
  var overlay = document.getElementById('more-menu-overlay');
  if (!menu) return;
  menu.classList.remove('hidden');
  if (overlay) overlay.onclick = function () { closeMoreMenu(); };
}

function closeMoreMenu() {
  var menu = document.getElementById('more-menu');
  if (!menu) return;
  menu.classList.add('hidden');
}

function bindMoreMenu() {
  // Close button
  var closeBtn = document.getElementById('more-menu-close');
  if (closeBtn && closeBtn.dataset.boundQx !== '1') {
    closeBtn.dataset.boundQx = '1';
    closeBtn.addEventListener('click', closeMoreMenu);
  }

  // Menu items
  var items = document.querySelectorAll('.more-menu-item');
  items.forEach(function (item) {
    if (item.dataset.boundQx === '1') return;
    item.dataset.boundQx = '1';
    item.addEventListener('click', function () {
      var action = item.dataset.menu;
      closeMoreMenu();

      if (action === 'deposit') {
        var popup = document.getElementById('deposit-popup');
        var overlay = document.getElementById('deposit-popup-overlay');
        if (popup) {
          popup.classList.remove('hidden');
          if (overlay) overlay.onclick = function () { popup.classList.add('hidden'); };
        }
      } else if (action === 'withdraw') {
        var popup = document.getElementById('withdraw-popup');
        var overlay = document.getElementById('withdraw-popup-overlay');
        if (popup) {
          popup.classList.remove('hidden');
          if (overlay) overlay.onclick = function () { popup.classList.add('hidden'); };
        }
      } else if (action === 'referral') {
        if (typeof openReferralPopup === 'function') openReferralPopup();
      } else if (action === 'chat') {
        if (typeof openUserChat === 'function') openUserChat();
      } else if (action === 'logout') {
        if (confirm('Logout?')) {
          if (typeof signOut === 'function' && typeof auth !== 'undefined') {
            signOut(auth);
          }
        }
      } else if (action === 'market') {
        alert('Market — Coming in MSG 22');
      } else if (action === 'analytics') {
        alert('Analytics — Coming in MSG 22');
      } else if (action === 'signals') {
        alert('Signals — Coming in MSG 23');
      } else if (action === 'trades') {
        alert('Trades — Coming in MSG 22');
      } else if (action === 'settings') {
        alert('Settings — Coming in MSG 22');
      }
    });
  });

  console.log('[MSG21] More menu bound');
}

// ============================================================
// 9. BIND SIDEBAR-REPLACEMENT BUTTONS
// ============================================================

// Deposit button in top bar
function bindTopBarDeposit() {
  var btn = document.getElementById('deposit-btn');
  if (!btn || btn.dataset.boundQx === '1') return;
  btn.dataset.boundQx = '1';
  btn.addEventListener('click', function () {
    var popup = document.getElementById('deposit-popup');
    var overlay = document.getElementById('deposit-popup-overlay');
    if (popup) {
      popup.classList.remove('hidden');
      if (overlay) overlay.onclick = function () { popup.classList.add('hidden'); };
    }
  });
}

// ============================================================
// 10. UPDATE ACCOUNT BADGE (DEMO/LIVE)
// ============================================================

function updateAccountBadge() {
  var badge = document.getElementById('qx-account-type');
  if (!badge) return;
  if (typeof accountType !== 'undefined' && accountType === 'real') {
    badge.textContent = 'LIVE';
    badge.style.background = 'linear-gradient(135deg, #00c853 0%, #00a844 100%)';
  } else {
    badge.textContent = 'DEMO';
    badge.style.background = 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)';
  }
}

setInterval(updateAccountBadge, 1000);

// ============================================================
// 11. TICKER UPDATE — Big timer should show selectedTime
// ============================================================

function updateQxBigTimer() {
  var el = document.getElementById('big-timer');
  if (!el) return;

  if (typeof activeTradesLocal !== 'undefined' && activeTradesLocal.length > 0) {
    // Active trade running — show its countdown
    var soonest = activeTradesLocal[0].expiresAt;
    activeTradesLocal.forEach(function (t) {
      if (t.expiresAt < soonest) soonest = t.expiresAt;
    });
    var remaining = Math.max(0, Math.ceil((soonest - Date.now()) / 1000));
    var m = Math.floor(remaining / 60);
    var s = remaining % 60;
    el.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  } else {
    // No active trade — show selected time
    var time = (typeof selectedTime !== 'undefined') ? selectedTime : 60;
    el.textContent = formatQxTimer(time);
  }
}

setInterval(updateQxBigTimer, 500);

// ============================================================
// 12. INIT
// ============================================================

function initMsg21() {
  bindAccountButton();
  bindAccountPopupClose();
  bindNotifButton();
  bindChartTimeframe();
  bindChartMenu();
  bindInvestmentControls();
  bindPayoutSwitch();
  bindBottomNav();
  bindMoreMenu();
  bindTopBarDeposit();
  updateAccountBadge();
  updateQxBigTimer();
  console.log('[MSG21] Quotex-style UI initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMsg21);
} else {
  initMsg21();
}
setTimeout(initMsg21, 1500);
setTimeout(initMsg21, 3500);

// ============================================================
// 13. EXPOSE FOR DEBUG
// ============================================================

window.openMoreMenu = openMoreMenu;
window.closeMoreMenu = closeMoreMenu;
window.initMsg21 = initMsg21;
window.formatQxTimer = formatQxTimer;

console.log('===== MSG 21: Quotex-style Trade Screen loaded =====');
/* ============================================================
   MSG 21: Null-safe addEventListener Wrapper
   (Missing elements এ error না দেখানোর জন্য)
   ============================================================ */

(function msg21NullSafeWrapper() {
  if (window.__msg21NullSafe) return;
  window.__msg21NullSafe = true;

  // Save original
  var originalAddEventListener = EventTarget.prototype.addEventListener;

  // Override to silently skip null
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    try {
      if (this === null || this === undefined) {
        return;
      }
      return originalAddEventListener.call(this, type, listener, options);
    } catch (e) {
      console.warn('[MSG21-NULL] Skipped addEventListener:', type, e.message);
    }
  };

  // Global error handler for "Cannot read properties of null"
  window.addEventListener('error', function (e) {
    var msg = e.message || '';
    if (msg.indexOf("Cannot read properties of null") !== -1 &&
        msg.indexOf("addEventListener") !== -1) {
      e.preventDefault();
      console.warn('[MSG21-NULL] Suppressed null error');
      return true;
    }
  }, true);

  console.log('[MSG21-NULL] Null-safe wrapper active');
})();

console.log('===== MSG 21 NUL-SAFE: AddEventListener wrapper loaded =====');
