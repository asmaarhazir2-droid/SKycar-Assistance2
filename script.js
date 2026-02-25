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

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9]{8,15}$/;
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

function normalizePhone(phone) {
  return phone.replace(/[\s()-]/g, "");
}

async function getUserProfileByUid(uid) {
  if (!db || !uid) {
    return null;
  }

  const documentSnapshot = await db.collection("users").doc(uid).get();
  return documentSnapshot.exists ? documentSnapshot.data() : null;
}

async function getUserProfileByPhone(phone) {
  if (!db || !phone) {
    return null;
  }

  const result = await db.collection("users").where("phone", "==", phone).limit(1).get();

  if (result.empty) {
    return null;
  }

  const profileDoc = result.docs[0];
  return {
    uid: profileDoc.id,
    ...profileDoc.data(),
  };
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

  const forgotPhoneInput = document.getElementById("forgotPhone");
  const phone = normalizePhone(forgotPhoneInput.value.trim());

  forgotMessage.className = "";

  if (!phonePattern.test(phone)) {
    forgotMessage.textContent = "Merci d'entrer un numéro de téléphone valide.";
    forgotMessage.classList.add("error");
    forgotPhoneInput.focus();
    return;
  }

  const profile = await getUserProfileByPhone(phone);

  if (!profile || !profile.email) {
    forgotMessage.textContent = "Aucun compte trouvé avec ce numéro de téléphone.";
    forgotMessage.classList.add("error");
    forgotPhoneInput.focus();
    return;
  }

  await auth.sendPasswordResetEmail(profile.email);

  forgotMessage.textContent = `Lien de réinitialisation envoyé ✅ (${profile.email})`;
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
    loginForm.reset();

    setTimeout(() => {
      window.location.href = "tracking.html";
    }, 500);
  } catch (error) {
    if (error?.code === "auth/invalid-credential" || error?.code === "auth/wrong-password") {
      loginMessage.textContent = "Email ou mot de passe incorrect.";
      loginMessage.classList.add("error");
      passwordInput.focus();
      return;
    }

    if (error?.code === "auth/user-not-found") {
      loginMessage.textContent = "Aucun compte trouvé avec cet email.";
      loginMessage.classList.add("error");
      emailInput.focus();
      return;
    }

    loginMessage.textContent = "Erreur de connexion Firebase.";
    loginMessage.classList.add("error");
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
  const phoneInput = document.getElementById("signupPhone");
  const passwordInput = document.getElementById("signupPassword");
  const confirmPasswordInput = document.getElementById("confirmPassword");

  const fullName = fullNameInput.value.trim();
  const email = emailInput.value.trim();
  const phone = normalizePhone(phoneInput.value.trim());
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

  if (!phonePattern.test(phone)) {
    signupMessage.textContent = "Merci d'entrer un numéro de téléphone valide.";
    signupMessage.classList.add("error");
    phoneInput.focus();
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
  const phoneProfile = await getUserProfileByPhone(phone);

  if (phoneProfile) {
    signupMessage.textContent = "Un compte existe déjà avec ce numéro de téléphone.";
    signupMessage.classList.add("error");
    phoneInput.focus();
    return;
  }

  try {
    const credential = await auth.createUserWithEmailAndPassword(normalizedEmail, password);

    await db.collection("users").doc(credential.user.uid).set(
      {
        fullName,
        email: normalizedEmail,
        phone,
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
