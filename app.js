// ============================================
// QUOTEX CLONE — app.js v25
// Part 1 of 5: Guards + Imports + Firebase + DOM + Auth
// ============================================

// ============================================
// SAFE TEXT GUARD
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

  console.log("[SAFE-GUARD] Active");
})();

// ============================================
// GLOBAL NULL-GUARD
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

  var origTextContent = null;
  try {
    origTextContent = Object.getOwnPropertyDescriptor(Element.prototype, "textContent");
  } catch(e) {}
  if (!origTextContent || !origTextContent.set) {
    try {
      origTextContent = Object.getOwnPropertyDescriptor(Node.prototype, "textContent");
    } catch(e) {}
  }
  if (!origTextContent || !origTextContent.set) return;

  try {
    Object.defineProperty(HTMLElement.prototype, "textContent", {
      get: function() {
        try {
          if (this === null || this === undefined) return "";
          return origTextContent.get.call(this);
        } catch(e) { return ""; }
      },
      set: function(value) {
        try {
          if (this === null || this === undefined) return;
          origTextContent.set.call(this, value);
        } catch(e) {}
      },
      configurable: true
    });
    console.log("[SAFE-TEXT] Active");
  } catch(e) {}
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
const message = document.getElementById("message");

const balanceChip = document.getElementById("balance-chip");
const balancePopup = document.getElementById("balance-popup");
const balancePopupClose = document.getElementById("balance-popup-close");
const balancePopupOverlay = document.getElementById("balance-popup-overlay");

const accountPopup = document.getElementById("account-popup");
const accountPopupOverlay = document.getElementById("account-popup-overlay");
const accountPopupClose = document.getElementById("account-popup-close");

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
const withdrawAmount = document.getElementById("withdraw-amount");
const withdrawMethod = document.getElementById("withdraw-method");
const withdrawNumber = document.getElementById("withdraw-number");
const withdrawSubmit = document.getElementById("withdraw-submit");
const withdrawMessage = document.getElementById("withdraw-message");

// CRITICAL: id renamed to tv-chart
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
let candleSeries = null;
window.candleSeries = null;
let currentDrawingTool = "cursor";
let drawings = [];
let isDrawing = false;
let drawStartPoint = null;

// Chart refs (exposed)
window.chartRef = null;
window.chart = null;

// ============================================
// SOUNDS
// ============================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  try {
    if (audioCtx.state === "suspended") audioCtx.resume();
    if (type === "click") {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.frequency.value = 800; osc.type = "sine";
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === "win") {
      [523.25, 659.25, 783.99, 1046.5].forEach(function(freq, i) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.value = freq; osc.type = "sine";
        var t = audioCtx.currentTime + i * 0.1;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t); osc.stop(t + 0.3);
      });
    } else if (type === "loss") {
      [392, 329.63, 261.63].forEach(function(freq, i) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.value = freq; osc.type = "sawtooth";
        var t = audioCtx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.start(t); osc.stop(t + 0.35);
      });
    }
  } catch (e) {}
}

function showResultFlash(result) {
  var flash = document.createElement("div");
  flash.className = "result-flash " + result;
  document.body.appendChild(flash);
  setTimeout(function() { flash.remove(); }, 700);
}

function animateBalanceChange(amount) {
  var chip = document.getElementById("balance-chip");
  if (!chip) return;
  var balEl = chip.querySelector(".qx-balance");
  if (!balEl) return;
  var originalColor = "#ffffff";
  if (amount > 0) {
    chip.style.color = "#00c853";
    balEl.innerHTML = "$<span style='color:#00c853'>+" + amount.toFixed(2) + "</span>";
  } else {
    chip.style.color = "#ff5252";
    balEl.innerHTML = "$<span style='color:#ff5252'>-" + Math.abs(amount).toFixed(2) + "</span>";
  }
  setTimeout(function() {
    chip.style.color = "";
    if (window.userBalance !== undefined) {
      balEl.textContent = "$" + Number(window.userBalance).toFixed(2);
    }
  }, 2000);
}

// ============================================
// AUTH EVENTS
// ============================================
signupBtn.addEventListener("click", async () => {
  var email = emailInput.value.trim();
  var password = passwordInput.value;
  if (!email || !password) { message.textContent = "Enter email & password"; return; }
  if (password.length < 6) { message.textContent = "Password must be 6+ chars"; return; }
  try {
    var userCred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", userCred.user.uid), {
      email: email, balance: 1000, demoBalance: 1000, realBalance: 0,
      accountType: "demo", role: "user",
      createdAt: new Date().toISOString(), referralEarned: 0
    });
    message.style.color = "#00c853";
    message.textContent = "Registration success! $1000";
  } catch (error) {
    message.style.color = "#ff5252";
    message.textContent = error.message;
  }
});

loginBtn.addEventListener("click", async () => {
  var email = emailInput.value.trim();
  var password = passwordInput.value;
  if (!email || !password) { message.textContent = "Enter email & password"; return; }
  try {
    await signInWithEmailAndPassword(auth, email, password);
    message.style.color = "#00c853";
    message.textContent = "Login success!";
  } catch (error) {
    message.style.color = "#ff5252";
    message.textContent = error.message;
  }
});

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
      var userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        var data = userDoc.data();
        accountType = data.accountType || "demo";
        userBalance = accountType === "demo" ? (data.demoBalance ?? data.balance ?? 1000) : (data.realBalance ?? 0);
        window.userBalance = userBalance;
        safeSetTextById("balance", userBalance.toFixed(2));
      }
    } catch (err) { console.error(err); }

    // initChart() and other functions defined in Part 2
    if (typeof initChart === "function") initChart();
    if (typeof loadCandles === "function") await loadCandles();
    if (typeof startLivePrice === "function") startLivePrice();
    if (typeof loadActiveTrades === "function") loadActiveTrades();
    if (typeof loadHistory === "function") loadHistory();

    console.log("[AUTH] Logged in:", user.email);
  } else {
    currentUser = null;
    window.currentUser = null;
    window.activeTradesLocal = [];
    activeTradesLocal = [];
    loginPage.classList.remove("hidden");
    dashboardPage.classList.add("hidden");
    emailInput.value = "";
    passwordInput.value = "";
    if (typeof stopLivePrice === "function") stopLivePrice();
    if (activeTradesUnsub) activeTradesUnsub();
    if (historyUnsub) historyUnsub();
    console.log("[AUTH] Logged out");
  }
});

// ============================================
// EXPOSE FIREBASE
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

console.log("===== PART 1 LOADED =====");
// ============================================
// Part 2 of 5: Chart + Candles + Live Price + Time Labels
// ============================================

// ============================================
// INIT CHART (CRITICAL: window.chartRef expose)
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

  var wrapperHeight = chartWrapper ? chartWrapper.clientHeight : 290;
  if (!wrapperHeight || wrapperHeight < 100) wrapperHeight = 290;

  // ===== Create Chart =====
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
  window.chart = realChart;
  window.chartRef = realChart;

  console.log("[CHART] ✅ chartRef exposed");
  console.log("[CHART] timeScale:", typeof realChart.timeScale);
  console.log("[CHART] addCandlestickSeries:", typeof realChart.addCandlestickSeries);

  // ===== Candlestick Series =====
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

  // ===== Watermark =====
  try {
    var wm = document.createElement("div");
    wm.className = "qx-chart-watermark";
    wm.textContent = "QUOTEX";
    chartEl.appendChild(wm);
  } catch(e) {}

  // ===== Price Dot =====
  try {
    var pd = document.getElementById("qx-price-dot");
    if (pd) pd.style.display = "none";
  } catch(e) {}

  // ===== Time Labels updater =====
  startTimeLabelsUpdater();

  // ===== Subscribe to chart changes =====
  try {
    realChart.timeScale().subscribeVisibleTimeRangeChange(function() {
      if (typeof redrawDrawings === "function") redrawDrawings();
      if (typeof updateTimeLabels === "function") updateTimeLabels();
      if (typeof updateEntryLine === "function") updateEntryLine();
      if (typeof refreshVerticalLines === "function") refreshVerticalLines();
    });
  } catch(e) {}

  // ===== Drawing system init =====
  if (typeof initDrawingSystem === "function") initDrawingSystem();

  // ===== Resize handler =====
  window.addEventListener("resize", function() {
    if (chart && chartWrapper && chartEl) {
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
  var map = {
    "5s": "5s", "10s": "10s", "15s": "15s", "30s": "30s",
    "1m": "1m", "2m": "2m", "3m": "3m", "5m": "5m",
    "10m": "10m", "15m": "15m", "30m": "30m",
    "1h": "1h", "4h": "4h", "1d": "1d"
  };
  return map[tf] || "1m";
}

// ============================================
// LOAD CANDLES (Binance API)
// ============================================
async function loadCandles() {
  console.log("[Candles] Loading:", selectedAsset, selectedTimeframe);
  try {
    if (!candleSeries) { setTimeout(loadCandles, 500); return; }
    var isRealSymbol = /^(BTC|ETH|BNB|ADA|SOL|XRP|DOGE|MATIC|LTC|DOT)/i.test(selectedAsset);
    if (!isRealSymbol) { candleSeries.setData([]); return; }

    var interval = convertTimeframe(selectedTimeframe);
    var limit = interval.indexOf("s") !== -1 ? 200 : 150;
    var url = "https://api.binance.com/api/v3/klines?symbol=" + selectedAsset + "&interval=" + interval + "&limit=" + limit;

    var res = await fetch(url);
    var data = await res.json();
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

      // Update time labels after data load
      setTimeout(updateTimeLabels, 100);
    }
  } catch (err) {
    console.error("[Candles] Error:", err);
  }
}

// ============================================
// LIVE PRICE (Binance WebSocket)
// ============================================
function startLivePrice() {
  stopLivePrice();
  var interval = convertTimeframe(selectedTimeframe);
  var streamName = selectedAsset.toLowerCase() + "@kline_" + interval;
  var url = "wss://stream.binance.com:9443/ws/" + streamName;

  try {
    livePriceWS = new WebSocket(url);
    livePriceWS.onmessage = function(event) {
      try {
        var msg = JSON.parse(event.data);
        if (!msg.k) return;
        var k = msg.k;
        var price = parseFloat(k.c);

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

        // Update price dot
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

        // Update entry line every tick
        if (typeof updateEntryLine === "function") updateEntryLine();

        // Update candle countdown
        if (typeof updateCandleCountdown === "function") updateCandleCountdown();

        if (typeof checkExpiredTrades === "function") checkExpiredTrades();
        if (typeof updateBigTimer === "function") updateBigTimer();
      } catch (err) {}
    };
    livePriceWS.onerror = function() {};
    livePriceWS.onclose = function() {
      setTimeout(function() {
        if (currentUser) startLivePrice();
      }, 3000);
    };
  } catch (e) { console.log("WS init error:", e); }
}

function stopLivePrice() {
  if (livePriceWS) {
    try { livePriceWS.close(); } catch(e) {}
    livePriceWS = null;
  }
}

// ============================================
// REAL CANDLE TIMESTAMPS (bottom of chart)
// ============================================
function startTimeLabelsUpdater() {
  if (window.__timeLabelsInterval) return;
  window.__timeLabelsInterval = setInterval(function() {
    updateTimeLabels();
  }, 5000);

  // Initial
  setTimeout(updateTimeLabels, 1000);
}

function updateTimeLabels() {
  try {
    var labelsEl = document.getElementById("qx-time-labels");
    if (!labelsEl) return;
    if (!window.chartRef || !window.candleSeries) return;

    var chartWrap = document.getElementById("chart-wrapper");
    if (!chartWrap) return;

    // ===== Visible time range (stable) =====
    var range = null;
    try {
      range = window.chartRef.timeScale().getVisibleRange();
    } catch(e) {}

    if (!range || !range.from || !range.to) {
      labelsEl.innerHTML = "";
      return;
    }

    // ===== Candle data =====
    var data = window.candleSeries.data();
    if (!data || data.length === 0) {
      labelsEl.innerHTML = "";
      return;
    }

    // ===== Filter visible candles =====
    var visible = [];
    for (var i = 0; i < data.length; i++) {
      if (data[i].time >= range.from && data[i].time <= range.to) {
        visible.push(data[i]);
      }
    }

    if (visible.length < 2) {
      labelsEl.innerHTML = "";
      return;
    }

    // ===== Pick 5 evenly spaced =====
    var labelCount = 5;
    var step = Math.max(1, Math.floor(visible.length / labelCount));
    var labels = [];
    var usedTimes = {};

    for (var j = 0; j < labelCount; j++) {
      var idx = Math.min(j * step, visible.length - 1);
      var candle = visible[idx];
      if (candle && !usedTimes[candle.time]) {
        usedTimes[candle.time] = true;
        var d = new Date(candle.time * 1000);
        var hh = String(d.getHours()).padStart(2, "0");
        var mm = String(d.getMinutes()).padStart(2, "0");
        labels.push(hh + ":" + mm);
      }
    }

    // ===== Render =====
    labelsEl.innerHTML = labels.map(function(l, i) {
      var active = (i === Math.floor(labels.length / 2)) ? " active" : "";
      return '<span class="qx-time-label' + active + '">' + l + '</span>';
    }).join("");

  } catch(e) {
    console.error("[TimeLabels] error:", String(e), e.message);
  }
}

// ============================================
// CANDLE COUNTDOWN (for drawer)
// ============================================
function updateCandleCountdown() {
  try {
    if (!window.candleSeries) return;
    var data = window.candleSeries.data();
    if (!data || data.length === 0) return;

    var lastCandle = data[data.length - 1];
    var candleStartSec = lastCandle.time;
    var interval = convertTimeframe(selectedTimeframe);

    // Convert interval to seconds
    var intervalSec = 60;
    if (interval.indexOf("s") !== -1) intervalSec = parseInt(interval);
    else if (interval === "1m") intervalSec = 60;
    else if (interval === "2m") intervalSec = 120;
    else if (interval === "3m") intervalSec = 180;
    else if (interval === "5m") intervalSec = 300;
    else if (interval === "10m") intervalSec = 600;
    else if (interval === "15m") intervalSec = 900;
    else if (interval === "30m") intervalSec = 1800;
    else if (interval === "1h") intervalSec = 3600;
    else if (interval === "4h") intervalSec = 14400;
    else if (interval === "1d") intervalSec = 86400;

    var nowSec = Math.floor(Date.now() / 1000);
    var nextCandleSec = candleStartSec + intervalSec;
    var remaining = Math.max(0, nextCandleSec - nowSec);

    var mm = Math.floor(remaining / 60);
    var ss = remaining % 60;
    var countdownStr = String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");

    // Update drawer elements
    var cdEl = document.getElementById("candle-countdown");
    if (cdEl) cdEl.textContent = countdownStr;

    var rangeEl = document.getElementById("candle-time-range");
    if (rangeEl) {
      var startD = new Date(candleStartSec * 1000);
      var endD = new Date(nextCandleSec * 1000);
      var startStr = String(startD.getHours()).padStart(2, "0") + ":" + String(startD.getMinutes()).padStart(2, "0");
      var endStr = String(endD.getHours()).padStart(2, "0") + ":" + String(endD.getMinutes()).padStart(2, "0");
      rangeEl.textContent = startStr + " - " + endStr;
    }

    // Update OHLC
    var openEl = document.getElementById("drawer-open");
    var highEl = document.getElementById("drawer-high");
    var lowEl = document.getElementById("drawer-low");
    var closeEl = document.getElementById("drawer-close-price");

    if (openEl) openEl.textContent = lastCandle.open.toFixed(2);
    if (highEl) highEl.textContent = lastCandle.high.toFixed(2);
    if (lowEl) lowEl.textContent = lastCandle.low.toFixed(2);
    if (closeEl) closeEl.textContent = lastCandle.close.toFixed(2);

  } catch(e) {}
}

// ============================================
// EXPOSE
// ============================================
window.initChart = initChart;
window.loadCandles = loadCandles;
window.startLivePrice = startLivePrice;
window.stopLivePrice = stopLivePrice;
window.updateTimeLabels = updateTimeLabels;
window.updateCandleCountdown = updateCandleCountdown;
window.convertTimeframe = convertTimeframe;

console.log("===== PART 2 LOADED =====");
// ============================================
// Part 3 of 5: Drawing + Timeframe Switch + UI Toggles
// ============================================

// ============================================
// DRAWING SYSTEM
// ============================================
var drawingCtx = null;

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
    chart.timeScale().subscribeVisibleLogicalRangeChange(function() {
      redrawDrawings();
      updateTimeLabels();
      updateEntryLine();
    });
  } catch(e) {}
}

function resizeDrawingCanvas() {
  if (!drawingCanvas || !chartWrapper) return;
  var rect = chartWrapper.getBoundingClientRect();
  var dpr = window.devicePixelRatio || 1;
  drawingCanvas.width = rect.width * dpr;
  drawingCanvas.height = rect.height * dpr;
  drawingCanvas.style.width = rect.width + "px";
  drawingCanvas.style.height = rect.height + "px";
  if (drawingCtx) drawingCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  redrawDrawings();
}

function getCanvasPoint(event) {
  var rect = drawingCanvas.getBoundingClientRect();
  var clientX, clientY;
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
    var time = chart.timeScale().coordinateToTime(x);
    var price = candleSeries.coordinateToPrice(y);
    if (time === null || price === null) return null;
    return { time: time, price: price, x: x, y: y };
  } catch (e) { return null; }
}

function dataToPixel(time, price) {
  if (!chart || !candleSeries) return null;
  try {
    var x = chart.timeScale().timeToCoordinate(time);
    var y = candleSeries.priceToCoordinate(price);
    if (x === null || y === null) return null;
    return { x: x, y: y };
  } catch (e) { return null; }
}

function handleDrawStart(event) {
  if (currentDrawingTool === "cursor") return;
  event.preventDefault();
  var point = getCanvasPoint(event);
  var data = pixelToData(point.x, point.y);
  if (!data) return;
  isDrawing = true;
  drawStartPoint = data;

  if (currentDrawingTool === "HorizontalLine" || currentDrawingTool === "VerticalLine") {
    saveDrawing({ tool: currentDrawingTool, points: [data] });
    isDrawing = false;
    drawStartPoint = null;
    return;
  }
  if (currentDrawingTool === "TextAnnotation") {
    var text = prompt("Enter text:");
    if (text) saveDrawing({ tool: "TextAnnotation", points: [data], text: text });
    isDrawing = false;
    drawStartPoint = null;
    return;
  }
}

function handleDrawMove(event) {
  if (!isDrawing || !drawStartPoint) return;
  event.preventDefault();
  var point = getCanvasPoint(event);
  var data = pixelToData(point.x, point.y);
  if (!data) return;
  redrawDrawings();
  drawPreview({ tool: currentDrawingTool, points: [drawStartPoint, data] });
}

function handleDrawEnd(event) {
  if (!isDrawing || !drawStartPoint) return;
  event.preventDefault();
  var point = getCanvasPoint(event);
  var data = pixelToData(point.x, point.y);
  if (data && (Math.abs(data.x - drawStartPoint.x) > 5 || Math.abs(data.y - drawStartPoint.y) > 5)) {
    saveDrawing({ tool: currentDrawingTool, points: [drawStartPoint, data] });
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
  drawings.forEach(function(drawing) {
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
  var tool = drawing.tool;
  var points = drawing.points;
  var text = drawing.text;
  if (!points || points.length === 0) return;

  var color = "#2196f3";
  drawingCtx.strokeStyle = color;
  drawingCtx.fillStyle = color;
  drawingCtx.lineWidth = 1.5;
  drawingCtx.font = "12px Arial";
  drawingCtx.textBaseline = "middle";

  if (tool === "HorizontalLine") {
    var p = dataToPixel(points[0].time, points[0].price);
    if (!p) return;
    drawingCtx.beginPath();
    drawingCtx.moveTo(0, p.y);
    drawingCtx.lineTo(drawingCanvas.width, p.y);
    drawingCtx.stroke();
  } else if (tool === "VerticalLine") {
    var p2 = dataToPixel(points[0].time, points[0].price);
    if (!p2) return;
    drawingCtx.beginPath();
    drawingCtx.moveTo(p2.x, 0);
    drawingCtx.lineTo(p2.x, drawingCanvas.height);
    drawingCtx.stroke();
  } else if (tool === "TextAnnotation") {
    var p3 = dataToPixel(points[0].time, points[0].price);
    if (!p3) return;
    drawingCtx.fillStyle = "#fff";
    drawingCtx.font = "bold 13px Arial";
    drawingCtx.fillText(text || "", p3.x, p3.y);
  } else if (points.length >= 2) {
    var p1 = dataToPixel(points[0].time, points[0].price);
    var p22 = dataToPixel(points[1].time, points[1].price);
    if (!p1 || !p22) return;
    if (tool === "TrendLine") {
      drawingCtx.beginPath();
      drawingCtx.moveTo(p1.x, p1.y);
      drawingCtx.lineTo(p22.x, p22.y);
      drawingCtx.stroke();
    } else if (tool === "Rectangle") {
      drawingCtx.strokeRect(p1.x, p1.y, p22.x - p1.x, p22.y - p1.y);
    } else if (tool === "FibRetracement") {
      drawFibonacci(p1, p22);
    }
  }
}

function drawFibonacci(p1, p2) {
  var levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  var colors = ["#6b7a90", "#ff5252", "#ffb300", "#00c853", "#2196f3", "#9c27b0", "#6b7a90"];
  var height = p2.y - p1.y;
  var leftX = Math.min(p1.x, p2.x);
  var rightX = Math.max(p1.x, p2.x);
  levels.forEach(function(level, i) {
    var y = p1.y + height * level;
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
// DRAWING TOOL BUTTONS
// ============================================
document.querySelectorAll(".qx-tool-btn").forEach(function(btn) {
  btn.addEventListener("click", function() {
    var tool = btn.dataset.tool;
    if (tool === "Eraser") {
      clearAllDrawings();
      return;
    }
    document.querySelectorAll(".qx-tool-btn").forEach(function(b) {
      b.classList.remove("active");
    });
    btn.classList.add("active");
    currentDrawingTool = tool;
    if (drawingCanvas) {
      if (tool === "cursor") drawingCanvas.classList.remove("active");
      else drawingCanvas.classList.add("active");
    }
  });
});

// ============================================
// DRAWER TOGGLE
// ============================================
(function initDrawer() {
  var toggleBtn = document.getElementById("drawer-toggle");
  var drawer = document.getElementById("qx-drawer");
  var overlay = document.getElementById("drawer-overlay");
  var closeBtn = document.getElementById("drawer-close");

  if (!drawer) return;

  function openDrawer() {
    drawer.classList.remove("hidden");
    if (overlay) overlay.classList.remove("hidden");
    updateCandleCountdown();
  }

  function closeDrawer() {
    drawer.classList.add("hidden");
    if (overlay) overlay.classList.add("hidden");
  }

  if (toggleBtn) toggleBtn.addEventListener("click", openDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  if (overlay) overlay.addEventListener("click", closeDrawer);

  console.log("[Drawer] Initialized");
})();

// ============================================
// DRAWING PANEL TOGGLE
// ============================================
(function initDrawingPanel() {
  var toggleBtn = document.getElementById("drawing-toggle");
  var panel = document.getElementById("drawing-panel");
  var overlay = document.getElementById("drawing-overlay");
  var closeBtn = document.getElementById("drawing-panel-close");

  if (!panel) return;

  function openPanel() {
    panel.classList.remove("hidden");
    if (overlay) overlay.classList.remove("hidden");
  }

  function closePanel() {
    panel.classList.add("hidden");
    if (overlay) overlay.classList.add("hidden");
  }

  if (toggleBtn) toggleBtn.addEventListener("click", openPanel);
  if (closeBtn) closeBtn.addEventListener("click", closePanel);
  if (overlay) overlay.addEventListener("click", closePanel);

  console.log("[DrawingPanel] Initialized");
})();

// ============================================
// TIMEFRAME MODAL TOGGLE
// ============================================
(function initTimeframeModal() {
  var badge = document.getElementById("tf-badge");
  var modal = document.getElementById("tf-modal");
  var overlay = document.getElementById("tf-overlay");
  var closeBtn = document.getElementById("tf-close");
  var activeLabel = document.getElementById("qx-tf-active");

  if (!modal) return;

  function openModal() {
    modal.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  if (badge) badge.addEventListener("click", openModal);
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (overlay) overlay.addEventListener("click", closeModal);

  // Timeframe items
  modal.querySelectorAll(".qx-tf-item").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      modal.querySelectorAll(".qx-tf-item").forEach(function(b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      var tf = btn.dataset.tf;
      selectedTimeframe = tf;
      if (activeLabel) activeLabel.textContent = tf;
      closeModal();
      console.log("[TF] Changed to:", tf);
      if (typeof loadCandles === "function") await loadCandles();
      if (typeof startLivePrice === "function" && currentUser) startLivePrice();
    });
  });

  console.log("[TimeframeModal] Initialized");
})();

// ============================================
// BOTTOM NAV
// ============================================
(function initBottomNav() {
  var navBtns = document.querySelectorAll(".qx-nav-btn");
  navBtns.forEach(function(btn) {
    btn.addEventListener("click", function(e) {
      e.preventDefault();
      var nav = btn.dataset.nav;
      navBtns.forEach(function(b) { b.classList.remove("active"); });
      btn.classList.add("active");

      if (nav === "tournament") {
        var tp = document.getElementById("tournament-popup");
        if (tp) tp.classList.remove("hidden");
      } else if (nav === "help") {
        openUserChat();
      } else if (nav === "more") {
        var mm = document.getElementById("more-menu");
        if (mm) mm.classList.remove("hidden");
      } else if (nav === "chart") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (nav === "profile") {
        var ap = document.getElementById("account-popup");
        if (ap) ap.classList.remove("hidden");
      }
    });
  });
  console.log("[BottomNav] Initialized");
})();

// ============================================
// CHART MENU BUTTON (open drawer as well)
// ============================================
(function initChartMenuBtn() {
  var btn = document.getElementById("chart-menu-btn");
  if (!btn) return;
  btn.addEventListener("click", function() {
    var drawer = document.getElementById("qx-drawer");
    var overlay = document.getElementById("drawer-overlay");
    if (drawer) drawer.classList.remove("hidden");
    if (overlay) overlay.classList.remove("hidden");
    updateCandleCountdown();
  });
})();

// ============================================
// EXPOSE
// ============================================
window.initDrawingSystem = initDrawingSystem;
window.resizeDrawingCanvas = resizeDrawingCanvas;
window.redrawDrawings = redrawDrawings;
window.clearAllDrawings = clearAllDrawings;

console.log("===== PART 3 LOADED =====");
// ============================================
// Part 4 of 5: Trade Logic + Entry Line + P/L + Trades
// ============================================

// ============================================
// ENTRY LINE (Quotex-style dashed horizontal + timer + label)
// ============================================
window.__activeEntryData = null;

window.__activePriceLine = null;

function updateEntryLine() {
  // Quotex design: no full-width line, no timer on line
  // This function is kept for compatibility but does nothing
  return;
}

function renderEntryLine(type, entryPrice, expiresAt) {
  // Quotex design: no full-width line, only candle mark
  // This function is kept for compatibility but does nothing
  return;
}

function clearEntryLine() {
  window.__activeEntryData = null;
  if (window.__activePriceLine) {
    try { window.candleSeries.removePriceLine(window.__activePriceLine); } catch(e) {}
    window.__activePriceLine = null;
  }
  var container = document.getElementById("qx-entry-line-container");
  if (container) container.innerHTML = "";
}

// ============================================
// VERTICAL DOTTED LINES (trade start/end)
// ============================================
window.__activeVLines = null;

function renderVerticalLines(startTime, endTime) {
  window.__activeVLines = {
    startTime: startTime,
    endTime: endTime
  };
  refreshVerticalLines();
}

function refreshVerticalLines() {
  try {
    if (!window.__activeVLines) return;
    if (!window.chartRef) return;

    var container = document.getElementById("qx-vline-container");
    if (!container) return;
    container.innerHTML = "";

    var startSec = Math.floor(new Date(window.__activeVLines.startTime).getTime() / 1000);
    var endSec = Math.floor(window.__activeVLines.endTime / 1000);

    var startX = window.chartRef.timeScale().timeToCoordinate(startSec);
    var endX = window.chartRef.timeScale().timeToCoordinate(endSec);

    if (startX !== null && startX !== undefined) {
      var vStart = document.createElement("div");
      vStart.className = "qx-vline start";
      vStart.style.left = startX + "px";
      container.appendChild(vStart);

      var labelStart = document.createElement("div");
      labelStart.className = "qx-vline-label";
      labelStart.style.left = startX + "px";
      labelStart.textContent = "Beginning of trade";
      container.appendChild(labelStart);
    }

    if (endX !== null && endX !== undefined) {
      var vEnd = document.createElement("div");
      vEnd.className = "qx-vline end";
      vEnd.style.left = endX + "px";
      container.appendChild(vEnd);

      var labelEnd = document.createElement("div");
      labelEnd.className = "qx-vline-label";
      labelEnd.style.left = endX + "px";
      labelEnd.textContent = "End of trade";
      container.appendChild(labelEnd);
    }
  } catch(e) {
    console.error("[VLine] error:", String(e), e.message);
  }
}

function clearVerticalLines() {
  window.__activeVLines = null;
  var container = document.getElementById("qx-vline-container");
  if (container) container.innerHTML = "";
}

window.refreshVerticalLines = refreshVerticalLines;

// ============================================
// FIX 1: TICK MARK (Quotex-style — candle er nice/upore)
// ============================================
function renderTickMark(type, entryPrice, entryTime) {
  // Trigger full re-render of all markers
  renderAllMarkers();
}
// ============================================
// RENDER ALL MARKERS — HTML Overlay (Quotex style)
// ============================================
window.__entryPriceLines = [];

function renderAllMarkers() {
  try {
    var container = document.getElementById("qx-tick-container");
    if (!container) return;

    // Clear old HTML markers
    container.innerHTML = "";

    // Clear old native markers
    if (window.candleSeries && window.candleSeries.setMarkers) {
      window.candleSeries.setMarkers([]);
    }

    // Clear old native price lines
    if (window.__entryPriceLines && window.__entryPriceLines.length > 0) {
      window.__entryPriceLines.forEach(function(pl) {
        try {
          window.candleSeries.removePriceLine(pl);
        } catch(e) {}
      });
    }
    window.__entryPriceLines = [];

    // Get active trades
    var trades = window.activeTradesLocal || [];
    if (trades.length === 0) {
      console.log("[Marker] No active trades");
      return;
    }

    // Get candle data
    if (!window.chartRef || !window.candleSeries) return;
    var candleData = window.candleSeries.data();
    if (!candleData || candleData.length === 0) return;

    // ===== For each pending trade =====
    trades.forEach(function(trade) {
      if (trade.status !== "pending") return;
      if (!trade.entryTime || !trade.entryPrice) return;

      var entrySec = Math.floor(new Date(trade.entryTime).getTime() / 1000);

      // Find closest candle
      var closestCandleTime = null;
      var minDiff = Infinity;
      for (var i = 0; i < candleData.length; i++) {
        var diff = Math.abs(candleData[i].time - entrySec);
        if (diff < minDiff) {
          minDiff = diff;
          closestCandleTime = candleData[i].time;
        }
      }
      if (closestCandleTime === null) return;

      // Get coordinates
      var xPos = window.chartRef.timeScale().timeToCoordinate(closestCandleTime);
      var yPos = window.candleSeries.priceToCoordinate(trade.entryPrice);

      if (xPos === null || yPos === null || xPos === undefined || yPos === undefined) {
        console.warn("[Marker] coords null for trade", trade.id);
        return;
      }

      var isCall = trade.type === "call";
      var color = isCall ? "#00c853" : "#ff5252";

      // ===== 1. Short horizontal line (30px, candle width) =====
      var lineWidth = 30;
      var lineLeft = xPos - 15;

      var line = document.createElement("div");
      line.className = "qx-entry-mark " + trade.type;
      line.style.cssText =
        "position:absolute;" +
        "left:" + lineLeft + "px;" +
        "top:" + (yPos - 1.5) + "px;" +
        "width:" + lineWidth + "px;" +
        "height:3px;" +
        "background:" + color + ";" +
        "border-radius:2px;" +
        "box-shadow:0 0 6px " + color + ";" +
        "z-index:40;" +
        "pointer-events:none;";
      container.appendChild(line);

      // ===== 2. Tick mark at right end =====
      var tickSize = 12;
      var tick = document.createElement("div");
      tick.className = "qx-entry-tick " + trade.type;
      tick.style.cssText =
        "position:absolute;" +
        "left:" + (xPos + 15 - tickSize/2) + "px;" +
        "top:" + (yPos - tickSize/2) + "px;" +
        "width:" + tickSize + "px;" +
        "height:" + tickSize + "px;" +
        "border-radius:50%;" +
        "background:" + color + ";" +
        "border:2px solid #ffffff;" +
        "box-shadow:0 0 8px " + color + ";" +
        "color:#ffffff;" +
        "font-size:8px;" +
        "font-weight:900;" +
        "text-align:center;" +
        "line-height:" + (tickSize-4) + "px;" +
        "font-family:Inter, sans-serif;" +
        "z-index:41;" +
        "pointer-events:none;";
      tick.textContent = "\u2713";
      container.appendChild(tick);

    });

    console.log("[Marker] ✅ Rendered " + trades.length + " HTML markers");
  } catch(e) {
    console.error("[Marker] renderAllMarkers error:", String(e));
  }
}

// ============================================
// CLEAR ALL MARKERS
// ============================================
function clearTickMark() {
  try {
    if (window.candleSeries && window.candleSeries.setMarkers) {
      window.candleSeries.setMarkers([]);
    }
    if (window.__entryPriceLines && window.__entryPriceLines.length > 0) {
      window.__entryPriceLines.forEach(function(pl) {
        try {
          window.candleSeries.removePriceLine(pl);
        } catch(e) {}
      });
    }
    window.__entryPriceLines = [];
    var container = document.getElementById("qx-tick-container");
    if (container) container.innerHTML = "";
  } catch(e) {
    console.error("[Marker] clear error:", String(e));
  }
}
// ============================================
// PLACE TRADE
// ============================================
async function placeTrade(type) {
  if (!currentUser) return;
  var now = Date.now();
  if (now - lastTradeTime < 500) return;
  lastTradeTime = now;

  var amountInput = document.getElementById("trade-amount");
  var amount = amountInput ? parseFloat(amountInput.value) : 1;

  function showMsg(text, color) {
    try {
      var msgEl = document.getElementById("trade-message");
      if (msgEl) {
        msgEl.style.color = color || "#ff5252";
        msgEl.textContent = text;
      }
    } catch(e) {}
  }

  if (!amount || amount < 1) { showMsg("Minimum $1 required"); return; }
  if (amount > userBalance) { showMsg("Insufficient balance"); return; }

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
    safeSetTextById("balance", userBalance.toFixed(2));

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

    showMsg(type.toUpperCase() + " $" + amount + " placed",
      type === "call" ? "#00c853" : "#ff5252");

    // ===== Render all markers =====
    renderEntryLine(type, entryPrice, expiresAt);
    renderVerticalLines(entryTime, expiresAt);
    renderTickMark(type, entryPrice, entryTime);

    setTimeout(function() {
      var tm = document.getElementById("trade-message");
      if (tm) tm.textContent = "";
    }, 2000);

    console.log("[Trade] Placed:", type, "$" + amount, "@ $" + entryPrice.toFixed(2));
  } catch (error) {
    showMsg(error.message);
    console.error("[Trade] Error:", error);
  }
}

// ============================================
// BIND TRADE BUTTONS
// ============================================
function bindTradeButtons() {
  var callBtnEl = document.getElementById("call-btn");
  var putBtnEl = document.getElementById("put-btn");

  if (callBtnEl && callBtnEl.dataset.bound !== "1") {
    callBtnEl.dataset.bound = "1";
    callBtnEl.addEventListener("click", function(e) {
      e.preventDefault();
      console.log("[Trade] CALL clicked");
      placeTrade("call");
    });
  }
  if (putBtnEl && putBtnEl.dataset.bound !== "1") {
    putBtnEl.dataset.bound = "1";
    putBtnEl.addEventListener("click", function(e) {
      e.preventDefault();
      console.log("[Trade] PUT clicked");
      placeTrade("put");
    });
  }
}

bindTradeButtons();
setTimeout(bindTradeButtons, 1500);

// ============================================
// CHECK EXPIRED TRADES
// ============================================
async function checkExpiredTrades() {
  if (!currentUser) return;
  var now = Date.now();

  for (var i = 0; i < activeTradesLocal.length; i++) {
    var trade = activeTradesLocal[i];
    if (trade.expiresAt <= now && trade.status === "pending") {
      var exitPrice = currentPrice;
      var entryPrice = trade.entryPrice;
      var result = "loss";
      if (trade.type === "call" && exitPrice > entryPrice) result = "win";
      else if (trade.type === "put" && exitPrice < entryPrice) result = "win";

      var payout = 1.85;
      var profit = result === "win" ? trade.amount * payout : 0;

      try {
        await updateDoc(doc(db, "trades", trade.id), {
          status: "completed",
          result: result,
          exitPrice: exitPrice,
          profit: profit,
          completedAt: new Date().toISOString()
        });

        // Clear entry line + vertical lines
        clearEntryLine();
        clearVerticalLines();
        // Force re-render markers (other trades may still be pending)
        window.__lastPendingCount = -1;

        if (result === "win") {
          var userDoc = await getDoc(doc(db, "users", currentUser.uid));
          var currentBal = userDoc.data().balance || 0;
          var newBal = currentBal + profit;
          var balanceField = accountType === "demo" ? "demoBalance" : "realBalance";

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
          if (tm1) { tm1.style.color = "#00c853"; tm1.textContent = "WIN +$" + profit.toFixed(2); }
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
      } catch (error) {
        console.error("Trade expire error:", error);
      }
    }
  }
}

// ============================================
// UPDATE BIG TIMER
// ============================================
function updateBigTimer() {
  var timerEl = document.getElementById("trade-timer-display");
  var topTimer = document.getElementById("countdown-time");

  if (activeTradesLocal.length === 0) {
    var time = selectedTime || 60;
    var mm = Math.floor(time / 60);
    var ss = time % 60;
    var str = String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
    if (timerEl) timerEl.textContent = str;
    if (bigTimer) bigTimer.classList.add("hidden");
    if (topTimer) topTimer.textContent = str;
    return;
  }

  var soonest = activeTradesLocal[0].expiresAt;
  for (var i = 1; i < activeTradesLocal.length; i++) {
    if (activeTradesLocal[i].expiresAt < soonest) soonest = activeTradesLocal[i].expiresAt;
  }

  var remaining = Math.max(0, Math.ceil((soonest - Date.now()) / 1000));
  var m = Math.floor(remaining / 60);
  var s = remaining % 60;
  var timerStr = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");

  if (timerEl) timerEl.textContent = timerStr;
  if (topTimer) topTimer.textContent = timerStr;

  // Show top countdown
  var topTimerWrap = document.getElementById("top-countdown-timer");
  if (topTimerWrap) topTimerWrap.classList.remove("hidden");

  // Update entry line timer
  updateEntryLine();
}

// ============================================
// LOAD ACTIVE TRADES
// ============================================
function loadActiveTrades() {
  if (!currentUser) return;
  var q = query(
    collection(db, "trades"),
    where("userId", "==", currentUser.uid),
    where("status", "==", "pending")
  );

  if (activeTradesUnsub) {
    try { activeTradesUnsub(); } catch(e) {}
  }

  activeTradesUnsub = onSnapshot(q, function(snapshot) {
    activeTradesLocal = [];
    window.activeTradesLocal = activeTradesLocal;

    if (activeTradesList) activeTradesList.innerHTML = "";

    if (snapshot.empty) {
      if (activeTradesList) activeTradesList.innerHTML = '<p class="qx-empty">No active trades</p>';
      if (activeCount) activeCount.textContent = "0";
      var badge = document.getElementById("trades-count-badge");
      if (badge) badge.textContent = "0";
      return;
    }

    snapshot.forEach(function(docSnap) {
      var trade = Object.assign({ id: docSnap.id }, docSnap.data());
      activeTradesLocal.push(trade);

      var card = document.createElement("div");
      card.className = "qx-trade-card";
      var remaining = Math.max(0, Math.ceil((trade.expiresAt - Date.now()) / 1000));
      var m = Math.floor(remaining / 60);
      var s = remaining % 60;
      var timerStr = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");

      card.innerHTML =
        '<div class="qx-tc-left">' +
          '<div class="qx-tc-symbol">' + (trade.asset || "BTC/USDT") +
            '<span class="qx-tc-type-badge ' + trade.type + '">' + trade.type.toUpperCase() + '</span>' +
          '</div>' +
          '<div class="qx-tc-time">Entry: $' + Number(trade.entryPrice).toFixed(2) + '</div>' +
        '</div>' +
        '<div class="qx-tc-right">' +
          '<div class="qx-tc-timer" data-expires="' + trade.expiresAt + '">' + timerStr + '</div>' +
          '<div class="qx-tc-amount">$' + Number(trade.amount).toFixed(2) + '</div>' +
        '</div>';

      if (activeTradesList) activeTradesList.appendChild(card);
    });

    window.activeTradesLocal = activeTradesLocal;
    if (activeCount) activeCount.textContent = activeTradesLocal.length;
    var badge2 = document.getElementById("trades-count-badge");
    if (badge2) badge2.textContent = activeTradesLocal.length;

    // Render markers for latest trade
    var latest = activeTradesLocal[activeTradesLocal.length - 1];
    if (latest && latest.status === "pending") {
      renderEntryLine(latest.type, latest.entryPrice, latest.expiresAt);
      renderVerticalLines(latest.entryTime, latest.expiresAt);
      renderTickMark(latest.type, latest.entryPrice, latest.entryTime);
    }

    updateBigTimer();
  });
}

// ============================================
// LOAD HISTORY
// ============================================
function loadHistory() {
  if (!currentUser) return;
  var q = query(
    collection(db, "trades"),
    where("userId", "==", currentUser.uid),
    where("status", "==", "completed")
  );

  if (historyUnsub) {
    try { historyUnsub(); } catch(e) {}
  }

  historyUnsub = onSnapshot(q, function(snapshot) {
    if (historyList) historyList.innerHTML = "";
    var drawerHistory = document.getElementById("drawer-history");
    if (drawerHistory) drawerHistory.innerHTML = "";

    if (snapshot.empty) {
      if (historyList) historyList.innerHTML = '<p class="qx-empty">No trade history yet</p>';
      if (drawerHistory) drawerHistory.innerHTML = '<p class="qx-empty">No trades yet</p>';
      return;
    }

    var trades = [];
    snapshot.forEach(function(docSnap) {
      trades.push(Object.assign({ id: docSnap.id }, docSnap.data()));
    });
    trades.sort(function(a, b) {
      return new Date(b.completedAt || 0) - new Date(a.completedAt || 0);
    });

    // Main list (30)
    trades.slice(0, 30).forEach(function(trade) {
      var card = document.createElement("div");
      card.className = "qx-trade-card " + (trade.result || "");
      var entryPrice = Number(trade.entryPrice || 0).toFixed(2);
      var pl = trade.result === "win"
        ? "+$" + Number(trade.profit || 0).toFixed(2)
        : "-$" + Number(trade.amount || 0).toFixed(2);

      card.innerHTML =
        '<div class="qx-tc-left">' +
          '<div class="qx-tc-symbol">' + (trade.asset || "BTC/USDT") +
            '<span class="qx-tc-type-badge ' + trade.type + '">' + trade.type.toUpperCase() + '</span>' +
          '</div>' +
          '<div class="qx-tc-time">Entry: $' + entryPrice + '</div>' +
        '</div>' +
        '<div class="qx-tc-right">' +
          '<div class="qx-tc-pl ' + trade.result + '">' + pl + '</div>' +
        '</div>';

      if (historyList) historyList.appendChild(card);
    });

    // Drawer history (10)
    if (drawerHistory) {
      trades.slice(0, 10).forEach(function(trade) {
        var item = document.createElement("div");
        item.className = "qx-dh-item";
        var d = new Date(trade.completedAt || trade.createdAt || Date.now());
        var hh = String(d.getHours()).padStart(2, "0");
        var mm = String(d.getMinutes()).padStart(2, "0");
        var pl = trade.result === "win"
          ? "+$" + Number(trade.profit || 0).toFixed(2)
          : "-$" + Number(trade.amount || 0).toFixed(2);

        item.innerHTML =
          '<div class="qx-dh-left">' +
            '<div class="qx-dh-type ' + trade.type + '">' + trade.type.toUpperCase() + '</div>' +
            '<div class="qx-dh-time">' + hh + ":" + mm + '</div>' +
          '</div>' +
          '<div class="qx-dh-pl ' + trade.result + '">' + pl + '</div>';
        drawerHistory.appendChild(item);
      });
    }
  });
}

// ============================================
// UPDATE LOOP (every 1s)
// ============================================
setInterval(function() {
  if (currentUser && activeTradesLocal.length > 0) {
    updateBigTimer();
    updateEntryLine();
    updateCandleCountdown();
  }

  // Update trade card timers
  var timers = document.querySelectorAll(".qx-tc-timer[data-expires]");
  timers.forEach(function(el) {
    var expires = parseInt(el.dataset.expires);
    var remaining = Math.max(0, Math.ceil((expires - Date.now()) / 1000));
    var m = Math.floor(remaining / 60);
    var s = remaining % 60;
    el.textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  });

  // Update candle countdown always
  if (currentUser) updateCandleCountdown();
}, 1000);

// ============================================
// EXPOSE
// ============================================
window.placeTrade = placeTrade;
window.bindTradeButtons = bindTradeButtons;
window.updateBigTimer = updateBigTimer;
window.loadActiveTrades = loadActiveTrades;
window.loadHistory = loadHistory;
window.checkExpiredTrades = checkExpiredTrades;
window.renderEntryLine = renderEntryLine;
window.updateEntryLine = updateEntryLine;
window.clearEntryLine = clearEntryLine;
window.renderVerticalLines = renderVerticalLines;
window.clearVerticalLines = clearVerticalLines;
window.renderTickMark = renderTickMark;
window.clearTickMark = clearTickMark;

console.log("===== PART 4 LOADED =====");
// ============================================
// Part 5 of 5: Popups + Chat + More Menu + Final
// ============================================

// ============================================
// POPUP HELPERS
// ============================================
function openPopup(popup, overlay) {
  if (!popup) return;
  popup.classList.remove("hidden");
  if (overlay) overlay.onclick = function() { closePopup(popup); };
}

function closePopup(popup) {
  if (!popup) return;
  popup.classList.add("hidden");
}

// ============================================
// BALANCE CHIP → OPEN BALANCE POPUP
// ============================================
(function initBalanceChip() {
  var chip = document.getElementById("balance-chip");
  if (!chip) return;
  chip.addEventListener("click", function(e) {
    e.preventDefault();
    refreshBalanceDisplays();
    updateAccountOptionState();
    var popup = document.getElementById("balance-popup");
    var overlay = document.getElementById("balance-popup-overlay");
    if (popup) openPopup(popup, overlay);
  });
})();

function refreshBalanceDisplays() {
  var demoDisplay = document.getElementById("demo-balance-display");
  var realDisplay = document.getElementById("real-balance-display");
  if (!currentUser) return;

  getDoc(doc(db, "users", currentUser.uid)).then(function(userDoc) {
    if (userDoc.exists()) {
      var data = userDoc.data();
      var demoBal = data.demoBalance ?? data.balance ?? 1000;
      var realBal = data.realBalance ?? 0;
      if (demoDisplay) demoDisplay.textContent = Number(demoBal).toFixed(2);
      if (realDisplay) realDisplay.textContent = Number(realBal).toFixed(2);
    }
  }).catch(function(e) { console.error("[QX-BAL]", e); });
}

function updateAccountOptionState() {
  document.querySelectorAll(".qx-acc-option").forEach(function(opt) {
    var type = opt.dataset.accType;
    opt.classList.toggle("active", type === accountType);
  });
}

// ============================================
// BALANCE POPUP — QUOTEX STYLE
// ============================================
(function initQuotexBalancePopup() {
  // Account option click (switch account)
  document.querySelectorAll(".qx-acc-option").forEach(function(opt) {
    opt.addEventListener("click", function(e) {
      if (e.target.closest(".qx-acc-edit")) return;
      var type = opt.dataset.accType;
      if (typeof switchAccount === "function") switchAccount(type);
      updateAccountOptionState();
    });
  });

  // Edit button (demo only)
  document.querySelectorAll(".qx-acc-edit").forEach(function(btn) {
    btn.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      var type = btn.dataset.edit;
      if (type !== "demo") return;

      var editBox = document.getElementById("qx-balance-edit-box");
      var editInput = document.getElementById("qx-balance-edit-input");
      if (!editBox || !editInput) return;

      editBox.classList.remove("hidden");

      if (currentUser) {
        getDoc(doc(db, "users", currentUser.uid)).then(function(userDoc) {
          if (userDoc.exists()) {
            var data = userDoc.data();
            var currentVal = data.demoBalance ?? data.balance ?? 1000;
            editInput.value = Number(currentVal).toFixed(2);
            setTimeout(function() { editInput.focus(); }, 100);
          }
        });
      }
    });
  });

  // Cancel edit
  var cancelBtn = document.getElementById("qx-balance-edit-cancel");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function() {
      var editBox = document.getElementById("qx-balance-edit-box");
      if (editBox) editBox.classList.add("hidden");
    });
  }

  // Save edit
  var saveBtn = document.getElementById("qx-balance-edit-save");
  if (saveBtn) {
    saveBtn.addEventListener("click", async function() {
      var editBox = document.getElementById("qx-balance-edit-box");
      var editInput = document.getElementById("qx-balance-edit-input");
      if (!editBox || !editInput || !currentUser) return;

      var newVal = parseFloat(editInput.value);
      if (isNaN(newVal) || newVal < 0) {
        alert("Enter a valid amount");
        return;
      }

      try {
        await updateDoc(doc(db, "users", currentUser.uid), {
          demoBalance: newVal
        });
        if (accountType === "demo") {
          userBalance = newVal;
          window.userBalance = newVal;
          safeSetTextById("balance", userBalance.toFixed(2));
        }
        refreshBalanceDisplays();
        editBox.classList.add("hidden");
        console.log("[QX-BAL] Saved:", newVal);
      } catch(err) {
        alert("Failed: " + err.message);
      }
    });
  }

  // Close / overlay
  var popup = document.getElementById("balance-popup");
  var closeBtn = document.getElementById("balance-popup-close");
  var overlay = document.getElementById("balance-popup-overlay");

  if (closeBtn && popup) {
    closeBtn.addEventListener("click", function() {
      popup.classList.add("hidden");
    });
  }
  if (overlay && popup) {
    overlay.addEventListener("click", function() {
      popup.classList.add("hidden");
    });
  }

  // Deposit / Withdraw buttons from popup
  var depBtn = document.getElementById("balance-popup-deposit");
  var wdBtn = document.getElementById("balance-popup-withdraw");
  if (depBtn && popup) {
    depBtn.addEventListener("click", function() {
      popup.classList.add("hidden");
      var dp = document.getElementById("deposit-popup");
      var dv = document.getElementById("deposit-popup-overlay");
      if (dp) openPopup(dp, dv);
    });
  }
  if (wdBtn && popup) {
    wdBtn.addEventListener("click", function() {
      popup.classList.add("hidden");
      var wp = document.getElementById("withdraw-popup");
      var wv = document.getElementById("withdraw-popup-overlay");
      if (wp) openPopup(wp, wv);
    });
  }

  console.log("[QX-BAL] Ready");
})();

// ============================================
// SWITCH ACCOUNT
// ============================================
async function switchAccount(type) {
  accountType = type;
  document.querySelectorAll(".acc-btn-popup").forEach(function(b) {
    b.classList.toggle("active", b.dataset.acc === type);
  });
  if (!currentUser) return;

  try {
    var userRef = doc(db, "users", currentUser.uid);
    var userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      var data = userDoc.data();
      userBalance = type === "demo" ? (data.demoBalance ?? 1000) : (data.realBalance ?? 0);
      window.userBalance = userBalance;
      safeSetTextById("balance", userBalance.toFixed(2));
    }
    await updateDoc(userRef, { accountType: type });
    var badge = document.getElementById("qx-account-type");
    if (badge) badge.textContent = type === "demo" ? "DEMO" : "LIVE";
  } catch (err) { console.error("Switch account error:", err); }

  var ap = document.getElementById("account-popup");
  if (ap) ap.classList.add("hidden");
}

// ============================================
// ACCOUNT POPUP
// ============================================
(function initAccountPopup() {
  var closeBtn = document.getElementById("account-popup-close");
  var overlay = document.getElementById("account-popup-overlay");
  var popup = document.getElementById("account-popup");

  if (closeBtn && popup) {
    closeBtn.addEventListener("click", function() { popup.classList.add("hidden"); });
  }
  if (overlay && popup) {
    overlay.addEventListener("click", function() { popup.classList.add("hidden"); });
  }

  document.querySelectorAll(".acc-btn-popup").forEach(function(btn) {
    btn.addEventListener("click", function() {
      switchAccount(btn.dataset.acc);
    });
  });
})();

// ============================================
// DEPOSIT POPUP
// ============================================
(function initDeposit() {
  var btn = document.getElementById("deposit-btn");
  var closeBtn = document.getElementById("deposit-popup-close");
  var overlay = document.getElementById("deposit-popup-overlay");
  var popup = document.getElementById("deposit-popup");

  if (btn && popup) {
    btn.addEventListener("click", function() {
      openPopup(popup, overlay);
    });
  }
  if (closeBtn && popup) {
    closeBtn.addEventListener("click", function() { popup.classList.add("hidden"); });
  }
  if (overlay && popup) {
    overlay.addEventListener("click", function() { popup.classList.add("hidden"); });
  }

  var submit = document.getElementById("deposit-submit");
  if (submit) {
    submit.addEventListener("click", async function() {
      if (!currentUser) return;
      var amount = parseFloat(document.getElementById("deposit-amount").value);
      var txid = document.getElementById("deposit-txid").value.trim();
      var msg = document.getElementById("deposit-message");

      if (!amount || amount < 1) { msg.style.color = "#ff5252"; msg.textContent = "Minimum $1"; return; }
      if (!txid) { msg.style.color = "#ff5252"; msg.textContent = "Enter TrxID"; return; }

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
        msg.style.color = "#00c853";
        msg.textContent = "Request sent!";
        document.getElementById("deposit-amount").value = "";
        document.getElementById("deposit-txid").value = "";
        setTimeout(function() {
          popup.classList.add("hidden");
          msg.textContent = "";
        }, 1500);
      } catch (err) {
        msg.style.color = "#ff5252";
        msg.textContent = err.message;
      }
    });
  }
})();

// ============================================
// WITHDRAW POPUP
// ============================================
(function initWithdraw() {
  var closeBtn = document.getElementById("withdraw-popup-close");
  var overlay = document.getElementById("withdraw-popup-overlay");
  var popup = document.getElementById("withdraw-popup");

  if (closeBtn && popup) {
    closeBtn.addEventListener("click", function() { popup.classList.add("hidden"); });
  }
  if (overlay && popup) {
    overlay.addEventListener("click", function() { popup.classList.add("hidden"); });
  }

  var submit = document.getElementById("withdraw-submit");
  if (submit) {
    submit.addEventListener("click", async function() {
      if (!currentUser) return;
      var amount = parseFloat(document.getElementById("withdraw-amount").value);
      var method = document.getElementById("withdraw-method").value;
      var number = document.getElementById("withdraw-number").value.trim();
      var msg = document.getElementById("withdraw-message");

      if (!amount || amount < 1) { msg.style.color = "#ff5252"; msg.textContent = "Minimum $1"; return; }
      if (amount > userBalance) { msg.style.color = "#ff5252"; msg.textContent = "Insufficient balance"; return; }
      if (!number) { msg.style.color = "#ff5252"; msg.textContent = "Enter number"; return; }

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
        msg.style.color = "#00c853";
        msg.textContent = "Request sent!";
        document.getElementById("withdraw-amount").value = "";
        document.getElementById("withdraw-number").value = "";
        setTimeout(function() {
          popup.classList.add("hidden");
          msg.textContent = "";
        }, 1500);
      } catch (err) {
        msg.style.color = "#ff5252";
        msg.textContent = err.message;
      }
    });
  }
})();

// ============================================
// NOTIFICATION BELL
// ============================================
(function initNotif() {
  var btn = document.getElementById("notif-btn");
  if (!btn) return;
  btn.addEventListener("click", function() {
    var badge = document.getElementById("notif-badge");
    if (badge) { badge.textContent = "0"; badge.style.display = "none"; }
  });
})();

// ============================================
// BONUS BANNER CLOSE
// ============================================
(function initBonusClose() {
  var closeBtn = document.getElementById("bonus-close");
  var banner = document.getElementById("bonus-banner");
  if (!closeBtn || !banner) return;
  closeBtn.addEventListener("click", function() {
    banner.classList.add("hidden");
    try { localStorage.setItem("bonusBannerClosed", "1"); } catch(e) {}
  });
  try {
    if (localStorage.getItem("bonusBannerClosed") === "1") {
      banner.classList.add("hidden");
    }
  } catch(e) {}
})();

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
        messagesEl.innerHTML = '<p class="qx-empty">Send a message...</p>';
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
  } catch (err) { console.error("[Chat] error:", err.message); }
}

(function initChatSend() {
  var sendBtn = document.getElementById("user-chat-send");
  var input = document.getElementById("user-chat-input");
  var closeBtn = document.getElementById("chat-popup-close");
  var overlay = document.getElementById("chat-popup-overlay");

  if (sendBtn && input) {
    sendBtn.addEventListener("click", async function() {
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
    });
  }

  if (closeBtn) closeBtn.addEventListener("click", closeUserChat);
  if (overlay) overlay.addEventListener("click", closeUserChat);
})();

// ============================================
// MORE MENU
// ============================================
(function initMoreMenu() {
  var closeBtn = document.getElementById("more-menu-close");
  var overlay = document.getElementById("more-menu-overlay");
  var menu = document.getElementById("more-menu");

  function close() {
    if (menu) menu.classList.add("hidden");
  }

  if (closeBtn) closeBtn.addEventListener("click", close);
  if (overlay) overlay.addEventListener("click", close);

  document.querySelectorAll(".qx-more-item").forEach(function(item) {
    item.addEventListener("click", function(e) {
      e.preventDefault();
      var action = item.dataset.menu;
      close();

      if (action === "deposit") {
        var dp = document.getElementById("deposit-popup");
        var dv = document.getElementById("deposit-popup-overlay");
        if (dp) openPopup(dp, dv);
      } else if (action === "withdraw") {
        var wp = document.getElementById("withdraw-popup");
        var wv = document.getElementById("withdraw-popup-overlay");
        if (wp) openPopup(wp, wv);
      } else if (action === "referral") {
        var rp = document.getElementById("referral-popup");
        var rv = document.getElementById("referral-popup-overlay");
        if (rp) openPopup(rp, rv);
      } else if (action === "chat") {
        openUserChat();
      } else if (action === "trades") {
        var ts = document.querySelector(".qx-trades-section");
        if (ts) ts.scrollIntoView({ behavior: "smooth" });
      } else if (action === "logout") {
        signOut(auth);
      }
    });
  });
})();

// ============================================
// TOURNAMENT / REFERRAL POPUP CLOSE
// ============================================
(function initPlaceholderPopups() {
  ["tournament-popup", "referral-popup"].forEach(function(id) {
    var popup = document.getElementById(id);
    if (!popup) return;
    var closeBtn = popup.querySelector(".popup-close");
    var overlay = popup.querySelector(".popup-overlay");
    if (closeBtn) closeBtn.addEventListener("click", function() { popup.classList.add("hidden"); });
    if (overlay) overlay.addEventListener("click", function() { popup.classList.add("hidden"); });
  });
})();

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
// INVESTMENT +/- BUTTONS
// ============================================
(function initInvestmentButtons() {
  document.querySelectorAll(".qx-inc-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var input = document.getElementById("trade-amount");
      if (!input) return;
      var val = parseFloat(input.value) || 0;
      if (btn.dataset.action === "plus") val += 1;
      else val = Math.max(1, val - 1);
      input.value = val;
    });
  });
})();

// ============================================
// PENDING TOGGLE
// ============================================
(function initPendingToggle() {
  var btn = document.getElementById("pending-toggle");
  if (!btn) return;
  btn.addEventListener("click", function() {
    btn.classList.toggle("active");
  });
})();

// ============================================
// ASSET SELECT
// ============================================
(function initAssetSelect() {
  var sel = document.getElementById("asset-select");
  if (!sel) return;
  sel.addEventListener("change", async function() {
    selectedAsset = sel.value;
    window.selectedAsset = sel.value;
    if (typeof loadCandles === "function") await loadCandles();
    if (typeof startLivePrice === "function" && currentUser) startLivePrice();
  });
})();

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
}, 500);

// ============================================
// CHART RESIZE FORCE
// ============================================
setInterval(function() {
  try {
    if (window.chartRef && typeof window.chartRef.applyOptions === "function") {
      var wrap = document.getElementById("chart-wrapper");
      if (wrap && wrap.clientWidth > 0 && wrap.clientHeight > 0) {
        var currentH = 0;
        try {
          var opts = window.chartRef.options();
          currentH = opts.height || 0;
        } catch(e) {}
        if (Math.abs(currentH - wrap.clientHeight) > 5) {
          window.chartRef.applyOptions({
            width: wrap.clientWidth,
            height: wrap.clientHeight
          });
        }
      }
    }
  } catch(e) {}
}, 2000);

// ============================================
// FINAL EXPOSE
// ============================================
window.switchAccount = switchAccount;
window.openUserChat = openUserChat;
window.closeUserChat = closeUserChat;
window.openPopup = openPopup;
window.closePopup = closePopup;

console.log("===== PART 5 LOADED =====");
console.log("===== ALL 5 PARTS LOADED =====");
console.log("Try: window.chartRef, window.candleSeries");
// ============================================
// AUTO REFRESH ALL MARKERS — Every 1.5s
// ============================================
setInterval(function() {
  try {
    if (!window.candleSeries) return;

    var trades = window.activeTradesLocal || [];
    var pendingCount = 0;
    var lastCount = window.__lastPendingCount || 0;

    for (var i = 0; i < trades.length; i++) {
      if (trades[i].status === "pending") pendingCount++;
    }

    if (pendingCount !== lastCount || pendingCount > 0) {
      window.__lastPendingCount = pendingCount;
      renderAllMarkers();
    }

    if (pendingCount === 0 && lastCount > 0) {
      window.__lastPendingCount = 0;
      clearTickMark();
    }
  } catch(e) {
    console.error("[AutoMarker] error:", String(e));
  }
}, 1500);

console.log("===== AUTO MARKER LOADED =====");

// ============================================================
// STEP 2A: FIRESTORE CANDLE CONSUMER
// User app reads candles from admin's Firestore data
// (Binance will be removed in Step 2C)
// ============================================================

// ============================================================
// FS1. STATE
// ============================================================

window.fsCandleState = {
  listening: false,
  marketId: null,
  unsubLive: null,        // liveCandles listener
  unsubMarket: null,      // market doc listener (for currentPrice)
  candles: [],            // accumulated candle history
  lastCandleTime: 0,      // for dedup
  lastPrice: 0
};

console.log('[FS] Step 2A loaded');

// ============================================================
// FS2. START LISTENER FOR A MARKET
// ============================================================

window.startFirestoreCandleListener = function(marketId) {
  if (!marketId) {
    console.warn('[FS] No marketId provided');
    return;
  }

  var state = window.fsCandleState;

  // Cleanup previous
  if (state.unsubLive) { try { state.unsubLive(); } catch(e) {} state.unsubLive = null; }
  if (state.unsubMarket) { try { state.unsubMarket(); } catch(e) {} state.unsubMarket = null; }

  state.marketId = marketId;
  state.listening = true;
  state.candles = [];
  state.lastCandleTime = 0;
  state.lastPrice = 0;

  console.log('[FS] Starting listener for market:', marketId);

  // ===== Listener 1: Market doc (current price) =====
  try {
    var marketRef = window.doc(window.db, 'markets', marketId);
    state.unsubMarket = window.onSnapshot(marketRef, function(snap) {
      if (!snap.exists()) return;
      var data = snap.data();
      if (data.currentPrice) {
        state.lastPrice = data.currentPrice;
        updateUserPriceDisplay(data.currentPrice);
      }
    });
  } catch (err) {
    console.error('[FS] Market listener error:', err.message);
  }

  // ===== Listener 2: liveCandles sub-collection =====
  try {
    var liveRef = window.collection(window.db, 'markets', marketId, 'liveCandles');
    state.unsubLive = window.onSnapshot(liveRef, function(snap) {
      if (snap.empty) {
        console.log('[FS] No live candles yet — waiting for Auto-Runner');
        return;
      }

      // Collect candles
      var all = [];
      snap.forEach(function(d) {
        all.push(d.data());
      });

      // Sort by startTime
      all.sort(function(a, b) {
        return (a.startTime || 0) - (b.startTime || 0);
      });

      // Take last 100
      var recent = all.slice(-100);

      // Process each candle
      var newCandle = null;
      recent.forEach(function(c) {
        if (c.startTime && c.startTime > state.lastCandleTime) {
          state.lastCandleTime = c.startTime;
          newCandle = c;
        }
      });

      // Update chart
      if (newCandle) {
        updateUserChart(all);
        console.log('[FS] Update chart with', all.length, 'candles');
      }
    });
  } catch (err) {
    console.error('[FS] LiveCandles listener error:', err.message);
  }
};

// ============================================================
// FS3. STOP LISTENER
// ============================================================

window.stopFirestoreCandleListener = function() {
  var state = window.fsCandleState;
  if (state.unsubLive) { try { state.unsubLive(); } catch(e) {} state.unsubLive = null; }
  if (state.unsubMarket) { try { state.unsubMarket(); } catch(e) {} state.unsubMarket = null; }
  state.listening = false;
  state.marketId = null;
  console.log('[FS] Listeners stopped');
};

// ============================================================
// FS4. UPDATE USER PRICE DISPLAY
// ============================================================

function updateUserPriceDisplay(price) {
  try {
    var priceEl = document.getElementById('current-price');
    if (priceEl) {
      priceEl.textContent = Number(price).toFixed(2);
      priceEl.style.color = '#e6edf3';
    }
    window.currentPrice = price;
  } catch(e) {}
}

// ============================================================
// FS5. UPDATE USER CHART (delegates to renderCandleList)
// ============================================================

function updateUserChart(candleList) {
  if (!window.candleSeries) {
    console.warn('[FS] candleSeries not ready');
    return;
  }

  // Convert Firestore candles to chart format
  var chartData = candleList.map(function(c) {
    return {
      time: Math.floor((c.startTime || 0) / 1000),
      open: Number(c.open || 0),
      high: Number(c.high || 0),
      low: Number(c.low || 0),
      close: Number(c.close || 0)
    };
  }).filter(function(c) {
    return c.time > 0 && c.open > 0 && c.close > 0;
  });

  if (chartData.length === 0) return;

  try {
    // Set full data (replace)
    window.candleSeries.setData(chartData);

    // Update currentPrice from last candle
    var last = chartData[chartData.length - 1];
    if (last) {
      window.currentPrice = last.close;
      window.fsCandleState.lastPrice = last.close;
      updateUserPriceDisplay(last.close);
    }

    console.log('[FS] Chart updated:', chartData.length, 'candles');
  } catch (err) {
    console.error('[FS] Chart update error:', err.message);
  }
}

// ============================================================
// FS6. EXPOSE
// ============================================================

window.updateUserChart = updateUserChart;
window.updateUserPriceDisplay = updateUserPriceDisplay;

console.log('===== STEP 2A: FIRESTORE CONSUMER LOADED =====');


// ============================================================
// STEP 2B: FIRESTORE CHART INTEGRATION
// Full pipeline: Admin to Firestore to User Chart
// ============================================================

window.marketCache = window.marketCache || {};

window.resolveMarketId = async function(symbol) {
  if (!symbol) return null;

  if (window.marketCache[symbol]) {
    return window.marketCache[symbol];
  }

  try {
    var snap = await window.getDocs(window.collection(window.db, 'markets'));
    var foundId = null;
    snap.forEach(function(d) {
      var data = d.data();
      if (data.symbol === symbol && data.enabled !== false) {
        foundId = d.id;
      }
    });

    if (foundId) {
      window.marketCache[symbol] = foundId;
      console.log('[FS-B] Resolved:', symbol, '->', foundId);
    } else {
      console.warn('[FS-B] No market found for symbol:', symbol);
    }

    return foundId;
  } catch (err) {
    console.error('[FS-B] Resolve error:', err.message);
    return null;
  }
};

window.loadAdminHistoricalCandles = async function(marketId) {
  if (!marketId) return [];

  try {
    var snap = await window.getDocs(
      window.collection(window.db, 'markets', marketId, 'liveCandles')
    );

    if (snap.empty) {
      console.log('[FS-B] No historical candles yet');
      return [];
    }

    var candles = [];
    snap.forEach(function(d) {
      var c = d.data();
      candles.push({
        time: Math.floor((c.startTime || 0) / 1000),
        open: Number(c.open || 0),
        high: Number(c.high || 0),
        low: Number(c.low || 0),
        close: Number(c.close || 0)
      });
    });

    candles.sort(function(a, b) { return a.time - b.time; });

    console.log('[FS-B] Historical candles loaded:', candles.length);
    return candles;
  } catch (err) {
    console.error('[FS-B] Historical load error:', err.message);
    return [];
  }
};

window.connectAdminLiveCandles = function(marketId) {
  if (!marketId) return;

  var state = window.fsCandleState;

  if (state.unsubLive) { try { state.unsubLive(); } catch(e) {} }

  state.marketId = marketId;
  state.listening = true;

  console.log('[FS-B] Connecting live candles:', marketId);

  try {
    var liveRef = window.collection(window.db, 'markets', marketId, 'liveCandles');

    state.unsubLive = window.onSnapshot(liveRef, function(snap) {
      if (snap.empty) return;

      var all = [];
      snap.forEach(function(d) {
        var c = d.data();
        if (c.startTime && c.open > 0 && c.close > 0) {
          all.push(c);
        }
      });

      if (all.length === 0) return;

      all.sort(function(a, b) { return (a.startTime || 0) - (b.startTime || 0); });

      var recent = all.slice(-200);

      applyCandlesToChart(recent);

    }, function(err) {
      console.error('[FS-B] Live listen error:', err.message);
    });

  } catch (err) {
    console.error('[FS-B] Connect error:', err.message);
  }
};

function applyCandlesToChart(candles) {
  if (!window.candleSeries) {
    console.warn('[FS-B] candleSeries not ready');
    return;
  }

  if (!candles || candles.length === 0) return;

  var chartData = candles.map(function(c) {
    return {
      time: Math.floor((c.startTime || 0) / 1000),
      open: Number(c.open || 0),
      high: Number(c.high || 0),
      low: Number(c.low || 0),
      close: Number(c.close || 0)
    };
  }).filter(function(c) {
    return c.time > 0 && !isNaN(c.open) && !isNaN(c.close);
  });

  var seen = {};
  var unique = [];
  chartData.forEach(function(c) {
    if (!seen[c.time]) {
      seen[c.time] = c;
      unique.push(c);
    } else {
      seen[c.time] = c;
    }
  });
  unique.sort(function(a, b) { return a.time - b.time; });

  if (unique.length === 0) return;

  try {
    window.candleSeries.setData(unique);

    var last = unique[unique.length - 1];
    window.currentPrice = last.close;
    window.fsCandleState.lastPrice = last.close;

    var priceEl = document.getElementById('current-price');
    if (priceEl) {
      priceEl.textContent = last.close.toFixed(2);
      if (last.close >= last.open) {
        priceEl.style.color = '#00c853';
      } else {
        priceEl.style.color = '#ff5252';
      }
    }

    try {
      var priceDot = document.getElementById('qx-price-dot');
      if (priceDot && window.candleSeries) {
        var yPos = window.candleSeries.priceToCoordinate(last.close);
        if (yPos !== null && yPos !== undefined) {
          priceDot.style.top = yPos + 'px';
          priceDot.style.display = 'block';
          priceDot.className = 'qx-price-dot ' + (last.close >= last.open ? 'up' : 'down');
        }
      }
    } catch(e) {}

    console.log('[FS-B] Chart updated:', unique.length, 'candles');
  } catch (err) {
    console.error('[FS-B] Chart apply error:', err.message);
  }
}

window.switchToAdminMarket = async function(symbol) {
  if (!symbol) return;

  console.log('[FS-B] Switching to:', symbol);

  var marketId = await window.resolveMarketId(symbol);
  if (!marketId) {
    console.warn('[FS-B] Market not found:', symbol);
    return;
  }

  if (window.fsCandleState.unsubLive) {
    try { window.fsCandleState.unsubLive(); } catch(e) {}
    window.fsCandleState.unsubLive = null;
  }

  var historical = await window.loadAdminHistoricalCandles(marketId);
  if (historical.length > 0) {
    applyCandlesToChart(historical);
  }

  window.connectAdminLiveCandles(marketId);

  console.log('[FS-B] Connected:', symbol, '(' + marketId + ')');
};

(function hookAssetSelect() {
  var sel = document.getElementById('asset-select');
  if (!sel) {
    console.warn('[FS-B] asset-select not found');
    return;
  }

  if (sel.dataset.fsHook === '1') return;
  sel.dataset.fsHook = '1';

  sel.addEventListener('change', function() {
    var symbol = sel.value;
    console.log('[FS-B] User selected:', symbol);
    window.switchToAdminMarket(symbol);
  });

  console.log('[FS-B] Asset select hooked');
})();

window.initAdminCandleConsumer = async function() {
  console.log('[FS-B] Initial load...');

  var sel = document.getElementById('asset-select');
  var symbol = sel ? sel.value : 'BTCUSDT';

  await window.switchToAdminMarket(symbol);
};

(function hookAuthForFS() {
  var tries = 0;
  var maxTries = 30;

  var checkInterval = setInterval(function() {
    tries++;

    if (window.candleSeries && window.currentUser) {
      clearInterval(checkInterval);
      console.log('[FS-B] Chart + user ready, initializing...');
      window.initAdminCandleConsumer();
    } else if (tries >= maxTries) {
      clearInterval(checkInterval);
      console.warn('[FS-B] Timeout waiting for chart/user');
    }
  }, 1000);

  console.log('[FS-B] Waiting for chart + user...');
})();

window.resolveMarketId = window.resolveMarketId;
window.loadAdminHistoricalCandles = window.loadAdminHistoricalCandles;
window.connectAdminLiveCandles = window.connectAdminLiveCandles;
window.switchToAdminMarket = window.switchToAdminMarket;
window.initAdminCandleConsumer = window.initAdminCandleConsumer;

console.log('===== STEP 2B: CHART INTEGRATION LOADED =====');

// ============================================================
// STEP 2C: BINANCE DISABLE FLAG
// Toggle Binance on/off. Default OFF (Firestore only)
// ============================================================

// ============================================================
// BIN-C1. GLOBAL FLAG
// ============================================================

window.USE_BINANCE = false;  // CHANGE TO true TO RE-ENABLE BINANCE

console.log('[BIN-C] Binance flag:', window.USE_BINANCE ? 'ENABLED' : 'DISABLED');
console.log('[BIN-C] Using:', window.USE_BINANCE ? 'Binance API' : 'Firestore (admin candles)');

// ============================================================
// BIN-C2. PATCH startLivePrice
// ============================================================

(function patchStartLivePrice() {
  if (typeof window.startLivePrice !== 'function') {
    console.warn('[BIN-C] startLivePrice not found');
    return;
  }

  var origStartLivePrice = window.startLivePrice;

  window.startLivePrice = function() {
    if (!window.USE_BINANCE) {
      console.log('[BIN-C] Binance WS disabled - using Firestore');
      return;
    }

    console.log('[BIN-C] Binance WS enabled - starting');
    return origStartLivePrice.apply(this, arguments);
  };

  console.log('[BIN-C] startLivePrice patched');
})();

// ============================================================
// BIN-C3. PATCH loadCandles
// ============================================================

(function patchLoadCandles() {
  if (typeof window.loadCandles !== 'function') {
    console.warn('[BIN-C] loadCandles not found');
    return;
  }

  var origLoadCandles = window.loadCandles;

  window.loadCandles = async function() {
    if (!window.USE_BINANCE) {
      console.log('[BIN-C] Binance API disabled - using Firestore');
      
      // Trigger Firestore load instead
      if (typeof window.switchToAdminMarket === 'function') {
        var symbol = window.selectedAsset || 'BTCUSDT';
        await window.switchToAdminMarket(symbol);
      }
      return;
    }

    console.log('[BIN-C] Binance API enabled - loading');
    return await origLoadCandles.apply(this, arguments);
  };

  console.log('[BIN-C] loadCandles patched');
})();

// ============================================================
// BIN-C4. STOP BINANCE WS (if running)
// ============================================================

(function stopRunningBinanceWS() {
  try {
    if (window.livePriceWS) {
      console.log('[BIN-C] Stopping existing Binance WS');
      window.livePriceWS.close();
      window.livePriceWS = null;
    }
  } catch(e) {}
})();

// ============================================================
// BIN-C5. HOOK ASSET SELECT (disable Binance)
// ============================================================

(function patchAssetSelect() {
  var sel = document.getElementById('asset-select');
  if (!sel) return;

  // Remove existing listeners by cloning
  var newSel = sel.cloneNode(true);
  sel.parentNode.replaceChild(newSel, sel);

  newSel.addEventListener('change', async function() {
    var symbol = newSel.value;
    window.selectedAsset = symbol;
    console.log('[BIN-C] Asset changed:', symbol);

    if (window.USE_BINANCE) {
      // Binance path
      if (typeof window.loadCandles === 'function') {
        await window.loadCandles();
      }
      if (typeof window.startLivePrice === 'function') {
        window.startLivePrice();
      }
    } else {
      // Firestore path
      if (typeof window.switchToAdminMarket === 'function') {
        await window.switchToAdminMarket(symbol);
      }
    }
  });

  console.log('[BIN-C] Asset select patched');
})();

// ============================================================
// BIN-C6. HOOK TIMEFRAME SWITCH (disable Binance)
// ============================================================

(function patchTimeframeSwitch() {
  // Override the timeframe change handler
  var originalItems = document.querySelectorAll('.qx-tf-item');
  
  originalItems.forEach(function(btn) {
    // Remove old handlers by cloning
    var newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', async function() {
      // Close modal
      var modal = document.getElementById('tf-modal');
      if (modal) modal.classList.add('hidden');
      
      // Update active
      document.querySelectorAll('.qx-tf-item').forEach(function(b) {
        b.classList.remove('active');
      });
      newBtn.classList.add('active');
      
      var tf = newBtn.dataset.tf;
      window.selectedTimeframe = tf;
      var label = document.getElementById('qx-tf-active');
      if (label) label.textContent = tf;
      
      console.log('[BIN-C] Timeframe changed:', tf);
      
      if (window.USE_BINANCE) {
        if (typeof window.loadCandles === 'function') {
          await window.loadCandles();
        }
      } else {
        // Firestore path - reload market
        var symbol = window.selectedAsset || 'BTCUSDT';
        if (typeof window.switchToAdminMarket === 'function') {
          await window.switchToAdminMarket(symbol);
        }
      }
    });
  });

  console.log('[BIN-C] Timeframe switch patched');
})();

// ============================================================
// BIN-C7. TOGGLE FUNCTION (for testing)
// ============================================================

window.setBinanceMode = function(enabled) {
  window.USE_BINANCE = enabled;
  console.log('[BIN-C] Binance mode:', enabled ? 'ENABLED' : 'DISABLED');
  
  if (!enabled) {
    // Stop Binance WS
    if (window.livePriceWS) {
      try { window.livePriceWS.close(); } catch(e) {}
      window.livePriceWS = null;
    }
    // Switch to Firestore
    var symbol = window.selectedAsset || 'BTCUSDT';
    if (typeof window.switchToAdminMarket === 'function') {
      window.switchToAdminMarket(symbol);
    }
  } else {
    // Switch to Binance
    if (typeof window.loadCandles === 'function') {
      window.loadCandles();
    }
    if (typeof window.startLivePrice === 'function') {
      window.startLivePrice();
    }
  }
  
  return window.USE_BINANCE;
};

// ============================================================
// BIN-C8. INIT
// ============================================================

console.log('===== STEP 2C: BINANCE DISABLE FLAG LOADED =====');
console.log('  To enable Binance: window.setBinanceMode(true)');
console.log('  To disable Binance: window.setBinanceMode(false)');

// ============================================================
// USER FALLBACK MASTER SYSTEM
// User login করলে admin offline detect করে
// Admin offline হলে user candle generate করবে (hidden)
// ============================================================

// ============================================================
// UM1. USER MASTER STATE
// ============================================================

window.userMasterState = {
  isMaster: false,
  masterCheckInterval: null,
  masterHeartbeatTimer: null,
  candleTimer: null,
  lastAdminHeartbeat: 0,
  lastCheck: 0
};

// ============================================================
// UM2. CHECK ADMIN STATUS
// ============================================================

async function checkAdminStatus() {
  try {
    var doc = await window.getDoc(
      window.doc(window.db, 'settings', 'candleMaster')
    );

    if (!doc.exists()) {
      return { online: false, masterId: null };
    }

    var data = doc.data();
    var heartbeat = data.heartbeat || 0;
    var age = Date.now() - heartbeat;

    var isAdminOnline = (data.masterType === 'admin') &&
                        (age < 30000);

    window.userMasterState.lastAdminHeartbeat = heartbeat;

    return {
      online: isAdminOnline,
      masterId: data.masterId,
      masterType: data.masterType,
      age: age
    };
  } catch (err) {
    console.error('[UserMaster] Check error:', err.message);
    return { online: false, masterId: null };
  }
}

// ============================================================
// UM3. USER BECOMES MASTER (Fallback)
// ============================================================

async function becomeUserMaster() {
  if (window.userMasterState.isMaster) return;

  try {
    // Double-check admin still offline
    var status = await checkAdminStatus();
    if (status.online) {
      console.log('[UserMaster] Admin is online, skipping');
      return;
    }

    // Declare self as master
    await window.setDoc(
      window.doc(window.db, 'settings', 'candleMaster'),
      {
        masterId: window.currentUser.uid,
        masterType: 'user',
        masterEmail: window.currentUser.email,
        heartbeat: Date.now(),
        declaredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    window.userMasterState.isMaster = true;
    console.log('[UserMaster] User became fallback master');

    // Start heartbeat
    startUserHeartbeat();

    // Start candle generation
    startUserCandleEngine();

  } catch (err) {
    console.error('[UserMaster] Become master error:', err.message);
  }
}

// ============================================================
// UM4. USER HEARTBEAT
// ============================================================

function startUserHeartbeat() {
  if (window.userMasterState.masterHeartbeatTimer) {
    clearInterval(window.userMasterState.masterHeartbeatTimer);
  }

  window.userMasterState.masterHeartbeatTimer = setInterval(async function() {
    if (!window.userMasterState.isMaster) return;

    try {
      await window.updateDoc(
        window.doc(window.db, 'settings', 'candleMaster'),
        {
          heartbeat: Date.now(),
          masterType: 'user'
        }
      );
    } catch (err) {
      console.error('[UserMaster] Heartbeat error:', err.message);
    }
  }, 10000);

  console.log('[UserMaster] User heartbeat started (every 10s)');
}

// ============================================================
// UM5. USER CANDLE ENGINE (Hidden)
// ============================================================

function startUserCandleEngine() {
  if (window.userMasterState.candleTimer) {
    clearInterval(window.userMasterState.candleTimer);
  }

  // Get current market from user's selection
  var marketId = window.fsCandleState?.marketId;
  if (!marketId) {
    console.warn('[UserMaster] No market selected for candle engine');
    return;
  }

  console.log('[UserMaster] Starting candle engine for:', marketId);

  // Candle generation loop
  window.userMasterState.candleTimer = setInterval(async function() {
    // Stop if no longer master
    if (!window.userMasterState.isMaster) {
      stopUserCandleEngine();
      return;
    }

    // Check if admin came back online
    var status = await checkAdminStatus();
    if (status.online && status.masterType === 'admin') {
      console.log('[UserMaster] Admin came back online — stepping down');
      stepDownUserMaster();
      return;
    }

    // Generate candle
    await generateUserCandle();

  }, 60000); // 1 minute per candle
}

// ============================================================
// UM6. GENERATE USER CANDLE
// ============================================================

async function generateUserCandle() {
  var marketId = window.fsCandleState?.marketId;
  if (!marketId) return;

  try {
    // Get market data
    var marketDoc = await window.getDoc(
      window.doc(window.db, 'markets', marketId)
    );
    if (!marketDoc.exists()) return;

    var market = marketDoc.data();
    var currentPrice = market.currentPrice || market.basePrice || 50000;
    var basePrice = market.basePrice || 50000;

    // Calculate candle time (aligned to minute)
    var now = Date.now();
    var alignedStart = Math.floor(now / 60000) * 60000;

    // Random movement
    var movement = (Math.random() - 0.5) * 100; // ±50
    var open = currentPrice;
    var close = open + movement;
    var high = Math.max(open, close) + Math.random() * 20;
    var low = Math.min(open, close) - Math.random() * 20;

    var liveCandleId = 'live_' + alignedStart;

    // Write to Firestore (hidden path name, looks like cache)
    await window.setDoc(
      window.doc(window.db, 'markets', marketId, 'liveCandles', liveCandleId),
      {
        id: liveCandleId,
        marketId: marketId,
        startTime: alignedStart,
        endTime: alignedStart + 60000,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        direction: close >= open ? 'up' : 'down',
        behavior: 'normal',
        size: 'normal',
        generatedBy: 'fallback',
        updatedAt: Date.now()
      },
      { merge: true }
    );

    // Update market currentPrice
    await window.updateDoc(
      window.doc(window.db, 'markets', marketId),
      {
        currentPrice: Number(close.toFixed(2)),
        updatedAt: new Date().toISOString()
      }
    );

    console.log('[UserMaster] Candle generated:', {
      start: alignedStart,
      open: open.toFixed(2),
      close: close.toFixed(2)
    });

  } catch (err) {
    console.error('[UserMaster] Candle generation error:', err.message);
  }
}

// ============================================================
// UM7. STOP USER ENGINE
// ============================================================

function stopUserCandleEngine() {
  if (window.userMasterState.candleTimer) {
    clearInterval(window.userMasterState.candleTimer);
    window.userMasterState.candleTimer = null;
  }
  console.log('[UserMaster] Candle engine stopped');
}

// ============================================================
// UM8. STEP DOWN (Admin came back)
// ============================================================

async function stepDownUserMaster() {
  stopUserCandleEngine();

  if (window.userMasterState.masterHeartbeatTimer) {
    clearInterval(window.userMasterState.masterHeartbeatTimer);
    window.userMasterState.masterHeartbeatTimer = null;
  }

  window.userMasterState.isMaster = false;

  // Clear master flag (don't overwrite admin's)
  try {
    var status = await checkAdminStatus();
    if (status.masterType !== 'admin') {
      await window.updateDoc(
        window.doc(window.db, 'settings', 'candleMaster'),
        {
          masterType: null,
          masterId: null
        }
      );
    }
  } catch (e) {}

  console.log('[UserMaster] Stepped down - admin is master');
}

// ============================================================
// UM9. MASTER COORDINATOR (main loop)
// ============================================================

function startUserMasterCheck() {
  if (window.userMasterState.masterCheckInterval) {
    clearInterval(window.userMasterState.masterCheckInterval);
  }

  window.userMasterState.masterCheckInterval = setInterval(async function() {
    if (!window.currentUser) return;
    if (window.userMasterState.isMaster) return; // already master

    var status = await checkAdminStatus();

    // If admin offline for 30s+, become master
    if (!status.online && status.masterType !== 'user') {
      console.log('[UserMaster] Admin offline - attempting to become master');
      await becomeUserMaster();
    }
  }, 15000); // Check every 15s

  console.log('[UserMaster] Master check started (every 15s)');
}

// ============================================================
// UM10. HOOK ON USER LOGIN
// ============================================================

(function hookUserLogin() {
  var tries = 0;
  var maxTries = 30;

  var check = setInterval(function() {
    tries++;

    if (window.currentUser && window.fsCandleState?.marketId) {
      clearInterval(check);
      console.log('[UserMaster] User ready - starting master check');
      startUserMasterCheck();
    } else if (tries >= maxTries) {
      clearInterval(check);
    }
  }, 1000);
})();

// ============================================================
// UM11. EXPOSE
// ============================================================

window.userMasterState = window.userMasterState;
window.checkAdminStatus = checkAdminStatus;
window.becomeUserMaster = becomeUserMaster;
window.stepDownUserMaster = stepDownUserMaster;
window.generateUserCandle = generateUserCandle;
window.startUserMasterCheck = startUserMasterCheck;

console.log('===== USER FALLBACK MASTER LOADED =====');

// ============================================================
// PHASE 12: TRADE ALIGNMENT — Block A
// Trade expire at candle boundary (Quotex style)
// ============================================================

// ============================================================
// PA1. TIMEFRAME TO MS
// ============================================================

function tfToMs(tf) {
  var map = {
    '5s': 5000, '10s': 10000, '15s': 15000, '30s': 30000,
    '1m': 60000, '2m': 120000, '3m': 180000, '5m': 300000,
    '10m': 600000, '15m': 900000, '30m': 1800000,
    '1h': 3600000, '4h': 14400000, '1d': 86400000
  };
  return map[tf] || 60000;
}

// ============================================================
// PA2. CALCULATE ALIGNED EXPIRE TIME
// ============================================================

function calcAlignedExpire(nowMs, durationSec, timeframe) {
  var tfMs = tfToMs(timeframe);
  var durationMs = durationSec * 1000;

  // Raw expire time
  var rawExpire = nowMs + durationMs;

  // Align to next candle boundary
  var alignedExpire = Math.ceil(rawExpire / tfMs) * tfMs;

  // Current candle end time
  var candleEndTime = Math.ceil(nowMs / tfMs) * tfMs;

  // Wait time until candle ends
  var waitTime = candleEndTime - nowMs;

  // Total wait (including candle duration)
  var totalWait = alignedExpire - nowMs;

  return {
    alignedExpire: alignedExpire,
    candleEndTime: candleEndTime,
    waitTime: waitTime,
    totalWait: totalWait,
    tfMs: tfMs
  };
}

// ============================================================
// PA3. ENHANCED PLACE TRADE (override existing)
// ============================================================

var originalPlaceTrade = window.placeTrade;

window.placeTrade = async function(type) {
  if (!currentUser) return;

  var now = Date.now();
  if (now - lastTradeTime < 500) return;
  lastTradeTime = now;

  var amountInput = document.getElementById('trade-amount');
  var amount = amountInput ? parseFloat(amountInput.value) : 1;

  function showMsg(text, color) {
    try {
      var msgEl = document.getElementById('trade-message');
      if (msgEl) {
        msgEl.style.color = color || '#ff5252';
        msgEl.textContent = text;
      }
    } catch(e) {}
  }

  if (!amount || amount < 1) { showMsg('Minimum $1 required'); return; }
  if (amount > userBalance) { showMsg('Insufficient balance'); return; }

  playSound('click');

  var entryPrice = currentPrice;
  var entryTime = new Date().toISOString();

  // PHASE 12: Calculate aligned expire
  var timeframe = window.selectedTimeframe || '1m';
  var duration = window.selectedTime || 60;

  var alignment = calcAlignedExpire(now, duration, timeframe);

  // Save trade with aligned expire
  try {
    var newBalance = userBalance - amount;
    var balanceField = accountType === 'demo' ? 'demoBalance' : 'realBalance';

    await updateDoc(doc(db, 'users', currentUser.uid), {
      [balanceField]: newBalance,
      balance: newBalance
    });
    userBalance = newBalance;
    window.userBalance = newBalance;
    safeSetTextById('balance', userBalance.toFixed(2));

    animateBalanceChange(-amount);

    // Save trade with alignment
    var tradeRef = await addDoc(collection(db, 'trades'), {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      type: type,
      amount: amount,
      entryPrice: entryPrice,
      entryTime: entryTime,
      expiresAt: alignment.alignedExpire,
      candleEndTime: alignment.candleEndTime,
      waitTime: alignment.waitTime,
      totalWait: alignment.totalWait,
      timeframe: timeframe,
      duration: duration,
      asset: selectedAsset,
      accountType: accountType,
      status: 'pending',
      result: null,
      profit: 0,
      phase: 'waiting',
      createdAt: entryTime
    });

    showMsg(type.toUpperCase() + ' $' + amount + ' placed (' +
      Math.round(alignment.totalWait / 1000) + 's)',
      type === 'call' ? '#00c853' : '#ff5252');

    // Render markers
    if (typeof renderEntryLine === 'function') {
      renderEntryLine(type, entryPrice, alignment.alignedExpire);
    }
    if (typeof renderVerticalLines === 'function') {
      renderVerticalLines(entryTime, alignment.alignedExpire);
    }
    if (typeof renderTickMark === 'function') {
      renderTickMark(type, entryPrice, entryTime);
    }

    setTimeout(function() {
      var tm = document.getElementById('trade-message');
      if (tm) tm.textContent = '';
    }, 2000);

    console.log('[PA-Phase12] Trade placed:', {
      type: type,
      amount: amount,
      entryPrice: entryPrice,
      alignedExpire: new Date(alignment.alignedExpire).toLocaleTimeString(),
      candleEnd: new Date(alignment.candleEndTime).toLocaleTimeString(),
      waitTime: alignment.waitTime + 'ms',
      totalWait: alignment.totalWait + 'ms'
    });

  } catch (error) {
    showMsg(error.message);
    console.error('[PA-Phase12] Trade error:', error);
  }
};

// ============================================================
// PA4. GET TRADE PHASE
// ============================================================

function getTradePhase(trade) {
  var now = Date.now();

  if (trade.status === 'completed') {
    return 'completed';
  }

  if (!trade.candleEndTime) {
    return 'active';  // Legacy trades
  }

  if (now < trade.candleEndTime) {
    return 'waiting';  // Waiting for candle to start
  }

  if (now < trade.expiresAt) {
    return 'active';   // Candle running
  }

  return 'expiring';   // Should expire now
}

// ============================================================
// PA5. UPDATE TRADE PHASE IN FIRESTORE
// ============================================================

async function updateTradePhase(trade) {
  var newPhase = getTradePhase(trade);

  if (trade.phase !== newPhase) {
    try {
      await updateDoc(doc(db, 'trades', trade.id), {
        phase: newPhase,
        phaseUpdatedAt: new Date().toISOString()
      });
      trade.phase = newPhase;
      console.log('[PA-Phase12] Trade ' + trade.id.slice(0, 8) +
        ' phase: ' + trade.phase + ' → ' + newPhase);
    } catch (err) {
      console.error('[PA-Phase12] Phase update error:', err.message);
    }
  }

  return newPhase;
}

// ============================================================
// PA6. UPDATE ALL TRADES PHASES (loop)
// ============================================================

async function updateAllTradePhases() {
  if (!window.activeTradesLocal || window.activeTradesLocal.length === 0) return;

  for (var i = 0; i < window.activeTradesLocal.length; i++) {
    var trade = window.activeTradesLocal[i];
    if (trade.status === 'pending') {
      await updateTradePhase(trade);
    }
  }
}

// ============================================================
// PA7. PHASE LOOP (every 1s)
// ============================================================

setInterval(function() {
  if (currentUser) {
    updateAllTradePhases();
  }
}, 1000);

// ============================================================
// PA8. EXPOSE
// ============================================================

window.placeTrade = window.placeTrade;
window.calcAlignedExpire = calcAlignedExpire;
window.getTradePhase = getTradePhase;
window.updateTradePhase = updateTradePhase;
window.tfToMs = tfToMs;

console.log('===== PHASE 12 — TRADE ALIGNMENT LOADED =====');

// ============================================================
// PHASE 12 FIX: Expose selectedTimeframe + selectedTime
// ============================================================

// Sync variables with window scope (every 1s)
setInterval(function() {
  try {
    window.selectedTimeframe = (typeof selectedTimeframe !== 'undefined') ? selectedTimeframe : '1m';
    window.selectedTime = (typeof selectedTime !== 'undefined') ? selectedTime : 60;
    window.selectedAsset = (typeof selectedAsset !== 'undefined') ? selectedAsset : 'BTCUSDT';
    window.accountType = (typeof accountType !== 'undefined') ? accountType : 'demo';
    window.lastTradeTime = (typeof lastTradeTime !== 'undefined') ? lastTradeTime : 0;
  } catch(e) {}
}, 1000);

// Initial expose
setTimeout(function() {
  try {
    window.selectedTimeframe = selectedTimeframe;
    window.selectedTime = selectedTime;
    window.selectedAsset = selectedAsset;
    window.accountType = accountType;
    console.log('[Phase12-Fix] Variables exposed:', {
      timeframe: window.selectedTimeframe,
      time: window.selectedTime,
      asset: window.selectedAsset
    });
  } catch(e) {}
}, 2000);

console.log('===== PHASE 12 VARIABLES EXPOSED =====');

// ============================================================
// PHASE 12 — AUTO-REBIND (Permanent)
// Ensures trade buttons always use Phase 12 placeTrade
// ============================================================

(function phase12AutoRebind() {
  console.log('[Phase12] Loading rebind system...');

  function rebind() {
    var callBtn = document.querySelector('#call-btn');
    var putBtn = document.querySelector('#put-btn');

    if (callBtn && callBtn.getAttribute('data-phase12-bound') !== '1') {
      callBtn.setAttribute('data-phase12-bound', '1');
      var nc = callBtn.cloneNode(true);
      nc.setAttribute('data-phase12-bound', '1');
      callBtn.parentNode.replaceChild(nc, callBtn);

      nc.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.placeTrade === 'function') {
          window.placeTrade('call');
        }
      }, true);
      console.log('[Phase12] ✅ Buy button rebound');
    }

    if (putBtn && putBtn.getAttribute('data-phase12-bound') !== '1') {
      putBtn.setAttribute('data-phase12-bound', '1');
      var np = putBtn.cloneNode(true);
      np.setAttribute('data-phase12-bound', '1');
      putBtn.parentNode.replaceChild(np, putBtn);

      np.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.placeTrade === 'function') {
          window.placeTrade('put');
        }
      }, true);
      console.log('[Phase12] ✅ Sell button rebound');
    }
  }

  // Initial
  setTimeout(rebind, 3000);
  setTimeout(rebind, 6000);

  // Auto-loop — store handle so flag check works
  window.__phase12AutoRebind = setInterval(rebind, 5000);

  console.log('[Phase12] ✅ Auto-rebind active');
  console.log('[Phase12] Flag set: __phase12AutoRebind =', !!window.__phase12AutoRebind);
})();

console.log('===== PHASE 12 AUTO-REBIND LOADED =====');

// ============================================================
// app.js v26 — PERMANENT FIXES (Final)
// ============================================================

// ============================================================
// FIX 1 — Phase 12 Auto-Rebind
// Ensures trade buttons always use Phase 12 placeTrade
// ============================================================

(function phase12PermanentRebind() {
  console.log('[PermanentFix] Loading Phase 12 rebind...');

  function rebind() {
    var callBtn = document.querySelector('#call-btn');
    var putBtn = document.querySelector('#put-btn');

    if (callBtn && callBtn.getAttribute('data-phase12-bound') !== '1') {
      callBtn.setAttribute('data-phase12-bound', '1');
      var nc = callBtn.cloneNode(true);
      nc.setAttribute('data-phase12-bound', '1');
      callBtn.parentNode.replaceChild(nc, callBtn);

      nc.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.placeTrade === 'function') {
          window.placeTrade('call');
        }
      }, true);
      console.log('[PermanentFix] ✅ Buy button');
    }

    if (putBtn && putBtn.getAttribute('data-phase12-bound') !== '1') {
      putBtn.setAttribute('data-phase12-bound', '1');
      var np = putBtn.cloneNode(true);
      np.setAttribute('data-phase12-bound', '1');
      putBtn.parentNode.replaceChild(np, putBtn);

      np.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.placeTrade === 'function') {
          window.placeTrade('put');
        }
      }, true);
      console.log('[PermanentFix] ✅ Sell button');
    }
  }

  rebind();
  setTimeout(rebind, 2000);
  setTimeout(rebind, 5000);
  setInterval(rebind, 5000);
})();
// ============================================================
// FIX 2 — Firestore Auto-Reconnect (Fixed)
// ============================================================

(function firestoreAutoReconnectFixed() {
  console.log('[PermanentFix] Firestore reconnect (fixed)...');

  var lastCheck = 0;
  var checkInterval = 30000; // Only check every 30s

  setInterval(async function() {
    if (!window.currentUser) return;

    var now = Date.now();
    if (now - lastCheck < checkInterval) return;
    lastCheck = now;

    // Candle listener check
    var candleNeedsRestart = false;
    if (window.fsCandleState) {
      if (!window.fsCandleState.listening) candleNeedsRestart = true;
      if (!window.fsCandleState.unsubLive) candleNeedsRestart = true;
    }

    if (candleNeedsRestart && window.fsCandleState?.marketId) {
      if (typeof window.connectAdminLiveCandles === 'function') {
        try {
          window.connectAdminLiveCandles(window.fsCandleState.marketId);
          console.log('[PermanentFix] Candle listener restarted');
        } catch(e) {}
      }
    }

    // Trade listener check — more careful
    var tradeListenerExists = false;
    try {
      tradeListenerExists = typeof activeTradesUnsub !== 'undefined' && activeTradesUnsub !== null;
    } catch(e) {
      tradeListenerExists = false;
    }

    if (!tradeListenerExists) {
      if (typeof window.loadActiveTrades === 'function') {
        window.loadActiveTrades();
        console.log('[PermanentFix] Trade listener restarted');
      }
    }

    // History listener check
    var historyListenerExists = false;
    try {
      historyListenerExists = typeof historyUnsub !== 'undefined' && historyUnsub !== null;
    } catch(e) {
      historyListenerExists = false;
    }

    if (!historyListenerExists) {
      if (typeof window.loadHistory === 'function') {
        window.loadHistory();
        console.log('[PermanentFix] History listener restarted');
      }
    }
  }, 15000);
})();

// ============================================================
// FIX 3 — Trade Expiry Watchdog
// Auto-expire stuck trades every 5s
// ============================================================

(function tradeExpiryWatchdog() {
  console.log('[PermanentFix] Loading expiry watchdog...');

  setInterval(async function() {
    if (!window.currentUser) return;
    if (!window.activeTradesLocal || window.activeTradesLocal.length === 0) return;

    var now = Date.now();
    var expired = [];

    for (var i = 0; i < window.activeTradesLocal.length; i++) {
      var t = window.activeTradesLocal[i];
      if (t.status === 'pending' && t.expiresAt <= now) {
        expired.push(t);
      }
    }

    if (expired.length === 0) return;
    console.log('[PermanentFix] Found', expired.length, 'expired trades');

    for (var j = 0; j < expired.length; j++) {
      var trade = expired[j];
      try {
        var result = 'loss';
        var exitPrice = window.currentPrice;
        if (trade.type === 'call' && exitPrice > trade.entryPrice) result = 'win';
        else if (trade.type === 'put' && exitPrice < trade.entryPrice) result = 'win';

              var profit = result === 'win' ? trade.amount * 1.85 : 0;

        await window.updateDoc(
          window.doc(window.db, 'trades', trade.id),
          {
            status: 'completed',
            result: result,
            exitPrice: exitPrice,
            profit: profit,
            completedAt: new Date().toISOString(),
            phase: 'completed'
          }
        );

        if (result === 'win') {
          var userRef = window.doc(window.db, 'users', window.currentUser.uid);
          var uDoc = await window.getDoc(userRef);
          if (uDoc.exists()) {
            var uData = uDoc.data();
            var field = trade.accountType === 'real' ? 'realBalance' : 'demoBalance';
            var curBal = uData[field] || 0;
            var newBal = curBal + profit;
            await window.updateDoc(userRef, {
              [field]: newBal,
              balance: newBal
            });
            window.userBalance = newBal;
            var balEl = document.querySelector('#balance');
            if (balEl) balEl.textContent = newBal.toFixed(2);
          }
        }

        console.log('[PermanentFix] Expired:', trade.id.slice(0,8), '→', result);
      } catch(e) {
        console.error('[PermanentFix] Expire error:', e.message);
      }
    }
  }, 5000);
})();

// ============================================================
// FIX 4 — Timer Stuck Fix
// Reset timer if 00:00 with no trades
// ============================================================

(function timerStuckFix() {
  setInterval(function() {
    if (!window.currentUser) return;

    var timerEls = [
      document.querySelector('#trade-timer-display'),
      document.querySelector('#countdown-time')
    ];

    var anyStuck = false;
    timerEls.forEach(function(el) {
      if (el && el.textContent === '00:00') anyStuck = true;
    });

    if (anyStuck && (!window.activeTradesLocal || window.activeTradesLocal.length === 0)) {
      var dur = window.selectedTime || 60;
      var mm = Math.floor(dur / 60);
      var ss = dur % 60;
      var str = String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');

      timerEls.forEach(function(el) {
        if (el) el.textContent = str;
      });

      var bigTimer = document.querySelector('#big-timer');
      if (bigTimer) bigTimer.classList.add('hidden');

      var topWrap = document.querySelector('#top-countdown-timer');
      if (topWrap) topWrap.classList.add('hidden');

      console.log('[PermanentFix] Timer reset to', str);
    }
  }, 2000);
})();

console.log('===== ALL PERMANENT FIXES LOADED =====');

// ============================================================
// PHASE 15 — RESULT MARKER
// Win/Loss text on chart at trade close
// ============================================================

console.log('[Phase15] Loading Result Marker...');

// ============================================================
// RM1. STATE
// ============================================================

window.resultMarkers = [];
window.resultMarkerTimeout = null;

// ============================================================
// RM2. SHOW RESULT MARKER
// ============================================================

window.showResultMarker = function(trade, result, profit) {
  try {
    console.log('[Phase15] showResultMarker:', trade.id?.slice(0,8), result, profit);

    if (!window.chartRef || !window.candleSeries) {
      console.warn('[Phase15] Chart not ready');
      return;
    }

    if (!trade.entryTime || !trade.entryPrice) {
      console.warn('[Phase15] Trade missing entry data');
      return;
    }

    var candleData = window.candleSeries.data();
    if (!candleData || candleData.length === 0) return;

    var entrySec = Math.floor(new Date(trade.entryTime).getTime() / 1000);
    var closestCandle = null;
    var minDiff = Infinity;

    for (var i = 0; i < candleData.length; i++) {
      var diff = Math.abs(candleData[i].time - entrySec);
      if (diff < minDiff) {
        minDiff = diff;
        closestCandle = candleData[i];
      }
    }

    if (!closestCandle) return;

    var xPos = window.chartRef.timeScale().timeToCoordinate(closestCandle.time);
    if (xPos === null || xPos === undefined) return;

    var yPos;
    if (trade.type === 'call') {
      yPos = window.candleSeries.priceToCoordinate(closestCandle.high);
      if (yPos !== null) yPos -= 20;
    } else {
      yPos = window.candleSeries.priceToCoordinate(closestCandle.low);
      if (yPos !== null) yPos += 20;
    }

    if (yPos === null || yPos === undefined) return;

    var isWin = (result === 'win');
    var color = isWin ? '#00c853' : '#ff5252';
    var text = isWin 
      ? '+$' + Number(profit || 0).toFixed(2)
      : '-$' + Number(trade.amount || 0).toFixed(2);

    var container = document.getElementById('qx-tick-container');
    if (!container) {
      var wrapper = document.getElementById('chart-wrapper');
      if (wrapper) {
        container = document.createElement('div');
        container.id = 'qx-tick-container';
        container.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:100;';
        wrapper.appendChild(container);
      }
    }
    if (!container) return;

    var marker = document.createElement('div');
    marker.className = 'qx-result-marker ' + result;
    marker.style.cssText =
      'position:absolute;' +
      'left:' + xPos + 'px;' +
      'top:' + yPos + 'px;' +
      'transform:translateX(-50%);' +
      'background:' + color + ';' +
      'color:#ffffff;' +
      'font-size:11px;' +
      'font-weight:800;' +
      'padding:3px 8px;' +
      'border-radius:5px;' +
      'box-shadow:0 0 8px ' + color + ';' +
      'font-family:Inter, sans-serif;' +
      'white-space:nowrap;' +
      'z-index:50;' +
      'pointer-events:none;' +
      'opacity:0;' +
      'transition:opacity 0.3s ease-in;';
    marker.textContent = text;

    container.appendChild(marker);

    setTimeout(function() {
      marker.style.opacity = '1';
    }, 50);

    window.resultMarkers.push({
      element: marker,
      timestamp: Date.now()
    });

    setTimeout(function() {
      marker.style.transition = 'opacity 1s ease-out';
      marker.style.opacity = '0';

      setTimeout(function() {
        try { marker.remove(); } catch(e) {}
        window.resultMarkers = window.resultMarkers.filter(function(m) {
          return m.element !== marker;
        });
      }, 1000);
    }, 4000);

    console.log('[Phase15] ✅ Marker added:', text, 'at (' + xPos + ',' + yPos + ')');

  } catch(e) {
    console.error('[Phase15] Error:', e.message);
  }
};

// ============================================================
// RM3. CLEAR ALL RESULT MARKERS
// ============================================================

window.clearResultMarkers = function() {
  try {
    window.resultMarkers.forEach(function(m) {
      try { m.element.remove(); } catch(e) {}
    });
    window.resultMarkers = [];
    console.log('[Phase15] All markers cleared');
  } catch(e) {}
};

// ============================================================
// RM4. HOOK INTO TRADE EXPIRY
// ============================================================

(function hookExpiryForMarkers() {
  if (typeof window.checkExpiredTrades !== 'function') {
    console.warn('[Phase15] checkExpiredTrades not found — will retry');
    setTimeout(hookExpiryForMarkers, 2000);
    return;
  }

  if (window.__resultMarkerHooked) return;
  window.__resultMarkerHooked = true;

  var originalCheck = window.checkExpiredTrades;

  window.checkExpiredTrades = async function() {
    await originalCheck.call(this);

    setTimeout(async function() {
      try {
        var now = Date.now();
        var fiveSecAgo = now - 5000;

        var snap = await window.getDocs(
          window.query(
            window.collection(window.db, 'trades'),
            window.where('userId', '==', window.currentUser?.uid),
            window.where('status', '==', 'completed')
          )
        );

        snap.forEach(function(d) {
          var t = d.data();
          var completedAt = t.completedAt ? new Date(t.completedAt).getTime() : 0;

          if (completedAt > fiveSecAgo && completedAt <= now) {
            if (!window.__shownMarkers) window.__shownMarkers = {};
            if (window.__shownMarkers[d.id]) return;

            window.__shownMarkers[d.id] = true;
            window.showResultMarker(t, t.result, t.profit);
          }
        });
      } catch(e) {
        console.error('[Phase15] Hook error:', e.message);
      }
    }, 500);
  };

  console.log('[Phase15] checkExpiredTrades hooked');
})();

// ============================================================
// RM5. HOOK INTO PERMANENT EXPIRY WATCHDOG
// ============================================================

(function hookWatchdogForMarkers() {
  if (window.__watchdogMarkerHooked) return;
  window.__watchdogMarkerHooked = true;

  setInterval(async function() {
    if (!window.currentUser) return;

    try {
      var now = Date.now();
      var fiveSecAgo = now - 5000;

      var snap = await window.getDocs(
        window.query(
          window.collection(window.db, 'trades'),
          window.where('userId', '==', window.currentUser.uid),
          window.where('status', '==', 'completed')
        )
      );

      snap.forEach(function(d) {
        var t = d.data();
        var completedAt = t.completedAt ? new Date(t.completedAt).getTime() : 0;

        if (completedAt > fiveSecAgo && completedAt <= now) {
          if (!window.__shownMarkers) window.__shownMarkers = {};
          if (window.__shownMarkers[d.id]) return;

          window.__shownMarkers[d.id] = true;
          window.showResultMarker(t, t.result, t.profit);
        }
      });
    } catch(e) {}
  }, 2000);

  console.log('[Phase15] Watchdog hook active');
})();

// ============================================================
// RM6. EXPOSE
// ============================================================

window.showResultMarker = window.showResultMarker;
window.clearResultMarkers = window.clearResultMarkers;

console.log('===== PHASE 15 — RESULT MARKER LOADED =====');
console.log('===== app.js COMPLETE — ALL FEATURES LOADED =====');
// ============================================================
// PHASE 7-9 — 14 CANDLE BEHAVIORS (Self-Contained Block)
// Part A: Auto-Detect + Behavior Engine
// ============================================================
// SAFE: Yeh block existing admin.js functions ko
//       sirf WRAP karega, DELETE/REPLACE nahi karega.
// ============================================================

(function phase7_9_Behaviors_PartA() {
  if (window.__phase7_9_PartA_Loaded) {
    console.log('[Phase7-9-A] Already loaded, skipping');
    return;
  }
  window.__phase7_9_PartA_Loaded = true;

  console.log('[Phase7-9-A] Loading Behavior Engine...');

  // ==========================================================
  // B1. BEHAVIOR LIST (14 types)
  // ==========================================================

  var BEHAVIORS = [
    'normal',
    'doji',
    'hammer',
    'inverted_hammer',
    'shooting_star',
    'hanging_man',
    'bullish_engulf',
    'bearish_engulf',
    'marubozu_bull',
    'marubozu_bear',
    'long_body_bull',
    'long_body_bear',
    'spinning_top',
    'random'
  ];

  window.CANDLE_BEHAVIORS = BEHAVIORS;
  console.log('[Phase7-9-A] Behaviors:', BEHAVIORS.length);

  // ==========================================================
  // B2. HELPER: Round to 2 decimals
  // ==========================================================

  function r2(v) {
    return Number(Number(v).toFixed(2));
  }

  // ==========================================================
  // B3. CORE: applyBehavior()
  // Input:  behavior, open, close, targetDir ('up'/'down'/'auto')
  // Output: { open, high, low, close, direction }
  // ==========================================================

  function applyBehavior(behavior, open, close, targetDir) {
    open = Number(open);
    close = Number(close);

    // Base body
    var bodyHigh = Math.max(open, close);
    var bodyLow = Math.min(open, close);
    var bodySize = Math.abs(close - open);
    if (bodySize === 0) bodySize = 0.01;

    // Direction override
    var dir = targetDir;
    if (!dir || dir === 'auto' || dir === 'smart') {
      dir = (close >= open) ? 'up' : 'down';
    }

    var high, low, finalOpen, finalClose;

    switch (behavior) {

      // ----- 1. NORMAL -----
      case 'normal':
      default:
        high = bodyHigh + bodySize * 0.4;
        low  = bodyLow  - bodySize * 0.4;
        finalOpen = open;
        finalClose = close;
        break;

      // ----- 2. DOJI -----
      case 'doji':
        // Body almost zero, long wicks both sides
        var mid = (bodyHigh + bodyLow) / 2;
        var range = bodySize * 4;
        finalOpen = mid;
        finalClose = mid + (dir === 'up' ? 0.01 : -0.01);
        high = mid + range * 0.5;
        low  = mid - range * 0.5;
        break;

      // ----- 3. HAMMER -----
      case 'hammer':
        // Small body top, long lower wick
        var hb = bodySize * 0.3;
        if (dir === 'up') {
          finalOpen = bodyHigh - hb;
          finalClose = bodyHigh;
        } else {
          finalOpen = bodyLow + hb;
          finalClose = bodyLow;
        }
        high = Math.max(finalOpen, finalClose) + bodySize * 0.15;
        low  = Math.min(finalOpen, finalClose) - bodySize * 2.2;
        break;

      // ----- 4. INVERTED HAMMER -----
      case 'inverted_hammer':
        // Long upper wick, small body bottom
        var ib = bodySize * 0.3;
        if (dir === 'up') {
          finalOpen = bodyLow;
          finalClose = bodyLow + ib;
        } else {
          finalOpen = bodyLow + ib;
          finalClose = bodyLow;
        }
        high = Math.max(finalOpen, finalClose) + bodySize * 2.2;
        low  = Math.min(finalOpen, finalClose) - bodySize * 0.15;
        break;

      // ----- 5. SHOOTING STAR -----
      case 'shooting_star':
        // Bearish: long upper wick, small body at bottom
        var ss = bodySize * 0.25;
        finalOpen = bodyLow + ss;
        finalClose = bodyLow;
        high = bodyLow + bodySize * 2.5;
        low  = bodyLow - bodySize * 0.1;
        dir = 'down';
        break;

      // ----- 6. HANGING MAN -----
      case 'hanging_man':
        // Bearish: small body top, long lower wick
        var hm = bodySize * 0.3;
        finalOpen = bodyHigh;
        finalClose = bodyHigh - hm;
        high = bodyHigh + bodySize * 0.15;
        low  = (bodyHigh - hm) - bodySize * 2.2;
        dir = 'down';
        break;

      // ----- 7. BULLISH ENGULF -----
      case 'bullish_engulf':
        // Big green body swallowing previous
        var be = bodySize * 1.6;
        finalOpen = bodyLow - bodySize * 0.3;
        finalClose = finalOpen + be;
        high = finalClose + bodySize * 0.2;
        low  = finalOpen - bodySize * 0.2;
        dir = 'up';
        break;

      // ----- 8. BEARISH ENGULF -----
      case 'bearish_engulf':
        var bg = bodySize * 1.6;
        finalOpen = bodyHigh + bodySize * 0.3;
        finalClose = finalOpen - bg;
        high = finalOpen + bodySize * 0.2;
        low  = finalClose - bodySize * 0.2;
        dir = 'down';
        break;

      // ----- 9. MARUBOZU BULL -----
      case 'marubozu_bull':
        // No wicks, all green
        var mb1 = bodySize * 1.5;
        finalOpen = bodyLow;
        finalClose = finalOpen + mb1;
        high = finalClose;
        low  = finalOpen;
        dir = 'up';
        break;

      // ----- 10. MARUBOZU BEAR -----
      case 'marubozu_bear':
        var mb2 = bodySize * 1.5;
        finalOpen = bodyHigh;
        finalClose = finalOpen - mb2;
        high = finalOpen;
        low  = finalClose;
        dir = 'down';
        break;

      // ----- 11. LONG BODY BULL -----
      case 'long_body_bull':
        var lb1 = bodySize * 1.8;
        finalOpen = bodyLow;
        finalClose = finalOpen + lb1;
        high = finalClose + bodySize * 0.2;
        low  = finalOpen - bodySize * 0.15;
        dir = 'up';
        break;

      // ----- 12. LONG BODY BEAR -----
      case 'long_body_bear':
        var lb2 = bodySize * 1.8;
        finalOpen = bodyHigh;
        finalClose = finalOpen - lb2;
        high = finalOpen + bodySize * 0.15;
        low  = finalClose - bodySize * 0.2;
        dir = 'down';
        break;

      // ----- 13. SPINNING TOP -----
      case 'spinning_top':
        // Small body middle, equal wicks
        var st = bodySize * 0.3;
        var midST = (bodyHigh + bodyLow) / 2;
        finalOpen = midST - st / 2;
        finalClose = midST + st / 2;
        high = midST + bodySize * 1.5;
        low  = midST - bodySize * 1.5;
        break;

      // ----- 14. RANDOM -----
      case 'random':
        var pick = BEHAVIORS[Math.floor(Math.random() * 13)];
        return applyBehavior(pick, open, close, targetDir);
    }

    // Safety
    if (high < Math.max(finalOpen, finalClose)) {
      high = Math.max(finalOpen, finalClose) + bodySize * 0.1;
    }
    if (low > Math.min(finalOpen, finalClose)) {
      low = Math.min(finalOpen, finalClose) - bodySize * 0.1;
    }

    return {
      open: r2(finalOpen),
      high: r2(high),
      low: r2(low),
      close: r2(finalClose),
      direction: dir,
      behavior: behavior
    };
  }

  window.applyCandleBehavior = applyBehavior;
  console.log('[Phase7-9-A] applyCandleBehavior() ready');

  // ==========================================================
  // B4. AUTO-DETECT: Find Auto-Runner function
  // ==========================================================

  var detected = {
    generatorFn: null,
    generatorName: null,
    behaviorGetter: null
  };

  var CANDIDATE_NAMES = [
    'generateCandle',
    'createCandle',
    'startNewCandle',
    'writeLiveCandle',
    'buildCandle',
    'makeCandle',
    'newCandle',
    'autoCandle',
    'runAutoMode',
    'tickCandle'
  ];

  function detectGenerator() {
    for (var i = 0; i < CANDIDATE_NAMES.length; i++) {
      var name = CANDIDATE_NAMES[i];
      if (typeof window[name] === 'function') {
        detected.generatorFn = window[name];
        detected.generatorName = name;
        console.log('[Phase7-9-A] Detected:', name);
        return true;
      }
    }
    return false;
  }

  window.__phase7_9_detect = detected;
  window.__phase7_9_detectFn = detectGenerator;

  // ==========================================================
  // B5. AUTO-DETECT: Find behavior getter
  // ==========================================================

  function detectBehaviorGetter() {
    // Try common patterns
    if (typeof window.getBehaviorForCandle === 'function') {
      detected.behaviorGetter = window.getBehaviorForCandle;
      return true;
    }
    if (typeof window.getNextBehavior === 'function') {
      detected.behaviorGetter = window.getNextBehavior;
      return true;
    }
    // Default: read from settings
    detected.behaviorGetter = function() {
      try {
        var s = window.adminSettings || window.settings || {};
        return s.defaultBehavior || s.candleBehavior || 'normal';
      } catch(e) {
        return 'normal';
      }
    };
    return true;
  }

  detectBehaviorGetter();

  // ==========================================================
  // B6. EXPOSE
  // ==========================================================

  window.phase7_9 = {
    behaviors: BEHAVIORS,
    applyBehavior: applyBehavior,
    detect: detected,
    detectGenerator: detectGenerator,
    detectBehaviorGetter: detectBehaviorGetter
  };

  console.log('[Phase7-9-A] ✅ Part A loaded');

})();
