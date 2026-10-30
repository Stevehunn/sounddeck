/**
 * @file Trial Pro — activation + expiry notifications.
 *
 * Triggers `addToast` at key milestones of the 3-month Pro trial:
 * - `activated` — trial just went live (first time)
 * - `month`     — 1 month left
 * - `week`      — 1 week left
 * - `day`       — last day
 * - `expired`   — trial ended (back to Free)
 * - `upgraded`  — trial user became lifetime Pro
 *
 * State is persisted in electron-store under `trialNotificationState` so
 * the same milestone is only shown once, across sessions.
 *
 * @see @core/services/LicenseService.js
 * @see @shared/hooks/useTrialNotifications.js
 */

import { logWarn } from "@shared/utils/logger";

const STORE_KEY = "trialNotificationState";
const DAY = 86400;

/**
 * @typedef {Object} TrialNotifState
 * @property {number|null} expiresAt
 * @property {boolean} shownActivated
 * @property {boolean} shownMonth
 * @property {boolean} shownWeek
 * @property {boolean} shownDay
 * @property {boolean} shownExpired
 */

/**
 * @returns {TrialNotifState}
 */
function emptyState() {
  return {
    expiresAt: null,
    shownActivated: false,
    shownMonth: false,
    shownWeek: false,
    shownDay: false,
    shownExpired: false,
  };
}

async function readState() {
  try {
    const raw = await window.electronAPI?.storeGet?.(STORE_KEY);
    return raw && typeof raw === "object" ? raw : emptyState();
  } catch {
    return emptyState();
  }
}

async function writeState(state) {
  try {
    await window.electronAPI?.storeSet?.(STORE_KEY, state);
  } catch (e) {
    logWarn("TrialNotification", "writeState", e);
  }
}

/**
 * Picks the most urgent threshold not yet shown.
 *
 * @param {number} daysLeft
 * @param {TrialNotifState} state
 * @returns {{key: 'month'|'week'|'day', alsoMark: string[]} | null}
 */
function pickThreshold(daysLeft, state) {
  if (daysLeft <= 1 && !state.shownDay) {
    return { key: "day", alsoMark: ["week", "month"] };
  }
  if (daysLeft <= 7 && !state.shownWeek) {
    return { key: "week", alsoMark: ["month"] };
  }
  if (daysLeft <= 30 && !state.shownMonth) {
    return { key: "month", alsoMark: [] };
  }
  return null;
}

/**
 * Compares the current license status to the persisted notification
 * state, and calls `addToast` for any pending notification.
 *
 * Should be called at boot and then hourly (see `useTrialNotifications`).
 *
 * @param {Object} status - Result of `LicenseService.getStatus()`.
 * @param {(msg: string, type?: string) => void} addToast
 * @param {(key: string, params?: Object) => string} t - i18n lookup.
 * @returns {Promise<void>}
 */
export async function checkAndNotify(status, addToast, t) {
  const state = await readState();
  const nowSec = Math.floor(Date.now() / 1000);

  // ─── Case 1: trial is active ──────────────────────────────────────
  if (status.tier === "pro" && status.expiresAt && !status.neverExpires) {
    // New trial (expiresAt changed) → reset the milestone flags
    if (state.expiresAt !== status.expiresAt) {
      state.expiresAt = status.expiresAt;
      state.shownActivated = false;
      state.shownMonth = false;
      state.shownWeek = false;
      state.shownDay = false;
      state.shownExpired = false;
    }

    const daysLeft = Math.max(
      0,
      Math.floor((status.expiresAt - nowSec) / DAY),
    );

    if (!state.shownActivated) {
      state.shownActivated = true;
      addToast(t("trialActivated", { days: daysLeft }), "success");
    } else {
      const threshold = pickThreshold(daysLeft, state);
      if (threshold) {
        const keyMap = {
          month: "trialMonthLeft",
          week: "trialWeekLeft",
          day: "trialDayLeft",
        };
        addToast(t(keyMap[threshold.key]), "warning");

        state[
          `shown${threshold.key[0].toUpperCase()}${threshold.key.slice(1)}`
        ] = true;
        for (const k of threshold.alsoMark) {
          state[`shown${k[0].toUpperCase()}${k.slice(1)}`] = true;
        }
      }
    }
  }

  // ─── Case 2: trial expired (token rejected) ───────────────────────
  else if (status.tier === "free" && status.error === "EXPIRED") {
    if (state.expiresAt && !state.shownExpired) {
      state.shownExpired = true;
      addToast(t("trialExpired"), "info");
    }
  }

  // ─── Case 3: upgraded to lifetime Pro ─────────────────────────────
  else if (
    status.tier === "pro" &&
    status.neverExpires &&
    state.expiresAt !== null
  ) {
    state.expiresAt = null;
    state.shownActivated = false;
    state.shownMonth = false;
    state.shownWeek = false;
    state.shownDay = false;
    state.shownExpired = false;
    addToast(t("trialUpgradedLifetime"), "success");
  }

  await writeState(state);
}

export default { checkAndNotify };