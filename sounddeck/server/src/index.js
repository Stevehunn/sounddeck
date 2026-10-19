/**
 * @file Cloudflare Worker entry point — request router.
 *
 * This is the single `export default` consumed by the Workers runtime.
 * Every incoming HTTP request lands in `fetch()`, which:
 *
 * 1. Handles CORS preflight (`OPTIONS`) requests.
 * 2. Routes to the matching handler based on `pathname` + `method`:
 *
 *    **Public routes**
 *    - `GET  /health`                       → health check
 *    - `GET  /download/:platform`           → GitHub Releases redirect
 *    - `POST /signup`                       → create unverified account
 *    - `GET  /verify-email?token=…`         → verify email (HTML)
 *    - `POST /forgot-password`              → send reset link by email
 *    - `GET  /reset-password?token=…`       → reset form (HTML)
 *    - `POST /reset-password`               → submit new password
 *    - `POST /login`                        → email + password login
 *    - `POST /redeem`                       → redeem activation code
 *    - `POST /claim-sponsorship`            → claim a GitHub Sponsorship
 *    - `POST /webhook/stripe`               → Stripe webhook (dormant)
 *    - `POST /webhook/github-sponsor`       → GitHub Sponsors webhook
 *
 *    **Admin routes** (require `Authorization: Bearer <ADMIN_TOKEN>`)
 *    - `POST /admin/generate-code`
 *    - `GET  /admin/list-codes`
 *    - `POST /admin/revoke-code`
 *    - `POST /admin/create-user`
 *    - `POST /admin/reset-password`
 *    - `GET  /admin/list-users`
 *
 * 3. Injects CORS headers on every response (including error responses).
 *    HTML responses get a relaxed CORS (no `Access-Control-Allow-Headers`
 *    because they're served to a browser, not an XHR).
 * 4. Catches any unhandled error → logs it and returns `500 internal_error`.
 *
 * Unknown routes → `404 Not Found` (plain text).
 *
 * @see ./routes/*.js — the actual route handlers
 * @see ./lib/*.js    — DB, crypto, email, license helpers
 */

import { handleHealth } from "./routes/health.js";
import { handleLogin } from "./routes/login.js";
import { handleStripeWebhook } from "./routes/stripe-webhook.js";
import { handleRedeem } from "./routes/redeem.js";
import { handleGitHubSponsorWebhook } from "./routes/github-webhook.js";
import { handleClaimSponsorship } from "./routes/claim.js";
import { handleSignup, handleVerifyEmail } from "./routes/signup.js";
import { handleForgotPassword } from "./routes/forgot-password.js";
import {
  handleResetPasswordPage,
  handleResetPasswordSubmit,
} from "./routes/reset-password.js";
import {
  handleGenerateCode,
  handleListCodes,
  handleRevokeCode,
  handleCreateUser,
  handleResetPassword,
  handleListUsers,
} from "./routes/admin.js";
import { handleDownload } from "./routes/download.js";

export default {
  /**
   * Main request handler.
   *
   * The method is `fetch` because that's the Cloudflare Workers
   * convention (the runtime invokes `worker.fetch(request, env, ctx)`).
   *
   * @param {Request} request - Incoming HTTP request.
   * @param {Object} env - Worker environment bindings (D1, secrets, vars).
   * @returns {Promise<Response>} The HTTP response, with CORS headers set.
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    // ─── CORS headers applied to every response ────────────────────
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Hub-Signature-256, X-GitHub-Event",
    };

    // ─── CORS preflight ────────────────────────────────────────────
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      let response;

      // ─── Public routes ───────────────────────────────────────────
      if (pathname === "/health" && method === "GET") {
        response = handleHealth(env);
      } else if (
        pathname.startsWith("/download/") &&
        (method === "GET" || method === "HEAD")
      ) {
        const platform = pathname.split("/")[2];
        response = await handleDownload(request, env, platform);
      } else if (pathname === "/signup" && method === "POST") {
        response = await handleSignup(request, env);
      } else if (pathname === "/verify-email" && method === "GET") {
        response = await handleVerifyEmail(request, env);
      } else if (pathname === "/forgot-password" && method === "POST") {
        response = await handleForgotPassword(request, env);
      } else if (pathname === "/reset-password" && method === "GET") {
        response = await handleResetPasswordPage(request, env);
      } else if (pathname === "/reset-password" && method === "POST") {
        response = await handleResetPasswordSubmit(request, env);
      } else if (pathname === "/login" && method === "POST") {
        response = await handleLogin(request, env);
      } else if (pathname === "/redeem" && method === "POST") {
        response = await handleRedeem(request, env);
      } else if (pathname === "/claim-sponsorship" && method === "POST") {
        response = await handleClaimSponsorship(request, env);
      } else if (pathname === "/webhook/stripe" && method === "POST") {
        response = await handleStripeWebhook(request, env);
      } else if (pathname === "/webhook/github-sponsor" && method === "POST") {
        response = await handleGitHubSponsorWebhook(request, env);
      }

      // ─── Admin routes (Bearer auth inside each handler) ──────────
      else if (pathname === "/admin/generate-code" && method === "POST") {
        response = await handleGenerateCode(request, env);
      } else if (pathname === "/admin/list-codes" && method === "GET") {
        response = await handleListCodes(request, env);
      } else if (pathname === "/admin/revoke-code" && method === "POST") {
        response = await handleRevokeCode(request, env);
      } else if (pathname === "/admin/create-user" && method === "POST") {
        response = await handleCreateUser(request, env);
      } else if (pathname === "/admin/reset-password" && method === "POST") {
        response = await handleResetPassword(request, env);
      } else if (pathname === "/admin/list-users" && method === "GET") {
        response = await handleListUsers(request, env);
      } else {
        // ─── Catch-all 404 ────────────────────────────────────────
        response = new Response("Not Found", { status: 404 });
      }

      // ─── Inject CORS headers (skip Allow-Headers for HTML) ────────
      const newHeaders = new Headers(response.headers);
      const isHtml = response.headers
        .get("Content-Type")
        ?.includes("text/html");
      for (const [k, v] of Object.entries(corsHeaders)) {
        if (isHtml && k === "Access-Control-Allow-Headers") continue;
        newHeaders.set(k, v);
      }

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    } catch (e) {
      console.error("❌ Unhandled error:", {
        message: e.message,
        pathname,
        method,
        timestamp: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ error: "internal_error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  },
};