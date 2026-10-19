/**
 * @file Shared constants for the sidebar editor UI.
 *
 * Defines the icon and label shown for each section group (pinned,
 * navigation, profiles, actions, footer) in the editor header.
 *
 * @see ./SidebarEditorGroup.jsx
 */

/**
 * Icon class (Tabler) for each section group.
 * @type {Record<string, string>}
 */
export const GROUP_ICONS = {
  pinned: "ti-pinned",
  navigation: "ti-compass",
  profiles: "ti-users",
  actions: "ti-bolt",
  footer: "ti-arrow-bar-to-down",
};

/**
 * Returns the display label for each section group, translated.
 *
 * @param {(key: string) => string} t - i18n function.
 * @returns {Record<string, string>}
 */
export function getGroupLabels(t) {
  return {
    pinned: `📌 ${t("pinned")}`,
    navigation: `🧭 ${t("navigation")}`,
    profiles: `👤 ${t("profiles")}`,
    actions: `⚡ ${t("actions")}`,
    footer: `📌 Footer`,
  };
}
