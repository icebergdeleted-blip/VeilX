// SPDX-License-Identifier: GPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareQuit } from '../backend/quit.mjs';
import { ConnectionAlerts } from '../backend/alerts.mjs';

function fixture({ busy = false, session = null, restoreOnQuit = true, stop = async () => {} } = {}) {
  const calls = [];
  const controller = {
    state: { busy, session, preferences: { restoreOnQuit } },
    stopLocation: async () => { calls.push('stopLocation'); await stop(); controller.state.session = null; },
    sessionEnded: async event => { calls.push(`sessionEnded:${event.retry}`); },
  };
  const phoneControl = { stop: async () => { calls.push('phoneControl.stop'); } };
  return { calls, controller, phoneControl, alerts: new ConnectionAlerts() };
}
const session = { deviceId: 'ios:00008140-0000000000000001', status: 'active' };

test('a quit refused because a device operation is running leaves phone control and alerts on', async () => {
  const { calls, controller, phoneControl, alerts } = fixture({ busy: true, session });
  const leaving = await prepareQuit({ controller, phoneControl, alerts, showBusy: async () => { calls.push('busy dialog'); }, confirmUnrestored: async () => true });
  assert.equal(leaving, false);
  assert.deepEqual(calls, ['busy dialog']);
  assert.equal(alerts.suppressed, false);
});

test('choosing Keep VeilX open after a failed restore keeps the record, phone control and alerts', async () => {
  const { calls, controller, phoneControl, alerts } = fixture({ session, stop: async () => { throw new Error('phone not connected'); } });
  const leaving = await prepareQuit({ controller, phoneControl, alerts, showBusy: async () => {}, confirmUnrestored: async error => { calls.push(`ask:${error.message}`); return false; } });
  assert.equal(leaving, false);
  assert.deepEqual(calls, ['stopLocation', 'ask:phone not connected']);
  assert.ok(controller.state.session, 'the unresolved record stays');
  assert.equal(alerts.suppressed, false);
});

test('Quit anyway marks the session unresolved, then stops phone control', async () => {
  const { calls, controller, phoneControl, alerts } = fixture({ session, stop: async () => { throw new Error('phone not connected'); } });
  const leaving = await prepareQuit({ controller, phoneControl, alerts, showBusy: async () => {}, confirmUnrestored: async () => true });
  assert.equal(leaving, true);
  assert.deepEqual(calls, ['stopLocation', 'sessionEnded:false', 'phoneControl.stop']);
  assert.equal(alerts.suppressed, true);
});

test('a successful restore on quit needs no question; Restore on quit off sends no restore', async () => {
  const restored = fixture({ session });
  assert.equal(await prepareQuit({ ...restored, showBusy: async () => {}, confirmUnrestored: async () => { throw new Error('must not ask'); } }), true);
  assert.deepEqual(restored.calls, ['stopLocation', 'phoneControl.stop']);
  const kept = fixture({ session, restoreOnQuit: false });
  assert.equal(await prepareQuit({ ...kept, showBusy: async () => {}, confirmUnrestored: async () => true }), true);
  assert.deepEqual(kept.calls, ['sessionEnded:false', 'phoneControl.stop']);
});

test('alerts muted for a cancelled quit report the next real connection loss', () => {
  const alerts = new ConnectionAlerts();
  const state = status => ({ session: { deviceId: 'ios:00008140-0000000000000001', status, connection: 'usb', deviceName: 'Example iPhone', autoReconnect: true } });
  alerts.update(state('active'));
  alerts.suppress(); alerts.resume();
  assert.equal(alerts.update(state('waiting'))?.kind, 'lost');
});
