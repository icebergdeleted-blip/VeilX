// SPDX-License-Identifier: GPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { migrateLegacyData } from '../backend/data-migration.mjs';

function dirs(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'veilx-migrate-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const from = path.join(root, 'Ghost'); const to = path.join(root, 'VeilX');
  mkdirSync(from);
  return { from, to };
}

test('first VeilX launch copies Ghost settings, routes and recovery records, leaving Ghost intact', t => {
  const { from, to } = dirs(t);
  writeFileSync(path.join(from, 'settings.json'), '{"session":{"status":"error"}}');
  writeFileSync(path.join(from, 'route.json'), '{"route":1}');
  assert.deepEqual(migrateLegacyData({ from, to }), ['settings.json', 'route.json']);
  assert.equal(readFileSync(path.join(to, 'settings.json'), 'utf8'), '{"session":{"status":"error"}}');
  assert.equal(readFileSync(path.join(from, 'settings.json'), 'utf8'), '{"session":{"status":"error"}}');
  assert.equal(existsSync(path.join(to, 'phone-control.json')), false);
});

test('existing VeilX data is never overwritten, and a second launch copies nothing', t => {
  const { from, to } = dirs(t);
  writeFileSync(path.join(from, 'settings.json'), '{"old":true}');
  writeFileSync(path.join(from, 'route.json'), '{"old":true}');
  mkdirSync(to); writeFileSync(path.join(to, 'settings.json'), '{"new":true}');
  assert.deepEqual(migrateLegacyData({ from, to }), []);
  assert.equal(readFileSync(path.join(to, 'settings.json'), 'utf8'), '{"new":true}');
  assert.equal(existsSync(path.join(to, 'route.json')), false);
});

test('no Ghost folder, or the same folder, is a no-op', t => {
  const { from, to } = dirs(t);
  assert.deepEqual(migrateLegacyData({ from: path.join(from, 'missing'), to }), []);
  assert.deepEqual(migrateLegacyData({ from, to: from }), []);
  assert.equal(existsSync(to), false);
});
