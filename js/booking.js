import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from './firebase-config.js';

// State
let attachedAudioData = null;
let attachedAudioName = null;
let currentAuthUser = null;
let currentBasePrice = 250;
let appliedPromoData = null;

// DOM Elements
const bookingForm = document.getElementById('bookingForm');
const serviceSelect = document.getElementById('serviceSelect');
const fileInput = document.getElementById('audioFileInput');
const fileDropZone = document.getElementById('fileDropZone');
const fileAttachedInfo = document.getElementById('fileAttachedInfo');
const attachedFileNameEl = document.getElementById('attachedFileName');
const removeFileBtn = document.getElementById('removeFileBtn');
const uploadProgressBar = document.getElementById('uploadProgressBar');
const uploadProgressFill = document.getElementById('uploadProgressFill');
const submitBtn = document.getElementById('submitBookingBtn');
const submitBtnText = document.getElementById('submitBtnText');
const submitBtnSpinner = document.getElementById('submitBtnSpinner');

// Promo & Price Summary
const promoCodeInput = document.getElementById('promoCodeInput');
const applyPromoCodeBtn = document.getElementById('applyPromoCodeBtn');
const promoCodeFeedback = document.getElementById('promoCodeFeedback');
const priceSummaryBase = document.getElementById('priceSummaryBase');
const priceSummaryDiscount = document.getElementById('priceSummaryDiscount');
const priceSummaryFinal = document.getElementById('priceSummaryFinal');

// Success Modal Elements
const successModal = document.getElementById('successModal');
const closeSuccessModalBtn = document.getElementById('closeSuccessModalBtn');
const modalBookingId = document.getElementById('modalBookingId');
const modalCustomerName = document.getElementById('modalCustomerName');
const modalService = document.getElementById('modalService');
const modalPriceAmount = document.getElementById('modalPriceAmount');
const modalDateTime = document.getElementById('modalDateTime');
const modalWhatsappLink = document.getElementById('modalWhatsappLink');

// Auth elements
const googleSignInBtn = document.getElementById('googleSignInBtn');
const authStatusBox = document.getElementById('authStatusBox');
const authUserName = document.getElementById('authUserName');
const authUserEmail = document.getElementById('authUserEmail');
const authSignOutBtn = document.getElementById('authSignOutBtn');

// Initialize Auth Listener
onAuthStateChanged(auth, async (user) => {
  currentAuthUser = user;
  if (user) {
    if (authStatusBox) authStatusBox.style.display = 'flex';
    if (googleSignInBtn) googleSignInBtn.style.display = 'none';
    if (authUserName) authUserName.textContent = user.displayName || 'Customer';
    if (authUserEmail) authUserEmail.textContent = user.email || '';
    
    // Auto-fill customer name if empty
    const nameInput = document.getElementById('customerName');
    if (nameInput && !nameInput.value && user.displayName) {
      nameInput.value = user.displayName;
    }

    // Synchronize user to Cloud SQL
    try {
      const idToken = await user.getIdToken();
      await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
    } catch (e) {
      console.warn('User sync skipped:', e);
    }
  } else {
    if (authStatusBox) authStatusBox.style.display = 'none';
    if (googleSignInBtn) googleSignInBtn.style.display = 'inline-flex';
  }
});

// Google Sign-In Click
if (googleSignInBtn) {
  googleSignInBtn.addEventListener('click', async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('Signed in with Google successfully!', 'success');
    } catch (err) {
      console.error('Google Sign In Error:', err);
      showToast('Sign in cancelled or not available', 'info');
    }
  });
}

if (authSignOutBtn) {
  authSignOutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      showToast('Signed out', 'info');
    } catch (err) {
      console.error('Sign Out Error:', err);
    }
  });
}

// Service Selection & Price Calculation
if (serviceSelect) {
  serviceSelect.addEventListener('change', () => {
    updatePriceSummary();
  });
}

function updatePriceSummary() {
  const selectedOption = serviceSelect?.options[serviceSelect.selectedIndex];
  if (selectedOption && selectedOption.dataset.price) {
    currentBasePrice = Number(selectedOption.dataset.price);
  } else {
    currentBasePrice = 250;
  }

  let discount = 0;
  if (appliedPromoData) {
    if (appliedPromoData.discountType === 'percentage') {
      discount = Math.round((currentBasePrice * Number(appliedPromoData.discountValue)) / 100);
      if (appliedPromoData.maxDiscount && discount > appliedPromoData.maxDiscount) {
        discount = appliedPromoData.maxDiscount;
      }
    } else {
      discount = Number(appliedPromoData.discountValue);
    }
    discount = Math.min(discount, currentBasePrice);
  }

  const finalAmount = Math.max(0, currentBasePrice - discount);

  if (priceSummaryBase) priceSummaryBase.textContent = `₹${currentBasePrice}`;
  if (priceSummaryDiscount) priceSummaryDiscount.textContent = discount > 0 ? `-₹${discount}` : `-₹0`;
  if (priceSummaryFinal) priceSummaryFinal.textContent = `₹${finalAmount}`;
}

// Promo Code Apply Button
if (applyPromoCodeBtn && promoCodeInput) {
  applyPromoCodeBtn.addEventListener('click', async () => {
    const code = promoCodeInput.value.trim().toUpperCase();
    if (!code) {
      showToast('Please enter a promo code first.', 'error');
      return;
    }

    applyPromoCodeBtn.disabled = true;
    applyPromoCodeBtn.textContent = 'Verifying...';

    try {
      const serviceName = serviceSelect?.value || 'Bhojpuri Remix';
      const res = await fetch('/api/public/validate-gift-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          serviceName,
          baseAmount: currentBasePrice
        })
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        appliedPromoData = null;
        updatePriceSummary();
        showPromoFeedback(data.error || 'Invalid or expired promo code.', false);
        showToast(data.error || 'Invalid code.', 'error');
        return;
      }

      appliedPromoData = data;
      updatePriceSummary();
      showPromoFeedback(`✓ ${data.message || 'Promo code applied!'}`, true);
      showToast(data.message, 'success');
    } catch (err) {
      console.error('Promo validation error:', err);
      showPromoFeedback('Could not verify promo code.', false);
    } finally {
      applyPromoCodeBtn.disabled = false;
      applyPromoCodeBtn.textContent = 'Apply Code';
    }
  });
}

function showPromoFeedback(message, isSuccess) {
  if (!promoCodeFeedback) return;
  promoCodeFeedback.style.display = 'block';
  promoCodeFeedback.style.color = isSuccess ? 'var(--neon-emerald)' : 'var(--neon-red)';
  promoCodeFeedback.textContent = message;
}

// File Upload Handling
if (fileDropZone && fileInput) {
  fileDropZone.addEventListener('click', () => fileInput.click());

  fileDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropZone.classList.add('dragover');
  });

  fileDropZone.addEventListener('dragleave', () => {
    fileDropZone.classList.remove('dragover');
  });

  fileDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleAudioFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleAudioFile(e.target.files[0]);
    }
  });
}

function handleAudioFile(file) {
  if (file.size > 8 * 1024 * 1024) {
    showToast('File size must be under 8MB for instant upload', 'error');
    return;
  }

  attachedAudioName = file.name;
  if (uploadProgressBar) uploadProgressBar.style.display = 'block';
  if (uploadProgressFill) uploadProgressFill.style.width = '0%';

  let progress = 10;
  const interval = setInterval(() => {
    progress += 25;
    if (uploadProgressFill) uploadProgressFill.style.width = `${progress}%`;
    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        if (uploadProgressBar) uploadProgressBar.style.display = 'none';
        if (fileAttachedInfo) fileAttachedInfo.style.display = 'flex';
        if (attachedFileNameEl) attachedFileNameEl.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      }, 250);
    }
  }, 80);

  const reader = new FileReader();
  reader.onload = (e) => {
    attachedAudioData = e.target.result;
  };
  reader.readAsDataURL(file);
}

if (removeFileBtn) {
  removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    attachedAudioData = null;
    attachedAudioName = null;
    if (fileInput) fileInput.value = '';
    if (fileAttachedInfo) fileAttachedInfo.style.display = 'none';
  });
}

// Form Submission (Calls Secure Backend API)
if (bookingForm) {
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const customerName = document.getElementById('customerName')?.value.trim();
    const mobileNumber = document.getElementById('mobileNumber')?.value.trim();
    const whatsappNumber = document.getElementById('whatsappNumber')?.value.trim() || mobileNumber;
    const service = document.getElementById('serviceSelect')?.value;
    const language = document.getElementById('languageSelect')?.value;
    const songName = document.getElementById('songName')?.value.trim();
    const artistName = document.getElementById('artistName')?.value.trim() || 'Not specified';
    const nameToAdd = document.getElementById('nameToAdd')?.value.trim() || '';
    const preferredStyle = document.getElementById('preferredStyle')?.value || 'Standard Club Remix';
    const additionalRequirements = document.getElementById('additionalRequirements')?.value.trim() || '';
    const deliveryTime = document.getElementById('deliveryTime')?.value || 'Standard (2-3 Days)';

    // Validations
    if (!customerName || customerName.length < 2) {
      showToast('Please enter your full customer name', 'error');
      document.getElementById('customerName')?.focus();
      return;
    }

    if (!mobileNumber || mobileNumber.length < 10) {
      showToast('Please enter a valid 10-digit mobile number', 'error');
      document.getElementById('mobileNumber')?.focus();
      return;
    }

    if (!service) {
      showToast('Please select a remix service', 'error');
      document.getElementById('serviceSelect')?.focus();
      return;
    }

    if (!language) {
      showToast('Please choose the music language', 'error');
      document.getElementById('languageSelect')?.focus();
      return;
    }

    if (!songName) {
      showToast('Please enter the song title', 'error');
      document.getElementById('songName')?.focus();
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        customerName,
        mobileNumber,
        whatsappNumber,
        service,
        language,
        songName,
        artistName,
        nameToAdd,
        preferredStyle,
        additionalRequirements,
        deliveryTime,
        giftCode: appliedPromoData ? appliedPromoData.code : (promoCodeInput?.value.trim().toUpperCase() || ''),
        customerUid: currentAuthUser ? currentAuthUser.uid : 'guest',
        customerEmail: currentAuthUser ? (currentAuthUser.email || '') : '',
        audioFileName: attachedAudioName || '',
        audioFileData: attachedAudioData || ''
      };

      // Transmit to Backend API for verified discount and Firestore save
      const res = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Booking submission failed');
      }

      const bookingRecord = data.booking;

      // Reset form
      bookingForm.reset();
      attachedAudioData = null;
      attachedAudioName = null;
      appliedPromoData = null;
      if (promoCodeFeedback) promoCodeFeedback.style.display = 'none';
      if (fileAttachedInfo) fileAttachedInfo.style.display = 'none';
      updatePriceSummary();

      // Show receipt modal
      displaySuccessModal(bookingRecord);
      showToast(`Booking ${bookingRecord.bookingId} submitted successfully!`, 'success');

    } catch (error) {
      console.error('Booking submission error:', error);
      showToast(error.message || 'Submission error. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  });
}

function setSubmitting(isSubmitting) {
  if (submitBtn) submitBtn.disabled = isSubmitting;
  if (submitBtnText) submitBtnText.textContent = isSubmitting ? 'Transmitting to Studio Cloud...' : 'Submit Booking Request';
  if (submitBtnSpinner) submitBtnSpinner.style.display = isSubmitting ? 'inline-block' : 'none';
}

function displaySuccessModal(data) {
  if (modalBookingId) modalBookingId.textContent = data.bookingId;
  if (modalCustomerName) modalCustomerName.textContent = data.customerName;
  if (modalService) modalService.textContent = `${data.service} (${data.language})`;
  if (modalPriceAmount) modalPriceAmount.textContent = `₹${data.finalPrice ?? 250}`;
  if (modalDateTime) modalDateTime.textContent = new Date().toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  if (modalWhatsappLink) {
    const message = encodeURIComponent(
      `Hello Sanjeet Music Hub! 🎵\nI have just submitted a remix booking.\n\n` +
      `📌 Booking ID: ${data.bookingId}\n` +
      `👤 Name: ${data.customerName}\n` +
      `🎼 Song: ${data.songName}\n` +
      `🎙️ Service: ${data.service} (${data.language})\n` +
      `💰 Final Price: ₹${data.finalPrice ?? 250}\n` +
      `⚡ Style: ${data.preferredStyle}\n` +
      `⏳ Timeline: ${data.deliveryTime}\n\n` +
      `Please confirm receipt and start studio mastering!`
    );
    const cleanWa = (data.whatsappNumber || '919876543210').replace(/[^0-9]/g, '');
    modalWhatsappLink.href = `https://wa.me/919876543210?text=${message}`;
  }

  if (successModal) successModal.classList.add('active');
}

if (closeSuccessModalBtn) {
  closeSuccessModalBtn.addEventListener('click', () => {
    if (successModal) successModal.classList.remove('active');
  });
}

if (successModal) {
  successModal.addEventListener('click', (e) => {
    if (e.target === successModal) successModal.classList.remove('active');
  });
}

// Global Toast Helper
export function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
