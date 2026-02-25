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
  let cloudUnsubscribe = null;
  const remoteListeners = new Set();

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

    authReadyPromise = ensureSignedIn().then(() => {
      subscribeToRemoteChanges();
    });
  }

  async function ensureSignedIn() {
    if (!auth) {
      return;
    }

    await new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(() => {
        unsubscribe();
        resolve();
      });
    });

    if (auth.currentUser) {
      return;
    }

    try {
      await auth.signInAnonymously();
    } catch {
      // no-op: user can still be authenticated later with email/password
    }
  }

  function subscribeToRemoteChanges() {
    if (!db || cloudUnsubscribe) {
      return;
    }

    cloudUnsubscribe = db
      .collection(CLOUD_COLLECTION)
      .doc(CLOUD_DOC_ID)
      .onSnapshot(
        (snapshot) => {
          if (!snapshot.exists) {
            return;
          }

          const remoteData = snapshot.data() || {};
          const merged = hydrateMerge(remoteData, getLocalSnapshot());
          saveSnapshotToLocal(merged);

          remoteListeners.forEach((listener) => {
            try {
              listener(merged);
            } catch {
              // no-op
            }
          });
        },
        () => {
          // no-op
        }
      );
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

  function normalizeSnapshot(snapshot) {
    const safe = snapshot && typeof snapshot === "object" ? snapshot : {};

    return {
      accounts: Array.isArray(safe.accounts) ? safe.accounts : [],
      resetCodes: safe.resetCodes && typeof safe.resetCodes === "object" ? safe.resetCodes : {},
      missions: Array.isArray(safe.missions) ? safe.missions : [],
      drivers: Array.isArray(safe.drivers) ? safe.drivers : [],
      missionTypes: Array.isArray(safe.missionTypes) ? safe.missionTypes : [],
      payments: Array.isArray(safe.payments) ? safe.payments : [],
      vehicles: Array.isArray(safe.vehicles) ? safe.vehicles : [],
      assignments: Array.isArray(safe.assignments) ? safe.assignments : [],
      updatedAt: Number(safe.updatedAt || 0),
    };
  }

  function hydrateMerge(cloudSnapshot, localSnapshot) {
    const cloud = normalizeSnapshot(cloudSnapshot);
    const local = normalizeSnapshot(localSnapshot);

    if (!cloud.updatedAt) {
      return {
        ...local,
        updatedAt: local.updatedAt || Date.now(),
      };
    }

    return {
      ...cloud,
      updatedAt: cloud.updatedAt || Date.now(),
    };
  }

  function pushMerge(cloudSnapshot, localSnapshot) {
    const cloud = normalizeSnapshot(cloudSnapshot);
    const local = normalizeSnapshot(localSnapshot);

    return {
      ...cloud,
      ...local,
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
    const merged = pushMerge(cloudData, data);

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

      const merged = hydrateMerge(cloudData, getLocalSnapshot());
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
    onRemoteUpdate: (listener) => {
      if (typeof listener !== "function") {
        return () => {};
      }

      remoteListeners.add(listener);
      return () => {
        remoteListeners.delete(listener);
      };
    },
    schedulePush,
  };
})();
