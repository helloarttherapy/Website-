const CHOICE_KEY = 'helloart.analytics.v1';
const CHOICE_LIFETIME = 180 * 24 * 60 * 60 * 1000;
const COOKIE_LIFETIME = 90 * 24 * 60 * 60;

export function initAnalytics({ window: win = window, document: doc = document } = {}) {
  const panel = doc.querySelector('[data-analytics-choice]');
  if (!panel) return;
  const { measurementId, productionHostname } = panel.dataset;
  if (!/^G-[A-Z0-9]+$/.test(measurementId || '') || win.location.hostname !== productionHostname) return;

  const settings = doc.querySelector('[data-analytics-settings]');
  const allow = panel.querySelector('[data-analytics-allow]');
  const decline = panel.querySelector('[data-analytics-decline]');
  if (!settings || !allow || !decline) return;
  settings.hidden = false;
  let active = false;
  let initialized = false;
  let restoreFocus = false;
  const disableKey = `ga-disable-${measurementId}`;
  win[disableKey] = true;

  const readChoice = () => {
    try {
      const saved = JSON.parse(win.localStorage.getItem(CHOICE_KEY));
      const age = Date.now() - saved?.savedAt;
      if (age >= 0 && age < CHOICE_LIFETIME && typeof saved?.allowed === 'boolean') return saved.allowed;
    } catch { /* A blocked or unavailable store leaves analytics off. */ }
    return null;
  };
  const saveChoice = allowed => {
    try { win.localStorage.setItem(CHOICE_KEY, JSON.stringify({ allowed, savedAt: Date.now() })); }
    catch { /* The choice still applies to this page. */ }
  };
  const cleanReferrer = () => {
    try { return new URL(doc.referrer).origin; } catch { return ''; }
  };
  const track = (name, parameters = {}) => {
    if (active) win.gtag('event', name, { ...parameters, send_to: measurementId });
  };
  const start = () => {
    win[disableKey] = false;
    active = true;
    if (initialized) return;
    initialized = true;
    win.dataLayer = win.dataLayer || [];
    win.gtag = function () { win.dataLayer.push(arguments); };
    win.gtag('consent', 'default', {
      analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
    });
    win.gtag('consent', 'update', { analytics_storage: 'granted' });
    win.gtag('set', 'ads_data_redaction', true);
    win.gtag('js', new Date());
    win.gtag('config', measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: COOKIE_LIFETIME,
      cookie_flags: 'SameSite=Lax;Secure',
      page_location: win.location.origin + win.location.pathname,
      page_referrer: cleanReferrer(),
      send_page_view: true
    });
    const tag = doc.createElement('script');
    tag.id = 'hello-art-google-tag';
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    doc.head.appendChild(tag);
  };
  const stop = () => {
    active = false;
    win[disableKey] = true;
    // Remove both host-only and auto-domain GA cookies without touching the form.
    const domains = ['', `; Domain=${productionHostname}`, `; Domain=${productionHostname.replace(/^www\./, '')}`];
    for (const cookie of doc.cookie.split(';')) {
      const name = cookie.split('=')[0].trim();
      if (!/^_ga(?:_|$)/.test(name)) continue;
      for (const domain of domains) doc.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure${domain}`;
    }
  };
  const choose = allowed => {
    saveChoice(allowed);
    if (allowed) start(); else stop();
    panel.hidden = true;
    if (restoreFocus) settings.focus();
  };
  settings.addEventListener('click', () => {
    panel.hidden = false;
    restoreFocus = true;
    allow.focus();
  });
  allow.addEventListener('click', () => choose(true));
  decline.addEventListener('click', () => choose(false));
  const previous = readChoice();
  if (previous === true) start();
  else if (previous === false) stop();
  else panel.hidden = false;

  // Only fixed destination categories are sent, never link text or query strings.
  doc.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link || !active) return;
    let url;
    try { url = new URL(link.href, win.location.href); } catch { return; }
    const destination = url.protocol === 'mailto:' ? 'email' : {
      'www.amazon.com.au': 'amazon_book',
      'open.spotify.com': 'spotify',
      'www.youtube.com': 'youtube',
      'www.instagram.com': 'instagram',
      'www.linkedin.com': 'linkedin'
    }[url.hostname];
    if (destination) track('outbound_click', { destination });
  });
  doc.addEventListener('helloart:enquiry-success', () => {
    track('generate_lead', { method: 'contact_form' });
  });
}
