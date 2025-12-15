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
      // Prepare anonymous auth (if Auth SDK is loaded). We'll await this before writes.
      let authReady = Promise.resolve();
      if (firebase.auth) {
        try {
          authReady = firebase.auth().signInAnonymously()
            .then((cred) => {
              console.debug('Firebase anonymous sign-in succeeded', cred && cred.user && cred.user.uid);
            })
            .catch((err) => {
              console.warn('Firebase anonymous sign-in failed', err && err.message);
            });
        } catch (e) {
          console.warn('Firebase auth unavailable', e && e.message);
        }
      }
      // Prefer Realtime Database if `databaseURL` present; otherwise fall back to Firestore.
      if (cfg && cfg.databaseURL && firebase.database) {
        const rdb = firebase.database();

        window.paxiLogScan = async function logScan(entry, opts = {}) {
          const timeoutMs = typeof opts.timeoutMs === 'number' ? opts.timeoutMs : 10000;
          const doc = {
            code: entry.code || null,
            source: entry.source || null,
            success: typeof entry.success === 'boolean' ? entry.success : true,
            ts: entry.timestamp || new Date().toISOString(),
            meta: entry.meta || null
          };
          console.debug('paxiLogScan (RTDB): attempting to write', { doc, timeoutMs });
          // ensure auth attempt has completed (if available)
          try { await authReady; } catch (e) { /* ignore */ }
          try {
            // If the code looks like a package resi, update the package node (no auth required per rules)
            if (doc.code && typeof doc.code === 'string') {
              const resi = doc.code.replace(/[^a-zA-Z0-9-_]/g, '');
              // push a status update under paxibox/packages/$resi/updates
              const updatesRef = rdb.ref(`paxibox/packages/${resi}/updates`);
              const updatePromise = updatesRef.push({
                status: doc.success ? 'scanned' : 'failed',
                source: doc.source,
                ts: doc.ts,
                meta: doc.meta || null
              });
              // also keep a log under top-level scans for audit
              const scanLogPromise = rdb.ref('scans').push(doc);
              const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('paxiLogScan timeout after ' + timeoutMs + 'ms')), timeoutMs));
              const res = await Promise.race([Promise.all([updatePromise, scanLogPromise]), timeoutPromise]);
              console.debug('Updated package and logged scan (RTDB)', res, doc);
              return res;
            }
            // fallback: just write to scans
            const writePromise = rdb.ref('scans').push(doc);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('paxiLogScan timeout after ' + timeoutMs + 'ms')), timeoutMs));
            const res = await Promise.race([writePromise, timeoutPromise]);
            console.debug('Logged scan to RTDB, key=', res && res.key, doc);
            return res;
          } catch (err) {
            console.error('Failed to log scan to RTDB', err, { doc });
            throw err;
          }
        };

        window.paxiTestConnection = async function(timeoutMs = 8000) {
          try {
            console.debug('paxiTestConnection (RTDB): writing healthcheck');
            // use paxibox/system/healthcheck which aligns with package/system rules
            try { await authReady; } catch (e) { /* ignore */ }
            const writePromise = rdb.ref('paxibox/system/healthcheck').push({ ts: new Date().toISOString() });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('paxiTestConnection timeout after ' + timeoutMs + 'ms')), timeoutMs));
            const res = await Promise.race([writePromise, timeoutPromise]);
            console.debug('paxiTestConnection OK (RTDB), key=', res && res.key);
            return { ok: true, id: res && res.key };
          } catch (err) {
            console.error('paxiTestConnection (RTDB) failed', err);
            return { ok: false, error: err && err.message };
          }
        };
      } else {
        // fallback to Firestore if RTDB not available
        const db = firebase.firestore();
        window.paxiLogScan = async function logScan(entry, opts = {}) {
          const timeoutMs = typeof opts.timeoutMs === 'number' ? opts.timeoutMs : 10000;
          const doc = {
            code: entry.code || null,
            source: entry.source || null,
            success: typeof entry.success === 'boolean' ? entry.success : true,
            ts: entry.timestamp || new Date().toISOString(),
            meta: entry.meta || null
          };
          console.debug('paxiLogScan (Firestore): attempting to write', { doc, timeoutMs });
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

        window.paxiTestConnection = async function(timeoutMs = 8000) {
          try {
            console.debug('paxiTestConnection (Firestore): writing healthcheck doc');
            const writePromise = db.collection('paxi_healthcheck').add({ ts: new Date().toISOString() });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('paxiTestConnection timeout after ' + timeoutMs + 'ms')), timeoutMs));
            const res = await Promise.race([writePromise, timeoutPromise]);
            console.debug('paxiTestConnection OK (Firestore), id=', res && res.id);
            return { ok: true, id: res && res.id };
          } catch (err) {
            console.error('paxiTestConnection (Firestore) failed', err);
            return { ok: false, error: err && err.message };
          }
        };
      }

      console.debug('Firebase initialized for PaxiBox');
    } catch (err) {
      console.error('Firebase init error', err);
      window.paxiLogScan = async () => { return Promise.resolve(null); };
    }
  }

  // initialize on script load
  init();
})();
