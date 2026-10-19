/**
 * @file Health-check route.
 *
 * `GET /health` returns a small JSON payload proving the worker is up
 * and revealing its version. Used by:
 * - The release script (after `wrangler deploy`) to confirm the deploy
 *   landed on the right version.
 * - Uptime monitors (UptimeRobot, Better Uptime, …).
 * - The app's "Connection status" indicator.
 *
 * There is no auth and no DB access — this is intentionally as cheap as
 * possible so it can be hit at high frequency without hitting D1.
 */

/**
 * Handles `GET /health`.
 *
 * @param {Object} env - Worker environment bindings.
 * @param {string} [env.APP_VERSION] - Version string (e.g. "1.4.1").
 * @returns {Response} JSON `{status, version, timestamp}` with 200 OK.
 */
export function handleHealth(env) {
  return new Response(
    JSON.stringify({
      status: "ok",
      version: env.APP_VERSION || "unknown",
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}