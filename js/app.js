/* app.js — mobile QR scanner with 3 views: scan, manual input, confirmation

   Behavior:
   - Attempts to use BarcodeDetector (native) if available.
   - Falls back to jsQR by capturing video frames to a canvas.
   - Provides a manual input form.
   - Shows a confirmation view (success/failure) after scan or manual submit.
*/

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const fileInput = document.getElementById('fileInput');

const tabs = document.querySelectorAll('.tab');
const scanView = document.getElementById('scanView');
const manualView = document.getElementById('manualView');
// Modal elements (confirmation popup)
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
    startCamera();
  } else {
    stopCamera();
  }
}

tabs.forEach(t => t.addEventListener('click', () => showView(t.dataset.view)));
closeBtn.addEventListener('click', () => showView('scan'));

confirmClose.addEventListener('click', () => {
  // After confirmation, just hide the modal (showView will restart scan if on scan tab)
  hideConfirmation();
});

// --- Camera control and scanning ---
if (startBtn) startBtn.addEventListener('click', startCamera);
if (stopBtn) stopBtn.addEventListener('click', stopCamera);
if (fileInput) fileInput.addEventListener('change', handleFile);

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    video.srcObject = stream;
    await video.play();

  if (startBtn) startBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = false;
    scanning = true;

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
    alert('Could not access camera. Try allowing camera permissions or use the file input or manual input as fallback.');
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
    const detections = await barcodeDetector.detect(video);
    if (detections && detections.length) {
      const raw = detections[0].rawValue;
      handleDetectedInput(raw, 'camera');
      return;
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
    canvas.width = video.videoWidth || canvas.width;
    canvas.height = video.videoHeight || canvas.height;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (window.jsQR) {
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        handleDetectedInput(code.data, 'camera');
        return;
      }
    }
  } catch (err) {
    console.error('scanWithJsQR error', err);
  }
  rafId = requestAnimationFrame(scanWithJsQR);
}

// --- Handle detected input (from camera or file or manual) ---
function handleDetectedInput(text, source) {
  // Simple validation: consider failure if text is very short
  const trimmed = (text || '').trim();
  const success = trimmed.length >= 3; // adjust as needed
  const title = success ? 'input berhasil' : 'input gagal';
  const message = success ? 'mohon masukkan paket pada box' : 'mohon coba lagi atau cek kembali penerima';
  showConfirmation(success, title, message, trimmed, source);
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
    setTimeout(() => startCamera(), 250);
  }
}

if (confirmClose) confirmClose.addEventListener('click', hideConfirmation);
if (confirmOk) confirmOk.addEventListener('click', hideConfirmation);

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
          handleDetectedInput(code.data, 'file');
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
  handleDetectedInput(combined, 'manual');
});

// Cleanup
window.addEventListener('pagehide', () => stopCamera());

// Start on load in scan view
showView('scan');
