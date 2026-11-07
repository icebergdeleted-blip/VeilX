// SPDX-License-Identifier: GPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THEMES, normalizeTheme, windowColors } from '../backend/theme.mjs';
import { defaults } from '../backend/store.mjs';
import { Controller } from '../backend/controller.mjs';

test('appearance defaults to following the system and accepts only known themes', () => {
  assert.equal(defaults().preferences.theme, 'system');
  assert.deepEqual(THEMES, ['system', 'light', 'dark']);
  assert.equal(normalizeTheme('dark'), 'dark');
  assert.equal(normalizeTheme('purple'), 'system');
  assert.equal(normalizeTheme(undefined), 'system');
});

test('the controller saves a theme choice and rejects anything else without changing it', async () => {
  const store = { data: defaults(), async load() { return structuredClone(this.data); }, async save(value) { this.data = structuredClone(value); } };
  const adapter = { list: async () => [], status: async () => ({ available: true }), on() {}, close: async () => {} };
  const c = new Controller({ adapters: { ios: adapter, android: adapter }, store, network: async () => ({}) });
  c.state.preferences = structuredClone(defaults().preferences);
  const result = await c.updatePreferences({ theme: 'dark' });
  assert.equal(result.preferences.theme, 'dark');
  assert.equal(store.data.preferences.theme, 'dark');
  await assert.rejects(c.updatePreferences({ theme: 'neon' }), /appearance/i);
  assert.equal(c.state.preferences.theme, 'dark');
});

test('window colors match the stylesheet in both themes', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(css, new RegExp(`--window: ${windowColors(false).background}`));
  assert.match(css, new RegExp(`--window: ${windowColors(true).background}`));
  assert.notEqual(windowColors(true).symbol, windowColors(false).symbol);
});
