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
  getDoc
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

const loginPage = document.getElementById("login-page");
const dashboardPage = document.getElementById("dashboard-page");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");
const message = document.getElementById("message");
const balanceEl = document.getElementById("balance");

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
      balance: 0,
      createdAt: new Date().toISOString()
    });
    message.style.color = "#3fb950";
    message.textContent = "রেজিস্ট্রেশন সফল!";
  } catch (error) {
    message.style.color = "#f85149";
    message.textContent = error.message;
  }
});

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

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginPage.classList.add("hidden");
    dashboardPage.classList.remove("hidden");
    message.textContent = "";

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        balanceEl.textContent = userDoc.data().balance || 0;
      }
    } catch (err) {
      console.error(err);
    }
  } else {
    loginPage.classList.remove("hidden");
    dashboardPage.classList.add("hidden");
    emailInput.value = "";
    passwordInput.value = "";
  }
});
