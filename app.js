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
