import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveLanguage, rememberLanguage } from './language.js';

function browser(href, saved = {}, blocked = false) {
  const values = new Map(Object.entries(saved));
  globalThis.document = { documentElement: { lang: 'sv' } };
  globalThis.window = {
    location: { href },
    localStorage: {
      getItem(key) { if (blocked) throw new Error('blocked'); return values.get(key) ?? null; },
      setItem(key, value) { if (blocked) throw new Error('blocked'); values.set(key, value); },
    },
    history: {
      state: { retained: true },
      replaceState(state, _, url) { this.state = state; window.location.href = String(url); },
    },
  };
  return values;
}

test('language precedence and legacy preference migration', () => {
  browser('https://example.com/electricity/');
  assert.equal(resolveLanguage(), 'sv');
  browser('https://example.com/electricity/', { 'electricity-language': 'en' });
  assert.equal(resolveLanguage('sv', 'electricity-language'), 'en');
  browser('https://example.com/electricity/', { 'physics-language': 'sv', 'electricity-language': 'en' });
  assert.equal(resolveLanguage('sv', 'electricity-language'), 'sv');
  browser('https://example.com/electricity/?lang=en#/phasor-diagram', { 'physics-language': 'sv' });
  assert.equal(resolveLanguage(), 'en');
  browser('https://example.com/?lang=invalid', { 'physics-language': 'en' });
  assert.equal(resolveLanguage(), 'en');
});

test('selection persists across apps and preserves module routes and parameters', () => {
  const values = browser('https://example.com/electricity/?other=1#/phasor-diagram');
  rememberLanguage('en');
  assert.equal(values.get('physics-language'), 'en');
  assert.equal(window.location.href, 'https://example.com/electricity/?other=1&lang=en#/phasor-diagram');
  assert.equal(document.documentElement.lang, 'en');
  assert.deepEqual(window.history.state, { retained: true });
  window.location.href = 'https://example.com/thermodynamics/';
  assert.equal(resolveLanguage(), 'en');
  rememberLanguage('sv');
  assert.equal(resolveLanguage(), 'sv');
});

test('explicit links and switching work without storage', () => {
  browser('https://example.com/electricity/?lang=en#/phasor-diagram', {}, true);
  assert.equal(resolveLanguage(), 'en');
  rememberLanguage('sv');
  assert.equal(resolveLanguage(), 'sv');
  browser('https://example.com/', {}, true);
  assert.equal(resolveLanguage(), 'sv');
});
