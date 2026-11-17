// SPDX-License-Identifier: GPL-3.0-or-later
import { createRequire } from 'node:module';

/** VeilX's version, from package.json (also readable inside the packaged app). */
export const VERSION = createRequire(import.meta.url)('../package.json').version;
/** Sent to the search and routing services, as their usage policies ask. */
export const USER_AGENT = `VeilX/${VERSION} (phone location simulator)`;
