/**
 * @file Sidebar editor header + toolbar.
 *
 * The header has:
 * - Title ("Sidebar editor")
 * - Subtitle (short explanation)
 * - Save / Cancel / Reset buttons
 *
 * The toolbar below the header shows usage hints:
 * - Drag to reorder
 * - Eye to hide
 * - Pin to move to the pinned section
 * - Fixed sections (max 2)
 *
 * @see ./index.jsx (parent)
 */

import { useLanguage } from "@core/i18n/LanguageContext";

/**
 * Header of the sidebar editor.
 *
 * @param {Object} props
 * @param {() => void} props.onSave
 * @param {() => void} props.onCancel
 * @param {() => void} props.onReset
 * @param {number} props.fixedSectionsCount - Number of currently fixed sections (for the toolbar hint).
 * @returns {JSX.Element}
 */
export default function SidebarEditorHeader({
  onSave,
  onCancel,
  onReset,
  fixedSectionsCount,
}) {
  const { t } = useLanguage();

  return (
    <>
      <div
        style={{
          padding: "12px 16px",
          backgroundColor: "var(--accent-light)",
          borderBottom: "1px solid var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i
            className="ti ti-layout-sidebar"
            style={{ color: "var(--accent)" }}
          />
          <span
            style={{ fontWeight: 600, fontSize: 14, color: "var(--accent)" }}
          >
            {t("sidebarEditorTitle")}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {t("sidebarEditorSub")}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className="btn-ghost btn-sm"
            onClick={onReset}
            style={{
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <i className="ti ti-refresh" /> {t("sidebarEditorReset")}
          </button>
          <button
            className="btn-secondary btn-sm"
            onClick={onCancel}
            style={{
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <i className="ti ti-x" /> {t("cancel")}
          </button>
          <button
            className="btn-primary btn-sm"
            onClick={onSave}
            style={{
              fontSize: 12,
              padding: "4px 12px",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <i className="ti ti-check" /> {t("sidebarEditorSave")}
          </button>
        </div>
      </div>

      <Toolbar fixedSectionsCount={fixedSectionsCount} />
    </>
  );
}

/**
 * Toolbar below the header, with usage hints.
 *
 * @param {Object} props
 * @param {number} props.fixedSectionsCount - Number of currently fixed sections.
 * @returns {JSX.Element}
 */
function Toolbar({ fixedSectionsCount }) {
  const { t } = useLanguage();

  return (
    <div
      style={{
        padding: "8px 16px",
        backgroundColor: "var(--bg-tertiary)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
        fontSize: 11,
        color: "var(--text-tertiary)",
      }}
    >
      <span>
        <span style={{ opacity: 0.4 }}>☰</span> {t("sidebarEditorDragHint")}
      </span>
      <span>
        <i className="ti ti-eye" /> {t("sidebarEditorShowHide")}
      </span>
      <span>
        <i className="ti ti-pinned" /> {t("sidebarEditorPin")}
      </span>
      <span style={{ color: "var(--text-tertiary)", fontSize: 10 }}>
        💡 {t("sidebarEditorPinnedNote")}
      </span>
      <span style={{ color: "var(--accent)", fontSize: 10 }}>
        <i className="ti ti-arrows-sort" /> {t("sidebarEditorDragGroupHint")}
      </span>
      <span style={{ color: "var(--accent)", fontSize: 10 }}>
        🔒 {t("sidebarEditorFixedHint")} ({fixedSectionsCount}/2)
      </span>
    </div>
  );
}
