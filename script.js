const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const forgotForm = document.getElementById("forgotForm");
const loginMessage = document.getElementById("loginMessage");
const signupMessage = document.getElementById("signupMessage");
const forgotMessage = document.getElementById("forgotMessage");
const tabLogin = document.getElementById("tabLogin");
const tabSignup = document.getElementById("tabSignup");
const title = document.getElementById("login-title");
const subtitle = document.getElementById("subtitle");
const storageStatus = document.getElementById("storageStatus");
const autoLoginAfterSignup = document.getElementById("autoLoginAfterSignup");
const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const backToLogin = document.getElementById("backToLogin");
const sendResetCode = document.getElementById("sendResetCode");
const carAnim = document.getElementById("carAnim");
const carEyeLeft = document.getElementById("carEyeLeft");
const carEyeRight = document.getElementById("carEyeRight");
const carBrowLeft = document.getElementById("carBrowLeft");
const carBrowRight = document.getElementById("carBrowRight");
const carMouth = document.getElementById("carMouth");
const loginPasswordField = document.getElementById("password");
const carWheels = document.querySelectorAll(".wheel");
const carBody = document.querySelector(".car-body");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LAST_EMAIL_KEY = "skyCarLastLoginEmail";
const cloudReadyPromise = window.skyCloud?.hydrateFromCloud?.() ?? Promise.resolve();

const firebaseApp = (() => {
  try {
    if (!window.firebase || !window.SKY_FIREBASE_CONFIG) {
      return null;
    }

    return window.firebase.apps.length
      ? window.firebase.app()
      : window.firebase.initializeApp(window.SKY_FIREBASE_CONFIG);
  } catch {
    return null;
  }
})();

const auth = firebaseApp ? firebaseApp.auth() : null;
const db = firebaseApp ? firebaseApp.firestore() : null;

async function refreshCloudBeforeAuth() {
  await cloudReadyPromise;
  await (window.skyCloud?.refreshFromCloud?.() ?? Promise.resolve());
}

if (storageStatus) {
  storageStatus.textContent = auth && db
    ? "Compte synchronisé avec Firebase Auth + Firestore."
    : "Firebase indisponible (vérifie firebase-config.js).";
}

if (carAnim && window.gsap) {
  window.gsap.set(carAnim, { x: 0, scaleX: 1 });

  const roadWidth = () => Math.max(180, window.innerWidth < 540 ? 210 : 470);

  const timeline = window.gsap.timeline({ repeat: -1, defaults: { ease: "power1.inOut" } });

  timeline
    .to(carAnim, { x: roadWidth(), duration: 2.4 })
    .set(carAnim, { scaleX: -1 })
    .to(carAnim, { x: 0, duration: 2.4 })
    .set(carAnim, { scaleX: 1 });

  if (carWheels.length > 0) {
    window.gsap.to(carWheels, {
      rotate: "+=360",
      duration: 0.35,
      ease: "none",
      repeat: -1,
      transformOrigin: "center center",
    });
  }

  if (carBody) {
    window.gsap.to(carBody, {
      y: -2,
      duration: 0.35,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });
  }
}

function setCarNeutral() {
  if (!window.gsap || !carEyeLeft || !carEyeRight || !carMouth || !carBrowLeft || !carBrowRight) {
    return;
  }

  window.gsap.to([carEyeLeft, carEyeRight], { scaleY: 1, duration: 0.18, transformOrigin: "center" });
  window.gsap.to([carBrowLeft, carBrowRight], { opacity: 0, rotation: 0, y: 0, duration: 0.2 });
  window.gsap.to(carMouth, {
    width: 30,
    height: 6,
    borderBottomWidth: 3,
    borderTopWidth: 0,
    borderRadius: "0 0 12px 12px",
    y: 0,
    duration: 0.2,
  });
}

function setCarTyping() {
  if (!window.gsap || !carEyeLeft || !carEyeRight || !carBrowLeft || !carBrowRight || !carMouth) {
    return;
  }

  window.gsap.to([carEyeLeft, carEyeRight], { scaleY: 0.08, duration: 0.12, transformOrigin: "center" });
  window.gsap.to([carBrowLeft, carBrowRight], { opacity: 0, duration: 0.12 });
  window.gsap.to(carMouth, {
    width: 22,
    height: 4,
    borderBottomWidth: 3,
    borderTopWidth: 0,
    borderRadius: "0 0 10px 10px",
    duration: 0.12,
  });
}

function setCarHappy() {
  if (!window.gsap || !carEyeLeft || !carEyeRight || !carMouth || !carBrowLeft || !carBrowRight) {
    return;
  }

  window.gsap.to([carEyeLeft, carEyeRight], { scaleY: 1, duration: 0.16, transformOrigin: "center" });
  window.gsap.to([carBrowLeft, carBrowRight], { opacity: 0, duration: 0.16 });
  window.gsap.to(carMouth, {
    width: 34,
    height: 12,
    borderBottomWidth: 3,
    borderTopWidth: 0,
    borderRadius: "0 0 18px 18px",
    y: 1,
    duration: 0.2,
  });
}

function setCarAngry() {
  if (!window.gsap || !carEyeLeft || !carEyeRight || !carMouth || !carBrowLeft || !carBrowRight) {
    return;
  }

  window.gsap.to([carEyeLeft, carEyeRight], { scaleY: 1, duration: 0.16, transformOrigin: "center" });
  window.gsap.to(carBrowLeft, { opacity: 1, rotation: -25, y: -1, duration: 0.16, transformOrigin: "left center" });
  window.gsap.to(carBrowRight, { opacity: 1, rotation: 25, y: -1, duration: 0.16, transformOrigin: "right center" });
  window.gsap.to(carMouth, {
    width: 30,
    height: 8,
    borderBottomWidth: 0,
    borderTopWidth: 3,
    borderRadius: "12px 12px 0 0",
    y: 2,
    duration: 0.2,
  });
}

if (loginPasswordField) {
  let typingTimer = null;

  loginPasswordField.addEventListener("input", () => {
    setCarTyping();
    if (typingTimer) {
      clearTimeout(typingTimer);
    }

    typingTimer = setTimeout(() => {
      setCarNeutral();
    }, 240);
  });

  loginPasswordField.addEventListener("blur", () => {
    setCarNeutral();
  });
}

setCarNeutral();

async function getUserProfileByUid(uid) {
  if (!db || !uid) {
    return null;
  }

  const documentSnapshot = await db.collection("users").doc(uid).get();
  return documentSnapshot.exists ? documentSnapshot.data() : null;
}

function clearMessages() {
  loginMessage.textContent = "";
  signupMessage.textContent = "";
  forgotMessage.textContent = "";
  loginMessage.className = "";
  signupMessage.className = "";
  forgotMessage.className = "";
}

function setForgotMode(enabled) {
  loginForm.classList.toggle("hidden", enabled);
  forgotForm.classList.toggle("hidden", !enabled);
  tabLogin.disabled = enabled;
  tabSignup.disabled = enabled;
}

function setActiveView(view) {
  const showLogin = view === "login";

  loginForm.classList.toggle("hidden", !showLogin);
  signupForm.classList.toggle("hidden", showLogin);
  forgotForm.classList.add("hidden");

  tabLogin.classList.toggle("active", showLogin);
  tabSignup.classList.toggle("active", !showLogin);
  tabLogin.disabled = false;
  tabSignup.disabled = false;
  tabLogin.setAttribute("aria-selected", String(showLogin));
  tabSignup.setAttribute("aria-selected", String(!showLogin));

  title.textContent = showLogin ? "Connexion" : "Créer un compte";
  subtitle.textContent = showLogin
    ? "Accède à ton espace Sky Car Assistance"
    : "Inscris-toi pour rejoindre Sky Car Assistance";

  clearMessages();
}

tabLogin.addEventListener("click", () => setActiveView("login"));
tabSignup.addEventListener("click", () => setActiveView("signup"));
forgotPasswordLink.addEventListener("click", () => {
  title.textContent = "Mot de passe oublié";
  subtitle.textContent = "Reçois un lien de réinitialisation par email";
  clearMessages();
  setForgotMode(true);
});

backToLogin.addEventListener("click", () => setActiveView("login"));

sendResetCode.addEventListener("click", async () => {
  await refreshCloudBeforeAuth();

  if (!auth || !db) {
    forgotMessage.textContent = "Firebase n'est pas prêt.";
    forgotMessage.classList.add("error");
    return;
  }

  const forgotEmailInput = document.getElementById("forgotEmail");
  const email = forgotEmailInput.value.trim().toLowerCase();

  forgotMessage.className = "";

  if (!emailPattern.test(email)) {
    forgotMessage.textContent = "Merci d'entrer un email valide.";
    forgotMessage.classList.add("error");
    forgotEmailInput.focus();
    return;
  }

  await auth.sendPasswordResetEmail(email);

  forgotMessage.textContent = `Lien de réinitialisation envoyé ✅ (${email})`;
  forgotMessage.classList.add("success");
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await refreshCloudBeforeAuth();

  if (!auth) {
    loginMessage.textContent = "Firebase Auth n'est pas disponible.";
    loginMessage.classList.add("error");
    return;
  }

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  loginMessage.className = "";

  if (!emailPattern.test(email)) {
    loginMessage.textContent = "Merci d'entrer un email valide.";
    loginMessage.classList.add("error");
    emailInput.focus();
    return;
  }

  if (password.length < 6) {
    loginMessage.textContent = "Le mot de passe doit contenir au moins 6 caractères.";
    loginMessage.classList.add("error");
    setCarAngry();
    passwordInput.focus();
    return;
  }

  const normalizedEmail = email.toLowerCase();
  try {
    const credential = await auth.signInWithEmailAndPassword(normalizedEmail, password);
    const profile = await getUserProfileByUid(credential.user.uid);
    const displayName = profile?.fullName || credential.user.email;

    localStorage.setItem(LAST_EMAIL_KEY, normalizedEmail);

    loginMessage.textContent = `Connexion réussie ✅ Bienvenue ${displayName}.`;
    loginMessage.classList.add("success");
    setCarHappy();
    await (window.skyCloud?.refreshFromCloud?.() ?? Promise.resolve());
    loginForm.reset();

    setTimeout(() => {
      window.location.href = "tracking.html";
    }, 500);
  } catch (error) {
    if (error?.code === "auth/invalid-credential" || error?.code === "auth/wrong-password") {
      loginMessage.textContent = "Email ou mot de passe incorrect.";
      loginMessage.classList.add("error");
      setCarAngry();
      passwordInput.focus();
      return;
    }

    if (error?.code === "auth/user-not-found") {
      loginMessage.textContent = "Aucun compte trouvé avec cet email.";
      loginMessage.classList.add("error");
      setCarAngry();
      emailInput.focus();
      return;
    }

    loginMessage.textContent = "Erreur de connexion Firebase.";
    loginMessage.classList.add("error");
    setCarAngry();
  }
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await refreshCloudBeforeAuth();

  if (!auth || !db) {
    signupMessage.textContent = "Firebase Auth/Firestore n'est pas disponible.";
    signupMessage.classList.add("error");
    return;
  }

  const fullNameInput = document.getElementById("fullName");
  const emailInput = document.getElementById("signupEmail");
  const passwordInput = document.getElementById("signupPassword");
  const confirmPasswordInput = document.getElementById("confirmPassword");

  const fullName = fullNameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  signupMessage.className = "";

  if (fullName.length < 2) {
    signupMessage.textContent = "Merci d'entrer ton nom complet.";
    signupMessage.classList.add("error");
    fullNameInput.focus();
    return;
  }

  if (!emailPattern.test(email)) {
    signupMessage.textContent = "Merci d'entrer un email valide.";
    signupMessage.classList.add("error");
    emailInput.focus();
    return;
  }

  if (password.length < 6) {
    signupMessage.textContent = "Le mot de passe doit contenir au moins 6 caractères.";
    signupMessage.classList.add("error");
    passwordInput.focus();
    return;
  }

  if (password !== confirmPassword) {
    signupMessage.textContent = "Les mots de passe ne correspondent pas.";
    signupMessage.classList.add("error");
    confirmPasswordInput.focus();
    return;
  }

  const normalizedEmail = email.toLowerCase();
  try {
    const credential = await auth.createUserWithEmailAndPassword(normalizedEmail, password);

    await db.collection("users").doc(credential.user.uid).set(
      {
        fullName,
        email: normalizedEmail,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    localStorage.setItem(LAST_EMAIL_KEY, normalizedEmail);

    const shouldAutoLogin = Boolean(autoLoginAfterSignup?.checked);

    if (shouldAutoLogin) {
      signupMessage.textContent = `Compte créé et connexion réussie ✅ Bienvenue ${fullName}.`;
      signupMessage.classList.add("success");
      await (window.skyCloud?.refreshFromCloud?.() ?? Promise.resolve());
      signupForm.reset();

      setTimeout(() => {
        window.location.href = "tracking.html";
      }, 500);
      return;
    }

    await auth.signOut();

    signupMessage.textContent = "Compte créé avec succès ✅";
    signupMessage.classList.add("success");
    signupForm.reset();
    setActiveView("login");

    const loginEmailInput = document.getElementById("email");
    const loginPasswordInput = document.getElementById("password");
    loginEmailInput.value = normalizedEmail;
    loginMessage.textContent = "Compte enregistré ✅ Connecte-toi avec ton mot de passe.";
    loginMessage.classList.add("success");
    loginPasswordInput.focus();
  } catch (error) {
    if (error?.code === "auth/email-already-in-use") {
      signupMessage.textContent = "Un compte existe déjà avec cet email.";
      signupMessage.classList.add("error");
      emailInput.focus();
      return;
    }

    signupMessage.textContent = "Erreur lors de la création du compte Firebase.";
    signupMessage.classList.add("error");
  }
});

forgotForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  forgotMessage.className = "";
  forgotMessage.textContent = "Utilise le lien reçu par email pour réinitialiser ton mot de passe.";
  forgotMessage.classList.add("success");
});

const lastEmail = localStorage.getItem(LAST_EMAIL_KEY);
if (lastEmail) {
  const emailInput = document.getElementById("email");
  emailInput.value = lastEmail;
}
