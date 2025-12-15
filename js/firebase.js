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

      // Expose logging function with timeout and diagnostics
      window.paxiLogScan = async function logScan(entry, opts = {}) {
        const timeoutMs = typeof opts.timeoutMs === 'number' ? opts.timeoutMs : 10000;
        const doc = {
          code: entry.code || null,
          source: entry.source || null,
          success: typeof entry.success === 'boolean' ? entry.success : true,
          ts: entry.timestamp || new Date().toISOString(),
          meta: entry.meta || null
        };
        console.debug('paxiLogScan: attempting to write', { doc, timeoutMs });
        try {
          const writePromise = db.collection('scans').add(doc);
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('paxiLogScan timeout after ' + timeoutMs + 'ms')), timeoutMs));
          const res = await Promise.race([writePromise, timeoutPromise]);
          console.debug('Logged scan to Firestore, id=', res && res.id, doc);
          return res;
        } catch (err) {
          console.error('Failed to log scan to Firestore', err, { doc });
          throw err;
        }
      };

      // Helper to test Firestore connectivity (writes with timeout)
      window.paxiTestConnection = async function(timeoutMs = 8000) {
        try {
          console.debug('paxiTestConnection: writing healthcheck doc');
          const writePromise = db.collection('paxi_healthcheck').add({ ts: new Date().toISOString() });
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('paxiTestConnection timeout after ' + timeoutMs + 'ms')), timeoutMs));
          const res = await Promise.race([writePromise, timeoutPromise]);
          console.debug('paxiTestConnection OK, id=', res && res.id);
          return { ok: true, id: res && res.id };
        } catch (err) {
          console.error('paxiTestConnection failed', err);
          return { ok: false, error: err && err.message };
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
