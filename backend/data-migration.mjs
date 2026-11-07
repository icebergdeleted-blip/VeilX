// SPDX-License-Identifier: GPL-3.0-or-later
import { copyFileSync, constants, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

/** Files that carry saved places, settings, unresolved-session records, routes and phone pairings. */
export const LEGACY_DATA_FILES = ['settings.json', 'route.json', 'phone-control.json'];

/**
 * VeilX was renamed from Ghost, which moves Electron's data folder. Copy the Ghost files once so
 * saved places and, above all, unresolved-session recovery records are not silently lost.
 * Copy, never move: the original Ghost install keeps working. Runs only while the new folder has
 * none of these files, so it never overwrites VeilX data.
 */
export function migrateLegacyData({ from, to, files = LEGACY_DATA_FILES, fs = { copyFileSync, existsSync, mkdirSync } }) {
  if (!from || !to || path.resolve(from) === path.resolve(to)) return [];
  if (files.some(name => fs.existsSync(path.join(to, name)))) return [];
  const present = files.filter(name => fs.existsSync(path.join(from, name)));
  if (!present.length) return [];
  fs.mkdirSync(to, { recursive: true });
  const copied = [];
  for (const name of present) {
    try {
      fs.copyFileSync(path.join(from, name), path.join(to, name), constants.COPYFILE_EXCL);
      copied.push(name);
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
    }
  }
  return copied;
}
