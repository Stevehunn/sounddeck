// src/features/sequencer/components/SoundPopupConfigModal.jsx
import { useState } from "react";
import { useLanguage } from "@core/i18n/LanguageContext";
import {
  POPUP_POSITIONS,
  previewSoundPopup,
} from "@core/services/SoundPopupService";

const GRID = [
  ["top-left", "top-center", "top-right"],
  ["center-left", null, "center-right"],
  ["bottom-left", "bottom-center", "bottom-right"],
];

const POSITION_ICONS = {
  "top-left": "ti-align-box-top-left",
  "top-center": "ti-align-box-top-center",
  "top-right": "ti-align-box-top-right",
  "center-left": "ti-align-box-left-middle",
  "center-right": "ti-align-box-right-middle",
  "bottom-left": "ti-align-box-bottom-left",
  "bottom-center": "ti-align-box-bottom-center",
  "bottom-right": "ti-align-box-bottom-right",
};

const SIZE_LABELS = {
  small: "Petite",
  medium: "Moyenne",
  large: "Grande",
};

export default function SoundPopupConfigModal({
  initialPosition,
  cardSize = "medium",
  theme = "dark",
  customTheme = null,
  onValidate,
  onClose,
}) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState(
    POPUP_POSITIONS.includes(initialPosition) ? initialPosition : "top-right",
  );

  const handleValidate = () => onValidate(selected);

  const handlePreview = () => {
    previewSoundPopup({
      cardSize,
      theme,
      customTheme,
      //  Envoie la position SÉLECTIONNÉE dans la modale,
      //    pas la position validée stockée côté main.
      position: selected,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{
          width: 480,
          //  Layout flex : contenu scrollable, footer toujours visible
          display: "flex",
          flexDirection: "column",
          maxHeight: "85vh",
          padding: 0, // on gère le padding manuellement
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── CONTENU SCROLLABLE ─────────────────────────────────── */}
        <div
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            padding: "20px 24px 16px",
          }}
        >
          <div className="modal-title" style={{ marginBottom: 12 }}>
            <i
              className="ti ti-target-arrow"
              style={{ color: "var(--accent)" }}
            />
            {t("soundPopupConfigure")}
          </div>

          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              marginBottom: 14,
              lineHeight: 1.5,
            }}
          >
            {t("soundPopupPositionDesc")}
          </div>

          {/* Représentation d'écran avec 8 emplacements cliquables */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gridTemplateRows: "repeat(3, 1fr)",
              gap: 6,
              padding: 10,
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              aspectRatio: "16 / 9",
              maxWidth: 440,
              margin: "0 auto 16px",
            }}
            data-testid="sound-popup-position-grid"
          >
            {GRID.flat().map((pos, idx) => {
              if (!pos) {
                return (
                  <div
                    key={`center-${idx}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-tertiary)",
                      fontSize: 11,
                      opacity: 0.4,
                    }}
                  >
                    <i
                      className="ti ti-screen-share"
                      style={{ fontSize: 22 }}
                    />
                  </div>
                );
              }

              const isSelected = selected === pos;

              return (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setSelected(pos)}
                  data-testid={`sound-popup-position-${pos}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "var(--radius-md)",
                    border: `2px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                    background: isSelected
                      ? "var(--accent-light)"
                      : "var(--bg-secondary)",
                    color: isSelected
                      ? "var(--accent)"
                      : "var(--text-tertiary)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    aspectRatio: "1 / 1",
                    padding: 0,
                  }}
                  title={pos}
                >
                  <i
                    className={`ti ${POSITION_ICONS[pos]}`}
                    style={{ fontSize: 22 }}
                  />
                </button>
              );
            })}
          </div>

          {/* Info sur la taille utilisée */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "center",
              marginBottom: 4,
              fontSize: 11,
              color: "var(--text-tertiary)",
            }}
          >
            <i
              className="ti ti-info-circle"
              style={{ color: "var(--accent)" }}
            />
            {t("soundPopupUsesCardSize")}{" "}
            <strong style={{ color: "var(--accent)" }}>
              {SIZE_LABELS[cardSize] || SIZE_LABELS.medium}
            </strong>
          </div>
        </div>

        {/* ─── FOOTER FIXE (jamais scrollé) ───────────────────────── */}
        <div
          style={{
            flexShrink: 0,
            padding: "12px 24px 16px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-secondary)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={handlePreview}
            style={{ marginRight: "auto" }}
            data-testid="sound-popup-preview-button"
          >
            <i className="ti ti-eye" /> {t("soundPopupPreview")}
          </button>
          <button
            type="button"
            className="btn-secondary btn-lg"
            onClick={onClose}
            style={{ borderRadius: "var(--radius-md)" }}
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            className="btn-primary btn-lg"
            onClick={handleValidate}
            style={{ borderRadius: "var(--radius-md)" }}
            data-testid="sound-popup-validate-button"
          >
            <i className="ti ti-check" /> {t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
