/**
 * @file Feedback modal (bug / feature / question / praise).
 *
 * Collects user feedback with optional image attachment and error logs,
 * then sends it via a Discord webhook (resolved from the store) OR falls
 * back to a `mailto:` link if no webhook is configured / the webhook fails.
 *
 * Webhook resolution order:
 * 1. `feedbackWebhookUrls[type]` (per-type, from store)
 * 2. `feedbackWebhookUrl` (default, from store)
 * 3. `mailto:` fallback
 *
 * The webhook URL is injected into the store at boot by
 * `electron/main.js` (from `feedback-config.js` + env vars).
 *
 * Image attachment:
 * - The user picks a file via `electronAPI.openImageDialog()`
 * - The file is read as base64 via `electronAPI.readFileBase64()`
 * - Max size: 5 MB
 * - Supported: PNG, JPG, GIF, WebP, BMP
 *
 * Logs:
 * - If `includeLogs` is checked, the last error logs are attached as a
 *   JSON file in the webhook payload (multipart/form-data).
 *
 * @see electron/modules/fileHandlers.js (openImageDialog, readFileBase64)
 * @see electron/main.js (initFeedbackWebhooks)
 */

import { useState } from "react";
import { useLanguage } from "@core/i18n/LanguageContext";
import { logError, logWarn, logInfo } from "@shared/utils/logger";

/**
 * Feedback type tabs.
 * @type {Array<{id: string, labelKey: string, icon: string}>}
 */
const FEEDBACK_TYPES = [
  { id: "bug", labelKey: "feedbackBug", icon: "ti-bug" },
  { id: "feature", labelKey: "feedbackFeature", icon: "ti-lightbulb" },
  { id: "question", labelKey: "feedbackQuestion", icon: "ti-help" },
  { id: "praise", labelKey: "feedbackPraise", icon: "ti-heart" },
];

/** Fallback email if webhook sending fails. */
const DEFAULT_FEEDBACK_EMAIL = "feedback@sounddeck.app";

/** Maximum allowed image size, in bytes (5 MB). */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// ─── HELPERS ──────────────────────────────────────────────────────────

/**
 * Resolves the webhook URL to use for a given feedback type.
 *
 * Priority: per-type URL → default URL → null (mailto fallback).
 *
 * @param {string} type - Feedback type ('bug' | 'feature' | 'question' | 'praise').
 * @returns {Promise<string|null>} The webhook URL, or null.
 */
async function resolveWebhookUrl(type) {
  try {
    const perType = await window.electronAPI?.storeGet?.("feedbackWebhookUrls");
    if (perType && typeof perType === "object" && perType[type]) {
      return perType[type];
    }
  } catch {
    // silent
  }
  try {
    const def = await window.electronAPI?.storeGet?.("feedbackWebhookUrl");
    return def || null;
  } catch {
    return null;
  }
}

/**
 * Converts a base64 string to a Blob.
 *
 * @param {string} base64
 * @param {string} mime
 * @returns {Blob}
 */
function base64ToBlob(base64, mime) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * MIME type lookup by file extension. Only images are supported.
 */
const MIME_BY_EXT = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
};

/**
 * Returns the MIME type for a file path (fallback: `image/png`).
 * @param {string} filePath
 * @returns {string}
 */
function mimeFromPath(filePath) {
  const ext = filePath.split(".").pop()?.toLowerCase();
  return MIME_BY_EXT[ext] || "image/png";
}

/**
 * Formats a byte count into a human-readable string (B / KB / MB).
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ─── COMPONENT ────────────────────────────────────────────────────────

/**
 * Feedback modal.
 *
 * @param {Object} props
 * @param {() => void} props.onClose - Called when the modal should close.
 * @param {'fr'|'en'|'es'} [props.lang]
 * @param {(feedback: Object) => Promise<void>} [props.onSubmit] - Custom
 *   submit handler. If omitted, uses the default Discord/mailto flow.
 * @param {Object} [props.store] - App store (for version, sound count, etc.).
 * @param {(msg: string, type?: string) => void} [props.addToast]
 * @returns {JSX.Element}
 */
export default function FeedbackModal({
  onClose,
  lang = "fr",
  onSubmit,
  store,
  addToast,
}) {
  const { t } = useLanguage();

  // Type & content
  const [type, setType] = useState("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [includeLogs, setIncludeLogs] = useState(false);

  // Image attachment
  const [attachedImage, setAttachedImage] = useState(null);
  const [isAttaching, setIsAttaching] = useState(false);
  const [attachError, setAttachError] = useState(null);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);

  // ─── IMAGE ATTACHMENT ─────────────────────────────────────────────

  /**
   * Opens the native image picker, reads the file as base64, validates
   * size, and stores the blob + preview URL in state.
   *
   * @returns {Promise<void>}
   */
  const handleAttachImage = async () => {
    setIsAttaching(true);
    setAttachError(null);

    try {
      const filePath = await window.electronAPI?.openImageDialog?.();
      if (!filePath) {
        // Cancelled by the user
        setIsAttaching(false);
        return;
      }

      if (typeof window.electronAPI?.readFileBase64 !== "function") {
        throw new Error("readFileBase64 not available (restart the app)");
      }

      const readResult = await window.electronAPI.readFileBase64(filePath);
      if (!readResult?.success) {
        throw new Error(readResult?.error || "Failed to read file");
      }

      const base64 = readResult.base64;
      const sizeApprox = Math.floor((base64.length * 3) / 4);

      if (sizeApprox > MAX_IMAGE_SIZE) {
        throw new Error(
          `Image too large (${formatBytes(sizeApprox)} > ${formatBytes(
            MAX_IMAGE_SIZE,
          )})`,
        );
      }

      const mime = mimeFromPath(filePath);
      const blob = base64ToBlob(base64, mime);
      const previewUrl = URL.createObjectURL(blob);
      const name = filePath.split(/[\\/]/).pop() || "image.png";

      // Revoke the previous preview URL if we're replacing it
      if (attachedImage?.previewUrl) {
        URL.revokeObjectURL(attachedImage.previewUrl);
      }

      setAttachedImage({
        name,
        path: filePath,
        blob,
        previewUrl,
        size: blob.size,
        mime,
      });

      logInfo(
        "FeedbackModal",
        `✅ Image attached: ${name} (${formatBytes(blob.size)})`,
      );
    } catch (e) {
      logError("FeedbackModal", "Attachment error", e);
      setAttachError(e.message || "Failed to attach image");
    } finally {
      setIsAttaching(false);
    }
  };

  /**
   * Removes the currently attached image and revokes its preview URL.
   * @returns {void}
   */
  const handleRemoveImage = () => {
    if (attachedImage?.previewUrl) {
      URL.revokeObjectURL(attachedImage.previewUrl);
    }
    setAttachedImage(null);
    setAttachError(null);
  };

  // ─── SUBMIT ───────────────────────────────────────────────────────

  /**
   * Collects all fields into a `feedback` object and submits it via
   * `props.onSubmit` (if provided) or the default Discord/mailto flow.
   *
   * @returns {Promise<void>}
   */
  const handleSubmit = async () => {
    if (!message.trim()) {
      setError(t("feedbackMessageRequired"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let logs = null;
      if (includeLogs) {
        try {
          logs = (await window.electronAPI.storeGet("errorLogs")) || [];
        } catch (e) {
          logWarn("FeedbackModal", "Failed to get logs", e);
        }
      }

      let appVersion = "1.3.0";
      try {
        const storedVersion = await window.electronAPI.storeGet("appVersion");
        if (storedVersion) appVersion = storedVersion;
      } catch {
        // silent
      }

      const feedback = {
        type,
        message: message.trim(),
        email: email.trim() || undefined,
        logs: logs || undefined,
        image: attachedImage
          ? {
              blob: attachedImage.blob,
              name: attachedImage.name,
              mime: attachedImage.mime,
              size: attachedImage.size,
            }
          : undefined,
        timestamp: new Date().toISOString(),
        version: appVersion,
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        soundCount: store?.sounds?.length || 0,
        profileCount: store?.profiles?.length || 0,
      };

      if (onSubmit) {
        await onSubmit(feedback);
      } else {
        await submitFeedback(feedback);
      }

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (e) {
      logError("FeedbackModal", "Submit error", e);
      setError(t("feedbackError") + ": " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Default submit flow: send to Discord webhook, or fall back to mailto.
   *
   * @param {Object} feedback
   * @returns {Promise<void>}
   */
  const submitFeedback = async (feedback) => {
    const webhookUrl = await resolveWebhookUrl(feedback.type);

    if (webhookUrl) {
      logInfo(
        "FeedbackModal",
        `Sending feedback type="${feedback.type}" to webhook`,
      );
      const ok = await sendToDiscordWebhook(webhookUrl, feedback);
      if (ok) return;
      logWarn("FeedbackModal", "Webhook failed, mailto fallback");
    } else {
      logInfo(
        "FeedbackModal",
        `No webhook configured for type="${feedback.type}", mailto fallback`,
      );
    }

    openMailto(feedback);
  };

  /**
   * Sends the feedback to a Discord webhook as a rich embed.
   *
   * Uses multipart/form-data when logs or image are present, plain JSON
   * otherwise.
   *
   * @param {string} webhookUrl
   * @param {Object} feedback
   * @returns {Promise<boolean>} `true` on 2xx, `false` otherwise.
   */
  const sendToDiscordWebhook = async (webhookUrl, feedback) => {
    try {
      const typeLabel = t(
        `feedback${feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1)}`,
      );

      const embed = {
        title: `📬 New feedback: ${typeLabel}`,
        description: feedback.message,
        color: feedback.type === "bug" ? 0xef4444 : 0x7c6ff7,
        timestamp: feedback.timestamp,
        fields: [
          { name: "Version", value: feedback.version, inline: true },
          {
            name: "Platform",
            value: feedback.platform || "N/A",
            inline: true,
          },
          { name: "Sounds", value: String(feedback.soundCount), inline: true },
          {
            name: "Profiles",
            value: String(feedback.profileCount),
            inline: true,
          },
        ],
        footer: { text: "SoundDeck Feedback" },
      };

      if (feedback.email) {
        embed.fields.push({
          name: "Email",
          value: feedback.email,
          inline: false,
        });
      }

      if (feedback.userAgent) {
        embed.fields.push({
          name: "User Agent",
          value: feedback.userAgent.slice(0, 200),
          inline: false,
        });
      }

      const payload = {
        username: "SoundDeck Feedback",
        embeds: [embed],
      };

      const hasLogs = feedback.logs && feedback.logs.length > 0;
      const hasImage = !!feedback.image;

      let body;
      const headers = {};

      if (hasLogs || hasImage) {
        const formData = new FormData();
        formData.append("payload_json", JSON.stringify(payload));

        let fileIndex = 0;

        if (hasLogs) {
          formData.append(
            `files[${fileIndex++}]`,
            new Blob([JSON.stringify(feedback.logs, null, 2)], {
              type: "application/json",
            }),
            "error-logs.json",
          );
        }

        if (hasImage) {
          formData.append(
            `files[${fileIndex++}]`,
            feedback.image.blob,
            feedback.image.name,
          );
        }

        body = formData;
      } else {
        body = JSON.stringify(payload);
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body,
      });

      if (!response.ok) {
        logWarn("FeedbackModal", "Webhook HTTP error:", response.status);
        return false;
      }

      logInfo("FeedbackModal", "✅ Feedback sent via Discord webhook");
      return true;
    } catch (e) {
      logError("FeedbackModal", "Discord webhook error", e);
      return false;
    }
  };

  /**
   * Fallback: opens the default mail client with a pre-filled email.
   *
   * @param {Object} feedback
   * @returns {void}
   */
  const openMailto = (feedback) => {
    const typeLabel = t(
      `feedback${feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1)}`,
    );

    const subject = `[SoundDeck ${typeLabel}] ${feedback.message.slice(0, 60)}`;

    const bodyLines = [
      `Type: ${typeLabel}`,
      `Version: ${feedback.version}`,
      `Platform: ${feedback.platform}`,
      `Sounds: ${feedback.soundCount} · Profiles: ${feedback.profileCount}`,
      "",
      "--- Message ---",
      feedback.message,
      "",
    ];

    if (feedback.email) {
      bodyLines.push("--- Email ---", feedback.email, "");
    }

    if (feedback.image) {
      bodyLines.push(
        "--- Attachment ---",
        `(${feedback.image.name} — please attach the file manually)`,
        "",
      );
    }

    if (feedback.logs && feedback.logs.length > 0) {
      bodyLines.push(
        "--- Logs (last 10 errors) ---",
        JSON.stringify(feedback.logs.slice(0, 10), null, 2),
        "",
      );
    }

    const body = encodeURIComponent(bodyLines.join("\n"));
    const url = `mailto:${DEFAULT_FEEDBACK_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${body}`;

    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.location.href = url;
    }
  };

  // ─── RENDER ───────────────────────────────────────────────────────

  if (isSuccess) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal"
          style={{ width: 420 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <i
                className="ti ti-check"
                style={{ fontSize: 32, color: "white" }}
              />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              {t("feedbackThankYou")}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {t("feedbackThankYouDesc")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 500, maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">
          <i className="ti ti-message" style={{ color: "var(--accent)" }} />
          {t("feedbackTitle")}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* ─── TYPE ─────────────────────────────────────────────── */}
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: 6,
              }}
            >
              {t("feedbackType")}
            </label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {FEEDBACK_TYPES.map((feedbackType) => (
                <button
                  key={feedbackType.id}
                  onClick={() => setType(feedbackType.id)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 12,
                    border: `2px solid ${
                      type === feedbackType.id
                        ? "var(--accent)"
                        : "var(--border)"
                    }`,
                    background:
                      type === feedbackType.id
                        ? "var(--accent-light)"
                        : "var(--bg-tertiary)",
                    color:
                      type === feedbackType.id
                        ? "var(--accent)"
                        : "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <i className={`ti ${feedbackType.icon}`} />
                  {t(feedbackType.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* ─── MESSAGE ──────────────────────────────────────────── */}
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: 6,
              }}
            >
              {t("feedbackMessage")} *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("feedbackPlaceholder")}
              rows={4}
              className="input-lg"
              style={{
                borderRadius: "var(--radius-md)",
                resize: "vertical",
                minHeight: 80,
              }}
              aria-required="true"
            />
          </div>

          {/* ─── EMAIL ────────────────────────────────────────────── */}
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: 6,
              }}
            >
              {t("feedbackEmail")}{" "}
              <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
                ({t("feedbackEmailOptional")})
              </span>
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="input-lg"
              style={{ borderRadius: "var(--radius-md)" }}
              type="email"
            />
          </div>

          {/* ─── IMAGE ATTACHMENT ─────────────────────────────────── */}
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: 6,
              }}
            >
              {t("feedbackAttachImage") || "Attachment (optional)"}
            </label>

            {!attachedImage && (
              <button
                className="btn-secondary"
                onClick={handleAttachImage}
                disabled={isAttaching}
                style={{
                  width: "100%",
                  justifyContent: "center",
                  fontSize: 12,
                  minHeight: 36,
                  gap: 6,
                }}
              >
                {isAttaching ? (
                  <>
                    <i
                      className="ti ti-loader"
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                    {t("feedbackAttachImageLoading") || "Loading..."}
                  </>
                ) : (
                  <>
                    <i className="ti ti-photo-up" />
                    {t("feedbackAttachImageBtn") || "Attach an image"}
                  </>
                )}
              </button>
            )}

            {attachedImage && (
              <div
                style={{
                  padding: 10,
                  background: "var(--bg-tertiary)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--success)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                    fontSize: 11,
                    color: "var(--success)",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      minWidth: 0,
                    }}
                  >
                    <i className="ti ti-check" />
                    <span
                      style={{
                        fontFamily: "monospace",
                        maxWidth: 240,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={attachedImage.name}
                    >
                      {attachedImage.name}
                    </span>
                    <span style={{ opacity: 0.7 }}>
                      ({formatBytes(attachedImage.size)})
                    </span>
                  </span>
                  <button
                    onClick={handleRemoveImage}
                    className="btn-ghost btn-sm"
                    style={{
                      fontSize: 10,
                      padding: "2px 6px",
                      color: "var(--danger)",
                      flexShrink: 0,
                    }}
                    title={t("feedbackAttachImageRemove") || "Remove the image"}
                  >
                    <i className="ti ti-x" />{" "}
                    {t("feedbackAttachImageRemoveShort") || "Remove"}
                  </button>
                </div>
                <img
                  src={attachedImage.previewUrl}
                  alt="Preview"
                  style={{
                    width: "100%",
                    maxHeight: 160,
                    objectFit: "contain",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: "var(--bg-primary)",
                  }}
                />
              </div>
            )}

            {attachError && (
              <div
                style={{
                  marginTop: 6,
                  padding: "6px 10px",
                  background: "rgba(224,82,82,0.1)",
                  border: "1px solid var(--danger)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 11,
                  color: "var(--danger)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <i className="ti ti-alert-triangle" />
                <span style={{ flex: 1 }}>{attachError}</span>
                <button
                  onClick={handleAttachImage}
                  className="btn-secondary btn-sm"
                  style={{ fontSize: 10, padding: "2px 8px" }}
                >
                  <i className="ti ti-refresh" /> {t("retry") || "Retry"}
                </button>
              </div>
            )}
          </div>

          {/* ─── LOGS ─────────────────────────────────────────────── */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={includeLogs}
              onChange={(e) => setIncludeLogs(e.target.checked)}
              style={{ width: "auto", accentColor: "var(--accent)" }}
            />
            <span style={{ fontSize: 12 }}>
              <i className="ti ti-file-text" style={{ marginRight: 4 }} />
              {t("feedbackIncludeLogs")}
            </span>
          </label>

          {/* ─── ERROR ────────────────────────────────────────────── */}
          {error && (
            <div
              style={{
                padding: "8px 12px",
                background: "rgba(224,82,82,0.1)",
                border: "1px solid var(--danger)",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
                color: "var(--danger)",
              }}
            >
              <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} />
              {error}
            </div>
          )}
        </div>

        {/* ─── ACTIONS ───────────────────────────────────────────── */}
        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button
            className="btn-secondary btn-lg"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ borderRadius: "var(--radius-md)" }}
          >
            {t("cancel")}
          </button>
          <button
            className="btn-primary btn-lg"
            onClick={handleSubmit}
            disabled={isSubmitting || !message.trim() || isAttaching}
            style={{ borderRadius: "var(--radius-md)" }}
          >
            {isSubmitting ? (
              <>
                <i
                  className="ti ti-loader"
                  style={{ animation: "spin 1s linear infinite" }}
                />{" "}
                {t("feedbackSending")}
              </>
            ) : (
              <>
                <i className="ti ti-send" /> {t("feedbackSend")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
