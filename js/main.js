// NIPANA Atlas Corporation — interactions

(function () {
  'use strict';

  // Mark JS as available — enables reveal hidden states (no-JS fallback shows everything)
  document.documentElement.classList.add('js-on');

  // Safety: force-show all reveals after 4s even if observer fails
  setTimeout(() => {
    document.querySelectorAll('.reveal, .reveal-stagger').forEach((el) => el.classList.add('in'));
  }, 4000);

  // ===== Page Loader =====
  const loader = document.querySelector('.page-loader');
  const hideLoader = () => {
    if (loader) loader.classList.add('hidden');
    document.body.classList.add('page-fade');
  };
  // Hide on DOMContentLoaded with a small delay (don't wait for slow external images)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(hideLoader, 400));
  } else {
    setTimeout(hideLoader, 400);
  }
  // Safety: always hide after 1.5s no matter what
  setTimeout(hideLoader, 1500);

  // ===== Scrolled Nav =====
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ===== Mobile menu =====
  const toggle = document.querySelector('.nav-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (toggle && mobileMenu) {
    toggle.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      const icon = toggle.querySelector('i');
      if (icon) icon.className = open ? 'ri-close-line' : 'ri-menu-3-line';
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        const icon = toggle.querySelector('i');
        if (icon) icon.className = 'ri-menu-3-line';
        document.body.style.overflow = '';
      });
    });
  }

  // ===== Reveal on scroll =====
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          if (e.target.dataset.counter !== undefined) animateCounter(e.target);
          observer.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
  );

  document.querySelectorAll('.reveal, .reveal-stagger, [data-counter]').forEach((el) => {
    observer.observe(el);
  });

  // ===== Counter animation =====
  function animateCounter(el) {
    const target = parseFloat(el.dataset.counter);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const duration = parseInt(el.dataset.duration || '1800', 10);
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    function frame(now) {
      const p = Math.min(1, (now - start) / duration);
      const value = target * ease(p);
      el.textContent = value.toFixed(decimals);
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = target.toFixed(decimals);
    }
    requestAnimationFrame(frame);
  }

  // ===== Smooth anchor scroll =====
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ===== Form fake submit =====
  const form = document.querySelector('form[data-form="contact"]');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const original = btn.innerHTML;
      btn.innerHTML = 'Sending<span class="cursor-blink"></span>';
      btn.disabled = true;
      setTimeout(() => {
        btn.innerHTML = '<i class="ri-check-line"></i> Message Sent';
        setTimeout(() => {
          btn.innerHTML = original;
          btn.disabled = false;
          form.reset();
        }, 2400);
      }, 1200);
    });
  }

  // ===== Year stamp =====
  const yr = document.querySelector('[data-year]');
  if (yr) yr.textContent = new Date().getFullYear();

  // ===== Floating contact / live price widgets =====
  const floatingTools = document.createElement('div');
  floatingTools.className = 'floating-tools';
  floatingTools.innerHTML = `
    <div class="gold-price-float" aria-live="polite" aria-label="Live gold price in Tanzania">
      <span class="label">Live gold price</span>
      <span class="value" data-gold-value>Loading...</span>
      <span class="meta" data-gold-meta>Fetching market rates</span>
    </div>
    <a class="whatsapp-float" href="https://wa.me/255777913152?text=${encodeURIComponent('Hello NIPANA Atlas, I would like to ask about your services.')}" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">
      <i class="ri-whatsapp-line"></i>
    </a>
  `;
  document.body.appendChild(floatingTools);

  const goldValue = floatingTools.querySelector('[data-gold-value]');
  const goldMeta = floatingTools.querySelector('[data-gold-meta]');
  const goldWidget = floatingTools.querySelector('.gold-price-float');

  const GOLD_API = 'https://api.gold-api.com/price/XAU';
  const FX_API = 'https://open.er-api.com/v6/latest/USD';
  const GOLD_OUNCE_TO_GRAM = 31.1034768;
  const REFRESH_MS = 10 * 60 * 1000;

  const formatTzs = (value) => `TZS ${Math.round(value).toLocaleString('en-US')}`;

  async function updateGoldPrice() {
    if (!goldValue || !goldMeta) return;
    try {
      const [goldRes, fxRes] = await Promise.all([
        fetch(GOLD_API, { cache: 'no-store' }),
        fetch(FX_API, { cache: 'no-store' }),
      ]);

      if (!goldRes.ok) throw new Error('Gold price request failed');
      if (!fxRes.ok) throw new Error('FX rate request failed');

      const goldJson = await goldRes.json();
      const fxJson = await fxRes.json();
      const usdPerOz = Number(goldJson.price);
      const usdTzs = Number(fxJson?.rates?.TZS);

      if (!Number.isFinite(usdPerOz) || !Number.isFinite(usdTzs)) {
        throw new Error('Invalid price payload');
      }

      const tzsPerOz = usdPerOz * usdTzs;
      const tzsPerGram = tzsPerOz / GOLD_OUNCE_TO_GRAM;
      goldValue.textContent = `${formatTzs(tzsPerGram)} / g`;
      goldMeta.textContent = `USD/oz $${usdPerOz.toFixed(2)} · USD/TZS ${usdTzs.toFixed(0)}`;
      if (goldWidget) goldWidget.title = `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch (err) {
      goldValue.textContent = 'Price unavailable';
      goldMeta.textContent = 'Try again shortly';
      if (goldWidget) goldWidget.title = 'Live gold price unavailable';
    }
  }

  updateGoldPrice();
  setInterval(updateGoldPrice, REFRESH_MS);

  // ===== Hero Slider =====
  const slider = document.querySelector('.hero-slider');
  if (slider) {
    const slides = slider.querySelectorAll('.slide');
    const dots = slider.querySelectorAll('.hero-dot');
    const prevBtn = slider.querySelector('.hero-arrow.prev');
    const nextBtn = slider.querySelector('.hero-arrow.next');
    const numEl = slider.querySelector('.hero-slide-meta .num');
    const totalEl = slider.querySelector('.hero-slide-meta .total');
    let idx = 0;
    let timer;
    if (totalEl) totalEl.textContent = String(slides.length).padStart(2, '0');

    const go = (n) => {
      idx = (n + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle('active', i === idx));
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
      if (numEl) numEl.textContent = String(idx + 1).padStart(2, '0');
    };
    const next = () => go(idx + 1);
    const prev = () => go(idx - 1);
    const reset = () => { clearInterval(timer); timer = setInterval(next, 6500); };

    dots.forEach((d, i) => d.addEventListener('click', () => { go(i); reset(); }));
    if (nextBtn) nextBtn.addEventListener('click', () => { next(); reset(); });
    if (prevBtn) prevBtn.addEventListener('click', () => { prev(); reset(); });
    reset();
  }

  // ===== Subtle parallax on hero visual =====
  const heroVisual = document.querySelector('.hero-visual img');
  if (heroVisual && window.matchMedia('(min-width: 968px)').matches) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y < 800) heroVisual.style.transform = `translateY(${y * 0.08}px) scale(1.02)`;
    }, { passive: true });
  }
})();
