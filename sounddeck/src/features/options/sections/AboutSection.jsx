// src/features/options/sections/AboutSection.jsx
import { useLanguage } from "@core/i18n/LanguageContext";
import Section from "../Section";
import OptionRow from "../OptionRow";

const APP_VERSION = "0.1.0";

export default function AboutSection({ sectionRef }) {
  const { t } = useLanguage();

  const handleOpenSource = () => {
    window.electronAPI?.openExternal?.("https://github.com/SteveHun/sounddeck");
  };

  return (
    <Section
      ref={sectionRef}
      id="about"
      title={t("aboutSectionTitle")}
      icon="ti-info-circle"
    >
      {import.meta.env.DEV && (
        <div
          style={{
            padding: "10px 14px",
            background: "rgba(239,159,39,0.1)",
            border: "1px dashed var(--warning)",
            borderRadius: "var(--radius-md)",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <i
            className="ti ti-bug"
            style={{ color: "var(--warning)", fontSize: 16 }}
          />
          <div
            style={{ flex: 1, fontSize: 11, color: "var(--text-secondary)" }}
          >
            <strong>Mode dev</strong> — Bouton de test pour reset la licence
            locale
          </div>
          <button
            className="btn-secondary btn-sm"
            onClick={async () => {
              await window.electronAPI.storeSet("licenseToken", null);
              await window.electronAPI.storeSet("licenseEmail", null);
              window.location.reload();
            }}
            style={{ fontSize: 11 }}
          >
            Reset licence locale
          </button>
        </div>
      )}
      <OptionRow label={t("aboutVersion")}>
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 12,
            color: "var(--accent)",
            fontWeight: 600,
            background: "var(--bg-tertiary)",
            padding: "3px 10px",
            borderRadius: 6,
          }}
        >
          v{APP_VERSION}
        </span>
      </OptionRow>

      <OptionRow label={t("aboutLicense")}>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {t("aboutLicenseValue")}
        </span>
      </OptionRow>

      <OptionRow label={t("aboutSourceCode")}>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={handleOpenSource}
          style={{ fontSize: 11 }}
        >
          <i className="ti ti-brand-github" /> GitHub
        </button>
      </OptionRow>

      <div
        style={{
          marginTop: 12,
          padding: "12px 14px",
          background: "var(--bg-tertiary)",
          borderRadius: "var(--radius-md)",
          fontSize: 11,
          color: "var(--text-tertiary)",
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontSize: 24, marginBottom: 6 }}>🎧</div>
        <div style={{ color: "var(--text-secondary)", marginBottom: 4 }}>
          {t("aboutMadeWith")}
        </div>
        <div>{t("aboutOpenSource")}</div>
      </div>
    </Section>
  );
}
