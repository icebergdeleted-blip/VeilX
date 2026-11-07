// SPDX-License-Identifier: GPL-3.0-or-later
// Checks the desktop interface's Appearance setting in the browser preview: System follows the
// computer, Light and Dark override it, and key surfaces really change color.
// Usage: GHOST_BROWSER_CHANNEL=msedge node scripts/check-theme.mjs [screenshotDir]
import { createServer } from 'vite';
import { chromium } from 'playwright';
import path from 'node:path';

const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch(process.env.GHOST_BROWSER_CHANNEL ? { channel: process.env.GHOST_BROWSER_CHANNEL } : {});
const shots = process.argv[2];
const failures = [];
const colors = page => page.evaluate(() => ({
  body: getComputedStyle(document.body).backgroundColor,
  text: getComputedStyle(document.body).color,
  panel: getComputedStyle(document.querySelector('.control-panel')).backgroundColor,
}));
const isDark = rgb => { const [r, g, b] = rgb.match(/\d+/g).map(Number); return (r + g + b) / 3 < 100; };

try {
  for (const scheme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 820 }, colorScheme: scheme });
    await page.route(/tile\.openstreetmap\.org/, route => route.abort());
    await page.goto(base);
    await page.waitForSelector('.control-panel');
    await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close()));
    const system = await colors(page);
    if (isDark(system.body) !== (scheme === 'dark')) failures.push(`System (${scheme}): body background ${system.body}`);
    if (shots) await page.screenshot({ path: path.join(shots, `desktop-system-${scheme}.png`) });

    const opposite = scheme === 'light' ? 'dark' : 'light';
    await page.evaluate(() => document.querySelector('#settings-dialog').showModal());
    await page.click(`[data-theme-choice="${opposite}"]`);
    if (await page.getAttribute(`[data-theme-choice="${opposite}"]`, 'aria-pressed') !== 'true') failures.push(`${opposite} button not pressed`);
    if (shots) await page.screenshot({ path: path.join(shots, `desktop-settings-${opposite}.png`) });
    await page.evaluate(() => document.querySelector('#settings-dialog').close());
    const forced = await colors(page);
    if (isDark(forced.body) !== (opposite === 'dark')) failures.push(`${opposite} on a ${scheme} computer: body ${forced.body}`);
    if (isDark(forced.text) === isDark(forced.body)) failures.push(`${opposite}: text ${forced.text} has no contrast with ${forced.body}`);
    if (forced.panel === system.panel) failures.push(`${opposite}: control panel color did not change`);
    // Dropdown options (e.g. the connection guide's "Show steps for" list) must be readable.
    const options = await page.evaluate(() => [...document.querySelectorAll('select option')].map(option => {
      const style = getComputedStyle(option); return { text: option.textContent, fg: style.color, bg: style.backgroundColor };
    }));
    if (!options.length) failures.push('no dropdown options found to check');
    for (const option of options) {
      const transparent = /rgba\(.*,\s*0\)$/.test(option.bg) || option.bg === 'transparent';
      if (transparent || isDark(option.fg) === isDark(option.bg)) failures.push(`${opposite}: option "${option.text}" text ${option.fg} on ${option.bg}`);
    }

    await page.evaluate(() => document.querySelector('#settings-dialog').showModal());
    await page.click('[data-theme-choice="system"]');
    await page.evaluate(() => document.querySelector('#settings-dialog').close());
    const back = await colors(page);
    if (back.body !== system.body) failures.push(`System after ${opposite}: body ${back.body}, expected ${system.body}`);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
if (failures.length) { console.error(`theme check failed:\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log('theme ok: System follows the computer; Light and Dark override it and switch back');
