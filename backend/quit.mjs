// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The decisions made when the user quits. Returns true when VeilX may exit and false when it
 * stays open. Nothing that the running app still needs (phone control, connection alerts) is
 * switched off until the quit is certain, so "Keep VeilX open" leaves a fully working app.
 *
 * A session that could not be restored keeps its recovery record; nothing here claims a restore.
 */
export async function prepareQuit({ controller, phoneControl = null, alerts = null, showBusy, confirmUnrestored }) {
  alerts?.suppress(); // Quitting ends sessions on purpose; never alert about it.
  const stay = () => { alerts?.resume(); return false; };
  if (controller.state.busy) { await showBusy(); return stay(); }
  if (controller.state.session && controller.state.preferences.restoreOnQuit) {
    try { await controller.stopLocation(); }
    catch (error) { if (!await confirmUnrestored(error)) return stay(); }
  }
  if (controller.state.session) {
    await controller.sessionEnded({ deviceId: controller.state.session.deviceId, retry: false,
      error: 'VeilX quit without confirming restoration. Reconnect this phone and choose Retry location or Restore.' });
  }
  await phoneControl?.stop().catch(() => {});
  return true;
}
