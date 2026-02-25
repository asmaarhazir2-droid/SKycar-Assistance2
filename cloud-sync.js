(function () {
  const FIREBASE_CONFIG = {
    ...(window.SKY_FIREBASE_CONFIG || {}),
  };

  const STORAGE_KEYS = {
    accounts: "skyCarAccounts",
    resetCodes: "skyCarResetCodes",
    missions: "skyCarMissions",
    drivers: "skyCarDrivers",
    missionTypes: "skyCarMissionTypes",
    payments: "skyCarPayments",
    vehicles: "skyCarCustomVehicles",
    assignments: "skyCarAssignments",
  };

  const CLOUD_COLLECTION = "skycar-data";
  const CLOUD_DOC_ID = "global";

  let db = null;
  let auth = null;
  let initialized = false;
  let authReadyPromise = Promise.resolve();

  function hasCloudConfig() {
    return Boolean(
      FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.authDomain && FIREBASE_CONFIG.projectId
    );
  }

  function initCloud() {
    if (initialized) {
      return;
    }

    initialized = true;

    if (!hasCloudConfig()) {
      return;
    }

    if (!window.firebase || !window.firebase.apps) {
      return;
    }

    const app = window.firebase.apps.length
      ? window.firebase.app()
      : window.firebase.initializeApp(FIREBASE_CONFIG);

    auth = app.auth();
    db = app.firestore();

    authReadyPromise = ensureSignedIn();
  }

  async function ensureSignedIn() {
    if (!auth) {
      return;
    }

    if (auth.currentUser) {
      return;
    }

    await auth.signInAnonymously();
  }

  function parseArray(raw) {
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

  function parseObject(raw) {
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

  function getLocalSnapshot() {
    return {
      accounts: parseArray(localStorage.getItem(STORAGE_KEYS.accounts)),
      resetCodes: parseObject(localStorage.getItem(STORAGE_KEYS.resetCodes)),
      missions: parseArray(localStorage.getItem(STORAGE_KEYS.missions)),
      drivers: parseArray(localStorage.getItem(STORAGE_KEYS.drivers)),
      missionTypes: parseArray(localStorage.getItem(STORAGE_KEYS.missionTypes)),
      payments: parseArray(localStorage.getItem(STORAGE_KEYS.payments)),
      vehicles: parseArray(localStorage.getItem(STORAGE_KEYS.vehicles)),
      assignments: parseArray(localStorage.getItem(STORAGE_KEYS.assignments)),
      updatedAt: Date.now(),
    };
  }

  function saveSnapshotToLocal(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      return;
    }

    if (Array.isArray(snapshot.accounts)) {
      localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(snapshot.accounts));
    }

    if (snapshot.resetCodes && typeof snapshot.resetCodes === "object") {
      localStorage.setItem(STORAGE_KEYS.resetCodes, JSON.stringify(snapshot.resetCodes));
    }

    if (Array.isArray(snapshot.missions)) {
      localStorage.setItem(STORAGE_KEYS.missions, JSON.stringify(snapshot.missions));
    }

    if (Array.isArray(snapshot.drivers)) {
      localStorage.setItem(STORAGE_KEYS.drivers, JSON.stringify(snapshot.drivers));
    }

    if (Array.isArray(snapshot.missionTypes)) {
      localStorage.setItem(STORAGE_KEYS.missionTypes, JSON.stringify(snapshot.missionTypes));
    }

    if (Array.isArray(snapshot.payments)) {
      localStorage.setItem(STORAGE_KEYS.payments, JSON.stringify(snapshot.payments));
    }

    if (Array.isArray(snapshot.vehicles)) {
      localStorage.setItem(STORAGE_KEYS.vehicles, JSON.stringify(snapshot.vehicles));
    }

    if (Array.isArray(snapshot.assignments)) {
      localStorage.setItem(STORAGE_KEYS.assignments, JSON.stringify(snapshot.assignments));
    }
  }

  async function pullCloudData() {
    initCloud();

    if (!db) {
      return null;
    }

    await authReadyPromise;

    const snapshot = await db.collection(CLOUD_COLLECTION).doc(CLOUD_DOC_ID).get();

    if (!snapshot.exists) {
      return null;
    }

    return snapshot.data() || null;
  }

  function mergeUniqueArrays(cloudArray, localArray) {
    const safeCloud = Array.isArray(cloudArray) ? cloudArray : [];
    const safeLocal = Array.isArray(localArray) ? localArray : [];
    const seen = new Set();
    const merged = [];

    [...safeCloud, ...safeLocal].forEach((item) => {
      const key = JSON.stringify(item);

      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      merged.push(item);
    });

    return merged;
  }

  function mergeAccounts(cloudAccounts, localAccounts) {
    const safeCloud = Array.isArray(cloudAccounts) ? cloudAccounts : [];
    const safeLocal = Array.isArray(localAccounts) ? localAccounts : [];
    const byEmail = new Map();

    [...safeCloud, ...safeLocal].forEach((account) => {
      if (!account || typeof account !== "object") {
        return;
      }

      const email = String(account.email || "").toLowerCase().trim();

      if (!email) {
        return;
      }

      byEmail.set(email, {
        ...byEmail.get(email),
        ...account,
        email,
      });
    });

    return Array.from(byEmail.values());
  }

  function mergeSnapshots(cloudSnapshot, localSnapshot) {
    const cloud = cloudSnapshot && typeof cloudSnapshot === "object" ? cloudSnapshot : {};
    const local = localSnapshot && typeof localSnapshot === "object" ? localSnapshot : {};

    return {
      accounts: mergeAccounts(cloud.accounts, local.accounts),
      resetCodes: {
        ...(cloud.resetCodes && typeof cloud.resetCodes === "object" ? cloud.resetCodes : {}),
        ...(local.resetCodes && typeof local.resetCodes === "object" ? local.resetCodes : {}),
      },
      missions: mergeUniqueArrays(cloud.missions, local.missions),
      drivers: mergeUniqueArrays(cloud.drivers, local.drivers),
      missionTypes: mergeUniqueArrays(cloud.missionTypes, local.missionTypes),
      payments: mergeUniqueArrays(cloud.payments, local.payments),
      vehicles: mergeUniqueArrays(cloud.vehicles, local.vehicles),
      assignments: mergeUniqueArrays(cloud.assignments, local.assignments),
      updatedAt: Date.now(),
    };
  }

  async function pushCloudData(data) {
    initCloud();

    if (!db) {
      return false;
    }

    await authReadyPromise;

    const cloudData = (await pullCloudData()) || {};
    const merged = mergeSnapshots(cloudData, data);

    await db.collection(CLOUD_COLLECTION).doc(CLOUD_DOC_ID).set(
      {
        ...merged,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    return true;
  }

  async function hydrateFromCloud() {
    try {
      const cloudData = await pullCloudData();

      if (!cloudData) {
        return { synced: false, mode: "local" };
      }

      const merged = mergeSnapshots(cloudData, getLocalSnapshot());
      saveSnapshotToLocal(merged);
      return { synced: true, mode: "cloud" };
    } catch {
      return { synced: false, mode: "local" };
    }
  }

  let syncTimer = null;

  async function pushNowSafe() {
    const payload = getLocalSnapshot();

    try {
      await pushCloudData(payload);
      return true;
    } catch {
      return false;
    }
  }

  function schedulePush(delayMs) {
    if (syncTimer) {
      clearTimeout(syncTimer);
    }

    syncTimer = setTimeout(async () => {
      await pushNowSafe();
    }, delayMs);
  }

  window.addEventListener("pagehide", () => {
    void pushNowSafe();
  });

  window.addEventListener("beforeunload", () => {
    void pushNowSafe();
  });

  window.skyCloud = {
    isConfigured: hasCloudConfig,
    hydrateFromCloud,
    refreshFromCloud: hydrateFromCloud,
    pushNow: pushNowSafe,
    syncNow: pushNowSafe,
    schedulePush,
  };
})();
