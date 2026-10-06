// src/test/components/SidebarEditorConstants.test.js
import { describe, it, expect } from 'vitest'
import {
  GROUP_ICONS,
  getGroupLabels,
} from '@shared/components/navigation/SidebarEditor/constants'

describe('SidebarEditor/constants', () => {
  describe('GROUP_ICONS', () => {
    it('expose les 5 icônes de groupes', () => {
      expect(GROUP_ICONS.pinned).toBe('ti-pinned')
      expect(GROUP_ICONS.navigation).toBe('ti-compass')
      expect(GROUP_ICONS.profiles).toBe('ti-users')
      expect(GROUP_ICONS.actions).toBe('ti-bolt')
      expect(GROUP_ICONS.footer).toBe('ti-arrow-bar-to-down')
    })

    it('a exactement 5 entrées', () => {
      expect(Object.keys(GROUP_ICONS)).toHaveLength(5)
    })
  })

  describe('getGroupLabels', () => {
    const t = (k) => `[${k}]`

    it('retourne un objet avec les 5 groupes', () => {
      const labels = getGroupLabels(t)
      expect(Object.keys(labels)).toHaveLength(5)
    })

    it('préfixe pinned avec 📌', () => {
      const labels = getGroupLabels(t)
      expect(labels.pinned).toBe('📌 [pinned]')
    })

    it('préfixe navigation avec 🧭', () => {
      const labels = getGroupLabels(t)
      expect(labels.navigation).toBe('🧭 [navigation]')
    })

    it('préfixe profiles avec 👤', () => {
      const labels = getGroupLabels(t)
      expect(labels.profiles).toBe('👤 [profiles]')
    })

    it('préfixe actions avec ⚡', () => {
      const labels = getGroupLabels(t)
      expect(labels.actions).toBe('⚡ [actions]')
    })

    it('footer est statique', () => {
      const labels = getGroupLabels(t)
      expect(labels.footer).toBe('📌 Footer')
    })
  })
})