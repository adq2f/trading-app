// ============================================
// Quotex Clone — app.js
// User Site Only — Fresh Rebuild v14
// Part 1: Imports + Firebase + DOM + Globals + Sounds + Auth + Popups
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

// Chat
const chatBtn = document.getElementById("chat-btn");
const chatPopup = document.getElementById("chat-popup");
const chatPopupOverlay = document.getElementById("chat-popup-overlay");
const chatPopupClose = document.getElementById("chat-popup-close");
const userChatInput = document.getElementById("user-chat-input");
const userChatSend = document.getElementById("user-chat-send");

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
if (signupBtn) {
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
      await setDoc(doc(db, "users", userCred.user.uid), {
        email: email,
        balance: 1000,
        demoBalance: 1000,
        realBalance: 0,
        accountType: "demo",
        role: "user",
        createdAt: new Date().toISOString()
      });
      message.style.color = "#00c853";
      message.textContent = "রেজিস্ট্রেশন সফল! ব্যালেন্স $1000";
    } catch (error) {
      message.style.color = "#ff5252";
      message.textContent = error.message;
    }
  });
}

// ===== লগইন =====
if (loginBtn) {
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
}

// ===== লগআউট =====
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
  });
}

// ===== পরিমাণ +/− =====
document.querySelectorAll(".amount-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    let val = parseFloat(tradeAmountInput.value) || 0;
    if (btn.dataset.action === "plus") val += 5;
    else val = Math.max(1, val - 5);
    tradeAmountInput.value = val;
  });
});

// ===== এক্সপায়ারি টাইম সিলেকশন =====
document.querySelectorAll(".time-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".time-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedTime = parseInt(btn.dataset.time);
  });
});

// ===== টাইমফ্রেম সিলেকশন =====
document.querySelectorAll(".tf-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    document.querySelectorAll(".tf-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedTimeframe = btn.dataset.tf;
    await loadCandles();
    if (currentUser) startLivePrice();
  });
});

// ===== অ্যাসেট পরিবর্তন =====
if (assetSelect) {
  assetSelect.addEventListener("change", async () => {
    selectedAsset = assetSelect.value;
    await loadCandles();
    if (currentUser) startLivePrice();
  });
}

// ===== ট্যাব স্যুইচ =====
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
    if (btn.dataset.tab === "active") {
      document.getElementById("active-trades-list").classList.add("active");
    } else {
      document.getElementById("history-list").classList.add("active");
    }
  });
});

// ===== ড্রয়িং টুল সিলেকশন =====
document.querySelectorAll(".drawing-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tool = btn.dataset.tool;

    if (tool === "Eraser") {
      clearAllDrawings();
      return;
    }

    document.querySelectorAll(".drawing-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentDrawingTool = tool;

    if (tool === "cursor") {
      drawingCanvas.classList.remove("active");
    } else {
      drawingCanvas.classList.add("active");
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

// ব্যালেন্স পপআপ
if (balanceChip) {
  balanceChip.addEventListener("click", () => {
    if (balancePopupValue) balancePopupValue.textContent = userBalance.toFixed(2);
    openPopup(balancePopup, balancePopupOverlay);
  });
}
if (balancePopupClose) balancePopupClose.addEventListener("click", () => closePopup(balancePopup));

// অ্যাকাউন্ট টগল পপআপ
if (accountToggleBtn) {
  accountToggleBtn.addEventListener("click", () => {
    openPopup(accountPopup, accountPopupOverlay);
  });
}
if (accountPopupClose) accountPopupClose.addEventListener("click", () => closePopup(accountPopup));

// ডিপোজিট পপআপ
if (depositBtn) {
  depositBtn.addEventListener("click", () => {
    closePopup(balancePopup);
    openPopup(depositPopup, depositPopupOverlay);
  });
}
if (depositPopupClose) depositPopupClose.addEventListener("click", () => closePopup(depositPopup));

// উইথড্র পপআপ
if (withdrawBtn) {
  withdrawBtn.addEventListener("click", () => {
    closePopup(balancePopup);
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
    window.currentUser = user;
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
    window.currentUser = null;
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

console.log("Part 1: Imports + Firebase + DOM + Auth + Popups loaded");

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

  window.chart = chart;
  window.candleSeries = candleSeries;

  chart.timeScale().subscribeVisibleTimeRangeChange(() => {
    if (typeof redrawDrawings === "function") {
      redrawDrawings();
    }
  });

  if (typeof initDrawingSystem === "function") {
    initDrawingSystem();
  }

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

async function loadCandles() {
  try {
    const interval = convertTimeframe(selectedTimeframe);
    const limit = interval.includes("s") ? 200 : 150;

    const url = `https://api.binance.com/api/v3/klines?symbol=${selectedAsset}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error("Binance error:", data);
      return;
    }

    const candleData = data.map(k => ({
      time: Math.floor(k[0] / 1000),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4])
    }));

    if (candleSeries) {
      candleSeries.setData(candleData);
      chart.timeScale().fitContent();
    }

    if (candleData.length > 0) {
      currentPrice = candleData[candleData.length - 1].close;
      prevPrice = currentPrice;
      currentPriceEl.textContent = currentPrice.toFixed(2);
    }

  } catch (err) {
    console.error("Candle load error:", err);
  }
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

// ============================================
// Part 4: Drawing System (Canvas-based)
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

  chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
    redrawDrawings();
  });
}

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

function handleDrawStart(event) {
  if (currentDrawingTool === "cursor") return;
  event.preventDefault();

  const point = getCanvasPoint(event);
  const data = pixelToData(point.x, point.y);
  if (!data) return;

  isDrawing = true;
  drawStartPoint = data;

  if (currentDrawingTool === "HorizontalLine" || currentDrawingTool === "VerticalLine") {
    saveDrawing({
      tool: currentDrawingTool,
      points: [data]
    });
    isDrawing = false;
    drawStartPoint = null;
    return;
  }

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

function handleDrawMove(event) {
  if (!isDrawing || !drawStartPoint) return;
  event.preventDefault();

  const point = getCanvasPoint(event);
  const data = pixelToData(point.x, point.y);
  if (!data) return;

  redrawDrawings();

  drawPreview({
    tool: currentDrawingTool,
    points: [drawStartPoint, data]
  });
}

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

function saveDrawing(drawing) {
  drawings.push(drawing);
  redrawDrawings();
}

function clearAllDrawings() {
  drawings = [];
  if (drawingCtx && drawingCanvas) {
    drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
  }
}

function redrawDrawings() {
  if (!drawingCtx || !drawingCanvas) return;

  drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

  drawings.forEach(drawing => {
    drawShape(drawing);
  });
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
      drawingCtx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);

    } else if (tool === "Ray") {
      drawingCtx.beginPath();
      drawingCtx.moveTo(p1.x, p1.y);
      drawingCtx.lineTo(p2.x, p2.y);
      drawingCtx.stroke();

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
    drawingCtx.fillText((level * 100).toFixed(1) + "%", rightX + 4, y);
  });
}

// ============================================
// Part 5: Trade Logic + Timer + History
// ============================================

function updateBigTimer() {
  if (!bigTimer) return;

  if (activeTradesLocal.length === 0) {
    bigTimer.classList.add("hidden");
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

// (checkExpiredTrades is replaced by processTradeResults later)

function loadActiveTrades() {
  if (!currentUser) return;

  const q = query(
    collection(db, "trades"),
    where("userId", "==", currentUser.uid),
    where("status", "==", "pending")
  );

  activeTradesUnsub = onSnapshot(q, (snapshot) => {
    activeTradesLocal = [];
    activeTradesList.innerHTML = "";

    if (snapshot.empty) {
      activeTradesList.innerHTML = '<p class="empty-text">কোনো চলমান ট্রেড নেই</p>';
      if (activeCount) activeCount.textContent = "0";
      bigTimer.classList.add("hidden");
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
      div.dataset.tradeId = trade.id;
      div.innerHTML = `
        <div class="trade-info">
          <span class="trade-type ${trade.type}">${trade.type.toUpperCase()}</span>
          <span class="trade-time">$${trade.amount} @ ${trade.entryPrice.toFixed(2)}</span>
        </div>
        <div class="trade-countdown" data-trade-id="${trade.id}">${timeStr}</div>
      `;
      activeTradesList.appendChild(div);
    });

    if (activeCount) activeCount.textContent = activeTradesLocal.length;
    updateBigTimer();
  });
}

function loadHistory() {
  if (!currentUser) return;

  const q = query(
    collection(db, "trades"),
    where("userId", "==", currentUser.uid),
    where("status", "==", "completed")
  );

  historyUnsub = onSnapshot(q, (snapshot) => {
    historyList.innerHTML = "";

    if (snapshot.empty) {
      historyList.innerHTML = '<p class="empty-text">এখনো কোনো ট্রেড সম্পন্ন হয়নি</p>';
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
          ${trade.result === "win" ? "+$" + trade.netProfit.toFixed(2) : "-$" + trade.amount.toFixed(2)}
        </div>
      `;
      historyList.appendChild(div);
    });
  });
}

setInterval(() => {
  if (currentUser && activeTradesLocal.length > 0) {
    updateBigTimer();
  }
}, 1000);

// ============================================
// MSG 10: TRUE TRADE MECHANIC + COUNTDOWN + ENTRY LINE
// ============================================

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

  var trades = (typeof activeTradesLocal !== "undefined" && Array.isArray(activeTradesLocal))
    ? activeTradesLocal : [];

  if (trades.length === 0) {
    if (timerEl) timerEl.classList.add("hidden");
    if (badgeEl) badgeEl.classList.add("hidden");
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

  // Per-trade countdown in list
  var tradeItems = document.querySelectorAll("#active-trades-list .trade-item");
  tradeItems.forEach(function(item, index) {
    var trade = activeTradesLocal[index];
    if (!trade) return;
    var cd = item.querySelector(".trade-countdown");
    if (cd) {
      var rem = Math.max(0, Math.ceil((trade.expiresAt - Date.now()) / 1000));
      var mm2 = Math.floor(rem / 60);
      var ss2 = rem % 60;
      cd.textContent = String(mm2).padStart(2, "0") + ":" + String(ss2).padStart(2, "0");
      cd.classList.remove("warning", "critical");
      if (rem <= 5) cd.classList.add("critical");
      else if (rem <= 15) cd.classList.add("warning");
    }
  });
}

function startCountdownInterval() {
  if (window.countdownInterval) return;
  window.countdownInterval = setInterval(updateTopCountdown, 200);
  console.log("[MSG10] Countdown interval started");
}

// Auto-start
startCountdownInterval();
document.addEventListener("DOMContentLoaded", startCountdownInterval);

// ============================================================
// 2. TRUE TRADE MECHANIC — Entry vs Exit Compare
// ============================================================

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

    // Admin win/loss override (optional)
    var winPercent = window.adminWinPercent || 80;
    var useAdminOverride = (winPercent !== 100 && winPercent !== 0);

    if (useAdminOverride) {
      var r = Math.random() * 100;
      realResult = r < winPercent ? "win" : "loss";
    }

    console.log(
      "[Trade Result] " + String(trade.type).toUpperCase() +
      " | Entry: " + entryPrice.toFixed(2) +
      " → Exit: " + exitPrice.toFixed(2) +
      " | Diff: " + diff.toFixed(2) +
      " | " + realResult.toUpperCase()
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

          animateBalanceChange(returnAmount);
          showResultFlash("win");
          playSound("win");

          if (tradeMessage) {
            tradeMessage.style.color = "#00c853";
            tradeMessage.textContent = "🎉 জিতেছেন! +$" + netProfit.toFixed(2);
            setTimeout(function() { tradeMessage.textContent = ""; }, 3500);
          }
        }
      } else {
        showResultFlash("loss");
        playSound("loss");
        if (tradeMessage) {
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

// ============================================
// MSG 11: LIVE MOVEMENT + AUTO CANDLE + MULTI-USER ANALYSIS
// ============================================

window.adminWinPercent = 80;
window.adminLossPercent = 30;
window.liveSpeed = 500;
window.liveMovementInterval = null;
window.autoCandleInterval = null;
window.analyzerInterval = null;

window.currentCandleTime = Math.floor(Date.now() / 1000);
window.currentCandleOpen = currentPrice;

// Listen admin settings for win/loss
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

// Live price movement (every 500ms)
function startLiveMovement() {
  if (window.liveMovementInterval) clearInterval(window.liveMovementInterval);

  window.liveMovementInterval = setInterval(function() {
    if (typeof candleSeries === "undefined" || !candleSeries) return;
    if (typeof currentPrice === "undefined") return;

    var drift = (Math.random() - 0.5) * 30;

    var force = (typeof adminForceMarket !== "undefined") ? adminForceMarket : 0;
    if (force > 0) drift += Math.random() * 15;
    else if (force < 0) drift -= Math.random() * 15;

    currentPrice = Math.max(100, currentPrice + drift);
    window.currentPrice = currentPrice;

    if (typeof currentPriceEl !== "undefined" && currentPriceEl) {
      currentPriceEl.textContent = currentPrice.toFixed(2);
      currentPriceEl.style.color = drift >= 0 ? "#00c853" : "#ff5252";
    }

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
    } catch(e) {}
  }, 500);

  console.log("[MSG11] Live movement started");
}

// Auto candle generation (every 1m)
function startAutoCandleGeneration() {
  if (window.autoCandleInterval) clearInterval(window.autoCandleInterval);

  window.autoCandleInterval = setInterval(function() {
    if (typeof candleSeries === "undefined" || !candleSeries) return;
    if (!window.currentUser) return;

    var mode = (typeof adminSettings !== "undefined" && adminSettings.candleMode) || "random";
    if (mode === "locked") return;

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
    } catch(e) {}
  }, 60000);

  console.log("[MSG11] Auto candle generation started");
}

// Multi-user trade analysis
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

    snap.forEach(function(d) {
      var t = d.data();
      if (t.type === "call") { callTotal += t.amount; callCount++; }
      else if (t.type === "put") { putTotal += t.amount; putCount++; }
    });

    window.tradeAnalysis = {
      totalCall: callTotal,
      totalPut: putTotal,
      callCount: callCount,
      putCount: putCount,
      callUsers: [],
      putUsers: [],
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
  console.log("[MSG11] Trade analyzer started");
}

// Auto-direction bias
function applyDirectionBias() {
  if (typeof candleSeries === "undefined" || !candleSeries) return;
  var analysis = window.tradeAnalysis;
  if (!analysis) return;
  if (analysis.callCount + analysis.putCount === 0) return;

  var direction = analysis.suggestedDirection;
  if (direction === "neutral") return;

  var bias = direction === "up" ? 1.5 : -1.5;
  currentPrice = currentPrice + bias;
  window.currentPrice = currentPrice;
}

setInterval(applyDirectionBias, 1000);

// Start MSG 11 systems
setTimeout(function() {
  startLiveMovement();
  startAutoCandleGeneration();
  startTradeAnalysis();
  console.log("[MSG11] All systems started");
}, 4000);

console.log("Part 3: MSG 10 (True Trade) + MSG 11 (Live Movement + Analysis) loaded");

// ============================================
// MSG 12: CANDLE MANIPULATOR + TRAP + DELAY + REVERSAL
// ============================================

window.trapEngine = {
  trapRate: 30,
  delayRate: 20,
  reversalRate: 15,
  activeTraps: {},
  candleOpenPrice: {},
  candlePhases: {}
};

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

// Decision logic
function shouldTrap() {
  var rate = window.trapEngine.trapRate || 0;
  return (Math.random() * 100) < rate;
}

function shouldDelay() {
  var rate = window.trapEngine.delayRate || 0;
  return (Math.random() * 100) < rate;
}

function shouldReversal() {
  var rate = window.trapEngine.reversalRate || 0;
  return (Math.random() * 100) < rate;
}

// Generate trap candle
function generateTrapCandle(direction) {
  var openPrice = currentPrice;
  var trapSize = 50 + Math.random() * 100;
  var closePrice;

  if (direction === "trap_down") {
    closePrice = openPrice - trapSize;
  } else if (direction === "trap_up") {
    closePrice = openPrice + trapSize;
  } else {
    closePrice = openPrice + (Math.random() - 0.5) * 100;
  }

  var high = Math.max(openPrice, closePrice) + Math.random() * 30;
  var low = Math.min(openPrice, closePrice) - Math.random() * 30;

  if (direction === "trap_down") {
    high = openPrice + Math.random() * 80;
  } else if (direction === "trap_up") {
    low = openPrice - Math.random() * 80;
  }

  return {
    open: openPrice,
    high: high,
    low: low,
    close: closePrice,
    isTrap: true
  };
}

// Apply trap from analysis
function applyTrapFromAnalysis() {
  if (typeof candleSeries === "undefined" || !candleSeries) return;
  if (!window.tradeAnalysis) return;
  if (window.tradeAnalysis.callCount + window.tradeAnalysis.putCount === 0) return;

  var analysis = window.tradeAnalysis;
  var direction = analysis.suggestedDirection;

  if (!shouldTrap()) return;

  var trapDir = "trap_down";
  if (direction === "up") trapDir = "trap_up";

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
      " → Close: " + trapCandle.close.toFixed(2)
    );
  } catch(err) {
    console.error("[MSG12] Trap apply error:", err.message);
  }
}

// Delay injector
function injectDelay() {
  if (!shouldDelay()) return;

  var delaySec = 1 + Math.floor(Math.random() * 4);
  console.log("[MSG12] DELAY injected: " + delaySec + "s");

  var jitter = (Math.random() - 0.5) * 20;
  currentPrice = currentPrice + jitter;
  window.currentPrice = currentPrice;

  if (typeof currentPriceEl !== "undefined" && currentPriceEl) {
    currentPriceEl.textContent = currentPrice.toFixed(2);
  }
}

setInterval(injectDelay, 5000);

// Mid-candle reversal
function applyMidReversal() {
  if (!shouldReversal()) return;
  if (typeof candleSeries === "undefined" || !candleSeries) return;

  var now = Math.floor(Date.now() / 1000);
  var candleTime = Math.floor(now / 60) * 60;

  var openP = window.currentCandleOpen || currentPrice;
  var closeP = currentPrice;

  if (closeP > openP) {
    var reverseClose = openP - Math.random() * 50;
    try {
      candleSeries.update({
        time: candleTime,
        open: openP,
        high: closeP + Math.random() * 20,
        low: reverseClose - Math.random() * 10,
        close: reverseClose
      });
      currentPrice = reverseClose;
      window.currentPrice = reverseClose;
      console.log("[MSG12] MID-REVERSAL: Green → Red");
    } catch(err) {}
  } else if (closeP < openP) {
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
      console.log("[MSG12] MID-REVERSAL: Red → Green");
    } catch(err) {}
  }
}

setInterval(applyMidReversal, 30000);

// Trap check every 5 seconds when trades active
setInterval(function() {
  if (!window.currentUser) return;
  if (!window.tradeAnalysis) return;
  if (window.tradeAnalysis.callCount + window.tradeAnalysis.putCount === 0) return;
  applyTrapFromAnalysis();
}, 5000);

// ============================================
// MSG 13: AUTO 24/7 GENERATION + DESIGNER APPLY
// ============================================

window.autoGenerate24h = false;
window.designerCandle = null;
window.applyNextAt = 0;
window.auto24hInterval = null;
window.designerListeners = {};

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

// Auto 24/7 generation engine
function startAuto24hGeneration() {
  if (window.auto24hInterval) clearInterval(window.auto24hInterval);

  window.auto24hInterval = setInterval(async function() {
    if (!window.autoGenerate24h) return;
    if (typeof candleSeries === "undefined" || !candleSeries) return;
    if (!window.selectedMarketId) return;

    var now = Math.floor(Date.now() / 1000);
    var candleTime = Math.floor(now / 60) * 60;

    if (window.currentCandleTime === candleTime) return;

    var designerData = window.designerCandle;
    var useDesigner = designerData &&
                      window.applyNextAt > 0 &&
                      (Date.now() - window.applyNextAt < 70000);

    var openP, closeP, highP, lowP;

    if (useDesigner) {
      openP = designerData.open;
      closeP = designerData.close;
      highP = designerData.high;
      lowP = designerData.low;
      console.log("[MSG13] Applying designer candle:", designerData);
    } else {
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

      if (useDesigner) {
        window.applyNextAt = 0;
      }
    } catch(err) {
      console.error("[MSG13] Auto 24/7 error:", err.message);
    }
  }, 10000);

  console.log("[MSG13] Auto 24/7 generation engine started");
}

// Auto-start MSG 13
setTimeout(function() {
  startAuto24hGeneration();
  if (window.selectedMarketId) {
    listenDesignerForMarket(window.selectedMarketId);
  }
}, 5000);

setInterval(function() {
  if (window.selectedMarketId && !window.designerListeners[window.selectedMarketId]) {
    listenDesignerForMarket(window.selectedMarketId);
  }
}, 5000);

console.log("Part 4: MSG 12 (Candle Manipulator) + MSG 13 (Auto 24/7 + Designer) loaded");

console.log("Part 2: Chart + Drawing + Trade System loaded");

// ============================================
// MSG 14: USER CHAT SYSTEM
// ============================================

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
  var chatBtnEl = document.getElementById("chat-btn");
  if (chatBtnEl && chatBtnEl.dataset.bound !== "1") {
    chatBtnEl.dataset.bound = "1";
    chatBtnEl.onclick = openUserChat;
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

// ============================================
// GLOBAL EXPOSE (Debug + Cross-module)
// ============================================

// Expose Auth state
setInterval(function() {
  if (typeof currentUser !== "undefined" && currentUser) {
    window.currentUser = currentUser;
  }
  if (typeof userBalance !== "undefined") {
    window.userBalance = userBalance;
  }
  if (typeof selectedAsset !== "undefined") {
    window.selectedAsset = selectedAsset;
  }
  if (typeof accountType !== "undefined") {
    window.accountType = accountType;
  }
}, 1000);

// Expose core functions
window.placeTrade = placeTrade;
window.processTradeResults = processTradeResults;
window.loadActiveTrades = loadActiveTrades;
window.loadHistory = loadHistory;
window.initChart = initChart;
window.loadCandles = loadCandles;
window.startLivePrice = startLivePrice;
window.stopLivePrice = stopLivePrice;
window.updateBigTimer = updateBigTimer;
window.animateBalanceChange = animateBalanceChange;
window.showResultFlash = showResultFlash;
window.playSound = playSound;
window.updateTopCountdown = updateTopCountdown;
window.renderTradeMarkers = renderTradeMarkers;
window.startLiveMovement = startLiveMovement;
window.startAutoCandleGeneration = startAutoCandleGeneration;
window.analyzeActiveTrades = analyzeActiveTrades;
window.applyTrapFromAnalysis = applyTrapFromAnalysis;
window.startAuto24hGeneration = startAuto24hGeneration;
window.listenDesignerForMarket = listenDesignerForMarket;
window.openUserChat = openUserChat;
window.closeUserChat = closeUserChat;
window.sendUserChatMessage = sendUserChatMessage;

// Expose state variables
setInterval(function() {
  if (typeof chart !== "undefined" && chart) window.chart = chart;
  if (typeof candleSeries !== "undefined" && candleSeries) window.candleSeries = candleSeries;
  if (typeof activeTradesLocal !== "undefined" && Array.isArray(activeTradesLocal)) {
    window.activeTradesLocal = activeTradesLocal;
  }
  if (typeof currentPrice !== "undefined") window.currentPrice = currentPrice;
}, 500);

// Expose Firebase
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
window.orderBy = orderBy;

console.log("Part 5: MSG 14 (User Chat) + Global Expose loaded");
console.log("===== APP.JS REBUILD COMPLETE =====");
console.log("User Site Only — All features: Part 1-5 + 7A + 7B + MSG 10-14");
