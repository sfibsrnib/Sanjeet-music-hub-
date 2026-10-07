// ========================================================
// SANJEET MUSIC HUB - PRIVATE STUDIO MANAGEMENT ENGINE
// Secured via Backend JWT Authentication & Firestore APIs
// ========================================================

let adminToken = sessionStorage.getItem('smh_admin_token') || null;
let allBookings = [];
let allServices = [];
let allGiftCodes = [];
let currentTab = 'tab-dashboard';

// DOM Elements
const loginWrapper = document.getElementById('loginWrapper');
const adminPortal = document.getElementById('adminPortal');
const loginForm = document.getElementById('loginForm');
const loginUsernameInput = document.getElementById('loginUsername');
const loginPasswordInput = document.getElementById('loginPassword');
const loginBtnText = document.getElementById('loginBtnText');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');
const adminUserBadge = document.getElementById('adminUserBadge');
const adminUsernameDisplay = document.getElementById('adminUsernameDisplay');
const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
const adminSidebar = document.getElementById('adminSidebar');

// Initialize On Load
document.addEventListener('DOMContentLoaded', async () => {
  setupSidebarNavigation();
  setupLoginForm();
  setupModalDismissals();

  if (adminToken) {
    const isValid = await verifySession();
    if (isValid) {
      showAdminPortal();
      loadAllData();
    } else {
      showLoginGateway();
    }
  } else {
    showLoginGateway();
  }
});

// Session Verification
async function verifySession() {
  try {
    const res = await fetch('/api/admin/verify-session', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (adminUsernameDisplay && data.user) {
        adminUsernameDisplay.textContent = data.user.username;
      }
      return true;
    }
  } catch (err) {
    console.error('Session verify failed:', err);
  }
  adminToken = null;
  sessionStorage.removeItem('smh_admin_token');
  return false;
}

// UI State Switchers
function showLoginGateway() {
  if (loginWrapper) loginWrapper.style.display = 'flex';
  if (adminPortal) adminPortal.style.display = 'none';
  if (adminLogoutBtn) adminLogoutBtn.style.display = 'none';
  if (adminUserBadge) adminUserBadge.style.display = 'none';
}

function showAdminPortal() {
  if (loginWrapper) loginWrapper.style.display = 'none';
  if (adminPortal) adminPortal.style.display = 'flex';
  if (adminLogoutBtn) adminLogoutBtn.style.display = 'inline-block';
  if (adminUserBadge) adminUserBadge.style.display = 'flex';
}

// Authenticated Fetch Helper
async function apiFetch(url, options = {}) {
  const headers = options.headers || {};
  if (adminToken) {
    headers['Authorization'] = `Bearer ${adminToken}`;
  }
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  options.headers = headers;

  const res = await fetch(url, options);
  if (res.status === 401) {
    showAdminToast('Session expired. Please log in again.', 'error');
    adminToken = null;
    sessionStorage.removeItem('smh_admin_token');
    showLoginGateway();
    throw new Error('Unauthorized');
  }
  return res;
}

// Login Handler
function setupLoginForm() {
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = loginUsernameInput?.value.trim() || 'sanjeet';
    const password = loginPasswordInput?.value.trim();

    if (!password) {
      showAdminToast('Please enter your security password.', 'error');
      return;
    }

    if (loginBtnText) loginBtnText.textContent = 'Verifying Credentials...';

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      adminToken = data.token;
      sessionStorage.setItem('smh_admin_token', adminToken);
      if (adminUsernameDisplay) {
        adminUsernameDisplay.textContent = data.user.username;
      }

      showAdminToast('Access granted. Welcome to Studio Desk.', 'success');
      showAdminPortal();
      loadAllData();
      loginPasswordInput.value = '';
    } catch (err) {
      showAdminToast(err.message || 'Login failed. Invalid password.', 'error');
    } finally {
      if (loginBtnText) loginBtnText.textContent = 'Unlock System →';
    }
  });

  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', () => {
      adminToken = null;
      sessionStorage.removeItem('smh_admin_token');
      showLoginGateway();
      showAdminToast('Logged out of studio management.', 'info');
    });
  }
}

// Navigation & Tab Switching
function setupSidebarNavigation() {
  const tabs = document.querySelectorAll('.sidebar-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-tab');
      if (targetId) switchTab(targetId);
      if (window.innerWidth <= 900 && adminSidebar) {
        adminSidebar.classList.remove('open');
      }
    });
  });

  if (sidebarToggleBtn && adminSidebar) {
    sidebarToggleBtn.addEventListener('click', () => {
      adminSidebar.classList.toggle('open');
    });
  }

  // Global window tab switcher
  window.switchTab = (tabId) => {
    tabs.forEach(t => {
      if (t.getAttribute('data-tab') === tabId) t.classList.add('active');
      else t.classList.remove('active');
    });

    document.querySelectorAll('.tab-pane').forEach(p => {
      if (p.id === tabId) p.classList.add('active');
      else p.classList.remove('active');
    });

    currentTab = tabId;
  };
}

// Master Data Loader
async function loadAllData() {
  await Promise.allSettled([
    loadDashboardStats(),
    loadBookings(),
    loadServices(),
    loadGiftCodes(),
    loadWebsiteSettings(),
    loadAuditLogs()
  ]);
}

// -------------------------------------------------------------
// 1. DASHBOARD OVERVIEW
// -------------------------------------------------------------
async function loadDashboardStats() {
  try {
    const res = await apiFetch('/api/admin/dashboard-stats');
    if (!res.ok) return;
    const stats = await res.json();

    document.getElementById('statTotal').textContent = stats.totalBookings || 0;
    document.getElementById('statPending').textContent = stats.pending || 0;
    document.getElementById('statConfirmed').textContent = stats.confirmed || 0;
    document.getElementById('statInProgress').textContent = stats.inProgress || 0;
    document.getElementById('statCompleted').textContent = stats.completed || 0;
    document.getElementById('statCancelled').textContent = stats.cancelled || 0;
    document.getElementById('statRevenue').textContent = `₹${stats.totalRevenue || 0}`;
    document.getElementById('statActiveCodes').textContent = stats.activeCodes || 0;
  } catch (err) {
    console.warn('Dashboard stats error:', err);
  }
}

// -------------------------------------------------------------
// 2. BOOKINGS MANAGEMENT
// -------------------------------------------------------------
async function loadBookings() {
  try {
    const res = await apiFetch('/api/admin/bookings');
    if (!res.ok) return;
    allBookings = await res.json();

    renderRecentBookings();
    renderBookingsTable();
    populateBookingServiceFilter();
  } catch (err) {
    console.warn('Bookings load error:', err);
  }
}

function renderRecentBookings() {
  const tbody = document.getElementById('recentBookingsTableBody');
  if (!tbody) return;

  const recents = allBookings.slice(0, 6);
  if (recents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--admin-muted); padding: 1.5rem;">No recent bookings recorded.</td></tr>`;
    return;
  }

  tbody.innerHTML = recents.map(b => `
    <tr>
      <td><span class="booking-id-tag">${b.bookingId}</span></td>
      <td><strong>${escapeHtml(b.customerName)}</strong><br/><small style="color: var(--admin-muted);">${escapeHtml(b.mobileNumber)}</small></td>
      <td>${escapeHtml(b.service)}</td>
      <td>${escapeHtml(b.songName)}</td>
      <td><strong>₹${b.finalPrice ?? 250}</strong> ${b.giftCode ? `<small style="color: var(--admin-cyan);">(${b.giftCode})</small>` : ''}</td>
      <td><span class="badge ${getStatusBadgeClass(b.status)}">${b.status || 'Pending'}</span></td>
    </tr>
  `).join('');
}

function renderBookingsTable() {
  const tbody = document.getElementById('bookingsFullTableBody');
  if (!tbody) return;

  const searchQ = document.getElementById('bookingSearchInput')?.value.toLowerCase().trim() || '';
  const statusFilter = document.getElementById('bookingStatusFilter')?.value || 'all';
  const serviceFilter = document.getElementById('bookingServiceFilter')?.value || 'all';
  const sortSelect = document.getElementById('bookingSortSelect')?.value || 'newest';

  let filtered = allBookings.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (serviceFilter !== 'all' && b.service !== serviceFilter) return false;
    if (searchQ) {
      const matchId = (b.bookingId || '').toLowerCase().includes(searchQ);
      const matchName = (b.customerName || '').toLowerCase().includes(searchQ);
      const matchPhone = (b.mobileNumber || '').includes(searchQ) || (b.whatsappNumber || '').includes(searchQ);
      const matchSong = (b.songName || '').toLowerCase().includes(searchQ);
      const matchCode = (b.giftCode || '').toLowerCase().includes(searchQ);
      if (!matchId && !matchName && !matchPhone && !matchSong && !matchCode) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (sortSelect === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    if (sortSelect === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    if (sortSelect === 'name') return (a.customerName || '').localeCompare(b.customerName || '');
    return 0;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--admin-muted); padding: 3rem;">No bookings found matching filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(b => {
    const dateFormatted = b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-';
    return `
      <tr>
        <td><span class="booking-id-tag">${b.bookingId}</span></td>
        <td>
          <strong>${escapeHtml(b.customerName)}</strong>
          <div style="font-size: 0.78rem; color: var(--admin-muted);">${escapeHtml(b.mobileNumber)}</div>
        </td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(b.service)}</div>
          <small style="color: var(--admin-cyan);">${escapeHtml(b.language || '')}</small>
        </td>
        <td>
          <div style="max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${escapeHtml(b.songName)}
          </div>
          ${b.nameToAdd ? `<small style="color: var(--admin-magenta);">Tag: ${escapeHtml(b.nameToAdd)}</small>` : ''}
        </td>
        <td>
          <div style="font-weight: 700; color: #fff;">₹${b.finalPrice ?? 250}</div>
          ${b.discount ? `<small style="color: var(--admin-emerald);">-₹${b.discount} (${b.giftCode})</small>` : '<small style="color: var(--admin-muted);">No coupon</small>'}
        </td>
        <td><span class="badge ${getStatusBadgeClass(b.status)}">${b.status || 'Pending'}</span></td>
        <td><small style="color: var(--admin-muted);">${dateFormatted}</small></td>
        <td>
          <div class="action-btns">
            <button class="icon-btn" title="Inspect Order" onclick="window.openBookingDetail('${b.bookingId}')">👁️</button>
            <button class="icon-btn" title="WhatsApp Message" onclick="window.sendWhatsAppClient('${b.whatsappNumber || b.mobileNumber}', '${b.bookingId}', '${escapeHtml(b.customerName)}')">💬</button>
            <button class="icon-btn delete" title="Delete Booking" onclick="window.confirmDeleteBooking('${b.bookingId}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function populateBookingServiceFilter() {
  const sel = document.getElementById('bookingServiceFilter');
  if (!sel) return;
  const current = sel.value;
  const uniqueServices = Array.from(new Set(allBookings.map(b => b.service).filter(Boolean)));
  
  sel.innerHTML = `<option value="all">All Services</option>` +
    uniqueServices.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  if (current) sel.value = current;
}

// Booking Details Modal
let activeBookingId = null;

window.openBookingDetail = (bookingId) => {
  const b = allBookings.find(item => item.bookingId === bookingId);
  if (!b) return;
  activeBookingId = bookingId;

  document.getElementById('detailBookingId').textContent = b.bookingId;
  document.getElementById('detailCustomerName').textContent = b.customerName;
  document.getElementById('detailPhone').textContent = b.mobileNumber;
  document.getElementById('detailWhatsapp').textContent = b.whatsappNumber || b.mobileNumber;
  document.getElementById('detailServiceLang').textContent = `${b.service} (${b.language || 'Regional'})`;
  document.getElementById('detailSongTitle').textContent = b.songName;
  document.getElementById('detailArtist').textContent = b.artistName || 'Not specified';
  document.getElementById('detailNameDrop').textContent = b.nameToAdd || 'None';
  document.getElementById('detailStyle').textContent = b.preferredStyle || 'Standard';
  document.getElementById('detailDelivery').textContent = b.deliveryTime || 'Standard (2-3 Days)';
  document.getElementById('detailPricing').innerHTML = `
    <strong>Final: ₹${b.finalPrice ?? 250}</strong> (Base: ₹${b.originalPrice || 250}${b.discount ? `, Discount: -₹${b.discount} via ${b.giftCode}` : ''})
  `;
  document.getElementById('detailNotesBox').textContent = b.additionalRequirements || 'No special requirements noted.';

  const badgeEl = document.getElementById('detailStatusBadge');
  badgeEl.className = `badge ${getStatusBadgeClass(b.status)}`;
  badgeEl.textContent = b.status || 'Pending';

  // Audio Box
  const audioBox = document.getElementById('detailAudioBox');
  if (audioBox) {
    if (b.audioFileData) {
      audioBox.innerHTML = `
        <div style="background: rgba(0, 240, 255, 0.08); border: 1px solid rgba(0, 240, 255, 0.25); border-radius: 8px; padding: 0.75rem;">
          <div style="font-weight: 700; margin-bottom: 0.35rem; color: var(--admin-cyan);">Sample: ${escapeHtml(b.audioFileName || 'sample.mp3')}</div>
          <audio controls src="${b.audioFileData}" style="width: 100%; height: 34px;"></audio>
        </div>
      `;
    } else {
      audioBox.innerHTML = `<span style="color: var(--admin-muted); font-size: 0.85rem; font-style: italic;">No audio sample attached.</span>`;
    }
  }

  // Status buttons
  const statusButtons = document.querySelectorAll('#modalStatusBtnRow .status-toggle-btn');
  statusButtons.forEach(btn => {
    if (btn.getAttribute('data-status') === b.status) btn.classList.add('current');
    else btn.classList.remove('current');
  });

  const modal = document.getElementById('bookingDetailModal');
  if (modal) modal.classList.add('active');
};

// Update Booking Status
document.querySelectorAll('#modalStatusBtnRow .status-toggle-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!activeBookingId) return;
    const newStatus = btn.getAttribute('data-status');

    try {
      const res = await apiFetch(`/api/admin/bookings/${activeBookingId}`, {
        method: 'PATCH',
        body: { status: newStatus }
      });
      if (!res.ok) throw new Error('Update failed');

      showAdminToast(`Booking ${activeBookingId} set to '${newStatus}'`, 'success');
      // Update local object
      const b = allBookings.find(item => item.bookingId === activeBookingId);
      if (b) b.status = newStatus;

      window.openBookingDetail(activeBookingId);
      renderBookingsTable();
      renderRecentBookings();
      loadDashboardStats();
    } catch (err) {
      showAdminToast('Failed to update booking status.', 'error');
    }
  });
});

window.confirmDeleteBooking = async (bookingId) => {
  if (!confirm(`Permanently delete booking ${bookingId}?`)) return;
  try {
    const res = await apiFetch(`/api/admin/bookings/${bookingId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');

    showAdminToast(`Booking ${bookingId} deleted.`, 'info');
    allBookings = allBookings.filter(b => b.bookingId !== bookingId);
    renderBookingsTable();
    renderRecentBookings();
    loadDashboardStats();

    const modal = document.getElementById('bookingDetailModal');
    if (modal) modal.classList.remove('active');
  } catch (err) {
    showAdminToast('Could not delete booking.', 'error');
  }
};

window.sendWhatsAppClient = (phone, id, name) => {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const target = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
  const msg = encodeURIComponent(`Hello ${name}! Greetings from Sanjeet Music Hub regarding your remix booking order ${id}.`);
  window.open(`https://wa.me/${target}?text=${msg}`, '_blank');
};

// WhatsApp inside detail modal
const detailWhatsappBtn = document.getElementById('detailWhatsappReplyBtn');
if (detailWhatsappBtn) {
  detailWhatsappBtn.addEventListener('click', () => {
    const b = allBookings.find(item => item.bookingId === activeBookingId);
    if (!b) return;
    const cleanPhone = (b.whatsappNumber || b.mobileNumber || '').replace(/[^0-9]/g, '');
    const target = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    const msg = encodeURIComponent(
      `Hello ${b.customerName}! 🎵\nUpdate from Sanjeet Music Hub:\n` +
      `📌 Order: ${b.bookingId}\n` +
      `🎼 Song: ${b.songName}\n` +
      `⚡ Status: *${b.status}*\n` +
      `💰 Amount: ₹${b.finalPrice ?? 250}\n\n` +
      `Thank you for trusting Sanjeet Music Hub studio mastering!`
    );
    window.open(`https://wa.me/${target}?text=${msg}`, '_blank');
  });
}

const detailDeleteBtn = document.getElementById('detailDeleteBookingBtn');
if (detailDeleteBtn) {
  detailDeleteBtn.addEventListener('click', () => {
    if (activeBookingId) window.confirmDeleteBooking(activeBookingId);
  });
}

// Booking Search & Filter Events
['bookingSearchInput', 'bookingStatusFilter', 'bookingServiceFilter', 'bookingSortSelect'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', renderBookingsTable);
});

document.getElementById('refreshBookingsBtn')?.addEventListener('click', () => {
  loadBookings();
  showAdminToast('Bookings refreshed.', 'info');
});

document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
  if (allBookings.length === 0) {
    showAdminToast('No bookings to export.', 'info');
    return;
  }
  const headers = ['Booking ID', 'Customer Name', 'Phone', 'WhatsApp', 'Service', 'Language', 'Song Title', 'Original Price', 'Discount', 'Coupon', 'Final Price', 'Status', 'Date'];
  const rows = allBookings.map(b => [
    `"${b.bookingId}"`, `"${b.customerName}"`, `"${b.mobileNumber}"`, `"${b.whatsappNumber}"`,
    `"${b.service}"`, `"${b.language}"`, `"${b.songName}"`, b.originalPrice || 250, b.discount || 0,
    `"${b.giftCode || ''}"`, b.finalPrice || 250, `"${b.status}"`, `"${b.createdAt || ''}"`
  ]);

  const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const link = document.createElement('a');
  link.href = encodeURI(csv);
  link.download = `Sanjeet_Music_Hub_Orders_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  showAdminToast('Exported CSV spreadsheet.', 'success');
});

// -------------------------------------------------------------
// 3. SERVICES MANAGEMENT
// -------------------------------------------------------------
async function loadServices() {
  try {
    const res = await apiFetch('/api/admin/services');
    if (!res.ok) return;
    allServices = await res.json();
    renderServicesTable();
    renderPriceEditorTable();
  } catch (err) {
    console.warn('Services load error:', err);
  }
}

function renderServicesTable() {
  const tbody = document.getElementById('servicesTableBody');
  if (!tbody) return;

  if (allServices.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--admin-muted); padding: 2rem;">No services configured.</td></tr>`;
    return;
  }

  tbody.innerHTML = allServices.map(s => `
    <tr>
      <td style="font-size: 1.4rem;">${s.icon || '🎚️'}</td>
      <td><strong>${escapeHtml(s.serviceName)}</strong></td>
      <td style="max-width: 250px; font-size: 0.85rem; color: var(--admin-muted);">${escapeHtml(s.description || '')}</td>
      <td><span style="font-weight: 700;">₹${s.price}</span></td>
      <td><span style="font-weight: 700; color: var(--admin-cyan);">₹${s.discountPrice || s.price}</span></td>
      <td>
        <span class="badge ${s.status === 'Active' ? 'badge-active' : 'badge-inactive'}">${s.status || 'Active'}</span>
      </td>
      <td>
        <div class="action-btns">
          <button class="icon-btn" title="Edit Service" onclick="window.openEditServiceModal('${s.id}')">✏️</button>
          <button class="icon-btn" title="Toggle Status" onclick="window.toggleServiceStatus('${s.id}', '${s.status}')">🔄</button>
          <button class="icon-btn delete" title="Delete Service" onclick="window.deleteServiceItem('${s.id}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Service Form & Modal
const serviceModal = document.getElementById('serviceModal');
const serviceForm = document.getElementById('serviceForm');

document.getElementById('openAddServiceModalBtn')?.addEventListener('click', () => {
  serviceForm.reset();
  document.getElementById('serviceFormId').value = '';
  document.getElementById('serviceModalTitle').textContent = 'Add New Service';
  serviceModal.classList.add('active');
});

window.openEditServiceModal = (id) => {
  const s = allServices.find(item => item.id === id);
  if (!s) return;
  document.getElementById('serviceFormId').value = s.id;
  document.getElementById('serviceFormName').value = s.serviceName;
  document.getElementById('serviceFormPrice').value = s.price;
  document.getElementById('serviceFormDiscountPrice').value = s.discountPrice ?? s.price;
  document.getElementById('serviceFormIcon').value = s.icon || '🎚️';
  document.getElementById('serviceFormStatus').value = s.status || 'Active';
  document.getElementById('serviceFormDesc').value = s.description || '';
  document.getElementById('serviceFormHighlights').value = (s.highlights || []).join(', ');
  document.getElementById('serviceModalTitle').textContent = 'Edit Service: ' + s.serviceName;
  serviceModal.classList.add('active');
};

serviceForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('serviceFormId').value;
  const serviceName = document.getElementById('serviceFormName').value.trim();
  const price = Number(document.getElementById('serviceFormPrice').value);
  const discountPrice = Number(document.getElementById('serviceFormDiscountPrice').value);
  const icon = document.getElementById('serviceFormIcon').value.trim() || '🎚️';
  const status = document.getElementById('serviceFormStatus').value;
  const description = document.getElementById('serviceFormDesc').value.trim();
  const highlights = document.getElementById('serviceFormHighlights').value.split(',').map(h => h.trim()).filter(Boolean);

  if (!serviceName || isNaN(price)) {
    showAdminToast('Service name and price are required.', 'error');
    return;
  }

  const payload = { serviceName, price, discountPrice, icon, status, description, highlights };

  try {
    if (id) {
      await apiFetch(`/api/admin/services/${id}`, { method: 'PUT', body: payload });
      showAdminToast('Service updated successfully.', 'success');
    } else {
      await apiFetch('/api/admin/services', { method: 'POST', body: payload });
      showAdminToast('New service added.', 'success');
    }
    serviceModal.classList.remove('active');
    loadServices();
  } catch (err) {
    showAdminToast('Failed to save service.', 'error');
  }
});

window.toggleServiceStatus = async (id, currentStatus) => {
  const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
  try {
    await apiFetch(`/api/admin/services/${id}`, { method: 'PUT', body: { status: newStatus } });
    showAdminToast(`Service set to ${newStatus}.`, 'info');
    loadServices();
  } catch (err) {
    showAdminToast('Status change failed.', 'error');
  }
};

window.deleteServiceItem = async (id) => {
  if (!confirm(`Delete service ${id}?`)) return;
  try {
    await apiFetch(`/api/admin/services/${id}`, { method: 'DELETE' });
    showAdminToast('Service deleted.', 'info');
    loadServices();
  } catch (err) {
    showAdminToast('Could not delete service.', 'error');
  }
};

// -------------------------------------------------------------
// 4. LIVE PRICE MANAGER
// -------------------------------------------------------------
function renderPriceEditorTable() {
  const tbody = document.getElementById('priceEditorTableBody');
  if (!tbody) return;

  if (allServices.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--admin-muted); padding: 2rem;">No services found.</td></tr>`;
    return;
  }

  tbody.innerHTML = allServices.map(s => {
    const regular = s.price || 0;
    const discount = s.discountPrice ?? regular;
    const diff = regular - discount;
    return `
      <tr>
        <td>
          <div style="font-weight: 700; color: #fff;">${s.icon || '🎚️'} ${escapeHtml(s.serviceName)}</div>
          <small style="color: var(--admin-muted);">${s.id}</small>
        </td>
        <td style="width: 170px;">
          <input type="number" class="field-input price-reg-input" data-id="${s.id}" value="${regular}" style="width: 130px; font-weight: 700;" />
        </td>
        <td style="width: 170px;">
          <input type="number" class="field-input price-disc-input" data-id="${s.id}" value="${discount}" style="width: 130px; font-weight: 700; color: var(--admin-cyan);" />
        </td>
        <td>
          ${diff > 0 ? `<span style="color: var(--admin-emerald); font-weight: 700;">Save ₹${diff}</span>` : `<span style="color: var(--admin-muted);">No discount</span>`}
        </td>
        <td>
          <span class="badge ${s.status === 'Active' ? 'badge-active' : 'badge-inactive'}">${s.status || 'Active'}</span>
        </td>
      </tr>
    `;
  }).join('');
}

document.getElementById('saveBatchPricesBtn')?.addEventListener('click', async () => {
  const regInputs = document.querySelectorAll('.price-reg-input');
  const discInputs = document.querySelectorAll('.price-disc-input');

  const prices = [];
  regInputs.forEach((inp, idx) => {
    const id = inp.getAttribute('data-id');
    const price = Number(inp.value);
    const discountPrice = Number(discInputs[idx]?.value || price);
    prices.push({ id, price, discountPrice });
  });

  try {
    const res = await apiFetch('/api/admin/prices', {
      method: 'PATCH',
      body: { prices }
    });
    if (!res.ok) throw new Error('Price update failed');

    showAdminToast('All prices saved successfully to database.', 'success');
    loadServices();
  } catch (err) {
    showAdminToast('Failed to update prices.', 'error');
  }
});

// -------------------------------------------------------------
// 5. GIFT CODES & PROMOTIONAL OFFERS
// -------------------------------------------------------------
async function loadGiftCodes() {
  try {
    const res = await apiFetch('/api/admin/gift-codes');
    if (!res.ok) return;
    allGiftCodes = await res.json();
    renderGiftCodesTable();
  } catch (err) {
    console.warn('Gift codes load error:', err);
  }
}

function renderGiftCodesTable() {
  const tbody = document.getElementById('giftCodesTableBody');
  if (!tbody) return;

  if (allGiftCodes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--admin-muted); padding: 2rem;">No gift codes created yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = allGiftCodes.map(g => {
    const discStr = g.discountType === 'percentage' ? `${g.discountValue}% OFF` : `₹${g.discountValue} OFF`;
    const expiryFormatted = g.expiryDate ? new Date(g.expiryDate).toLocaleDateString('en-IN') : 'No expiry';
    return `
      <tr>
        <td><strong style="color: var(--admin-cyan); font-family: monospace; font-size: 1rem;">${g.code}</strong></td>
        <td><span style="font-weight: 700; color: #fff;">${discStr}</span></td>
        <td>₹${g.minOrderValue || 0}</td>
        <td>₹${g.maxDiscount || 'None'}</td>
        <td><small style="color: var(--admin-muted);">${expiryFormatted}</small></td>
        <td><strong>${g.usedCount || 0}</strong> / ${g.usageLimit || '∞'}</td>
        <td>
          <button class="icon-btn" style="width: auto; padding: 0 0.5rem; font-size: 0.75rem;" onclick="window.togglePublicOffer('${g.code}', ${!g.showPublicOffer})">
            ${g.showPublicOffer ? '🟢 Public' : '⚪ Hidden'}
          </button>
        </td>
        <td>
          <span class="badge ${g.status === 'active' ? 'badge-active' : 'badge-inactive'}">${g.status}</span>
        </td>
        <td>
          <div class="action-btns">
            <button class="icon-btn" title="Toggle Active" onclick="window.toggleCodeActive('${g.code}', '${g.status}')">🔄</button>
            <button class="icon-btn delete" title="Delete Code" onclick="window.deleteGiftCode('${g.code}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

const giftModal = document.getElementById('giftModal');
const giftForm = document.getElementById('giftForm');

document.getElementById('openAddGiftModalBtn')?.addEventListener('click', () => {
  giftForm.reset();
  giftModal.classList.add('active');
});

document.getElementById('generateRandomCodeBtn')?.addEventListener('click', () => {
  const prefixes = ['SANJEET', 'MUSIC', 'REMIX', 'BASS', 'DROP'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num = Math.floor(10 + Math.random() * 90);
  document.getElementById('giftFormCode').value = `${prefix}${num}`;
});

giftForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = document.getElementById('giftFormCode').value.trim().toUpperCase();
  const discountType = document.getElementById('giftFormType').value;
  const discountValue = Number(document.getElementById('giftFormValue').value);
  const minOrderValue = Number(document.getElementById('giftFormMinOrder').value) || 0;
  const maxDiscount = Number(document.getElementById('giftFormMaxDiscount').value) || 500;
  const usageLimit = Number(document.getElementById('giftFormUsageLimit').value) || 100;
  const expiryDate = document.getElementById('giftFormExpiry').value;
  const showPublicOffer = document.getElementById('giftFormShowOffer').checked;
  const publicBannerText = document.getElementById('giftFormBannerText').value.trim();
  const status = document.getElementById('giftFormStatus').value;

  if (!code || isNaN(discountValue)) {
    showAdminToast('Code and discount value are required.', 'error');
    return;
  }

  try {
    await apiFetch('/api/admin/gift-codes', {
      method: 'POST',
      body: { code, discountType, discountValue, minOrderValue, maxDiscount, usageLimit, expiryDate, showPublicOffer, publicBannerText, status }
    });
    showAdminToast(`Promo code '${code}' created!`, 'success');
    giftModal.classList.remove('active');
    loadGiftCodes();
    loadDashboardStats();
  } catch (err) {
    showAdminToast('Failed to create promo code.', 'error');
  }
});

window.togglePublicOffer = async (code, show) => {
  try {
    await apiFetch(`/api/admin/gift-codes/${code}`, {
      method: 'PUT',
      body: { showPublicOffer: show }
    });
    showAdminToast(`Offer banner set to ${show ? 'Public' : 'Hidden'} for ${code}.`, 'info');
    loadGiftCodes();
  } catch (err) {
    showAdminToast('Update failed.', 'error');
  }
};

window.toggleCodeActive = async (code, current) => {
  const newStatus = current === 'active' ? 'inactive' : 'active';
  try {
    await apiFetch(`/api/admin/gift-codes/${code}`, {
      method: 'PUT',
      body: { status: newStatus }
    });
    showAdminToast(`Code ${code} is now ${newStatus}.`, 'info');
    loadGiftCodes();
  } catch (err) {
    showAdminToast('Update failed.', 'error');
  }
};

window.deleteGiftCode = async (code) => {
  if (!confirm(`Delete promo code ${code}?`)) return;
  try {
    await apiFetch(`/api/admin/gift-codes/${code}`, { method: 'DELETE' });
    showAdminToast(`Code ${code} deleted.`, 'info');
    loadGiftCodes();
  } catch (err) {
    showAdminToast('Delete failed.', 'error');
  }
};

// -------------------------------------------------------------
// 6. WEBSITE SETTINGS & CONTACT SETTINGS
// -------------------------------------------------------------
async function loadWebsiteSettings() {
  try {
    const res = await apiFetch('/api/admin/settings');
    if (!res.ok) return;
    const s = await res.json();

    // Website Settings
    if (document.getElementById('settingBusinessName')) document.getElementById('settingBusinessName').value = s.businessName || '';
    if (document.getElementById('settingOwnerName')) document.getElementById('settingOwnerName').value = s.ownerName || '';
    if (document.getElementById('settingTagline')) document.getElementById('settingTagline').value = s.tagline || '';
    if (document.getElementById('settingLogoUrl')) document.getElementById('settingLogoUrl').value = s.logoUrl || '';
    if (document.getElementById('settingHeroTitle')) document.getElementById('settingHeroTitle').value = s.heroTitle || '';
    if (document.getElementById('settingHeroSubtitle')) document.getElementById('settingHeroSubtitle').value = s.heroSubtitle || '';
    if (document.getElementById('settingHeroDesc')) document.getElementById('settingHeroDesc').value = s.heroDescription || '';
    if (document.getElementById('settingFooterText')) document.getElementById('settingFooterText').value = s.footerText || '';
    if (document.getElementById('settingCopyrightText')) document.getElementById('settingCopyrightText').value = s.copyrightText || '';

    // Contact & Social
    if (document.getElementById('settingPhone')) document.getElementById('settingPhone').value = s.phoneNumber || '';
    if (document.getElementById('settingWhatsapp')) document.getElementById('settingWhatsapp').value = s.whatsappNumber || '';
    if (document.getElementById('settingBusinessEmail')) document.getElementById('settingBusinessEmail').value = s.businessEmail || '';
    if (document.getElementById('settingSupportEmail')) document.getElementById('settingSupportEmail').value = s.supportEmail || '';
    if (document.getElementById('settingInstaUser')) document.getElementById('settingInstaUser').value = s.instagramUsername || '';
    if (document.getElementById('settingInstaUrl')) document.getElementById('settingInstaUrl').value = s.instagramUrl || '';
  } catch (err) {
    console.warn('Settings load error:', err);
  }
}

document.getElementById('saveWebsiteSettingsBtn')?.addEventListener('click', async () => {
  const updates = {
    businessName: document.getElementById('settingBusinessName')?.value.trim(),
    ownerName: document.getElementById('settingOwnerName')?.value.trim(),
    tagline: document.getElementById('settingTagline')?.value.trim(),
    logoUrl: document.getElementById('settingLogoUrl')?.value.trim(),
    heroTitle: document.getElementById('settingHeroTitle')?.value.trim(),
    heroSubtitle: document.getElementById('settingHeroSubtitle')?.value.trim(),
    heroDescription: document.getElementById('settingHeroDesc')?.value.trim(),
    footerText: document.getElementById('settingFooterText')?.value.trim(),
    copyrightText: document.getElementById('settingCopyrightText')?.value.trim()
  };

  try {
    const res = await apiFetch('/api/admin/settings', { method: 'PUT', body: updates });
    if (!res.ok) throw new Error('Save failed');
    showAdminToast('Website information saved and synced.', 'success');
  } catch (err) {
    showAdminToast('Could not save website settings.', 'error');
  }
});

document.getElementById('saveContactSettingsBtn')?.addEventListener('click', async () => {
  const updates = {
    phoneNumber: document.getElementById('settingPhone')?.value.trim(),
    whatsappNumber: document.getElementById('settingWhatsapp')?.value.trim(),
    businessEmail: document.getElementById('settingBusinessEmail')?.value.trim(),
    supportEmail: document.getElementById('settingSupportEmail')?.value.trim(),
    instagramUsername: document.getElementById('settingInstaUser')?.value.trim(),
    instagramUrl: document.getElementById('settingInstaUrl')?.value.trim()
  };

  try {
    const res = await apiFetch('/api/admin/settings', { method: 'PUT', body: updates });
    if (!res.ok) throw new Error('Save failed');
    showAdminToast('Contact and Instagram channels saved.', 'success');
  } catch (err) {
    showAdminToast('Could not save contact settings.', 'error');
  }
});

// -------------------------------------------------------------
// 7. SECURITY & ACCOUNT SETTINGS
// -------------------------------------------------------------
document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const currentPassword = document.getElementById('currentPasswordInput')?.value;
  const newPassword = document.getElementById('newPasswordInput')?.value;
  const confirmPassword = document.getElementById('confirmPasswordInput')?.value;

  if (newPassword !== confirmPassword) {
    showAdminToast('New password confirmation does not match.', 'error');
    return;
  }
  if (newPassword.length < 6) {
    showAdminToast('New password must be at least 6 characters.', 'error');
    return;
  }

  try {
    const res = await apiFetch('/api/admin/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Password update failed');

    showAdminToast('Password updated successfully.', 'success');
    document.getElementById('changePasswordForm').reset();
  } catch (err) {
    showAdminToast(err.message || 'Current password incorrect.', 'error');
  }
});

document.getElementById('changeAccountForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('adminUsernameInput')?.value.trim();
  const email = document.getElementById('adminEmailInput')?.value.trim();

  try {
    const res = await apiFetch('/api/admin/change-account', {
      method: 'POST',
      body: { username, email }
    });
    if (!res.ok) throw new Error('Failed to update account');

    showAdminToast('Account details updated.', 'success');
    if (adminUsernameDisplay && username) adminUsernameDisplay.textContent = username;
  } catch (err) {
    showAdminToast('Update error.', 'error');
  }
});

// -------------------------------------------------------------
// 8. AUDIT LOGS
// -------------------------------------------------------------
async function loadAuditLogs() {
  const tbody = document.getElementById('auditLogsTableBody');
  if (!tbody) return;

  try {
    const res = await apiFetch('/api/admin/audit-logs');
    if (!res.ok) return;
    const logs = await res.json();

    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--admin-muted); padding: 2rem;">No audit records logged yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map(l => {
      const timeFormatted = l.timestamp ? new Date(l.timestamp).toLocaleString('en-IN') : '-';
      return `
        <tr>
          <td><small style="color: var(--admin-muted);">${timeFormatted}</small></td>
          <td><strong style="color: var(--admin-cyan);">${escapeHtml(l.action)}</strong></td>
          <td style="color: #cbd5e1;">${escapeHtml(l.details)}</td>
          <td><small style="color: #94a3b8;">${escapeHtml(l.adminUser || 'admin')}</small></td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.warn('Audit logs load error:', err);
  }
}

document.getElementById('refreshAuditBtn')?.addEventListener('click', () => {
  loadAuditLogs();
  showAdminToast('Audit logs refreshed.', 'info');
});

document.querySelectorAll('.refresh-all-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    loadAllData();
    showAdminToast('All data refreshed from cloud.', 'info');
  });
});

// Modal Dismissals
function setupModalDismissals() {
  document.getElementById('closeBookingDetailModalBtn')?.addEventListener('click', () => {
    document.getElementById('bookingDetailModal')?.classList.remove('active');
  });
  document.getElementById('closeServiceModalBtn')?.addEventListener('click', () => {
    document.getElementById('serviceModal')?.classList.remove('active');
  });
  document.getElementById('closeGiftModalBtn')?.addEventListener('click', () => {
    document.getElementById('giftModal')?.classList.remove('active');
  });

  document.querySelectorAll('.admin-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });
}

// Helpers
function getStatusBadgeClass(status) {
  switch (status) {
    case 'Pending': return 'badge-pending';
    case 'Confirmed': return 'badge-confirmed';
    case 'Payment Pending': return 'badge-payment-pending';
    case 'Payment Received': return 'badge-payment-received';
    case 'In Progress': return 'badge-in-progress';
    case 'Completed': return 'badge-completed';
    case 'Cancelled': return 'badge-cancelled';
    default: return 'badge-pending';
  }
}

function showAdminToast(msg, type = 'info') {
  let container = document.getElementById('adminToastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const borderCol = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#00f0ff';
  toast.style.cssText = `
    background: #0d121c;
    border: 1px solid ${borderCol};
    padding: 0.85rem 1.25rem;
    border-radius: 10px;
    color: #fff;
    font-size: 0.88rem;
    box-shadow: 0 10px 25px rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    animation: toastSlide 0.25s ease;
  `;
  const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
