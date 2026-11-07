// SPDX-License-Identifier: GPL-3.0-or-later

/** Appearance choices. "system" follows the operating system's light/dark setting. */
export const THEMES = ['system', 'light', 'dark'];

export function normalizeTheme(value) {
  return THEMES.includes(value) ? value : 'system';
}

/** Window background and Windows title-bar button colors, matching src/style.css. */
export function windowColors(dark) {
  return dark
    ? { background: '#1c1d20', symbol: '#f2f2f4' }
    : { background: '#f8f9fb', symbol: '#1d1d1f' };
}
