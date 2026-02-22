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
const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const backToLogin = document.getElementById("backToLogin");
const sendResetCode = document.getElementById("sendResetCode");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9]{8,15}$/;
const STORAGE_KEY = "skyCarAccounts";
const RESET_CODES_KEY = "skyCarResetCodes";
const RESET_CODE_TTL_MS = 10 * 60 * 1000;

function normalizePhone(phone) {
  return phone.replace(/[\s()-]/g, "");
}

function getAccounts() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

function getResetCodes() {
  const raw = localStorage.getItem(RESET_CODES_KEY);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveResetCodes(resetCodes) {
  localStorage.setItem(RESET_CODES_KEY, JSON.stringify(resetCodes));
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

function generateResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
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
  subtitle.textContent = "Reçois un code par SMS et choisis un nouveau mot de passe";
  clearMessages();
  setForgotMode(true);
});

backToLogin.addEventListener("click", () => setActiveView("login"));

sendResetCode.addEventListener("click", () => {
  const forgotPhoneInput = document.getElementById("forgotPhone");
  const phone = normalizePhone(forgotPhoneInput.value.trim());

  forgotMessage.className = "";

  if (!phonePattern.test(phone)) {
    forgotMessage.textContent = "Merci d'entrer un numéro de téléphone valide.";
    forgotMessage.classList.add("error");
    forgotPhoneInput.focus();
    return;
  }

  const accounts = getAccounts();
  const accountExists = accounts.some((item) => item.phone === phone);

  if (!accountExists) {
    forgotMessage.textContent = "Aucun compte trouvé avec ce numéro de téléphone.";
    forgotMessage.classList.add("error");
    forgotPhoneInput.focus();
    return;
  }

  const code = generateResetCode();
  const resetCodes = getResetCodes();
  resetCodes[phone] = {
    code,
    expiresAt: Date.now() + RESET_CODE_TTL_MS,
  };
  saveResetCodes(resetCodes);

  forgotMessage.textContent = `Code envoyé au téléphone ✅ (mode démo: ${code})`;
  forgotMessage.classList.add("success");
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

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
  const accounts = getAccounts();
  const account = accounts.find((item) => item.email === normalizedEmail);

  if (!account) {
    loginMessage.textContent = "Aucun compte trouvé avec cet email.";
    loginMessage.classList.add("error");
    emailInput.focus();
    return;
  }

  if (account.password !== password) {
    loginMessage.textContent = "Mot de passe incorrect.";
    loginMessage.classList.add("error");
    passwordInput.focus();
    return;
  }

  loginMessage.textContent = `Connexion réussie ✅ Bienvenue ${account.fullName}.`;
  loginMessage.classList.add("success");
  loginForm.reset();

  setTimeout(() => {
    window.location.href = "tracking.html";
  }, 500);
});

signupForm.addEventListener("submit", (event) => {
  event.preventDefault();

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
  const accounts = getAccounts();
  const emailAlreadyUsed = accounts.some((item) => item.email === normalizedEmail);
  const phoneAlreadyUsed = accounts.some((item) => item.phone === phone);

  if (emailAlreadyUsed) {
    signupMessage.textContent = "Un compte existe déjà avec cet email.";
    signupMessage.classList.add("error");
    emailInput.focus();
    return;
  }

  if (phoneAlreadyUsed) {
    signupMessage.textContent = "Un compte existe déjà avec ce numéro de téléphone.";
    signupMessage.classList.add("error");
    phoneInput.focus();
    return;
  }

  accounts.push({
    fullName,
    email: normalizedEmail,
    phone,
    password,
  });
  saveAccounts(accounts);

  signupMessage.textContent = "Compte créé avec succès ✅";
  signupMessage.classList.add("success");
  signupForm.reset();
  setActiveView("login");
});

forgotForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const forgotPhoneInput = document.getElementById("forgotPhone");
  const resetCodeInput = document.getElementById("resetCode");
  const newPasswordInput = document.getElementById("newPassword");
  const confirmNewPasswordInput = document.getElementById("confirmNewPassword");

  const phone = normalizePhone(forgotPhoneInput.value.trim());
  const resetCode = resetCodeInput.value.trim();
  const newPassword = newPasswordInput.value;
  const confirmNewPassword = confirmNewPasswordInput.value;

  forgotMessage.className = "";

  if (!phonePattern.test(phone)) {
    forgotMessage.textContent = "Merci d'entrer un numéro de téléphone valide.";
    forgotMessage.classList.add("error");
    forgotPhoneInput.focus();
    return;
  }

  if (!/^\d{6}$/.test(resetCode)) {
    forgotMessage.textContent = "Le code doit contenir 6 chiffres.";
    forgotMessage.classList.add("error");
    resetCodeInput.focus();
    return;
  }

  if (newPassword.length < 6) {
    forgotMessage.textContent = "Le mot de passe doit contenir au moins 6 caractères.";
    forgotMessage.classList.add("error");
    newPasswordInput.focus();
    return;
  }

  if (newPassword !== confirmNewPassword) {
    forgotMessage.textContent = "Les mots de passe ne correspondent pas.";
    forgotMessage.classList.add("error");
    confirmNewPasswordInput.focus();
    return;
  }

  const resetCodes = getResetCodes();
  const resetEntry = resetCodes[phone];

  if (!resetEntry) {
    forgotMessage.textContent = "Aucun code actif. Clique sur 'Envoyer le code'.";
    forgotMessage.classList.add("error");
    return;
  }

  if (Date.now() > resetEntry.expiresAt) {
    delete resetCodes[phone];
    saveResetCodes(resetCodes);
    forgotMessage.textContent = "Le code a expiré. Demande un nouveau code.";
    forgotMessage.classList.add("error");
    return;
  }

  if (resetEntry.code !== resetCode) {
    forgotMessage.textContent = "Code incorrect.";
    forgotMessage.classList.add("error");
    resetCodeInput.focus();
    return;
  }

  const accounts = getAccounts();
  const accountIndex = accounts.findIndex((item) => item.phone === phone);

  if (accountIndex === -1) {
    forgotMessage.textContent = "Aucun compte trouvé avec ce numéro de téléphone.";
    forgotMessage.classList.add("error");
    return;
  }

  accounts[accountIndex].password = newPassword;
  saveAccounts(accounts);

  delete resetCodes[phone];
  saveResetCodes(resetCodes);

  forgotMessage.textContent = "Mot de passe réinitialisé avec succès ✅";
  forgotMessage.classList.add("success");
  forgotForm.reset();

  setTimeout(() => {
    setActiveView("login");
  }, 700);
});
