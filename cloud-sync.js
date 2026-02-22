(function () {
  const CLOUD_CONFIG = {
    apiKey: "",
    authDomain: "",
    projectId: "",
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

  const CLOUD_DOC_ID = "global";
  const CLOUD_COLLECTION = "skycar-data";

  let db = null;
  let initialized = false;

  function hasCloudConfig() {
    return Boolean(CLOUD_CONFIG.apiKey && CLOUD_CONFIG.authDomain && CLOUD_CONFIG.projectId);
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
      : window.firebase.initializeApp(CLOUD_CONFIG);

    db = app.firestore();
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

    const snapshot = await db.collection(CLOUD_COLLECTION).doc(CLOUD_DOC_ID).get();

    if (!snapshot.exists) {
      return null;
    }

    return snapshot.data() || null;
  }

  async function pushCloudData(data) {
    initCloud();

    if (!db) {
      return false;
    }

    await db.collection(CLOUD_COLLECTION).doc(CLOUD_DOC_ID).set(
      {
        ...data,
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

      saveSnapshotToLocal(cloudData);
      return { synced: true, mode: "cloud" };
    } catch {
      return { synced: false, mode: "local" };
    }
  }

  let syncTimer = null;

  function schedulePush(delayMs) {
    if (syncTimer) {
      clearTimeout(syncTimer);
    }

    syncTimer = setTimeout(async () => {
      const payload = getLocalSnapshot();

      try {
        await pushCloudData(payload);
      } catch {
        // no-op
      }
    }, delayMs);
  }

  window.skyCloud = {
    isConfigured: hasCloudConfig,
    hydrateFromCloud,
    pushNow: async () => {
      const payload = getLocalSnapshot();
      return pushCloudData(payload);
    },
    schedulePush,
  };
})();
