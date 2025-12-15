// Firebase helper for PaxiBox
// Uses Firebase compat SDKs (loaded via CDN in index.html)
(function () {
  // If the user supplies config via `window.PAXIBOX_FIREBASE_CONFIG`, initialize.
  async function init() {
    try {
      if (!window.firebase) {
        console.warn('Firebase SDK not loaded. Skipping Firebase init.');
        window.paxiLogScan = async () => { return Promise.resolve(null); };
        return;
      }
      const cfg = window.PAXIBOX_FIREBASE_CONFIG;
      if (!cfg || !cfg.projectId) {
        console.warn('No Firebase config found (window.PAXIBOX_FIREBASE_CONFIG). Firebase disabled.');
        window.paxiLogScan = async () => { return Promise.resolve(null); };
        return;
      }
      // Initialize app
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(cfg);
      }
      const db = firebase.firestore();

      // Expose logging function
      window.paxiLogScan = async function logScan(entry) {
        try {
          const doc = {
            code: entry.code || null,
            source: entry.source || null,
            success: typeof entry.success === 'boolean' ? entry.success : true,
            ts: entry.timestamp || new Date().toISOString(),
            meta: entry.meta || null
          };
          const res = await db.collection('scans').add(doc);
          console.debug('Logged scan to Firestore, id=', res.id, doc);
          return res;
        } catch (err) {
          console.error('Failed to log scan to Firestore', err);
          throw err;
        }
      };

      console.debug('Firebase initialized for PaxiBox');
    } catch (err) {
      console.error('Firebase init error', err);
      window.paxiLogScan = async () => { return Promise.resolve(null); };
    }
  }

  // initialize on script load
  init();
})();
