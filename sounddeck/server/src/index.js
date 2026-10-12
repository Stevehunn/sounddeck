// server/src/index.js
import { handleHealth } from './routes/health.js'
import { handleLogin } from './routes/login.js'
import { handleStripeWebhook } from './routes/stripe-webhook.js'
import { handleRedeem } from './routes/redeem.js'
import {
  handleGenerateCode,
  handleListCodes,
  handleRevokeCode,
} from './routes/admin.js'

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const { pathname } = url
    const method = request.method

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    try {
      let response

      // ─── Routes publiques ────────────────────────────────────────
      if (pathname === '/health' && method === 'GET') {
        response = handleHealth(env)
      } else if (pathname === '/login' && method === 'POST') {
        response = await handleLogin(request, env)
      } else if (pathname === '/redeem' && method === 'POST') {
        response = await handleRedeem(request, env)
      } else if (pathname === '/webhook/stripe' && method === 'POST') {
        response = await handleStripeWebhook(request, env)
      }

      // ─── Routes admin (protégées) ────────────────────────────────
      else if (pathname === '/admin/generate-code' && method === 'POST') {
        response = await handleGenerateCode(request, env)
      } else if (pathname === '/admin/list-codes' && method === 'GET') {
        response = await handleListCodes(request, env)
      } else if (pathname === '/admin/revoke-code' && method === 'POST') {
        response = await handleRevokeCode(request, env)
      } else {
        response = new Response('Not Found', { status: 404 })
      }

      const newHeaders = new Headers(response.headers)
      for (const [k, v] of Object.entries(corsHeaders)) {
        newHeaders.set(k, v)
      }

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      })
    } catch (e) {
      console.error('❌ Unhandled error:', {
        message: e.message,
        stack: e.stack?.split('\n').slice(0, 5).join('\n'),
        pathname,
        method,
        timestamp: new Date().toISOString(),
      })

      return new Response(
        JSON.stringify({ error: 'internal_error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }
  },
}