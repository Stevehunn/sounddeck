// src/features/auth/AccountPanel.jsx
import { useState } from "react";
import { useLanguage } from "@core/i18n/LanguageContext";

export default function AccountPanel({
  status,
  onLogout,
  onLoginClick,
  addToast,
}) {
  const { t } = useLanguage();
  const [showToken, setShowToken] = useState(false);
  const [tokenValue, setTokenValue] = useState("");
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const isConnected = !!status.email;
  const tier = status.tier || "free";
  const isPro = tier === "pro" || tier === "dev";
  const isDev = tier === "dev";
  const isFree = tier === "free";

  const loadToken = async () => {
    const tk = await window.electronAPI?.storeGet?.("licenseToken");
    setTokenValue(tk || "");
    setShowToken(true);
  };

  const copyToken = async () => {
    if (!tokenValue) return;
    try {
      await navigator.clipboard.writeText(tokenValue);
      addToast?.(t("accountTokenCopied"), "success");
    } catch (e) {
      addToast?.("❌ " + e.message, "error");
    }
  };

  const handleLogoutClick = () => {
    if (!confirmingLogout) {
      setConfirmingLogout(true);
      setTimeout(() => setConfirmingLogout(false), 3000);
      return;
    }
    onLogout?.();
  };

  // ─── Couleurs / labels selon tier ────────────────────────────────
  const tierConfig = isDev
    ? {
        label: t("tierDev"),
        header: t("supportDevMode"),
        desc: t("supportDevModeDesc"),
        color: "var(--accent)",
        bg: "rgba(124,111,247,0.06)",
      }
    : isPro
      ? {
          label: t("tierPro"),
          header: t("supportProActive"),
          desc: t("supportProActiveDesc"),
          color: "var(--success)",
          bg: "rgba(29,158,117,0.06)",
        }
      : {
          label: t("tierFree"),
          header: t("supportFreeActive"),
          desc: t("supportFreeActiveDesc"),
          color: "var(--text-secondary)",
          bg: "rgba(160,160,176,0.05)",
        };

  const issuedDate = status.issuedAt
    ? new Date(status.issuedAt * 1000).toLocaleDateString()
    : "—";

  return (
    <div
      style={{
        padding: "12px 14px",
        background: tierConfig.bg,
        border: `1px solid ${tierConfig.color}`,
        borderRadius: "var(--radius-md)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* ─── HEADER : badge tier ──────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
          }}
        >
          <i
            className={`ti ${isFree ? "ti-user-circle" : "ti-rosette-discount-check"}`}
            style={{
              color: tierConfig.color,
              fontSize: 18,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontWeight: 600,
              fontSize: 13,
              color: tierConfig.color,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {tierConfig.header}
          </span>
        </div>
        <span
          style={{
            fontSize: 10,
            padding: "2px 8px",
            borderRadius: 10,
            background: tierConfig.color,
            color: "white",
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {tierConfig.label}
        </span>
      </div>

      {/* ─── DESCRIPTION ──────────────────────────────────────────── */}
      <div
        style={{
          fontSize: 11,
          color: "var(--text-secondary)",
          lineHeight: 1.6,
        }}
      >
        {tierConfig.desc}
      </div>

      {/* ─── BADGE "NON CONNECTÉ" si pas d'email ─────────────────── */}
      {!isConnected && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            background: "rgba(239,159,39,0.1)",
            border: "1px solid var(--warning)",
            borderRadius: 6,
            fontSize: 11,
            color: "var(--warning)",
          }}
        >
          <i className="ti ti-plug-off" style={{ fontSize: 12 }} />
          {t("accountNotConnected")}
        </div>
      )}

      {/* ─── INFOS : email + date ─────────────────────────────────── */}
      {isConnected && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            fontSize: 11,
            paddingTop: 8,
            borderTop: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ color: "var(--text-tertiary)" }}>
              {t("accountEmail")}
            </div>
            <div
              style={{
                color: "var(--text-primary)",
                fontFamily: "monospace",
                fontSize: 11,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {status.email}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--text-tertiary)" }}>
              {t("accountIssuedAt")}
            </div>
            <div style={{ color: "var(--text-primary)" }}>{issuedDate}</div>
          </div>
        </div>
      )}

      {/* ─── TOKEN AFFICHÉ ────────────────────────────────────────── */}
      {showToken && tokenValue && (
        <div
          style={{
            padding: 8,
            background: "var(--bg-tertiary)",
            borderRadius: 6,
            fontSize: 10,
            fontFamily: "monospace",
            wordBreak: "break-all",
            color: "var(--text-secondary)",
            maxHeight: 80,
            overflowY: "auto",
          }}
        >
          {tokenValue}
        </div>
      )}

      {/* ─── WARNING : garde ta clé (uniquement si Pro) ───────────── */}
      {isPro && (
        <div
          style={{
            fontSize: 11,
            color: "var(--warning)",
            lineHeight: 1.5,
          }}
        >
          <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} />
          {t("accountTokenWarning")}
        </div>
      )}

      {/* ─── ACTIONS ──────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginTop: 4,
          alignItems: "center",
        }}
      >
        {/* Afficher/Copier token — uniquement pour Pro / Dev */}
        {isPro && (
          <>
            {!showToken ? (
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={loadToken}
                style={{ fontSize: 11 }}
              >
                <i className="ti ti-key" /> {t("accountTokenShow")}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={copyToken}
                  style={{ fontSize: 11 }}
                >
                  <i className="ti ti-copy" /> {t("accountTokenCopy")}
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => {
                    setShowToken(false);
                    setTokenValue("");
                  }}
                  style={{ fontSize: 11 }}
                >
                  <i className="ti ti-eye-off" /> {t("accountTokenHide")}
                </button>
              </>
            )}
          </>
        )}

        <div style={{ flex: 1 }} />

        {/* Boutons connecté */}
        {isConnected && (
          <>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={onLoginClick}
              style={{ fontSize: 11 }}
              data-testid="account-change-button"
            >
              <i className="ti ti-switch-horizontal" /> {t("accountChange")}
            </button>

            <button
              type="button"
              className={`btn-${confirmingLogout ? "danger" : "ghost"} btn-sm`}
              onClick={handleLogoutClick}
              style={{
                fontSize: 11,
                color: confirmingLogout ? "white" : "var(--danger)",
              }}
              data-testid="account-logout-button"
            >
              <i
                className={`ti ${confirmingLogout ? "ti-alert-triangle" : "ti-logout"}`}
              />
              {confirmingLogout ? t("accountLogoutConfirm") : t("authLogout")}
            </button>
          </>
        )}

        {/* Bouton non connecté */}
        {!isConnected && (
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={onLoginClick}
            style={{ fontSize: 11 }}
            data-testid="account-connect-button"
          >
            <i className="ti ti-login" /> {t("accountConnect")}
          </button>
        )}
      </div>

      {/* ─── NOTE de bas de panneau ───────────────────────────────── */}
      <div
        style={{
          fontSize: 10,
          color: "var(--text-tertiary)",
          marginTop: 2,
        }}
      >
        <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
        {isConnected ? t("accountLogoutNote") : t("accountNotConnectedNote")}
      </div>
    </div>
  );
}
