// server/src/routes/health.js

/**
 *
 * @param env
 */
export function handleHealth(env) {
  return new Response(
    JSON.stringify({
      status: 'ok',
      version: env.APP_VERSION || 'unknown',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}