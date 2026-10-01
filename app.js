// ============================================
// QUOTEX CLONE — app.js v27 (FIXED)
// Part 1 of 5: Guards + Imports + Firebase + DOM + Auth
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

window.chartRef = null;
window.chart = null;

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

    if (typeof initChart === "function") initChart();
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

function initChart() {
  console.log('>>> initChart() START');

  if (!chartEl) {
    console.error('[CHART] tv-chart element not found');
    return;
  }

  if (window.__chartInitDone) {
    console.log('[CHART] Already initialized, skipping');
    return;
  }

  if (!window.__chartLayoutReady) {
    window.__chartLayoutReady = true;
    console.log('[CHART] Waiting for layout...');
    setTimeout(function() {
      try { initChart(); } catch(e) { console.error('[CHART] retry error:', e); }
    }, 200);
    return;
  }

  try {
    var wrapperRect = chartWrapper ? chartWrapper.getBoundingClientRect() : null;
    var wrapperHeight = wrapperRect ? wrapperRect.height : 0;

    if (!wrapperHeight || wrapperHeight < 100) {
      wrapperHeight = Math.max(380, Math.round(window.innerHeight * 0.5));
    }

    if (chartWrapper) {
      chartWrapper.style.height = wrapperHeight + 'px';
      chartWrapper.style.minHeight = wrapperHeight + 'px';
    }
    chartEl.style.height = wrapperHeight + 'px';
    chartEl.style.minHeight = wrapperHeight + 'px';
    chartEl.innerHTML = "";

    if (chart) {
      try { chart.remove(); } catch(e) {}
      chart = null;
    }

    if (typeof window.QuotexChart !== 'function') {
      console.error('[CHART] QuotexChart class not loaded!');
      return;
    }

    var realChart = new window.QuotexChart(chartEl, {
      width: chartEl.clientWidth || window.innerWidth,
      height: wrapperHeight,
      showGrid: true,
      showWatermark: true,
      showCrosshair: true,
      watermarkText: 'QUOTEX',
      visibleCandleCount: 60,
      candleSpacing: 6,
      candleBodyRatio: 0.75
    });

    chart = realChart;
    window.chart = realChart;
    window.chartRef = realChart;

    candleSeries = realChart.addCandlestickSeries({
      upColor: "#00c076",
      downColor: "#ff3b30",
      borderUpColor: "#00c076",
      borderDownColor: "#ff3b30",
      wickUpColor: "#00c076",
      wickDownColor: "#ff3b30"
    });
    window.candleSeries = candleSeries;

    try {
      var pd = document.getElementById("qx-price-dot");
      if (pd) pd.style.display = "none";
    } catch(e) {}

    try {
      var htmlTimeLabels = document.getElementById('qx-time-labels');
      if (htmlTimeLabels) htmlTimeLabels.style.display = 'none';
    } catch(e) {}

    try {
      realChart.timeScale().subscribeVisibleTimeRangeChange(function() {
        if (typeof redrawDrawings === "function") redrawDrawings();
        if (typeof updateEntryLine === "function") updateEntryLine();
        if (typeof refreshVerticalLines === "function") refreshVerticalLines();
      });
    } catch(e) {}

    if (typeof initDrawingSystem === "function") {
      try { initDrawingSystem(); } catch(e) {}
    }

    window.__chartInitDone = true;
    console.log('[CHART] ✅ Init complete');

    // Firestore candle consumer trigger
    if (typeof window.initAdminCandleConsumer === 'function') {
      setTimeout(function() {
        window.initAdminCandleConsumer();
      }, 500);
    }

  } catch(err) {
    console.error('[CHART] ❌ FATAL ERROR:', err);
  }
}

function convertTimeframe(tf) {
  var map = {
    "5s": "5s", "10s": "10s", "15s": "15s", "30s": "30s",
    "1m": "1m", "2m": "2m", "3m": "3m", "5m": "5m",
    "10m": "10m", "15m": "15m", "30m": "30m",
    "1h": "1h", "4h": "4h", "1d": "1d"
  };
  return map[tf] || "1m";
}

async function loadCandles() {
  // Binance disabled — Firestore use হবে
  if (window.USE_BINANCE !== true) {
    if (typeof window.switchToAdminMarket === 'function') {
      await window.switchToAdminMarket(window.selectedAsset || 'BTCUSDT');
    }
    return;
  }
}

function startLivePrice() {
  // Binance WS disabled — Firestore use হবে
  if (window.USE_BINANCE !== true) return;
}

function stopLivePrice() {
  if (livePriceWS) {
    try { livePriceWS.close(); } catch(e) {}
    livePriceWS = null;
  }
}

function updateTimeLabels() {
  try {
    var labelsEl = document.getElementById("qx-time-labels");
    if (!labelsEl) return;
    if (!window.chartRef || !window.candleSeries) return;

    var range = null;
    try { range = window.chartRef.timeScale().getVisibleRange(); } catch(e) {}
    if (!range || !range.from || !range.to) { labelsEl.innerHTML = ""; return; }

    var data = window.candleSeries.data();
    if (!data || data.length === 0) { labelsEl.innerHTML = ""; return; }

    var visible = [];
    for (var i = 0; i < data.length; i++) {
      if (data[i].time >= range.from && data[i].time <= range.to) {
        visible.push(data[i]);
      }
    }

    if (visible.length < 2) { labelsEl.innerHTML = ""; return; }

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

    labelsEl.innerHTML = labels.map(function(l, i) {
      var active = (i === Math.floor(labels.length / 2)) ? " active" : "";
      return '<span class="qx-time-label' + active + '">' + l + '</span>';
    }).join("");
  } catch(e) {}
}

function updateCandleCountdown() {
  try {
    if (!window.candleSeries) return;
    var data = window.candleSeries.data();
    if (!data || data.length === 0) return;

    var lastCandle = data[data.length - 1];
    var candleStartSec = lastCandle.time;
    var interval = convertTimeframe(selectedTimeframe);

    var intervalSec = 60;
    if (interval.indexOf("s") !== -1) intervalSec = parseInt(interval);
    else if (interval === "1m") intervalSec = 60;
    else if (interval === "5m") intervalSec = 300;
    else if (interval === "15m") intervalSec = 900;
    else if (interval === "1h") intervalSec = 3600;

    var nowSec = Math.floor(Date.now() / 1000);
    var nextCandleSec = candleStartSec + intervalSec;
    var remaining = Math.max(0, nextCandleSec - nowSec);

    var mm = Math.floor(remaining / 60);
    var ss = remaining % 60;
    var countdownStr = String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");

    var cdEl = document.getElementById("candle-countdown");
    if (cdEl) cdEl.textContent = countdownStr;

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

window.initChart = initChart;
window.loadCandles = loadCandles;
window.startLivePrice = startLivePrice;
window.stopLivePrice = stopLivePrice;
window.updateTimeLabels = updateTimeLabels;
window.updateCandleCountdown = updateCandleCountdown;
window.convertTimeframe = convertTimeframe;

console.log("===== PART 2 LOADED =====");

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
  drawings.forEach(function(drawing) { drawShape(drawing); });
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
  });
}

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
})();

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
})();

(function initTimeframeModal() {
  var badge = document.getElementById("tf-badge");
  var modal = document.getElementById("tf-modal");
  var overlay = document.getElementById("tf-overlay");
  var closeBtn = document.getElementById("tf-close");
  var activeLabel = document.getElementById("qx-tf-active");

  if (!modal) return;

  function openModal() { modal.classList.remove("hidden"); }
  function closeModal() { modal.classList.add("hidden"); }

  if (badge) badge.addEventListener("click", openModal);
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (overlay) overlay.addEventListener("click", closeModal);

  modal.querySelectorAll(".qx-tf-item").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      modal.querySelectorAll(".qx-tf-item").forEach(function(b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      var tf = btn.dataset.tf;
      selectedTimeframe = tf;
      window.selectedTimeframe = tf;
      if (activeLabel) activeLabel.textContent = tf;
      closeModal();
    });
  });
})();

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
})();

window.initDrawingSystem = initDrawingSystem;
window.resizeDrawingCanvas = resizeDrawingCanvas;
window.redrawDrawings = redrawDrawings;
window.clearAllDrawings = clearAllDrawings;

console.log("===== PART 3 LOADED =====");

window.__activeEntryData = null;
window.__activePriceLine = null;

function updateEntryLine() { return; }
function renderEntryLine(type, entryPrice, expiresAt) { return; }

function clearEntryLine() {
  window.__activeEntryData = null;
  if (window.__activePriceLine) {
    try { window.candleSeries.removePriceLine(window.__activePriceLine); } catch(e) {}
    window.__activePriceLine = null;
  }
}

window.__activeVLines = null;

function renderVerticalLines(startTime, endTime) {
  window.__activeVLines = { startTime: startTime, endTime: endTime };
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
    }
    if (endX !== null && endX !== undefined) {
      var vEnd = document.createElement("div");
      vEnd.className = "qx-vline end";
      vEnd.style.left = endX + "px";
      container.appendChild(vEnd);
    }
  } catch(e) {}
}

function clearVerticalLines() {
  window.__activeVLines = null;
  var container = document.getElementById("qx-vline-container");
  if (container) container.innerHTML = "";
}

window.refreshVerticalLines = refreshVerticalLines;

function renderTickMark(type, entryPrice, entryTime) {
  renderAllMarkers();
}

window.__entryPriceLines = [];

function renderAllMarkers() {
  try {
    var container = document.getElementById("qx-tick-container");
    if (!container) return;
    container.innerHTML = "";

    var trades = window.activeTradesLocal || [];
    if (trades.length === 0) return;

    if (!window.chartRef || !window.candleSeries) return;
    var candleData = window.candleSeries.data();
    if (!candleData || candleData.length === 0) return;

    trades.forEach(function(trade) {
      if (trade.status !== "pending") return;
      if (!trade.entryTime || !trade.entryPrice) return;

      var entrySec = Math.floor(new Date(trade.entryTime).getTime() / 1000);
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

      var xPos = window.chartRef.timeScale().timeToCoordinate(closestCandleTime);
      var yPos = window.candleSeries.priceToCoordinate(trade.entryPrice);
      if (xPos === null || yPos === null) return;

      var isCall = trade.type === "call";
      var color = isCall ? "#00c853" : "#ff5252";

      var line = document.createElement("div");
      line.style.cssText =
        "position:absolute;" +
        "left:" + (xPos - 15) + "px;" +
        "top:" + (yPos - 1.5) + "px;" +
        "width:30px;height:3px;" +
        "background:" + color + ";" +
        "border-radius:2px;" +
        "z-index:40;pointer-events:none;";
      container.appendChild(line);
    });
  } catch(e) {}
}

function clearTickMark() {
  var container = document.getElementById("qx-tick-container");
  if (container) container.innerHTML = "";
}

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

    renderEntryLine(type, entryPrice, expiresAt);
    renderVerticalLines(entryTime, expiresAt);
    renderTickMark(type, entryPrice, entryTime);

    setTimeout(function() {
      var tm = document.getElementById("trade-message");
      if (tm) tm.textContent = "";
    }, 2000);
  } catch (error) {
    showMsg(error.message);
  }
}

function bindTradeButtons() {
  var callBtnEl = document.getElementById("call-btn");
  var putBtnEl = document.getElementById("put-btn");

  if (callBtnEl && callBtnEl.dataset.bound !== "1") {
    callBtnEl.dataset.bound = "1";
    callBtnEl.addEventListener("click", function(e) {
      e.preventDefault();
      placeTrade("call");
    });
  }
  if (putBtnEl && putBtnEl.dataset.bound !== "1") {
    putBtnEl.dataset.bound = "1";
    putBtnEl.addEventListener("click", function(e) {
      e.preventDefault();
      placeTrade("put");
    });
  }
}

bindTradeButtons();
setTimeout(bindTradeButtons, 1500);

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

        clearEntryLine();
        clearVerticalLines();
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
        } else {
          showResultFlash("loss");
          playSound("loss");
        }
      } catch (error) {
        console.error("Trade expire error:", error);
      }
    }
  }
}

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

  var topTimerWrap = document.getElementById("top-countdown-timer");
  if (topTimerWrap) topTimerWrap.classList.remove("hidden");
}

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

    if (activeCount) activeCount.textContent = activeTradesLocal.length;
    updateBigTimer();
  });
}

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

    if (snapshot.empty) {
      if (historyList) historyList.innerHTML = '<p class="qx-empty">No trade history yet</p>';
      return;
    }

    var trades = [];
    snapshot.forEach(function(docSnap) {
      trades.push(Object.assign({ id: docSnap.id }, docSnap.data()));
    });
    trades.sort(function(a, b) {
      return new Date(b.completedAt || 0) - new Date(a.completedAt || 0);
    });

    trades.slice(0, 30).forEach(function(trade) {
      var card = document.createElement("div");
      card.className = "qx-trade-card " + (trade.result || "");
      var pl = trade.result === "win"
        ? "+$" + Number(trade.profit || 0).toFixed(2)
        : "-$" + Number(trade.amount || 0).toFixed(2);

      card.innerHTML =
        '<div class="qx-tc-left">' +
          '<div class="qx-tc-symbol">' + (trade.asset || "BTC/USDT") +
            '<span class="qx-tc-type-badge ' + trade.type + '">' + trade.type.toUpperCase() + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="qx-tc-right">' +
          '<div class="qx-tc-pl ' + trade.result + '">' + pl + '</div>' +
        '</div>';

      if (historyList) historyList.appendChild(card);
    });
  });
}

setInterval(function() {
  if (currentUser && activeTradesLocal.length > 0) {
    updateBigTimer();
    updateCandleCountdown();
  }

  var timers = document.querySelectorAll(".qx-tc-timer[data-expires]");
  timers.forEach(function(el) {
    var expires = parseInt(el.dataset.expires);
    var remaining = Math.max(0, Math.ceil((expires - Date.now()) / 1000));
    var m = Math.floor(remaining / 60);
    var s = remaining % 60;
    el.textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  });

  if (currentUser) updateCandleCountdown();
}, 1000);

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

function openPopup(popup, overlay) {
  if (!popup) return;
  popup.classList.remove("hidden");
  if (overlay) overlay.onclick = function() { closePopup(popup); };
}

function closePopup(popup) {
  if (!popup) return;
  popup.classList.add("hidden");
}

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
  });
}

function updateAccountOptionState() {
  document.querySelectorAll(".qx-acc-option").forEach(function(opt) {
    var type = opt.dataset.accType;
    opt.classList.toggle("active", type === accountType);
  });
}

(function initQuotexBalancePopup() {
  document.querySelectorAll(".qx-acc-option").forEach(function(opt) {
    opt.addEventListener("click", function(e) {
      if (e.target.closest(".qx-acc-edit")) return;
      var type = opt.dataset.accType;
      if (typeof switchAccount === "function") switchAccount(type);
      updateAccountOptionState();
    });
  });

  var closeBtn = document.getElementById("balance-popup-close");
  var overlay = document.getElementById("balance-popup-overlay");
  var popup = document.getElementById("balance-popup");

  if (closeBtn && popup) {
    closeBtn.addEventListener("click", function() { popup.classList.add("hidden"); });
  }
  if (overlay && popup) {
    overlay.addEventListener("click", function() { popup.classList.add("hidden"); });
  }

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
})();

async function switchAccount(type) {
  accountType = type;
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
}

(function initDeposit() {
  var btn = document.getElementById("deposit-btn");
  var closeBtn = document.getElementById("deposit-popup-close");
  var overlay = document.getElementById("deposit-popup-overlay");
  var popup = document.getElementById("deposit-popup");

  if (btn && popup) {
    btn.addEventListener("click", function() { openPopup(popup, overlay); });
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
          userId: currentUser.uid, email: currentUser.email,
          amount: amount, txid: txid, method: "manual",
          status: "pending", createdAt: new Date().toISOString()
        });
        msg.style.color = "#00c853";
        msg.textContent = "Request sent!";
        setTimeout(function() { popup.classList.add("hidden"); msg.textContent = ""; }, 1500);
      } catch (err) {
        msg.style.color = "#ff5252";
        msg.textContent = err.message;
      }
    });
  }
})();

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
      if (amount > userBalance) { msg.style.color = "#ff5252"; msg.textContent = "Insufficient"; return; }
      if (!number) { msg.style.color = "#ff5252"; msg.textContent = "Enter number"; return; }

      try {
        await addDoc(collection(db, "withdrawals"), {
          userId: currentUser.uid, email: currentUser.email,
          amount: amount, method: method, number: number,
          status: "pending", createdAt: new Date().toISOString()
        });
        msg.style.color = "#00c853";
        msg.textContent = "Request sent!";
        setTimeout(function() { popup.classList.add("hidden"); msg.textContent = ""; }, 1500);
      } catch (err) {
        msg.style.color = "#ff5252";
        msg.textContent = err.message;
      }
    });
  }
})();

(function initNotif() {
  var btn = document.getElementById("notif-btn");
  if (!btn) return;
  btn.addEventListener("click", function() {
    var badge = document.getElementById("notif-badge");
    if (badge) { badge.textContent = "0"; badge.style.display = "none"; }
  });
})();

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
  } catch (err) {}
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
          from: "user", text: text, timestamp: new Date().toISOString()
        });
        input.value = "";
      } catch(e) {}
    });
  }

  if (closeBtn) closeBtn.addEventListener("click", closeUserChat);
  if (overlay) overlay.addEventListener("click", closeUserChat);
})();

(function initMoreMenu() {
  var closeBtn = document.getElementById("more-menu-close");
  var overlay = document.getElementById("more-menu-overlay");
  var menu = document.getElementById("more-menu");

  function close() { if (menu) menu.classList.add("hidden"); }

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
      } else if (action === "chat") {
        openUserChat();
      } else if (action === "logout") {
        signOut(auth);
      }
    });
  });
})();

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

(function initPendingToggle() {
  var btn = document.getElementById("pending-toggle");
  if (!btn) return;
  btn.addEventListener("click", function() {
    btn.classList.toggle("active");
  });
})();

(function initAssetSelect() {
  var sel = document.getElementById("asset-select");
  if (!sel) return;
  sel.addEventListener("change", function() {
    selectedAsset = sel.value;
    window.selectedAsset = sel.value;
  });
})();

window.switchAccount = switchAccount;
window.openUserChat = openUserChat;
window.closeUserChat = closeUserChat;
window.openPopup = openPopup;
window.closePopup = closePopup;

console.log("===== PART 5 LOADED =====");

setInterval(function() {
  try {
    if (!window.candleSeries) return;
    var trades = window.activeTradesLocal || [];
    var pendingCount = 0;
    for (var i = 0; i < trades.length; i++) {
      if (trades[i].status === "pending") pendingCount++;
    }
    if (pendingCount > 0) renderAllMarkers();
  } catch(e) {}
}, 1500);

window.USE_BINANCE = false;

console.log('[BIN-C] Binance flag: DISABLED');

window.fsCandleState = {
  listening: false,
  marketId: null,
  unsubLive: null,
  unsubMarket: null,
  candles: [],
  lastCandleTime: 0,
  lastPrice: 0
};

console.log('[FS] Step 2A loaded');

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

window.marketCache = window.marketCache || {};

window.resolveMarketId = async function(symbol) {
  if (!symbol) return null;
  if (window.marketCache[symbol]) return window.marketCache[symbol];

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
    if (snap.empty) return [];

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
  if (!window.candleSeries) return;
  if (!candles || candles.length === 0) return;

  var chartData = candles.map(function(c) {
    var t = c.startTime || c.time || 0;
    if (t > 1e12) t = Math.floor(t / 1000);
    else if (t > 1e9) t = Math.floor(t);
    else t = 0;

    return {
      time: t,
      open: Number(c.open || 0),
      high: Number(c.high || 0),
      low: Number(c.low || 0),
      close: Number(c.close || 0)
    };
  }).filter(function(c) {
    return c.time > 0 && c.open > 0 && c.close > 0 && c.high >= c.low;
  });

  chartData.sort(function(a, b) { return a.time - b.time; });

  var seen = {};
  var unique = [];
  chartData.forEach(function(c) {
    if (!seen[c.time]) {
      seen[c.time] = true;
      unique.push(c);
    }
  });

  if (unique.length === 0) return;

  try {
    var wasAtEnd = true;
    if (window.chartRef && window.chartRef.candles.length > 0) {
      var chart = window.chartRef;
      var pad = chart.options.padding;
      var chartW = chart.options.width - pad.left - pad.right;
      var maxVisible = Math.ceil(chartW / chart.viewport.candleSpacing);
      var maxOffset = Math.max(0, chart.candles.length - maxVisible + chart.options.rightOffsetCandles);
      wasAtEnd = Math.abs(chart.viewport.offsetX - maxOffset) < 5;
    }

    window.candleSeries.setData(unique);

    if (window.chartRef && wasAtEnd) {
      window.chartRef.scrollToRealTime();
      window.chartRef._autoScale();
    }

    var last = unique[unique.length - 1];
    window.currentPrice = last.close;
    window.fsCandleState.lastPrice = last.close;

    var priceEl = document.getElementById('current-price');
    if (priceEl) {
      priceEl.textContent = last.close.toFixed(2);
      priceEl.style.color = last.close >= last.open ? '#00c853' : '#ff5252';
    }

    console.log('[FS-B] ✅ Chart updated:', unique.length, 'candles');
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
})();

console.log('===== STEP 2B: CHART INTEGRATION LOADED =====');

(function patchStartLivePrice() {
  if (typeof window.startLivePrice !== 'function') return;
  window.startLivePrice = function() {
    if (!window.USE_BINANCE) return;
  };
})();

(function patchLoadCandles() {
  if (typeof window.loadCandles !== 'function') return;
  window.loadCandles = async function() {
    if (!window.USE_BINANCE) {
      if (typeof window.switchToAdminMarket === 'function') {
        var symbol = window.selectedAsset || 'BTCUSDT';
        await window.switchToAdminMarket(symbol);
      }
      return;
    }
  };
})();

console.log('===== app.js COMPLETE — ALL FEATURES LOADED =====');
