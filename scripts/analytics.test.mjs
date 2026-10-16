import test from 'node:test';
import assert from 'node:assert/strict';
import { initAnalytics } from '../src/lib/analytics-client.mjs';

const HOST = 'www.annaworthingtonarttherapy.com';
const ID = 'G-TEST123456';

function site({ hostname = HOST, choice, referrer = 'https://www.google.com/search?q=private' } = {}) {
  const element = () => ({
    hidden: true, handlers: {}, focused: false,
    addEventListener(name, handler) { this.handlers[name] = handler; },
    focus() { this.focused = true; },
    click() { this.handlers.click?.({ target: this }); }
  });
  const panel = element(), allow = element(), decline = element(), settings = element();
  panel.dataset = { measurementId: ID, productionHostname: HOST };
  panel.querySelector = selector => selector === '[data-analytics-allow]' ? allow : decline;
  const store = new Map(choice === undefined ? [] : [['helloart.analytics.v1', JSON.stringify(choice)]]);
  const scripts = [], events = new Map(), expiredCookies = [];
  const win = {
    location: { hostname, origin: `https://${hostname}`, pathname: '/contact', href: `https://${hostname}/contact?email=private@example.com#message` },
    localStorage: { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) }
  };
  const doc = {
    referrer,
    querySelector: selector => selector === '[data-analytics-choice]' ? panel : settings,
    createElement: () => ({}),
    head: { appendChild: tag => scripts.push(tag) },
    addEventListener: (name, handler) => events.set(name, handler),
    get cookie() { return '_ga=visitor; _ga_TEST123456=session; essential=keep'; },
    set cookie(value) { expiredCookies.push(value); }
  };
  initAnalytics({ window: win, document: doc });
  return {
    panel, allow, decline, settings, scripts, store, win, expiredCookies,
    emit: (name, event = {}) => events.get(name)?.(event),
    commands: () => (win.dataLayer || []).map(command => Array.from(command))
  };
}

test('analytics sends nothing until an affirmative choice and never loads on preview hosts', () => {
  const fresh = site();
  assert.equal(fresh.panel.hidden, false);
  assert.equal(fresh.settings.hidden, false);
  assert.deepEqual(fresh.scripts, []);
  assert.deepEqual(fresh.commands(), []);
  fresh.decline.click();
  assert.equal(fresh.panel.hidden, true);
  assert.deepEqual(fresh.scripts, []);
  assert.equal(JSON.parse(fresh.store.get('helloart.analytics.v1')).allowed, false);
  for (const hostname of ['127.0.0.1', 'localhost', 'hello-art-therapy.hello-art-therapy.workers.dev']) {
    const preview = site({ hostname, choice: { allowed: true, savedAt: Date.now() } });
    assert.deepEqual(preview.scripts, []);
    assert.equal(preview.settings.hidden, true);
  }
});

test('accepting loads only Anna’s tag with sanitized URLs and advertising disabled', () => {
  const page = site();
  page.allow.click();
  assert.equal(page.scripts.length, 1);
  assert.equal(page.scripts[0].src, `https://www.googletagmanager.com/gtag/js?id=${ID}`);
  const commands = page.commands();
  assert.equal(commands[0][0], 'consent');
  assert.deepEqual(commands[0][2], { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  assert.deepEqual(commands[1], ['consent', 'update', { analytics_storage: 'granted' }]);
  const config = commands.find(command => command[0] === 'config');
  assert.equal(config[1], ID);
  assert.equal(config[2].page_location, `https://${HOST}/contact`);
  assert.equal(config[2].page_referrer, 'https://www.google.com');
  assert.equal(config[2].allow_google_signals, false);
  assert.equal(config[2].allow_ad_personalization_signals, false);
  assert.equal(config[2].cookie_expires, 7776000);
  assert.ok(!JSON.stringify(commands).includes('private'));
  page.settings.click();
  page.allow.click();
  assert.equal(page.scripts.length, 1, 'Preferences must not add a duplicate tag or page view');
});

test('successful enquiries and fixed outbound categories never expose form fields or link queries', () => {
  const page = site();
  page.allow.click();
  page.emit('submit', { target: { email: 'private@example.com', message: 'private enquiry' } });
  assert.equal(page.commands().filter(command => command[0] === 'event').length, 0);
  page.emit('helloart:enquiry-success', { detail: { email: 'private@example.com', message: 'private enquiry' } });
  page.emit('click', { target: { closest: () => ({ href: 'https://www.amazon.com.au/dp/B0HMHYSVPV?private=message' }) } });
  page.emit('click', { target: { closest: () => ({ href: 'mailto:private@example.com?subject=private' }) } });
  page.emit('click', { target: { closest: () => ({ href: 'https://unrelated.example/private' }) } });
  const collected = page.commands().filter(command => command[0] === 'event');
  assert.deepEqual(collected, [
    ['event', 'generate_lead', { method: 'contact_form', send_to: ID }],
    ['event', 'outbound_click', { destination: 'amazon_book', send_to: ID }],
    ['event', 'outbound_click', { destination: 'email', send_to: ID }]
  ]);
  assert.ok(!JSON.stringify(collected).includes('private'));
});

test('declining stops further events and removes only GA cookies; saved choices expire', () => {
  const page = site({ choice: { allowed: true, savedAt: Date.now() } });
  assert.equal(page.scripts.length, 1);
  page.settings.click();
  assert.equal(page.panel.hidden, false);
  page.decline.click();
  assert.equal(page.win[`ga-disable-${ID}`], true);
  assert.equal(page.settings.focused, true);
  page.emit('helloart:enquiry-success');
  assert.equal(page.commands().filter(command => command[0] === 'event').length, 0);
  assert.equal(page.expiredCookies.length, 6);
  assert.ok(page.expiredCookies.every(cookie => cookie.startsWith('_ga') && cookie.includes('Max-Age=0')));
  assert.ok(page.expiredCookies.every(cookie => !cookie.startsWith('essential')));
  const old = site({ choice: { allowed: true, savedAt: Date.now() - 181 * 86400000 } });
  assert.equal(old.scripts.length, 0);
  assert.equal(old.panel.hidden, false);
});
