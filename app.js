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
  orderBy,
  onSnapshot,
  serverTimestamp
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

// DOM elements
const loginPage = document.getElementById("login-page");
const dashboardPage = document.getElementById("dashboard-page");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");
const message = document.getElementById("message");
const balanceEl = document.getElementById("balance");
const currentPriceEl = document.getElementById("current-price");
const tradeAmountInput = document.getElementById("trade-amount");
const callBtn = document.getElementById("call-btn");
const putBtn = document.getElementById("put-btn");
const tradeMessage = document.getElementById("trade-message");
const activeTradesList = document.getElementById("active-trades-list");
const historyList = document.getElementById("history-list");

// Globals
let currentUser = null;
let userBalance = 0;
let currentPrice = 50000;
let selectedTime = 60; // সেকেন্ড
let priceInterval = null;
let activeTradesUnsub = null;
let historyUnsub = null;
let activeTradesLocal = [];

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

// ===== টাইম সিলেকশন =====
document.querySelectorAll(".time-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".time-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedTime = parseInt(btn.dataset.time);
  });
});

// ===== Auth state =====
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    loginPage.classList.add("hidden");
    dashboardPage.classList.remove("hidden");
    message.textContent = "";

    // ব্যালেন্স লোড
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      userBalance = userDoc.data().balance || 0;
      balanceEl.textContent = userBalance.toFixed(2);
    }

    // চার্ট শুরু
    startPriceSimulation();
    // ট্রেড লোড
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
  }
});
// ===== প্রাইস সিমুলেশন =====
function startPriceSimulation() {
  if (priceInterval) clearInterval(priceInterval);
  
  currentPrice = 50000 + Math.random() * 1000;
  
  priceInterval = setInterval(() => {
    // র্যান্ডম মুভমেন্ট (-30 থেকে +30)
    const change = (Math.random() - 0.5) * 60;
    currentPrice = Math.max(1000, currentPrice + change);
    currentPriceEl.textContent = currentPrice.toFixed(2);
    
    // রঙ পরিবর্তন
    if (change >= 0) {
      currentPriceEl.style.color = "#3fb950";
    } else {
      currentPriceEl.style.color = "#f85149";
    }
    
    // অ্যাক্টিভ ট্রেডের সময় শেষ হলে চেক
    checkExpiredTrades();
  }, 1000);
}

function stopPriceSimulation() {
  if (priceInterval) {
    clearInterval(priceInterval);
    priceInterval = null;
  }
}

// ===== ট্রেড প্লেস =====
async function placeTrade(type) {
  if (!currentUser) return;
  
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
  
  const entryPrice = currentPrice;
  const expiresAt = Date.now() + (selectedTime * 1000);
  
  try {
    // ব্যালেন্স থেকে কেটে নিন
    const newBalance = userBalance - amount;
    await updateDoc(doc(db, "users", currentUser.uid), {
      balance: newBalance
    });
    userBalance = newBalance;
    balanceEl.textContent = userBalance.toFixed(2);
    
    // ট্রেড তৈরি
    await addDoc(collection(db, "trades"), {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      type: type, // "call" অথবা "put"
      amount: amount,
      entryPrice: entryPrice,
      expiresAt: expiresAt,
      status: "pending",
      result: null,
      profit: 0,
      createdAt: new Date().toISOString()
    });
    
    tradeMessage.style.color = "#3fb950";
    tradeMessage.textContent = `${type.toUpperCase()} ট্রেড $${amount} এ প্লেস হয়েছে`;
    
    // ২ সেকেন্ড পরে মেসেজ মুছুন
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

// ===== ট্রেড এক্সপায়ারি চেক =====
async function checkExpiredTrades() {
  if (!currentUser) return;
  
  const now = Date.now();
  
  for (const trade of activeTradesLocal) {
    if (trade.expiresAt <= now && trade.status === "pending") {
      // এই ট্রেডের ফলাফল নির্ধারণ
      const exitPrice = currentPrice;
      const entryPrice = trade.entryPrice;
      
      let result = "loss";
      
      if (trade.type === "call" && exitPrice > entryPrice) {
        result = "win";
      } else if (trade.type === "put" && exitPrice < entryPrice) {
        result = "win";
      }
      
      // পেআউট (৮৫%)
      const profit = result === "win" 
        ? trade.amount * 1.85  // জিতলে $10 → $18.50
        : 0;
      
      try {
        // ট্রেড আপডেট
        await updateDoc(doc(db, "trades", trade.id), {
          status: "completed",
          result: result,
          exitPrice: exitPrice,
          profit: profit,
          completedAt: new Date().toISOString()
        });
        
        // জিতলে ব্যালেন্স বাড়ান
        if (result === "win") {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          const currentBal = userDoc.data().balance || 0;
          const newBal = currentBal + profit;
          
          await updateDoc(doc(db, "users", currentUser.uid), {
            balance: newBal
          });
          
          userBalance = newBal;
          balanceEl.textContent = userBalance.toFixed(2);
          
          tradeMessage.style.color = "#3fb950";
          tradeMessage.textContent = `🎉 জিতেছেন! +$${profit.toFixed(2)}`;
        } else {
          tradeMessage.style.color = "#f85149";
          tradeMessage.textContent = `😔 হেরেছেন -$${trade.amount.toFixed(2)}`;
        }
        
        setTimeout(() => {
          tradeMessage.textContent = "";
        }, 3000);
        
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
      activeTradesList.innerHTML = '<p style="color:#8b949e; font-size:13px;">কোনো চলমান ট্রেড নেই</p>';
      return;
    }
    
    snapshot.forEach((docSnap) => {
      const trade = { id: docSnap.id, ...docSnap.data() };
      activeTradesLocal.push(trade);
      
      const remaining = Math.max(0, Math.ceil((trade.expiresAt - Date.now()) / 1000));
      
      const div = document.createElement("div");
      div.className = `trade-item ${trade.type}`;
      div.innerHTML = `
        <div class="trade-info">
          <span class="trade-type ${trade.type}">${trade.type.toUpperCase()}</span>
          <span class="trade-time">$${trade.amount} @ ${trade.entryPrice.toFixed(2)}</span>
        </div>
        <div class="trade-result pending">${remaining}s</div>
      `;
      activeTradesList.appendChild(div);
    });
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
      historyList.innerHTML = '<p style="color:#8b949e; font-size:13px;">এখনো কোনো ট্রেড সম্পন্ন হয়নি</p>';
      return;
    }
    
    const trades = [];
    snapshot.forEach((docSnap) => {
      trades.push({ id: docSnap.id, ...docSnap.data() });
    });
    
    // নতুন আগে
    trades.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    
    // সর্বোচ্চ ২০টি দেখান
    trades.slice(0, 20).forEach((trade) => {
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
