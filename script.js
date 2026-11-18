(() => {
  'use strict';

  const root = document.documentElement;
  const themeButton = document.querySelector('.theme-toggle');
  const menuButton = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('#mobile-nav');
  const header = document.querySelector('.site-header');
  const stickyCta = document.querySelector('.mobile-sticky-cta');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Theme: saved preference wins, otherwise the OS preference is used.
  themeButton?.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try { localStorage.setItem('jarvis-theme', next); } catch (_) {}
  });

  // Mobile navigation.
  menuButton?.addEventListener('click', () => {
    const willOpen = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(willOpen));
    menuButton.setAttribute('aria-label', willOpen ? 'Закрыть меню' : 'Открыть меню');
    mobileNav.hidden = !willOpen;
    menuButton.innerHTML = willOpen
      ? '<svg class="icon" aria-hidden="true"><use href="#i-close"/></svg>'
      : '<svg class="icon" aria-hidden="true"><use href="#i-menu"/></svg>';
  });
  mobileNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    mobileNav.hidden = true;
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Открыть меню');
    if (menuButton) menuButton.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-menu"/></svg>';
  }));

  // Header and mobile purchase bar respond to scroll direction.
  let lastY = window.scrollY;
  let ticking = false;
  const updateScrollUI = () => {
    const y = window.scrollY;
    header?.classList.toggle('is-scrolled', y > 12);
    if (y > lastY + 4 && y > 260) {
      header?.classList.add('is-hidden');
      stickyCta?.classList.add('is-hidden');
    } else if (y < lastY - 3) {
      header?.classList.remove('is-hidden');
      stickyCta?.classList.remove('is-hidden');
    }
    if (y < 100) {
      header?.classList.remove('is-hidden');
      stickyCta?.classList.remove('is-hidden');
    }
    lastY = y;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { window.requestAnimationFrame(updateScrollUI); ticking = true; }
  }, { passive: true });

  // Scroll reveal. Content remains visible when JS is unavailable or motion is reduced.
  const revealItems = [...document.querySelectorAll('.reveal')];
  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });
    revealItems.forEach(item => observer.observe(item));
  } else revealItems.forEach(item => item.classList.add('is-visible'));

  // FAQ: keep one answer open at a time for a cleaner reading flow.
  document.querySelectorAll('.faq-item').forEach(item => {
    item.addEventListener('toggle', () => {
      if (item.open) document.querySelectorAll('.faq-item[open]').forEach(other => { if (other !== item) other.open = false; });
    });
  });

  // Consent Mode defaults to denied. Analytics is only loaded when consent and a real ID exist.
  const GA_MEASUREMENT_ID = ''; // Owner: add the GA4 Measurement ID (G-XXXXXXXXXX) before enabling analytics.
  const consentKey = 'jarvis-analytics-consent';
  const banner = document.querySelector('#cookie-banner');
  const settingsPanel = document.querySelector('#cookie-settings-panel');
  const analyticsInput = document.querySelector('#analytics-consent');
  const cookieAccept = document.querySelector('#cookie-accept');
  const cookieSettings = document.querySelector('#cookie-settings');
  const cookieSave = document.querySelector('#cookie-save');

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', {
    analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    functionality_storage: 'granted', security_storage: 'granted'
  });

  const loadAnalytics = () => {
    if (!GA_MEASUREMENT_ID || document.querySelector('[data-ga-loader]')) return;
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
    script.dataset.gaLoader = 'true';
    document.head.append(script);
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
  };
  const setConsent = granted => {
    consent = granted ? 'granted' : 'denied';
    window.gtag('consent', 'update', {
      analytics_storage: granted ? 'granted' : 'denied',
      ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
    });
    try { localStorage.setItem(consentKey, granted ? 'granted' : 'denied'); } catch (_) {}
    if (granted) loadAnalytics();
    if (banner) banner.hidden = true;
  };
  let consent = null;
  try { consent = localStorage.getItem(consentKey); } catch (_) {}
  if (banner && consent === null) window.setTimeout(() => { banner.hidden = false; }, 1200);
  if (analyticsInput) analyticsInput.checked = consent === 'granted';
  cookieAccept?.addEventListener('click', () => setConsent(true));
  cookieSettings?.addEventListener('click', () => { settingsPanel.hidden = !settingsPanel.hidden; });
  cookieSave?.addEventListener('click', () => setConsent(Boolean(analyticsInput?.checked)));

  // Basic GA4 interaction events. No identifier is sent until analytics consent is granted.
  const track = (name, params = {}) => {
    if (consent === 'granted' && GA_MEASUREMENT_ID) window.gtag('event', name, params);
  };
  document.querySelectorAll('[data-track]').forEach(element => {
    element.addEventListener('click', () => track('outbound_click', {
      link_id: element.dataset.track,
      link_url: element.href || ''
    }));
  });
  const scrollMilestones = new Set();
  window.addEventListener('scroll', () => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const percent = Math.round((window.scrollY / maxScroll) * 100);
    [50, 90].forEach(point => {
      if (percent >= point && !scrollMilestones.has(point)) {
        scrollMilestones.add(point);
        track('scroll_depth', { percent: point });
      }
    });
  }, { passive: true });

  const year = document.querySelector('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
