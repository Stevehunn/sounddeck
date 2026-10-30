/**
 * @file Hook — orchestrates the Pro trial notifications.
 *
 * Mount it **once** at the app root, where both `addToast` and the
 * `useLicense()` status are available.
 *
 * What it does:
 * - Runs `checkAndNotify` immediately on mount
 * - Re-runs it every hour (long-running sessions)
 * - Skips re-runs when the status hasn't changed (avoids double toasts)
 *
 * @example
 *   const { status } = useLicense()
 *   const { addToast } = useToast() // or wherever addToast lives
 *   useTrialNotifications(status, addToast)
 *
 * @see @core/services/TrialNotificationService.js
 */

import { useEffect, useRef } from "react";
import { useLanguage } from "@core/i18n/LanguageContext";
import { checkAndNotify } from "@core/services/TrialNotificationService";

/**
 * @param {Object|null} status - Result of `LicenseService.getStatus()`.
 * @param {(msg: string, type?: string) => void} addToast
 * @returns {void}
 */
export function useTrialNotifications(status, addToast) {
  const { t } = useLanguage();
  const lastSigRef = useRef(null);

  useEffect(() => {
    if (!status || !addToast) return;

    // Cheap signature: skip if the relevant fields haven't changed
    const sig = JSON.stringify({
      tier: status.tier,
      expiresAt: status.expiresAt,
      neverExpires: status.neverExpires,
      error: status.error,
    });
    if (sig === lastSigRef.current) return;
    lastSigRef.current = sig;

    checkAndNotify(status, addToast, t);

    // Hourly re-check (long-running sessions)
    const id = setInterval(() => {
      checkAndNotify(status, addToast, t);
    }, 3_600_000);
    return () => clearInterval(id);
  }, [status, addToast, t]);
}

export default useTrialNotifications;