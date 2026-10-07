import { showToast } from './booking.js';

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initFaqAccordion();
  initAudioVisualizer();
  loadPublicSettings();
  loadPublicOffers();
  loadPublicServices();
});

// Load Live Website Settings (Brand, Owner, Contact, Social, Copy)
async function loadPublicSettings() {
  try {
    const res = await fetch('/api/public/settings');
    if (!res.ok) return;
    const s = await res.json();

    // Business & Brand
    if (s.businessName) {
      document.title = `${s.businessName} | Professional Music & Remix Studio`;
      const brandWords = s.businessName.split(' ');
      const namePart = brandWords[0] || 'Sanjeet';
      const hubPart = brandWords.slice(1).join(' ') || 'Music Hub';

      const brandEl = document.getElementById('brandNameText');
      if (brandEl) brandEl.textContent = namePart;
      const hubEl = document.getElementById('brandHubText');
      if (hubEl) hubEl.textContent = hubPart;
      const footerBrand = document.getElementById('footerBrandName');
      if (footerBrand) footerBrand.textContent = s.businessName;
    }

    if (s.ownerName) {
      const ownerEl = document.getElementById('ownerNameDisplay');
      if (ownerEl) ownerEl.textContent = s.ownerName;
    }

    // Hero Section
    if (s.heroTitle) {
      const titleEl = document.getElementById('heroTitle');
      if (titleEl) {
        titleEl.innerHTML = escapeHtml(s.heroTitle) + '<br /><span class="gradient-text">Something Powerful</span>';
      }
    }
    if (s.heroSubtitle) {
      const subEl = document.getElementById('heroSubtitle');
      if (subEl) subEl.textContent = s.heroSubtitle;
    }
    if (s.heroDescription) {
      const descEl = document.getElementById('heroDescription');
      if (descEl) descEl.textContent = s.heroDescription;
    }

    // Contact Channels
    const cleanPhone = (s.phoneNumber || '').replace(/[^0-9]/g, '');
    const cleanWhatsapp = (s.whatsappNumber || s.phoneNumber || '').replace(/[^0-9]/g, '');

    if (s.phoneNumber) {
      const phoneLink = document.getElementById('contactPhoneLink');
      const phoneText = document.getElementById('contactPhoneText');
      if (phoneLink) phoneLink.href = `tel:+${cleanPhone}`;
      if (phoneText) phoneText.textContent = s.phoneNumber;
    }

    if (s.whatsappNumber) {
      const waLink = document.getElementById('contactWhatsappLink');
      const waText = document.getElementById('contactWhatsappText');
      if (waLink) waLink.href = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent('Hello Sanjeet Music Hub! I would like to book a remix.')}`;
      if (waText) waText.textContent = s.whatsappNumber;
    }

    if (s.instagramUsername || s.instagramUrl) {
      const instaLink = document.getElementById('contactInstagramLink');
      const instaText = document.getElementById('contactInstagramText');
      if (instaLink) instaLink.href = s.instagramUrl || `https://instagram.com/${s.instagramUsername.replace('@', '')}`;
      if (instaText) instaText.textContent = s.instagramUsername || '@sanjeetmusichub_official';
    }

    if (s.businessEmail) {
      const emailLink = document.getElementById('contactEmailLink');
      const emailText = document.getElementById('contactEmailText');
      if (emailLink) emailLink.href = `mailto:${s.businessEmail}`;
      if (emailText) emailText.textContent = s.businessEmail;
    }

    // Footer copy
    if (s.footerText) {
      const fDesc = document.getElementById('footerDescText');
      if (fDesc) fDesc.textContent = s.footerText;
    }
    if (s.copyrightText) {
      const fCopy = document.getElementById('footerCopyrightText');
      if (fCopy) fCopy.textContent = s.copyrightText;
    }
  } catch (err) {
    console.warn('Could not load live settings, using defaults:', err);
  }
}

// Load Active Public Offers / Promo Banner
async function loadPublicOffers() {
  try {
    const res = await fetch('/api/public/offers');
    if (!res.ok) return;
    const offers = await res.json();

    const banner = document.getElementById('publicOfferBanner');
    const bannerText = document.getElementById('publicOfferText');

    if (offers && offers.length > 0 && banner && bannerText) {
      const topOffer = offers[0];
      bannerText.innerHTML = topOffer.publicBannerText 
        ? escapeHtml(topOffer.publicBannerText)
        : `Special Studio Offer: Use code <strong>${escapeHtml(topOffer.code)}</strong> for ${topOffer.discountType === 'percentage' ? topOffer.discountValue + '% OFF' : '₹' + topOffer.discountValue + ' OFF'}!`;
      banner.style.display = 'block';

      // Prefill promo code if user clicks banner
      banner.querySelector('a')?.addEventListener('click', () => {
        const promoInp = document.getElementById('promoCodeInput');
        if (promoInp) promoInp.value = topOffer.code;
      });
    }
  } catch (err) {
    console.warn('Offers load error:', err);
  }
}

// Load Live Active Services & Prices
async function loadPublicServices() {
  try {
    const res = await fetch('/api/public/services');
    if (!res.ok) return;
    const services = await res.json();
    if (!Array.isArray(services) || services.length === 0) return;

    window.liveServicesData = services;

    // 1. Render in Services Grid
    const grid = document.getElementById('servicesGridContainer');
    if (grid) {
      grid.innerHTML = services.map(s => {
        const regular = s.price || 0;
        const discount = s.discountPrice ?? regular;
        const hasDiscount = regular > discount;

        return `
          <div class="service-card">
            <div class="service-icon-box">${s.icon || '🎚️'}</div>
            <h3 class="service-title">${escapeHtml(s.serviceName)}</h3>
            <p class="service-desc">${escapeHtml(s.description || '')}</p>
            
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--neon-cyan); margin-bottom: 0.85rem;">
              ₹${discount} 
              ${hasDiscount ? `<span style="font-size: 0.88rem; text-decoration: line-through; opacity: 0.6; color: var(--text-muted); margin-left: 0.35rem;">₹${regular}</span>` : ''}
            </div>

            <ul class="service-highlights">
              ${(s.highlights || []).map(h => `<li>${escapeHtml(h)}</li>`).join('')}
            </ul>

            <button class="btn btn-secondary btn-sm btn-block book-service-btn" data-service="${escapeHtml(s.serviceName)}">
              Book This Service →
            </button>
          </div>
        `;
      }).join('');

      initServiceButtons();
    }

    // 2. Populate booking form select dropdown with live pricing
    const serviceSelect = document.getElementById('serviceSelect');
    if (serviceSelect) {
      const currentVal = serviceSelect.value;
      serviceSelect.innerHTML = `<option value="" disabled selected>-- Choose Remix Service --</option>` +
        services.map(s => {
          const priceDisplay = s.discountPrice ? `₹${s.discountPrice}` : `₹${s.price}`;
          return `<option value="${escapeHtml(s.serviceName)}" data-price="${s.discountPrice || s.price}">${escapeHtml(s.serviceName)} — ${priceDisplay}</option>`;
        }).join('');
      if (currentVal) serviceSelect.value = currentVal;
    }
  } catch (err) {
    console.warn('Could not load dynamic services, using static fallback:', err);
  }
}

// Sticky Navbar & Mobile Toggle
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const mobileToggle = document.getElementById('mobileToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }
  });

  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      mobileToggle.classList.toggle('active');
      mobileMenu.classList.toggle('open');
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileToggle.classList.remove('active');
        mobileMenu.classList.remove('open');
      });
    });
  }
}

// Service Card "Book This Service" triggers
function initServiceButtons() {
  const serviceButtons = document.querySelectorAll('.book-service-btn');
  const serviceSelect = document.getElementById('serviceSelect');
  const bookingSection = document.getElementById('booking');

  serviceButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedServiceName = btn.getAttribute('data-service');
      if (serviceSelect && selectedServiceName) {
        serviceSelect.value = selectedServiceName;
        // Trigger price update in booking.js
        serviceSelect.dispatchEvent(new Event('change'));
      }
      if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: 'smooth' });
        const bookingCard = document.querySelector('.booking-wrapper');
        if (bookingCard) {
          bookingCard.style.boxShadow = '0 0 45px rgba(0, 240, 255, 0.45)';
          setTimeout(() => {
            bookingCard.style.boxShadow = '';
          }, 1200);
        }
      }
    });
  });
}

// FAQ Accordion
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    if (questionBtn) {
      questionBtn.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        faqItems.forEach(other => {
          if (other !== item) other.classList.remove('open');
        });
        if (!isOpen) {
          item.classList.add('open');
        } else {
          item.classList.remove('open');
        }
      });
    }
  });
}

// Real-time Audio Visualizer with Web Audio API Synthesizer
function initAudioVisualizer() {
  const visualizerBarsContainer = document.getElementById('visualizerBars');
  const playBtn = document.getElementById('playVisualizerBtn');
  const bpmDisplay = document.getElementById('visualizerBpm');
  const trackNameDisplay = document.getElementById('currentTrackName');
  const trackButtons = document.querySelectorAll('.track-btn');

  if (!visualizerBarsContainer) return;

  const totalBars = 36;
  visualizerBarsContainer.innerHTML = '';
  const bars = [];
  for (let i = 0; i < totalBars; i++) {
    const bar = document.createElement('div');
    bar.className = 'canvas-bar';
    if (i > 24) bar.classList.add('hot');
    visualizerBarsContainer.appendChild(bar);
    bars.push(bar);
  }

  let audioCtx = null;
  let isPlaying = false;
  let synthInterval = null;
  let animationFrameId = null;
  let currentPreset = 'bhojpuri';

  const presets = {
    bhojpuri: {
      name: 'Bhojpuri Electro Dholki Drop',
      bpm: 135,
      kickPitch: 150,
      bassPitch: 55,
      dholkiPattern: [1, 0, 1, 1, 0, 1, 1, 0]
    },
    nagpuri: {
      name: 'Nagpuri Tribal Theka Bass',
      bpm: 128,
      kickPitch: 130,
      bassPitch: 65,
      dholkiPattern: [1, 1, 0, 1, 1, 0, 1, 0]
    },
    hindi: {
      name: 'Hindi Bollywood Club Punch',
      bpm: 124,
      kickPitch: 140,
      bassPitch: 50,
      dholkiPattern: [1, 0, 0, 1, 0, 1, 0, 1]
    },
    woofer: {
      name: 'Woofer Frequency Test (50Hz Sub-Bass)',
      bpm: 110,
      kickPitch: 90,
      bassPitch: 45,
      dholkiPattern: [1, 0, 1, 0, 1, 0, 1, 0]
    }
  };

  trackButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      trackButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const trackKey = btn.getAttribute('data-track');
      if (presets[trackKey]) {
        currentPreset = trackKey;
        if (trackNameDisplay) trackNameDisplay.textContent = presets[trackKey].name;
        if (bpmDisplay) bpmDisplay.textContent = `${presets[trackKey].bpm} BPM`;
        if (isPlaying) {
          restartBeat();
        }
      }
    });
  });

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (!isPlaying) {
        startBeat();
      } else {
        stopBeat();
      }
    });
  }

  function startBeat() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      isPlaying = true;
      if (playBtn) {
        playBtn.innerHTML = '<span>⏸</span> <span>Stop Beat</span>';
        playBtn.classList.add('btn-magenta');
        playBtn.classList.remove('btn-primary');
      }

      startSynthesizerLoop();
      animateVisualizer();
      showToast(`Playing sample beat: ${presets[currentPreset].name}`, 'info');
    } catch (e) {
      console.warn('Web Audio error:', e);
    }
  }

  function stopBeat() {
    isPlaying = false;
    if (synthInterval) clearInterval(synthInterval);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    if (playBtn) {
      playBtn.innerHTML = '<span>▶</span> <span>Play Studio Beat Sample</span>';
      playBtn.classList.remove('btn-magenta');
      playBtn.classList.add('btn-primary');
    }

    bars.forEach(b => {
      b.style.height = '4px';
    });
  }

  function restartBeat() {
    if (synthInterval) clearInterval(synthInterval);
    startSynthesizerLoop();
  }

  function startSynthesizerLoop() {
    const config = presets[currentPreset];
    const stepTime = (60 / config.bpm / 2) * 1000;
    let step = 0;

    synthInterval = setInterval(() => {
      if (!isPlaying || !audioCtx) return;

      const isKick = config.dholkiPattern[step % config.dholkiPattern.length] === 1;
      const isSub = (step % 4 === 0);
      const now = audioCtx.currentTime;

      if (isKick) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.frequency.setValueAtTime(config.kickPitch, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.start(now);
        osc.stop(now + 0.12);
      }

      if (isSub) {
        const bassOsc = audioCtx.createOscillator();
        const bassGain = audioCtx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.connect(bassGain);
        bassGain.connect(audioCtx.destination);

        bassOsc.frequency.setValueAtTime(config.bassPitch, now);
        bassGain.gain.setValueAtTime(0.2, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        bassOsc.start(now);
        bassOsc.stop(now + 0.25);
      }

      step++;
    }, stepTime);
  }

  function animateVisualizer() {
    if (!isPlaying) return;

    bars.forEach((bar, idx) => {
      const base = Math.sin(Date.now() / 150 + idx * 0.3) * 35;
      const noise = Math.random() * 45;
      const height = Math.max(8, Math.min(160, base + noise + (idx < 10 ? 30 : 15)));
      bar.style.height = `${height}px`;
    });

    animationFrameId = requestAnimationFrame(animateVisualizer);
  }
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
