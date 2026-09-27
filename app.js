// ============================================
// Quotex Clone — app.js
// Part 1: Imports + Firebase + DOM + Globals + Sounds
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
  updateDoc,
  collection,
  addDoc,
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
const balancePopupEl = document.getElementById("balance-popup");
const balancePopupClose = document.getElementById("balance-popup-close");
const balancePopupOverlay = document.getElementById("balance-popup-overlay");
const balancePopupValue = document.getElementById("balance-popup");

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

// ===== লগআউট =====
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

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
    balancePopupValue.textContent = userBalance.toFixed(2);
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
    activeTradesList.innerHTML = "";

    if (snapshot.empty) {
      activeTradesList.innerHTML = '<p class="empty-text">কোনো চলমান ট্রেড নেই</p>';
      if (activeCount) activeCount.textContent = "0";
      bigTimer.classList.add("hidden");
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
          <span class="trade-time">$${trade.amount} @ ${trade.entryPrice.toFixed(2)}</span>
        </div>
        <div class="trade-result pending">${timeStr}</div>
      `;
      activeTradesList.appendChild(div);
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
          ${trade.result === "win" ? "+$" + trade.profit.toFixed(2) : "-$" + trade.amount.toFixed(2)}
        </div>
      `;
      historyList.appendChild(div);
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
