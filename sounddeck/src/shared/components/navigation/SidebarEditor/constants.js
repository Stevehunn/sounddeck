// src/shared/components/navigation/SidebarEditor/constants.js

export const GROUP_ICONS = {
  pinned: 'ti-pinned',
  navigation: 'ti-compass',
  profiles: 'ti-users',
  actions: 'ti-bolt',
  footer: 'ti-arrow-bar-to-down',
}

export function getGroupLabels(t) {
  return {
    pinned: `📌 ${t('pinned')}`,
    navigation: `🧭 ${t('navigation')}`,
    profiles: `👤 ${t('profiles')}`,
    actions: `⚡ ${t('actions')}`,
    footer: `📌 Footer`,
  }
}