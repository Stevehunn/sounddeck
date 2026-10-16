// server/src/index.js
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
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Hub-Signature-256, X-GitHub-Event",
    };

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      let response;

      // ─── Public ──────────────────────────────────────────────────
      if (pathname === "/health" && method === "GET") {
        response = handleHealth(env);
      } else if (pathname.startsWith("/download/") && (method === "GET" || method === "HEAD")) {
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

      // ─── Admin ───────────────────────────────────────────────────
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
        response = new Response("Not Found", { status: 404 });
      }

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
