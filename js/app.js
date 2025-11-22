const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const fileInput = document.getElementById('fileInput');
const startOverlay = document.getElementById('startOverlay');
const startCameraBtn = document.getElementById('startCameraBtn');

const tabs = document.querySelectorAll('.tab');
const scanView = document.getElementById('scanView');
const manualView = document.getElementById('manualView');
// confirmation popup
const confirmModal = document.getElementById('confirmModal');
const confirmIcon = document.getElementById('confirmIcon');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const confirmClose = document.getElementById('confirmClose');
const confirmOk = document.getElementById('confirmOk');
const closeBtn = document.getElementById('closeBtn');

const manualForm = document.getElementById('manualForm');
const resiInput = document.getElementById('resiInput');
const recipientInput = document.getElementById('recipientInput');

let stream = null;
let scanning = false;
let rafId = null;
let barcodeDetector = null;
let processing = false; // true while running the pre-confirmation animation

// Detect BarcodeDetector API
if ('BarcodeDetector' in window) {
  try {
    barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
  } catch (e) {
    barcodeDetector = null;
  }
}

// --- View management ---
function showView(name) {
  scanView.hidden = name !== 'scan';
  manualView.hidden = name !== 'manual';
  tabs.forEach(t => t.classList.toggle('active', t.dataset.view === name));
  // start camera when entering scan view, stop when leaving
  if (name === 'scan') {
    // try to start camera; if blocked, show start overlay
    startCamera().catch(() => {
      if (startOverlay) { startOverlay.hidden = false; }
    });
  } else {
    stopCamera();
  }
}

tabs.forEach(t => t.addEventListener('click', () => showView(t.dataset.view)));
if (closeBtn) closeBtn.addEventListener('click', () => showView('scan'));

confirmClose.addEventListener('click', () => {
  // After confirmation, just hide the modal (showView will restart scan if on scan tab)
  hideConfirmation();
});

// --- Camera control and scanning ---
if (startBtn) startBtn.addEventListener('click', startCamera);
if (stopBtn) stopBtn.addEventListener('click', stopCamera);
if (fileInput) fileInput.addEventListener('change', handleFile);
if (startCameraBtn) startCameraBtn.addEventListener('click', async () => {
  if (startOverlay) startOverlay.hidden = true;
  try {
    await startCamera();
  } catch (err) {
    console.error('Start via button failed', err);
    if (startOverlay) startOverlay.hidden = false;
  }
});

async function startCamera() {
  // guard: don't start twice
  if (scanning || (stream && stream.active)) return;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    video.srcObject = stream;
    await video.play();

  if (startBtn) startBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = false;
    scanning = true;

    // hide start overlay if visible
    if (startOverlay) startOverlay.hidden = true;

    // ensure canvas size
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    if (barcodeDetector) {
      scanWithBarcodeDetector();
    } else {
      scanWithJsQR();
    }
  } catch (err) {
    console.error('Could not start camera', err);
    // show start overlay so user can try manually
    if (startOverlay) startOverlay.hidden = false;
    // rethrow so callers (showView) can handle
    throw err;
  }
}

function stopCamera() {
  scanning = false;
  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  if (video) video.srcObject = null;
}

async function scanWithBarcodeDetector() {
  if (!scanning || !barcodeDetector) return;
  try {
    // draw only the scan-area crop to canvas then detect from that canvas
    if (drawCropToCanvas()) {
      const detections = await barcodeDetector.detect(canvas);
      if (detections && detections.length) {
        const raw = detections[0].rawValue;
        if (!processing) handleDetectionFeedback(raw, 'camera');
        return;
      }
    }
  } catch (err) {
    console.warn('BarcodeDetector failed, falling back to jsQR', err);
    scanWithJsQR();
    return;
  }
  rafId = requestAnimationFrame(scanWithBarcodeDetector);
}

function scanWithJsQR() {
  if (!scanning) return;
  const ctx = canvas.getContext('2d');
  try {
    // draw crop of video corresponding to the visible .scan-area
    if (!drawCropToCanvas()) {
      // fallback to full frame if crop failed
      canvas.width = video.videoWidth || canvas.width;
      canvas.height = video.videoHeight || canvas.height;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (window.jsQR) {
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        if (!processing) handleDetectionFeedback(code.data, 'camera');
        return;
      }
    }
  } catch (err) {
    console.error('scanWithJsQR error', err);
  }
  rafId = requestAnimationFrame(scanWithJsQR);
}

/**
 * Draw the portion of the video that corresponds to the centered .scan-area
 * into the global `canvas`. Returns true on success, false if coordinates are not ready.
 */
function drawCropToCanvas() {
  const scanArea = document.querySelector('.scan-area');
  if (!video || !scanArea || !canvas) return false;
  const videoRect = video.getBoundingClientRect();
  const areaRect = scanArea.getBoundingClientRect();
  // video may not have initialized dimensions yet
  if (!video.videoWidth || !video.videoHeight || videoRect.width === 0 || videoRect.height === 0) return false;

  const sx = Math.max(0, Math.floor((areaRect.left - videoRect.left) * (video.videoWidth / videoRect.width)));
  const sy = Math.max(0, Math.floor((areaRect.top - videoRect.top) * (video.videoHeight / videoRect.height)));
  const sWidth = Math.max(16, Math.floor(areaRect.width * (video.videoWidth / videoRect.width)));
  const sHeight = Math.max(16, Math.floor(areaRect.height * (video.videoHeight / videoRect.height)));

  // clamp to video dimensions
  const sxClamped = Math.min(sx, video.videoWidth - 1);
  const syClamped = Math.min(sy, video.videoHeight - 1);
  const sWClamped = Math.min(sWidth, video.videoWidth - sxClamped);
  const sHClamped = Math.min(sHeight, video.videoHeight - syClamped);

  // set canvas to crop size
  canvas.width = sWClamped;
  canvas.height = sHClamped;
  const ctx = canvas.getContext('2d');
  try {
    ctx.drawImage(video, sxClamped, syClamped, sWClamped, sHClamped, 0, 0, sWClamped, sHClamped);
    return true;
  } catch (err) {
    console.warn('drawCropToCanvas failed', err);
    return false;
  }
}

// --- Handle detected input (from camera or file or manual) ---
function handleDetectedInput(text, source) {
  // Simple validation: consider failure if text is very short
  const trimmed = (text || '').trim();
  const success = trimmed.length >= 3; // adjust as needed
  const title = success ? 'input berhasil' : 'input gagal';
  const message = success ? 'mohon masukkan paket pada box' : 'mohon coba lagi atau cek kembali penerima';
  // direct path for callers that want immediate confirmation
  showConfirmation(success, title, message, trimmed, source);
}

/**
 * Handle a detection by pausing scanning, playing a short animation in the scan area,
 * then showing the confirmation modal. This prevents the modal from appearing instantly
 * and gives the user a short visual 'scanning' feedback.
 */
function handleDetectionFeedback(text, source) {
  if (processing) return;
  processing = true;

  // pause detection loop immediately
  scanning = false;

  // immediately show confirmation (no pre-confirmation animation)
  handleDetectedInput(text, source);
}

function showConfirmation(success, title, message, payload, source) {
  // render icon
  confirmIcon.innerHTML = '';
  confirmIcon.classList.remove('success', 'failure');
  if (success) {
    confirmIcon.classList.add('success');
    confirmIcon.innerHTML = '<svg viewBox="0 0 100 100" width="120" height="120"><circle cx="50" cy="50" r="44" stroke="#10b981" stroke-width="6" fill="none"/><path d="M30 53 L44 67 L70 37" fill="none" stroke="#10b981" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  } else {
    confirmIcon.classList.add('failure');
    confirmIcon.innerHTML = '<svg viewBox="0 0 100 100" width="120" height="120"><circle cx="50" cy="50" r="44" stroke="#ef4444" stroke-width="6" fill="none"/><path d="M35 35 L65 65 M65 35 L35 65" fill="none" stroke="#ef4444" stroke-width="6" stroke-linecap="round"/></svg>';
  }

  confirmTitle.textContent = title;
  confirmMessage.textContent = message;

  // Optionally, we could POST `payload` to a server here.
  // Pause scanning and show modal
  stopCamera();
  if (confirmModal) {
    confirmModal.hidden = false;
    confirmModal.classList.add('active');
  }
}

// Modal close handlers: hide modal and restart camera if still on scan tab
function hideConfirmation() {
  if (confirmModal) {
    confirmModal.classList.remove('active');
    confirmModal.hidden = true;
  }
  // If user is still on scan tab, restart camera automatically
  const activeTab = Array.from(tabs).find(t => t.classList.contains('active'));
  if (activeTab && activeTab.dataset.view === 'scan') {
    // slight delay to allow modal to hide
    // reset processing flag then try to restart camera
    processing = false;
    setTimeout(() => startCamera().catch(() => { if (startOverlay) startOverlay.hidden = false; }), 250);
  }
}

if (confirmClose) confirmClose.addEventListener('click', hideConfirmation);
if (confirmOk) confirmOk.addEventListener('click', hideConfirmation);

// also allow clicking on the overlay outside modal to close
if (confirmModal) {
  confirmModal.addEventListener('click', (ev) => {
    if (ev.target === confirmModal) hideConfirmation();
  });
}

// allow ESC key to close modal
window.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') hideConfirmation();
});

// --- File input handling (image) ---
function handleFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const img = new Image();
  const reader = new FileReader();
  reader.onload = function() {
    img.onload = function() {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (window.jsQR) {
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          // for file input we also show the brief animation then confirmation
          if (!processing) {
            handleDetectionFeedback(code.data, 'file');
          }
          return;
        }
      }
      alert('No QR code found in the image.');
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

// --- Manual form ---
manualForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const resi = resiInput.value.trim();
  const recipient = recipientInput.value.trim();
  if (!resi) {
    alert('Mohon masukkan nomor resi');
    return;
  }
  // Here we can validate or send to server. For now, treat as success if resi length ok
  const combined = `${resi} | ${recipient}`;
  // Play detection feedback before showing confirmation
  if (!processing) handleDetectionFeedback(combined, 'manual');
});

// Cleanup
window.addEventListener('pagehide', () => stopCamera());

// Start on load in scan view
showView('scan');
