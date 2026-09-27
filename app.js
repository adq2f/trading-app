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

// ===== Globals =====
let currentUser = null;
let userBalance = 0;
let currentPrice = 50000;
let prevPrice = 50000;
let selectedTime = 60;
let priceInterval = null;
let activeTradesUnsub = null;
let historyUnsub = null;
let activeTradesLocal = [];
let priceHistory = [];
let lastTradeTime = 0;

// ===== সাউন্ড =====
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  try {
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    
    if (type === "click") {
      // ট্রেড নেওয়ার সাউন্ড — সংক্ষিপ্ত বিট
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
    } 
    else if (type === "win") {
      // জেতার সাউন্ড — আরোহী কর্ড
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        const startTime = audioCtx.currentTime + i * 0.1;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });
    } 
    else if (type === "loss") {
      // হারার সাউন্ড — অবরোহী
      const notes = [392, 329.63, 261.63];
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = freq;
        osc.type = "sawtooth";
        const startTime = audioCtx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    }
  } catch (e) {
    console.log("Sound error:", e);
  }
}

// ===== ফলাফল ফ্ল্যাশ =====
function showResultFlash(result) {
  const flash = document.createElement("div");
  flash.className = `result-flash ${result}`;
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 600);
}

// ===== ব্যালেন্স অ্যানিমেশন =====
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

// ===== পরিমাণ +/− বাটন =====
document.querySelectorAll(".amount-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    let val = parseFloat(tradeAmountInput.value) || 0;
    if (btn.dataset.action === "plus") {
      val += 5;
    } else {
      val = Math.max(1, val - 5);
    }
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

    // ব্যালেন্স লোড
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      userBalance = userDoc.data().balance || 0;
      balanceEl.textContent = userBalance.toFixed(2);
    }

    // চার্ট অ্যানিমেশন
    priceHistory = [];
    for (let i = 0; i < 50; i++) {
      priceHistory.push(currentPrice + (Math.random() - 0.5) * 200);
    }
    renderChart();

    // সিমুলেশন শুরু
    startPriceSimulation();
    loadActiveTrades();
    loadHistory();

  } else {
    currentUser = null;
    loginPage.classList.remove("hidden");
    dashboardPage.classList.add("hidden");
    emailInput.value = "";
    passwordInput.value = "";
    stopPriceSimulation();
    if (activeTradesUnsub) activeTradesUnsub();
    if (historyUnsub) historyUnsub();
    activeTradesLocal = [];
  }
});

// ===== প্রাইস সিমুলেশন =====
function startPriceSimulation() {
  if (priceInterval) clearInterval(priceInterval);

  currentPrice = 50000 + Math.random() * 1000;

  priceInterval = setInterval(() => {
    prevPrice = currentPrice;
    const change = (Math.random() - 0.5) * 60;
    currentPrice = Math.max(1000, currentPrice + change);

    // প্রাইস ডিসপ্লে আপডেট
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

    // চার্ট আপডেট
    priceHistory.push(currentPrice);
    if (priceHistory.length > 60) priceHistory.shift();
    renderChart();

    // ট্রেড চেক
    checkExpiredTrades();
    // বড় টাইমার আপডেট
    updateBigTimer();

  }, 1000);
}

function stopPriceSimulation() {
  if (priceInterval) {
    clearInterval(priceInterval);
    priceInterval = null;
  }
  bigTimer.classList.add("hidden");
}
// ===== চার্ট রেন্ডার (কাস্টম ক্যানভাস) =====
function renderChart() {
  const chartEl = document.getElementById("chart");
  if (!chartEl) return;

  // ক্যানভাস তৈরি (একবারই)
  if (!chartEl.querySelector("canvas")) {
    chartEl.innerHTML = '<canvas id="price-canvas"></canvas>';
  }

  const canvas = document.getElementById("price-canvas");
  const ctx = canvas.getContext("2d");
  const rect = chartEl.getBoundingClientRect();

  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const W = rect.width;
  const H = rect.height;

  // ব্যাকগ্রাউন্ড
  ctx.fillStyle = "#0a0e17";
  ctx.fillRect(0, 0, W, H);

  if (priceHistory.length < 2) return;

  const minP = Math.min(...priceHistory);
  const maxP = Math.max(...priceHistory);
  const range = maxP - minP || 1;
  const padding = range * 0.15;

  const min = minP - padding;
  const max = maxP + padding;

  const stepX = W / (priceHistory.length - 1);

  // গ্রিড লাইন
  ctx.strokeStyle = "#1a2332";
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const y = (H / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // প্রাইস লাইন
  const isUp = priceHistory[priceHistory.length - 1] >= priceHistory[0];
  const lineColor = isUp ? "#3fb950" : "#f85149";

  // এরিয়া ফিল
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, isUp ? "rgba(63, 185, 80, 0.25)" : "rgba(248, 81, 73, 0.25)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.beginPath();
  priceHistory.forEach((p, i) => {
    const x = i * stepX;
    const y = H - ((p - min) / (max - min)) * H;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // লাইন
  ctx.beginPath();
  priceHistory.forEach((p, i) => {
    const x = i * stepX;
    const y = H - ((p - min) / (max - min)) * H;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.stroke();

  // শেষ পয়েন্টে ডট
  const lastX = (priceHistory.length - 1) * stepX;
  const lastY = H - ((priceHistory[priceHistory.length - 1] - min) / (max - min)) * H;

  ctx.beginPath();
  ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
  ctx.fillStyle = lineColor;
  ctx.globalAlpha = 0.3;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
  ctx.fillStyle = lineColor;
  ctx.fill();
}

// ===== বড় টাইমার আপডেট =====
function updateBigTimer() {
  if (activeTradesLocal.length === 0) {
    bigTimer.classList.add("hidden");
    return;
  }

  // সবচেয়ে কম সময়ের ট্রেড খুঁজুন
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

// ===== ট্রেড প্লেস =====
async function placeTrade(type) {
  if (!currentUser) return;

  const now = Date.now();
  if (now - lastTradeTime < 500) return; // ডাবল ক্লিক প্রতিরোধ
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
  const expiresAt = Date.now() + (selectedTime * 1000);

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
      status: "pending",
      result: null,
      profit: 0,
      createdAt: new Date().toISOString()
    });

    tradeMessage.style.color = type === "call" ? "#3fb950" : "#f85149";
    tradeMessage.textContent = `${type.toUpperCase()} $${amount} প্লেস হয়েছে`;

    setTimeout(() => {
      tradeMessage.textContent = "";
    }, 2000);

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

        setTimeout(() => {
          tradeMessage.textContent = "";
        }, 3500);

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
      activeCount.textContent = "0";
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
      div.innerHTML = `
        <div class="trade-info">
          <span class="trade-type ${trade.type}">${trade.type.toUpperCase()}</span>
          <span class="trade-time">$${trade.amount} @ ${trade.entryPrice.toFixed(2)}</span>
        </div>
        <div class="trade-result ${trade.result}">
          ${trade.result === "win" ? "+$" + trade.profit.toFixed(2) : "-$" + trade.amount.toFixed(2)}
        </div>
      `;
      historyList.appendChild(div);
    });
  });
}

// ===== উইন্ডো রিসাইজে চার্ট আপডেট =====
window.addEventListener("resize", () => {
  setTimeout(renderChart, 100);
});
