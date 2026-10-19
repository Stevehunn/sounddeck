/**
 * @file Sidebar editor — main component.
 *
 * Renders the editor UI used in Options → Sidebar to customize the app
 * sidebar. The editor has:
 * - A header with Save / Cancel / Reset buttons
 * - A toolbar with usage hints (drag, pin, hide, fix)
 * - One group per section (pinned, profiles, navigation, actions, footer)
 * - Each group contains draggable items (see `SidebarEditorItem`)
 *
 * The actual state logic lives in `useSidebarEditor` — this file only
 * composes the UI.
 *
 * @see ./useSidebarEditor.js
 * @see ./SidebarEditorHeader.jsx
 * @see ./SidebarEditorGroup.jsx
 * @see ./SidebarEditorItem.jsx
 */

import { useLanguage } from "@core/i18n/LanguageContext";
import useConfirm from "@shared/hooks/useConfirm";
import { useSidebarEditor } from "./useSidebarEditor";
import SidebarEditorHeader from "./SidebarEditorHeader";
import SidebarEditorGroup from "./SidebarEditorGroup";

/**
 * Sidebar editor component.
 *
 * @param {Object} props
 * @param {Object} props.config - Current sidebar configuration (from store).
 * @param {(newConfig: Object) => void} props.onSave - Called with the new
 *   configuration when the user clicks Save.
 * @param {() => void} props.onCancel - Called when the user cancels.
 * @param {() => void} props.onReset - Called when the user resets to defaults.
 * @param {Array} [props.profiles=[]] - All profiles (to build the profiles section).
 * @param {'fr'|'en'|'es'} [props.lang='fr'] - Current language (for useConfirm).
 * @returns {JSX.Element}
 */
export default function SidebarEditor({
  config,
  onSave,
  onCancel,
  onReset,
  profiles = [],
  lang = "fr",
}) {
  const { t } = useLanguage();
  const { ConfirmWrapper } = useConfirm({ lang });

  const editor = useSidebarEditor({ config, profiles, t });

  // Loading state (init in progress)
  if (!editor.isInitialized && config) {
    return (
      <div
        style={{
          marginTop: 12,
          border: "1px solid var(--accent)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          backgroundColor: "var(--bg-primary)",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <span style={{ color: "var(--text-tertiary)" }}>{t("loading")}</span>
      </div>
    );
  }

  /**
   * Triggers the save flow (compute new config + call parent handler).
   * @returns {void}
   */
  const handleSaveClick = () => {
    const newConfig = editor.handleSave();
    onSave(newConfig);
  };

  return (
    <>
      <div
        style={{
          marginTop: 12,
          border: "1px solid var(--accent)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          backgroundColor: "var(--bg-primary)",
        }}
      >
        <SidebarEditorHeader
          onSave={handleSaveClick}
          onCancel={onCancel}
          onReset={onReset}
          fixedSectionsCount={editor.fixedSections.length}
        />

        <div
          style={{ padding: "12px 16px", maxHeight: 400, overflowY: "auto" }}
        >
          {Object.keys(editor.groupedItems).map((groupKey) => {
            const itemsInGroup = editor.groupedItems[groupKey];
            if (itemsInGroup.length === 0) return null;

            return (
              <SidebarEditorGroup
                key={groupKey}
                groupKey={groupKey}
                items={itemsInGroup}
                editor={editor}
              />
            );
          })}
        </div>
      </div>
      <ConfirmWrapper />
    </>
  );
}
