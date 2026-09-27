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

// ===== DOM =====
const loginPage = document.getElementById("login-page");
const dashboardPage = document.getElementById("dashboard-page");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");
const message = document.getElementById("message");
const balanceEl = document.getElementById("balance");
const balanceChangeEl = document.getElementById("balance-change");
const userEmailDisplay = document.getElementById("user-email-display");
const currentPriceEl = document.getElementById("current-price");
const priceArrowEl = document.getElementById("price-arrow");
const tradeAmountInput = document.getElementById("trade-amount");
const callBtn = document.getElementById("call-btn");
const putBtn = document.getElementById("put-btn");
const tradeMessage = document.getElementById("trade-message");
const activeTradesList = document.getElementById("active-trades-list");
const historyList = document.getElementById("history-list");
const bigTimer = document.getElementById("big-timer");
const activeCount = document.getElementById("active-count");
const assetSelect = document.getElementById("asset-select");

// ===== Globals =====
let currentUser = null;
let userBalance = 0;
let currentPrice = 50000;
let prevPrice = 50000;
let selectedTime = 60;
let selectedTimeframe = "1m";
let selectedAsset = "BTCUSDT";
let activeTradesUnsub = null;
let historyUnsub = null;
let activeTradesLocal = [];
let lastTradeTime = 0;
let livePriceWS = null;
let chart = null;
let candleSeries = null;
let priceLinesMap = {};  // trade.id -> priceLine

// ===== সাউন্ড =====
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
  } catch (e) { console.log("Sound error:", e); }
}

function showResultFlash(result) {
  const flash = document.createElement("div");
  flash.className = `result-flash ${result}`;
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 600);
}

function animateBalanceChange(amount) {
  if (amount > 0) {
    balanceChangeEl.textContent = `+$${amount.toFixed(2)}`;
    balanceChangeEl.className = "balance-change up";
  } else {
    balanceChangeEl.textContent = `-$${Math.abs(amount).toFixed(2)}`;
    balanceChangeEl.className = "balance-change down";
  }
  setTimeout(() => {
    balanceChangeEl.textContent = "";
    balanceChangeEl.className = "balance-change";
  }, 3000);
}
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
      role: "user",
      createdAt: new Date().toISOString()
    });
    message.style.color = "#3fb950";
    message.textContent = "রেজিস্ট্রেশন সফল! ব্যালেন্স $1000";
  } catch (error) {
    message.style.color = "#f85149";
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
    message.style.color = "#3fb950";
    message.textContent = "লগইন সফল!";
  } catch (error) {
    message.style.color = "#f85149";
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

// ===== টাইম সিলেকশন =====
document.querySelectorAll(".time-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".time-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedTime = parseInt(btn.dataset.time);
  });
});

// ===== টাইমফ্রেম =====
document.querySelectorAll(".tf-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    document.querySelectorAll(".tf-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedTimeframe = btn.dataset.tf;
    await loadCandles();
  });
});

// ===== অ্যাসেট পরিবর্তন =====
if (assetSelect) {
  assetSelect.addEventListener("change", async () => {
    selectedAsset = assetSelect.value;
    await loadCandles();
  });
}

// ===== ট্যাব =====
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

// ===== Auth State =====
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    loginPage.classList.add("hidden");
    dashboardPage.classList.remove("hidden");
    message.textContent = "";
    userEmailDisplay.textContent = user.email;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      userBalance = userDoc.data().balance || 0;
      balanceEl.textContent = userBalance.toFixed(2);
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

// ===== Lightweight Chart তৈরি =====
function initChart() {
  const chartEl = document.getElementById("chart");
  if (!chartEl) return;

  chartEl.innerHTML = "";

  if (chart) {
    try { chart.remove(); } catch (e) {}
    chart = null;
  }

  chart = LightweightCharts.createChart(chartEl, {
    width: chartEl.clientWidth,
    height: 280,
    layout: {
      background: { color: "#0a0e17" },
      textColor: "#8b949e",
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
      borderColor: "#21262d",
      scaleMargins: { top: 0.1, bottom: 0.1 }
    },
    timeScale: {
      borderColor: "#21262d",
      timeVisible: true,
      secondsVisible: false
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
    upColor: "#3fb950",
    downColor: "#f85149",
    borderUpColor: "#3fb950",
    borderDownColor: "#f85149",
    wickUpColor: "#3fb950",
    wickDownColor: "#f85149"
  });

  window.addEventListener("resize", () => {
    if (chart && chartEl) {
      chart.applyOptions({ width: chartEl.clientWidth });
    }
  });
}

// ===== Binance থেকে ক্যান্ডেল লোড =====
async function loadCandles() {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${selectedAsset}&interval=${selectedTimeframe}&limit=100`;
    const res = await fetch(url);
    const data = await res.json();

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

  const streamName = selectedAsset.toLowerCase() + "@kline_" + selectedTimeframe;
  const url = `wss://stream.binance.com:9443/ws/${streamName}`;

  try {
    livePriceWS = new WebSocket(url);

    livePriceWS.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (!msg.k) return;

      const k = msg.k;
      const price = parseFloat(k.c);

      prevPrice = currentPrice;
      currentPrice = price;

      currentPriceEl.textContent = currentPrice.toFixed(2);

      if (currentPrice >= prevPrice) {
        currentPriceEl.style.color = "#3fb950";
        priceArrowEl.textContent = "▲";
        priceArrowEl.className = "price-arrow up";
      } else {
        currentPriceEl.style.color = "#f85149";
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
// ===== বড় টাইমার =====
function updateBigTimer() {
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

  if (remaining <= 10) {
    bigTimer.style.borderColor = "#f85149";
    bigTimer.style.color = "#f85149";
  } else {
    bigTimer.style.borderColor = "#1f6feb";
    bigTimer.style.color = "#58a6ff";
  }
}

// ===== ট্রেড মার্কার (চার্টে) =====
function updateTradeMarkers() {
  if (!candleSeries) return;

  const markers = [];

  activeTradesLocal.forEach((trade) => {
    if (!trade.entryTime) return;
    const entryTimeSec = Math.floor(new Date(trade.entryTime).getTime() / 1000);

    markers.push({
      time: entryTimeSec,
      position: trade.type === "call" ? "belowBar" : "aboveBar",
      color: trade.type === "call" ? "#3fb950" : "#f85149",
      shape: trade.type === "call" ? "arrowUp" : "arrowDown",
      text: `${trade.type.toUpperCase()} $${trade.amount}`
    });
  });

  markers.sort((a, b) => a.time - b.time);
  candleSeries.setMarkers(markers);
}

// ===== ট্রেড প্লেস =====
async function placeTrade(type) {
  if (!currentUser) return;

  const now = Date.now();
  if (now - lastTradeTime < 500) return;
  lastTradeTime = now;

  const amount = parseFloat(tradeAmountInput.value);

  if (!amount || amount < 1) {
    tradeMessage.style.color = "#f85149";
    tradeMessage.textContent = "সর্বনিম্ন $1 ট্রেড করুন";
    return;
  }

  if (amount > userBalance) {
    tradeMessage.style.color = "#f85149";
    tradeMessage.textContent = "পর্যাপ্ত ব্যালেন্স নেই";
    return;
  }

  playSound("click");

  const entryPrice = currentPrice;
  const expiresAt = Date.now() + selectedTime * 1000;
  const entryTime = new Date().toISOString();

  try {
    const newBalance = userBalance - amount;
    await updateDoc(doc(db, "users", currentUser.uid), {
      balance: newBalance
    });
    userBalance = newBalance;
    balanceEl.textContent = userBalance.toFixed(2);
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
      status: "pending",
      result: null,
      profit: 0,
      createdAt: entryTime
    });

    tradeMessage.style.color = type === "call" ? "#3fb950" : "#f85149";
    tradeMessage.textContent = `${type.toUpperCase()} $${amount} প্লেস হয়েছে`;

    setTimeout(() => { tradeMessage.textContent = ""; }, 2000);

  } catch (error) {
    tradeMessage.style.color = "#f85149";
    tradeMessage.textContent = error.message;
  }
}

callBtn.addEventListener("click", () => placeTrade("call"));
putBtn.addEventListener("click", () => placeTrade("put"));

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

          await updateDoc(doc(db, "users", currentUser.uid), {
            balance: newBal
          });

          userBalance = newBal;
          balanceEl.textContent = userBalance.toFixed(2);
          animateBalanceChange(profit);
          showResultFlash("win");
          playSound("win");

          tradeMessage.style.color = "#3fb950";
          tradeMessage.textContent = `🎉 জিতেছেন! +$${profit.toFixed(2)}`;
        } else {
          showResultFlash("loss");
          playSound("loss");

          tradeMessage.style.color = "#f85149";
          tradeMessage.textContent = `😔 হেরেছেন -$${trade.amount.toFixed(2)}`;
        }

        setTimeout(() => { tradeMessage.textContent = ""; }, 3500);

      } catch (error) {
        console.error("Trade expire error:", error);
      }
    }
  }
}

// ===== অ্যাক্টিভ ট্রেড =====
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
      activeCount.textContent = "0";
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

    activeCount.textContent = activeTradesLocal.length;
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
          <span class="trade-type ${trade.type}">${trade.type.toUpperCase()} ${trade.result === "win" ? "✓" : "✗"}</span>
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
