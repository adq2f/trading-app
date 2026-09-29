// ============================================
// QUOTEX CLONE — app.js v24 (Full Rewrite)
// Part 1 of 5: Guards + Imports + Firebase + Auth
// ============================================

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
// SAFE TEXT REPLACEMENT
// ============================================
(function safeTextReplacement() {
  if (window.__safeTextReplacement) return;
  window.__safeTextReplacement = true;

  var originalTextContent = null;
  try {
    originalTextContent = Object.getOwnPropertyDescriptor(Element.prototype, "textContent");
  } catch(e) {}
  if (!originalTextContent || !originalTextContent.set) {
    try {
      originalTextContent = Object.getOwnPropertyDescriptor(Node.prototype, "textContent");
    } catch(e) {}
  }
  if (!originalTextContent || !originalTextContent.set) return;

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

// IMPORTANT: chart element renamed to tv-chart
const chartEl = document.getElementById("tv-chart");
const chartWrapper = document.getElementById("chart-wrapper");
const drawingCanvas = document.getElementById("drawing-canvas");
const assetSelect = document.getElementById("asset-select");
const currentPriceEl = document.getElementById("current-price");
const priceArrowEl = document.getElementById("price-arrow");

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
window.currentUser = null;
let userBalance = 0;
window.userBalance = 0;
let currentPrice = 50000;
window.currentPrice = 50000;
let prevPrice = 50000;
let selectedTime = 60;
let selectedTimeframe = "1m";
let selectedAsset = "BTCUSDT";
let accountType = "demo";
let activeTradesUnsub = null;
let historyUnsub = null;
let activeTradesLocal = [];
window.activeTradesLocal = [];
let lastTradeTime = 0;
let livePriceWS = null;
let chart = null;
window.chart = null;
let candleSeries = null;
window.candleSeries = null;
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
  const chip = document.getElementById("balance-chip");
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
// AUTH EVENTS
// ============================================
signupBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) { message.textContent = "Enter email and password"; return; }
  if (password.length < 6) { message.textContent = "Password must be 6+ chars"; return; }
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", userCred.user.uid), {
      email: email, balance: 1000, demoBalance: 1000, realBalance: 0,
      accountType: "demo", role: "user",
      createdAt: new Date().toISOString(), referralEarned: 0
    });
    message.style.color = "#00c853";
    message.textContent = "Registration success! Balance $1000";
  } catch (error) {
    message.style.color = "#ff5252";
    message.textContent = error.message;
  }
});

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) { message.textContent = "Enter email and password"; return; }
  try {
    await signInWithEmailAndPassword(auth, email, password);
    message.style.color = "#00c853";
    message.textContent = "Login success!";
  } catch (error) {
    message.style.color = "#ff5252";
    message.textContent = error.message;
  }
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => { await signOut(auth); });
}

// ============================================
// AUTH STATE
// ============================================
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
        userBalance = accountType === "demo" ? (data.demoBalance ?? data.balance ?? 1000) : (data.realBalance ?? 0);
        window.userBalance = userBalance;
        safeSetTextById("balance", userBalance.toFixed(2));
      }
    } catch (err) { console.error(err); }
    initChart();
    await loadCandles();
    startLivePrice();
    loadActiveTrades();
    loadHistory();
    console.log("[AUTH] Logged in:", user.email);
  } else {
    currentUser = null;
    window.currentUser = null;
    window.activeTradesLocal = [];
    activeTradesLocal = [];
    loginPage.classList.remove("hidden");
    dashboardPage.classList.add("hidden");
    emailInput.value = ""; passwordInput.value = "";
    stopLivePrice();
    if (activeTradesUnsub) activeTradesUnsub();
    if (historyUnsub) historyUnsub();
    console.log("[AUTH] Logged out");
  }
});

// ============================================
// TRADE AMOUNT BUTTONS
// ============================================
document.querySelectorAll(".qx-inc-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    let val = parseFloat(tradeAmountInput.value) || 0;
    if (btn.dataset.action === "plus") val += 1;
    else val = Math.max(1, val - 1);
    tradeAmountInput.value = val;
  });
});

// ============================================
// EXPOSE FIREBASE TO WINDOW
// ============================================
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
console.log("✅ Firebase exposed to window");
console.log("===== PART 1 LOADED =====");
// ============================================
// Part 2 of 5: Chart Init + Candles + Live Price
// ============================================

function initChart() {
  if (!chartEl) {
    console.error("[CHART] tv-chart element not found");
    return;
  }

  chartEl.innerHTML = "";
  if (chart) {
    try { chart.remove(); } catch(e) {}
    chart = null;
  }

  const wrapperHeight = chartWrapper ? chartWrapper.clientHeight : 290;

  // ===== CREATE CHART =====
  var realChart = LightweightCharts.createChart(chartEl, {
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
        color: "#58a6ff", width: 1, style: 2,
        labelBackgroundColor: "#1f6feb"
      },
      horzLine: {
        color: "#58a6ff", width: 1, style: 2,
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

  chart = realChart;
  window.chart = realChart;         // backward compat
  window.chartRef = realChart;      // ✅ real chart reference

  console.log("[CHART] ✅ chartRef exposed");
  console.log("[CHART] timeScale type:", typeof realChart.timeScale);
  console.log("[CHART] addCandlestickSeries type:", typeof realChart.addCandlestickSeries);

  // ===== CANDLE SERIES =====
  candleSeries = realChart.addCandlestickSeries({
    upColor: "#00c853",
    downColor: "#ff5252",
    borderUpColor: "#00c853",
    borderDownColor: "#ff5252",
    wickUpColor: "#00c853",
    wickDownColor: "#ff5252",
    priceLineVisible: false,
    lastValueVisible: false
  });
  window.candleSeries = candleSeries;
  console.log("[CHART] ✅ candleSeries exposed");

  // ===== WATERMARK =====
  try {
    var wm = document.createElement("div");
    wm.className = "qx-chart-watermark";
    wm.textContent = "QUOTEX";
    chartEl.appendChild(wm);
  } catch(e) {}

  // ===== TIME LABELS =====
  try {
    var tl = document.createElement("div");
    tl.className = "qx-time-labels";
    tl.id = "qx-time-labels";
    chartEl.appendChild(tl);
  } catch(e) {}

  // ===== PRICE DOT =====
  try {
    var pd = document.createElement("div");
    pd.id = "qx-price-dot";
    pd.className = "qx-price-dot";
    chartEl.appendChild(pd);
  } catch(e) {}

  // ===== TIME LABELS UPDATE =====
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

  // ===== SUBSCRIBE =====
  try {
    realChart.timeScale().subscribeVisibleTimeRangeChange(function() {
      if (typeof redrawDrawings === "function") redrawDrawings();
    });
  } catch(e) { console.warn("[CHART] subscribe err:", e.message); }

  if (typeof initDrawingSystem === "function") initDrawingSystem();

  window.addEventListener("resize", function() {
    if (chart && chartWrapper) {
      try {
        chart.applyOptions({
          width: chartEl.clientWidth,
          height: chartWrapper.clientHeight
        });
      } catch(e) {}
      if (typeof resizeDrawingCanvas === "function") resizeDrawingCanvas();
    }
  });
}

// ============================================
// TIMEFRAME CONVERT
// ============================================
function convertTimeframe(tf) {
  const map = { "5s": "5s", "10s": "10s", "15s": "15s", "30s": "30s",
    "1m": "1m", "5m": "5m", "15m": "15m", "1h": "1h", "4h": "4h" };
  return map[tf] || "1m";
}

// ============================================
// LOAD CANDLES (Binance API)
// ============================================
async function loadCandles() {
  console.log("[Candles] Loading:", selectedAsset);
  try {
    if (!candleSeries) { setTimeout(loadCandles, 500); return; }
    var isRealSymbol = /^(BTC|ETH|BNB|ADA|SOL|XRP|DOGE|MATIC|LTC|DOT)/i.test(selectedAsset);
    if (!isRealSymbol) { candleSeries.setData([]); return; }

    const interval = convertTimeframe(selectedTimeframe);
    const limit = interval.includes("s") ? 200 : 150;
    const url = "https://api.binance.com/api/v3/klines?symbol=" + selectedAsset + "&interval=" + interval + "&limit=" + limit;
    const res = await fetch(url);
    const data = await res.json();
    if (!Array.isArray(data)) { console.error("[Candles] API error"); return; }

    var candleData = data.map(function(k) {
      return {
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4])
      };
    }).filter(function(c) {
      return c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0 &&
        !isNaN(c.open) && !isNaN(c.close) && c.high >= c.low;
    });

    if (candleData.length > 0 && candleSeries) {
      candleSeries.setData(candleData);
      chart.timeScale().fitContent();
      currentPrice = candleData[candleData.length - 1].close;
      window.currentPrice = currentPrice;
      prevPrice = currentPrice;
      if (currentPriceEl) currentPriceEl.textContent = currentPrice.toFixed(2);
      console.log("[Candles] " + candleData.length + " candles loaded");
    }
  } catch (err) { console.error("[Candles] Error:", err); }
}

// ============================================
// LIVE PRICE (WebSocket)
// ============================================
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
        window.currentPrice = currentPrice;

        if (currentPriceEl) currentPriceEl.textContent = currentPrice.toFixed(2);
        if (currentPrice >= prevPrice) {
          if (currentPriceEl) currentPriceEl.style.color = "#00c853";
          if (priceArrowEl) priceArrowEl.textContent = "\u25B2";
        } else {
          if (currentPriceEl) currentPriceEl.style.color = "#ff5252";
          if (priceArrowEl) priceArrowEl.textContent = "\u25BC";
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

        // Price dot
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
    livePriceWS.onclose = () => {
      setTimeout(() => { if (currentUser) startLivePrice(); }, 3000);
    };
  } catch (e) { console.log("WS init error:", e); }
}

function stopLivePrice() {
  if (livePriceWS) {
    try { livePriceWS.close(); } catch (e) {}
    livePriceWS = null;
  }
}

function formatPrice(price) {
  if (!price && price !== 0) return "0.00";
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(3);
  return price.toFixed(5);
}

// ============================================
// DRAWING SYSTEM
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
  try {
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => { redrawDrawings(); });
  } catch(e) {}
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
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else if (event.changedTouches && event.changedTouches.length > 0) {
    clientX = event.changedTouches[0].clientX;
    clientY = event.changedTouches[0].clientY;
  } else {
    clientX = event.clientX;
    clientY = event.clientY;
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
    const text = prompt("Enter text:");
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
  isDrawing = false; drawStartPoint = null;
  redrawDrawings();
}

function saveDrawing(drawing) { drawings.push(drawing); redrawDrawings(); }

function clearAllDrawings() {
  drawings = [];
  if (drawingCtx && drawingCanvas) {
    drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
  }
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
// EXPOSE
// ============================================
window.initChart = initChart;
window.loadCandles = loadCandles;
window.startLivePrice = startLivePrice;
window.stopLivePrice = stopLivePrice;
window.clearAllDrawings = clearAllDrawings;
// ============================================
// Part 3 of 5: Trade Logic + Timer + History
// ============================================

// ============================================
// BIG TIMER
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
  activeTradesLocal.forEach(t => {
    if (t.expiresAt < soonest) soonest = t.expiresAt;
  });
  const remaining = Math.max(0, Math.ceil((soonest - Date.now()) / 1000));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  timerEl.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  timerEl.classList.remove("hidden");
  if (remaining <= 5) {
    timerEl.style.borderColor = "#ff5252";
    timerEl.style.color = "#ff5252";
  } else {
    timerEl.style.borderColor = "#1f6feb";
    timerEl.style.color = "#58a6ff";
  }
}

// ============================================
// LEGACY MARKERS (Binance arrow style)
// ============================================
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

// ============================================
// PLACE TRADE
// ============================================
async function placeTrade(type) {
  if (!currentUser) {
    console.warn("[Trade] No user");
    return;
  }
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

  if (!amount || amount < 1) { showMsg("Minimum $1 required", "#ff5252"); return; }
  if (amount > userBalance) { showMsg("Insufficient balance", "#ff5252"); return; }

  playSound("click");
  var entryPrice = currentPrice;
  var expiresAt = Date.now() + selectedTime * 1000;
  var entryTime = new Date().toISOString();

  try {
    var newBalance = userBalance - amount;
    var balanceField = accountType === "demo" ? "demoBalance" : "realBalance";
    await updateDoc(doc(db, "users", currentUser.uid), {
      [balanceField]: newBalance,
      balance: newBalance
    });
    userBalance = newBalance;
    window.userBalance = newBalance;

    try {
      var balEl = document.getElementById("balance");
      if (balEl && balEl.textContent !== undefined) balEl.textContent = userBalance.toFixed(2);
    } catch(e) {}

    if (typeof animateBalanceChange === "function") animateBalanceChange(-amount);

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

    showMsg(type.toUpperCase() + " $" + amount + " placed", type === "call" ? "#00c853" : "#ff5252");

    setTimeout(function() {
      try {
        var tm = document.getElementById("trade-message");
        if (tm && tm.textContent !== undefined) tm.textContent = "";
      } catch(e) {}
    }, 2000);

    console.log("[Trade] Placed:", type, "$" + amount, "@ $" + entryPrice.toFixed(2));
  } catch (error) {
    showMsg(error.message, "#ff5252");
    console.error("[Trade] Error:", error);
  }
}

// ============================================
// BIND TRADE BUTTONS
// ============================================
function bindTradeButtons() {
  var callBtnEl = document.getElementById("call-btn");
  var putBtnEl = document.getElementById("put-btn");
  if (callBtnEl && callBtnEl.dataset.tradeBound !== "1") {
    callBtnEl.dataset.tradeBound = "1";
    callBtnEl.addEventListener("click", function(e) {
      e.preventDefault();
      console.log("[Trade] CALL clicked");
      placeTrade("call");
    });
  }
  if (putBtnEl && putBtnEl.dataset.tradeBound !== "1") {
    putBtnEl.dataset.tradeBound = "1";
    putBtnEl.addEventListener("click", function(e) {
      e.preventDefault();
      console.log("[Trade] PUT clicked");
      placeTrade("put");
    });
  }
}

bindTradeButtons();
setTimeout(bindTradeButtons, 1500);
setTimeout(bindTradeButtons, 3000);

// ============================================
// CHECK EXPIRED TRADES
// ============================================
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
          window.userBalance = newBal;
          safeSetTextById("balance", userBalance.toFixed(2));
          animateBalanceChange(profit);
          showResultFlash("win");
          playSound("win");
          var tm1 = document.getElementById("trade-message");
          if (tm1) { tm1.style.color = "#00c853"; tm1.textContent = "WIN! +$" + profit.toFixed(2); }
        } else {
          showResultFlash("loss");
          playSound("loss");
          var tm2 = document.getElementById("trade-message");
          if (tm2) { tm2.style.color = "#ff5252"; tm2.textContent = "LOSS -$" + trade.amount.toFixed(2); }
        }
        setTimeout(function() {
          var tm3 = document.getElementById("trade-message");
          if (tm3) tm3.textContent = "";
        }, 3500);
      } catch (error) { console.error("Trade expire error:", error); }
    }
  }
}

// ============================================
// LOAD ACTIVE TRADES (Firestore listener)
// ============================================
function loadActiveTrades() {
  if (!currentUser) return;
  const q = query(
    collection(db, "trades"),
    where("userId", "==", currentUser.uid),
    where("status", "==", "pending")
  );
  if (activeTradesUnsub) { try { activeTradesUnsub(); } catch(e) {} }
  activeTradesUnsub = onSnapshot(q, (snapshot) => {
    activeTradesLocal = [];
    window.activeTradesLocal = activeTradesLocal;
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
      const div = document.createElement("div");
      div.className = `trade-item ${trade.type}`;
      div.innerHTML = `<div class="trade-info">
        <span class="trade-type ${trade.type}">${trade.type.toUpperCase()}</span>
        <span class="trade-time">$${trade.amount} @ ${Number(trade.entryPrice).toFixed(2)}</span>
      </div>`;
      if (activeTradesList) activeTradesList.appendChild(div);
    });
    window.activeTradesLocal = activeTradesLocal;
    if (activeCount) activeCount.textContent = activeTradesLocal.length;
    updateBigTimer();
    updateTradeMarkers();
  });
}

// ============================================
// LOAD HISTORY
// ============================================
function loadHistory() {
  if (!currentUser) return;
  const q = query(
    collection(db, "trades"),
    where("userId", "==", currentUser.uid),
    where("status", "==", "completed")
  );
  if (historyUnsub) { try { historyUnsub(); } catch(e) {} }
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
    trades.sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));
    trades.slice(0, 30).forEach((trade) => {
      const div = document.createElement("div");
      div.className = `trade-item ${trade.result}`;
      div.innerHTML = `<div class="trade-info">
        <span class="trade-type ${trade.type}">${trade.type.toUpperCase()}</span>
        <span class="trade-time">Entry: $${Number(trade.entryPrice || 0).toFixed(2)}</span>
        <span class="trade-time">Exit: $${Number(trade.exitPrice || 0).toFixed(2)}</span>
      </div>`;
      if (historyList) historyList.appendChild(div);
    });
  });
}

// ============================================
// UPDATE TIMER LOOP
// ============================================
setInterval(() => {
  if (currentUser && activeTradesLocal.length > 0) {
    updateBigTimer();
    updateTradeMarkers();
  }
}, 1000);

// ============================================
// EXPOSE
// ============================================
window.placeTrade = placeTrade;
window.bindTradeButtons = bindTradeButtons;
window.updateBigTimer = updateBigTimer;
window.updateTradeMarkers = updateTradeMarkers;
window.loadActiveTrades = loadActiveTrades;
window.loadHistory = loadHistory;
window.checkExpiredTrades = checkExpiredTrades;

console.log("===== PART 3 LOADED =====");
// ============================================
// Part 4 of 5: Admin Settings + Markets + Chat
// ============================================

// ============================================
// ADMIN SETTINGS
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
      console.log("[ADMIN] WinRate:", adminWinRate, "Payout:", adminPayout, "Force:", adminForceMarket);
    });
  } catch (err) { console.error("Settings listen error:", err); }
}

function applyMarketForce(diff) {
  if (!diff) return;
  const moveAmount = diff * 50;
  currentPrice += moveAmount;
  window.currentPrice = currentPrice;
  if (currentPriceEl) currentPriceEl.textContent = currentPrice.toFixed(2);
  if (moveAmount > 0) {
    if (currentPriceEl) currentPriceEl.style.color = "#00c853";
    if (priceArrowEl) priceArrowEl.textContent = "\u25B2";
  } else {
    if (currentPriceEl) currentPriceEl.style.color = "#ff5252";
    if (priceArrowEl) priceArrowEl.textContent = "\u25BC";
  }
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
    } catch(e) {}
  }
}

setTimeout(() => { if (currentUser) listenAdminSettings(); }, 2000);

setInterval(() => {
  if (currentUser && !settingsUnsub) listenAdminSettings();
  if (!currentUser && settingsUnsub) { settingsUnsub(); settingsUnsub = null; }
}, 3000);

// ============================================
// AUTO MODE DRIFT
// ============================================
let autoModePriceInterval = null;

function startAutoModeDrift() {
  if (autoModePriceInterval) {
    clearInterval(autoModePriceInterval);
    autoModePriceInterval = null;
  }
  autoModePriceInterval = setInterval(() => {
    if (!adminAutoMode) return;
    if (!currentUser) return;
    let drift = (Math.random() - 0.5) * 40;
    if (adminForceMarket > 0) drift += Math.random() * 30;
    else if (adminForceMarket < 0) drift -= Math.random() * 30;
    currentPrice = Math.max(100, currentPrice + drift);
    window.currentPrice = currentPrice;
    if (currentPriceEl) currentPriceEl.textContent = currentPrice.toFixed(2);
    if (drift >= 0) {
      if (currentPriceEl) currentPriceEl.style.color = "#00c853";
      if (priceArrowEl) priceArrowEl.textContent = "\u25B2";
    } else {
      if (currentPriceEl) currentPriceEl.style.color = "#ff5252";
      if (priceArrowEl) priceArrowEl.textContent = "\u25BC";
    }
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
      } catch(e) {}
    }
    updateBigTimer();
  }, 1000);
}

setInterval(() => {
  if (currentUser && !autoModePriceInterval) startAutoModeDrift();
  if (!currentUser && autoModePriceInterval) {
    clearInterval(autoModePriceInterval);
    autoModePriceInterval = null;
  }
}, 2000);

// ============================================
// MARKETS
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
          id: docSnap.id,
          name: m.name || "Unknown",
          symbol: m.symbol || "",
          basePrice: m.basePrice || 50000,
          payout: m.payout || 85,
          winRate: m.winRate || 50
        });
      }
    });
    markets.sort(function(a, b) { return (a.name || "").localeCompare(b.name || ""); });
    console.log("[Markets] Loaded " + markets.length + " markets");
    return markets;
  } catch (err) { console.error("[Markets] Load error:", err.message); return []; }
}

function populateAssetSelect(markets) {
  const sel = document.getElementById("asset-select");
  if (!sel) return;
  if (!markets || markets.length === 0) {
    sel.innerHTML = '<option value="BTCUSDT">BTC/USDT</option>' +
                    '<option value="ETHUSDT">ETH/USDT</option>' +
                    '<option value="BNBUSDT">BNB/USDT</option>';
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
    sel.appendChild(opt);
    validCount++;
  });
  if (validCount === 0) {
    sel.innerHTML = '<option value="BTCUSDT">BTC/USDT</option>' +
                    '<option value="ETHUSDT">ETH/USDT</option>' +
                    '<option value="BNBUSDT">BNB/USDT</option>';
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
  }
  console.log("[Markets] Selected:", selectedAsset);
}

function listenUserMarkets() {
  if (window.marketsUnsub) { window.marketsUnsub(); window.marketsUnsub = null; }
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
            payout: m.payout || 85
          });
        }
      });
      window.userMarkets = markets;
      populateAssetSelect(markets);
    }, function(err) { console.error("[Markets] Listener error:", err.message); });
  } catch (err) { console.error("[Markets] Listen error:", err.message); }
}

function initUserMarkets() {
  console.log("[Markets] Initializing...");
  loadUserMarketsFromFirestore().then(function(markets) {
    populateAssetSelect(markets);
  });
  listenUserMarkets();
}

setInterval(function() {
  if (window.currentUser && !window.marketsUnsub) initUserMarkets();
  if (!window.currentUser && window.marketsUnsub) {
    window.marketsUnsub();
    window.marketsUnsub = null;
  }
}, 2000);

// ============================================
// FIRESTORE CANDLES (Admin)
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
        id: docSnap.id,
        number: c.number || 0,
        date: c.date || "",
        startTime: c.startTime || c.time || "",
        open: Number(c.open) || 0,
        high: Number(c.high) || 0,
        low: Number(c.low) || 0,
        close: Number(c.close) || 0
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
    return {
      time: timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close
    };
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
      window.currentPrice = currentPrice;
      prevPrice = currentPrice;
      if (currentPriceEl) currentPriceEl.textContent = currentPrice.toFixed(2);
    }
    console.log("[Candles] Rendered " + uniqueData.length + " admin candles");
  } catch (err) { console.error("[Candles] Render error:", err.message); }
}

async function loadUserCandlesSmart() {
  const marketId = window.selectedMarketId;
  if (marketId) {
    try {
      const adminCandles = await loadAdminCandlesFromFirestore(marketId);
      if (adminCandles.length > 0) {
        renderAdminCandlesOnChart(adminCandles);
        return;
      }
    } catch (err) {}
  }
  if (typeof loadCandles === "function") await loadCandles();
}

// ============================================
// USER CHAT
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
      if (snap.empty) {
        messagesEl.innerHTML = '<p class="empty-text">Send a message...</p>';
        return;
      }
      snap.forEach(function(d) {
        var m = d.data();
        var div = document.createElement("div");
        div.className = "user-chat-msg " + (m.from === "user" ? "from-user" : "from-admin");
        div.textContent = m.text || "";
        messagesEl.appendChild(div);
      });
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  } catch (err) { console.error("[Chat] Error:", err.message); }
}

// ============================================
// AUTO-FIX NULL TEXT
// ============================================
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

// ============================================
// CHART RESIZE FORCE
// ============================================
setInterval(function() {
  try {
    if (window.chartRef && typeof window.chartRef.applyOptions === "function") {
      var wrap = document.getElementById("chart-wrapper");
      if (wrap && wrap.clientWidth > 0 && wrap.clientHeight > 0) {
        window.chartRef.applyOptions({ width: wrap.clientWidth, height: wrap.clientHeight });
      }
    }
  } catch(e) {}
}, 2000);

console.log("===== PART 4 LOADED =====");
// ============================================
// Part 5 of 5: MSG 7 Tick Mark + UI + Expose
// ============================================

// ============================================
// MSG 7 UNIVERSAL: Tick Mark + Entry Line (v4/v5)
// ============================================
console.log("===== MSG 7 UNIVERSAL STARTING =====");

// ===== Universal coordinate helper =====
function getChartCoords(entryTime, entryPrice) {
  try {
    var realChart = window.chartRef || window.chart;
    if (!realChart) {
      console.warn("[COORD] No chart available");
      return null;
    }
    if (!realChart.timeScale || typeof realChart.timeScale !== "function") {
      console.warn("[COORD] chartRef.timeScale not a function");
      return null;
    }
    if (!window.candleSeries) {
      console.warn("[COORD] No candleSeries");
      return null;
    }

    var entrySec = Math.floor(new Date(entryTime).getTime() / 1000);
    var x = null, y = null;

    // X coordinate
    try {
      var ts = realChart.timeScale();
      if (ts && typeof ts.timeToCoordinate === "function") {
        x = ts.timeToCoordinate(entrySec);
      }
    } catch(e) { console.warn("[COORD] x fail:", String(e)); }

    // Y coordinate
    try {
      if (typeof window.candleSeries.priceToCoordinate === "function") {
        y = window.candleSeries.priceToCoordinate(entryPrice);
      }
    } catch(e) { console.warn("[COORD] y fail:", String(e)); }

    console.log("[COORD] entrySec:", entrySec, "x:", x, "y:", y);
    if (x === null || x === undefined || y === null || y === undefined) return null;
    return { x: x, y: y };
  } catch(e) {
    console.error("[COORD] error:", String(e), e.message);
    return null;
  }
}

// ===== 1. Tick Mark =====
function renderTickMark(type, entryPrice, entryTime) {
  try {
    var chartWrap = document.getElementById("chart-wrapper");
    if (!chartWrap) return;

    var old = chartWrap.querySelectorAll(".qx-tick-mark");
    old.forEach(function(m) { m.remove(); });

    var coords = getChartCoords(entryTime, entryPrice);
    if (!coords) {
      console.warn("[TICK] coords null - skip");
      return;
    }

    var tick = document.createElement("div");
    tick.className = "qx-tick-mark " + type;
    tick.style.left = (coords.x - 11) + "px";
    tick.style.top = type === "call" ? (coords.y + 18) + "px" : (coords.y - 30) + "px";
    tick.textContent = "\u2713";
    chartWrap.appendChild(tick);
    console.log("[TICK] Rendered at x=" + coords.x + " y=" + coords.y);
  } catch(e) {
    console.error("[TICK] ERROR:", String(e), e.message);
  }
}

// ===== 2. Dot Trail =====
function renderDotTrail(type, entryPrice, entryTime) {
  try {
    var chartWrap = document.getElementById("chart-wrapper");
    if (!chartWrap) return;

    var old = chartWrap.querySelectorAll(".qx-dot-trail");
    old.forEach(function(m) { m.remove(); });

    var coords = getChartCoords(entryTime, entryPrice);
    if (!coords) return;

    var trail = document.createElement("div");
    trail.className = "qx-dot-trail " + type;
    for (var i = 0; i < 4; i++) {
      var d = document.createElement("div");
      d.className = "qx-dot qx-dot-" + i;
      trail.appendChild(d);
    }
    if (type === "call") {
      trail.style.left = (coords.x - 62) + "px";
      trail.style.top = (coords.y + 18) + "px";
    } else {
      trail.style.left = (coords.x + 12) + "px";
      trail.style.top = (coords.y - 28) + "px";
    }
    chartWrap.appendChild(trail);
    console.log("[TRAIL] Rendered");
  } catch(e) {
    console.error("[TRAIL] ERROR:", String(e), e.message);
  }
}

// ===== 3. Entry Line + Label =====
function renderEntryLine(type, entryPrice, entryTime) {
  try {
    var chartWrap = document.getElementById("chart-wrapper");
    if (!chartWrap) return;

    var old = chartWrap.querySelectorAll(".qx-entry-line, .qx-entry-label");
    old.forEach(function(m) { m.remove(); });

    var coords = getChartCoords(entryTime, entryPrice);
    if (!coords) return;

    var line = document.createElement("div");
    line.className = "qx-entry-line " + type;
    line.style.left = coords.x + "px";
    line.style.right = "60px";
    line.style.top = coords.y + "px";
    chartWrap.appendChild(line);

    var label = document.createElement("div");
    label.className = "qx-entry-label " + type;
    label.textContent = Number(entryPrice).toFixed(2);
    label.style.left = (coords.x + 4) + "px";
    label.style.top = (coords.y - 22) + "px";
    chartWrap.appendChild(label);
    console.log("[LINE] Rendered");
  } catch(e) {
    console.error("[LINE] ERROR:", String(e), e.message);
  }
}

// ===== 4. Render All =====
function renderAllTradeMarkers(type, entryPrice, entryTime) {
  renderTickMark(type, entryPrice, entryTime);
  renderDotTrail(type, entryPrice, entryTime);
  renderEntryLine(type, entryPrice, entryTime);
}

// ===== 5. Auto render polling =====
setInterval(async function() {
  try {
    if (!window.currentUser) return;
    if (!window.chartRef || !window.candleSeries) return;

    var wrap = document.getElementById("chart-wrapper");
    if (!wrap) return;

    var q = query(
      collection(db, "trades"),
      where("userId", "==", window.currentUser.uid),
      where("status", "==", "pending")
    );
    var snap = await getDocs(q);

    if (snap.empty) {
      wrap.querySelectorAll(".qx-tick-mark, .qx-dot-trail, .qx-entry-line, .qx-entry-label").forEach(function(el) {
        el.remove();
      });
      return;
    }

    var existing = wrap.querySelectorAll(".qx-tick-mark");
    if (existing.length > 0) return;

    snap.forEach(function(docSnap) {
      var trade = docSnap.data();
      if (!trade.entryPrice || !trade.entryTime) return;
      renderAllTradeMarkers(trade.type, trade.entryPrice, trade.entryTime);
    });
  } catch(e) {
    console.error("[MSG7-POLL] err:", String(e), e.message);
  }
}, 2000);

// ===== 6. Patch placeTrade =====
(function patchPlaceTradeUniversal() {
  if (typeof window.placeTrade !== "function") {
    setTimeout(patchPlaceTradeUniversal, 1000);
    return;
  }
  var _orig = window.placeTrade;
  window.placeTrade = async function(type) {
    await _orig(type);
    setTimeout(function() {
      try {
        if (typeof activeTradesLocal !== "undefined" && activeTradesLocal.length > 0) {
          var last = activeTradesLocal[activeTradesLocal.length - 1];
          if (last && last.status === "pending") {
            renderAllTradeMarkers(last.type, last.entryPrice, last.entryTime);
          }
        }
      } catch(e) {}
    }, 1500);
  };
  console.log("[MSG7] placeTrade patched");
})();

// ===== Manual test =====
window.testTickMark = function() {
  console.log("=== MANUAL TEST ===");
  var c = getChartCoords(new Date().toISOString(), 83000);
  console.log("Coords:", c);
  if (c) {
    renderAllTradeMarkers("call", 83000, new Date().toISOString());
    setTimeout(function() {
      console.log("Tick marks:", document.querySelectorAll(".qx-tick-mark").length);
    }, 500);
  } else {
    console.error("Coords NULL");
  }
};

// ============================================
// TIMEFRAME DROPDOWN
// ============================================
(function initTfDropdown() {
  var menuBtn = document.getElementById("chart-menu-btn");
  var dropdown = document.getElementById("tf-dropdown");
  var activeLabel = document.getElementById("qx-tf-active");
  var tfBtn = document.getElementById("tf-btn");
  if (!dropdown) return;

  if (tfBtn) {
    tfBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      dropdown.classList.toggle("active");
    });
  }

  document.addEventListener("click", function(e) {
    if (!dropdown.contains(e.target) && e.target !== tfBtn) {
      dropdown.classList.remove("active");
    }
  });

  dropdown.querySelectorAll(".qx-tf-item").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      dropdown.querySelectorAll(".qx-tf-item").forEach(function(b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      var tf = btn.dataset.tf;
      selectedTimeframe = tf;
      if (activeLabel) activeLabel.textContent = tf;
      if (typeof loadCandles === "function") await loadCandles();
      if (currentUser && typeof startLivePrice === "function") startLivePrice();
      dropdown.classList.remove("active");
      console.log("[TF] Changed to:", tf);
    });
  });

  console.log("[TF] Dropdown initialized");
})();

// ============================================
// ASSET SELECT
// ============================================
if (assetSelect) {
  assetSelect.addEventListener("change", async () => {
    selectedAsset = assetSelect.value;
    await loadCandles();
    if (currentUser) startLivePrice();
  });
}

// ============================================
// DRAWING TOOL BUTTONS
// ============================================
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

// ============================================
// POPUP HELPERS
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

// ============================================
// BALANCE CHIP CLICK
// ============================================
if (balanceChip) {
  balanceChip.addEventListener("click", () => {
    if (balancePopupValue) balancePopupValue.textContent = userBalance.toFixed(2);
    if (balancePopup) openPopup(balancePopup, balancePopupOverlay);
    else openPopup(accountPopup, accountPopupOverlay);
  });
}
if (balancePopupClose) balancePopupClose.addEventListener("click", () => closePopup(balancePopup));

// ============================================
// DEPOSIT/WITHDRAW BUTTONS
// ============================================
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

// ============================================
// DEPOSIT SUBMIT
// ============================================
if (depositSubmit) {
  depositSubmit.addEventListener("click", async () => {
    if (!currentUser) return;
    const amount = parseFloat(depositAmount.value);
    const txid = depositTxid.value.trim();
    if (!amount || amount < 1) {
      depositMessage.style.color = "#ff5252";
      depositMessage.textContent = "Minimum $1";
      return;
    }
    if (!txid) {
      depositMessage.style.color = "#ff5252";
      depositMessage.textContent = "Enter TrxID";
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
      depositMessage.textContent = "Request sent!";
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

// ============================================
// WITHDRAW SUBMIT
// ============================================
if (withdrawSubmit) {
  withdrawSubmit.addEventListener("click", async () => {
    if (!currentUser) return;
    const amount = parseFloat(withdrawAmount.value);
    const method = withdrawMethod.value;
    const number = withdrawNumber.value.trim();
    if (!amount || amount < 1) {
      withdrawMessage.style.color = "#ff5252";
      withdrawMessage.textContent = "Minimum $1";
      return;
    }
    if (amount > userBalance) {
      withdrawMessage.style.color = "#ff5252";
      withdrawMessage.textContent = "Insufficient balance";
      return;
    }
    if (!number) {
      withdrawMessage.style.color = "#ff5252";
      withdrawMessage.textContent = "Enter account number";
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
      withdrawMessage.textContent = "Request sent!";
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

// ============================================
// BOTTOM NAV
// ============================================
(function initBottomNav() {
  var navBtns = document.querySelectorAll(".qx-nav-btn");
  navBtns.forEach(function(btn) {
    btn.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      var nav = btn.dataset.nav;
      navBtns.forEach(function(b) { b.classList.remove("active"); });
      btn.classList.add("active");

      if (nav === "more") {
        var mm = document.getElementById("more-menu");
        if (mm) mm.classList.remove("hidden");
      } else if (nav === "tournament") {
        var tp = document.getElementById("tournament-popup");
        if (tp) tp.classList.remove("hidden");
      } else if (nav === "help") {
        openUserChat();
      } else if (nav === "history") {
        var ts = document.querySelector(".qx-trades-section");
        if (ts) ts.scrollIntoView({ behavior: "smooth" });
      } else if (nav === "profile") {
        var ap = document.getElementById("account-popup");
        if (ap) ap.classList.remove("hidden");
      }
      console.log("[NAV] clicked:", nav);
    });
  });
})();

// ============================================
// MORE MENU ITEMS
// ============================================
setTimeout(function() {
  var moreClose = document.getElementById("more-menu-close");
  var moreMenu = document.getElementById("more-menu");
  if (moreClose && moreMenu) {
    moreClose.onclick = function() { moreMenu.classList.add("hidden"); };
  }
  document.querySelectorAll(".more-menu-item").forEach(function(item) {
    item.addEventListener("click", function(e) {
      e.preventDefault();
      var menu = item.dataset.menu;
      if (moreMenu) moreMenu.classList.add("hidden");
      if (menu === "deposit") {
        var dp = document.getElementById("deposit-popup");
        if (dp) dp.classList.remove("hidden");
      } else if (menu === "withdraw") {
        var wp = document.getElementById("withdraw-popup");
        if (wp) wp.classList.remove("hidden");
      } else if (menu === "chat") {
        openUserChat();
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
  console.log("[MORE] menu bound");
}, 2000);

// ============================================
// POPUP OVERLAY + CLOSE (Generic)
// ============================================
setTimeout(function() {
  document.querySelectorAll(".popup-overlay").forEach(function(overlay) {
    overlay.onclick = function() {
      var parent = overlay.closest(".popup");
      if (parent) parent.classList.add("hidden");
    };
  });
  document.querySelectorAll(".popup-close").forEach(function(btn) {
    btn.onclick = function() {
      var parent = btn.closest(".popup");
      if (parent) parent.classList.add("hidden");
    };
  });
  console.log("[POPUP] All bound");
}, 2500);

// ============================================
// CHAT SEND
// ============================================
setTimeout(function() {
  var sendBtn = document.getElementById("user-chat-send");
  var input = document.getElementById("user-chat-input");
  if (sendBtn && input) {
    sendBtn.onclick = async function() {
      var text = input.value.trim();
      if (!text || !currentUser) return;
      try {
        await addDoc(collection(db, "chats", currentUser.uid, "messages"), {
          from: "user",
          text: text,
          timestamp: new Date().toISOString()
        });
        input.value = "";
      } catch(e) { console.error("[Chat] send error:", e); }
    };
  }
}, 2000);

// ============================================
// TRADES TABS
// ============================================
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
})();

// ============================================
// EXPOSE ALL
// ============================================
window.renderTickMark = renderTickMark;
window.renderDotTrail = renderDotTrail;
window.renderEntryLine = renderEntryLine;
window.renderAllTradeMarkers = renderAllTradeMarkers;
window.getChartCoords = getChartCoords;

console.log("===== MSG 7 UNIVERSAL LOADED =====");
console.log("Type testTickMark() in console to test");
console.log("===== ALL PARTS LOADED =====");
console.log("===== PART 2 LOADED =====");
