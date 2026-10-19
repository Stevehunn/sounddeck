/**
 * @file Options → Support section.
 *
 * Three possible states:
 *
 * 1. **Not connected**: shows a big "Sponsor on GitHub" button and an
 *    "I have a code" button (opens the login modal on the `code` tab).
 * 2. **Connected (Pro / Dev)**: shows the `AccountPanel` with a green
 *    badge + token controls. No upgrade CTA.
 * 3. **Connected (Free)**: shows the `AccountPanel` with a gray badge,
 *    plus an "Upgrade to Pro" card with a GitHub Sponsors button.
 *
 * The `AccountPanel` handles the actual logout/change-account/token logic.
 * This wrapper decides *what to show* based on the current tier.
 *
 * @see @features/auth/AccountPanel.jsx
 * @see @features/auth/LoginModal.jsx
 * @see @core/store/hooks/useLicense.js
 */

import { useState } from "react";
import { useLanguage } from "@core/i18n/LanguageContext";
import { useLicense } from "@core/store/hooks/useLicense";
import Section from "../Section";
import LoginModal from "@features/auth/LoginModal";
import AccountPanel from "@features/auth/AccountPanel";

const GITHUB_SPONSORS_URL = "https://github.com/sponsors/Stevehunn";

/**
 * Support section for the Options page.
 *
 * @param {Object} props
 * @param {React.RefObject<HTMLElement>} [props.sectionRef] - Ref forwarded
 *   to the `<Section>` container (used by the tutorial system).
 * @param {(msg: string, type?: string) => void} [props.addToast]
 * @returns {JSX.Element}
 */
export default function SupportSection({ sectionRef, addToast }) {
  const { t } = useLanguage();
  const { status, isPro, activate, logout, loading } = useLicense();
  const [showLogin, setShowLogin] = useState(false);

  const isConnected = !!status?.email;

  /**
   * Called by `LoginModal` when any authentication succeeds (login, code,
   * claim, manual key). Persists the token via `LicenseService.activate`.
   *
   * @param {string} token - Signed license token.
   * @param {string|null} email - User email (null for manual license).
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const handleActivated = async (token, email) => {
    const result = await activate(token, email);
    if (result.success) {
      addToast?.(t("authManualSuccess"), "success");
      setShowLogin(false);
    }
    return result;
  };

  /**
   * Logout handler (delegated to `AccountPanel` which handles the
   * two-click confirmation).
   *
   * @returns {Promise<void>}
   */
  const handleLogout = async () => {
    await logout();
    addToast?.(t("accountLogoutDone"), "info");
  };

  /**
   * Opens the GitHub Sponsors page in the system browser.
   *
   * @returns {void}
   */
  const handleGithubSponsor = () => {
    window.electronAPI?.openExternal?.(GITHUB_SPONSORS_URL);
  };

  return (
    <>
      <Section
        ref={sectionRef}
        id="support"
        title={t("supportSectionTitle")}
        icon="ti-heart"
      >
        <div
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            marginBottom: 12,
          }}
        >
          {t("supportSectionDesc")}
        </div>

        {/* ═══ Case 1: connected (free OR pro) ═══════════════════════ */}
        {isConnected ? (
          <>
            <AccountPanel
              status={status}
              onLogout={handleLogout}
              onLoginClick={() => setShowLogin(true)}
              addToast={addToast}
            />

            {/* Upgrade CTA for Free accounts */}
            {!isPro && (
              <div
                style={{
                  marginTop: 14,
                  padding: 14,
                  background: "rgba(234,74,170,0.06)",
                  border: "1px dashed #ea4aaa",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#ea4aaa",
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <i className="ti ti-sparkles" />
                  {t("supportUpgradeTitle")}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                    marginBottom: 12,
                  }}
                >
                  {t("supportUpgradeDesc")}
                </div>
                <button
                  type="button"
                  className="btn-primary btn-lg"
                  onClick={handleGithubSponsor}
                  disabled={loading}
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    fontSize: 13,
                    minHeight: 42,
                    background: "#ea4aaa",
                    borderColor: "#ea4aaa",
                    color: "white",
                  }}
                  data-testid="support-upgrade-btn"
                >
                  <i className="ti ti-brand-github" style={{ fontSize: 16 }} />{" "}
                  {t("supportGithubSponsor")}
                </button>
              </div>
            )}
          </>
        ) : (
          /* ═══ Case 2: not connected ════════════════════════════════ */
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              type="button"
              className="btn-primary btn-lg"
              onClick={handleGithubSponsor}
              disabled={loading}
              style={{
                justifyContent: "center",
                fontSize: 13,
                minHeight: 48,
                background: "#ea4aaa",
                borderColor: "#ea4aaa",
                color: "white",
              }}
              data-testid="support-github-sponsor-btn"
            >
              <i className="ti ti-brand-github" style={{ fontSize: 16 }} />{" "}
              {t("supportGithubSponsor")}
            </button>

            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                textAlign: "center",
                lineHeight: 1.6,
              }}
            >
              <div>
                {t("supportGithubSponsorDesc")} ·{" "}
                <strong style={{ color: "var(--accent)" }}>
                  {t("supportGithubSponsorHint")}
                </strong>
              </div>
              <div style={{ marginTop: 4 }}>
                {t("supportGithubSponsorNote")}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: "var(--text-tertiary)",
                fontSize: 11,
                margin: "4px 0",
              }}
            >
              <div
                style={{ flex: 1, height: 1, background: "var(--border)" }}
              />
              {t("supportAlreadyDonor")}
              <div
                style={{ flex: 1, height: 1, background: "var(--border)" }}
              />
            </div>

            <button
              type="button"
              className="btn-secondary btn-lg"
              onClick={() => setShowLogin(true)}
              disabled={loading}
              style={{
                justifyContent: "center",
                fontSize: 13,
                minHeight: 44,
              }}
              data-testid="support-activate-btn"
            >
              <i className="ti ti-gift" /> {t("authTabCode")}
            </button>
          </div>
        )}
      </Section>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onActivated={handleActivated}
          addToast={addToast}
        />
      )}
    </>
  );
}
