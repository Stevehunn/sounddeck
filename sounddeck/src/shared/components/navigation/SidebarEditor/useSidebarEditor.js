/**
 * @file Sidebar editor — state and logic hook.
 *
 * Owns all the state and handlers used by `SidebarEditor` and its children:
 * - Items list (with per-item pinned/visible flags)
 * - Sections order (pinned, profiles, navigation, actions, footer)
 * - Fixed sections (max 2, sticky top)
 * - Drag & drop state
 *
 * The initial state is derived from the persisted `sidebarConfig` prop
 * (once, via a `initializingRef` guard). All actions return the *new*
 * config, ready to be saved to the store.
 *
 * Drag & drop model:
 * - Same-group reorder: source and target are in the same section
 * - Cross-group move: source is moved to the target group at the target index
 * - Guards: action items can only go to "actions"; profile items can only
 *   go to "profiles" or "pinned"
 *
 * @see ./index.jsx (consumer)
 * @see @shared/constants/navigation.js (DEFAULT_* + ACTION_IDS)
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ACTION_IDS,
  DEFAULT_SECTION_ORDER,
  DEFAULT_ICONS,
  DEFAULT_GROUPS,
} from "@shared/constants/navigation";

/**
 * Default item IDs known to the app. Used as a fallback when the persisted
 * config is missing some items (e.g. after an app update).
 */
const DEFAULT_ITEM_IDS = [
  "home",
  "discover",
  "trimmer",
  "editor",
  "sequencer",
  "youtube",
  "stats",
  "loop",
  "shortcuts",
  "presentation",
  "guide",
  "options",
];

/**
 * Hook that manages all sidebar editor state and actions.
 *
 * @param {Object} params
 * @param {Object} params.config - Persisted sidebar config (from store).
 * @param {Array} params.profiles - All profiles (to build the profiles section).
 * @param {(key: string) => string} params.t - i18n function.
 * @returns {{
 *   items: Array,
 *   sectionOrder: string[],
 *   fixedSections: string[],
 *   draggedIndex: number|null,
 *   dragOverIndex: number|null,
 *   draggedGroup: string|null,
 *   dragOverGroup: string|null,
 *   isInitialized: boolean,
 *   groupedItems: Record<string, Array>,
 *   moveSectionUp: (section: string) => void,
 *   moveSectionDown: (section: string) => void,
 *   toggleFixedSection: (section: string) => void,
 *   isSectionFixed: (section: string) => boolean,
 *   toggleVisibility: (id: string) => void,
 *   togglePinned: (id: string) => void,
 *   handleDragStart: (e: DragEvent, index: number, group: string) => void,
 *   handleDragEnd: (e: DragEvent) => void,
 *   handleDragOver: (e: DragEvent, index: number, group: string) => void,
 *   handleDragLeave: () => void,
 *   handleDrop: (e: DragEvent, targetIndex: number, targetGroup: string) => void,
 *   handleSave: () => Object,
 * }}
 */
export function useSidebarEditor({ config, profiles, t }) {
  const [items, setItems] = useState([]);
  const [sectionOrder, setSectionOrder] = useState(DEFAULT_SECTION_ORDER);
  const [fixedSections, setFixedSections] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [draggedGroup, setDraggedGroup] = useState(null);
  const [dragOverGroup, setDragOverGroup] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const initializingRef = useRef(false);

  // ─── INIT ─────────────────────────────────────────────────────────────
  //
  // Derives the editor state from the persisted `config` once, guarded by
  // `initializingRef` so it runs at most once per component lifetime.
  useEffect(() => {
    if (initializingRef.current || !config || isInitialized) return;
    initializingRef.current = true;

    let newSectionOrder = config.sectionOrder || DEFAULT_SECTION_ORDER;
    const allGroups = new Set([
      "pinned",
      "profiles",
      "navigation",
      "actions",
      "footer",
    ]);
    const existingGroups = new Set(newSectionOrder);
    allGroups.forEach((g) => {
      if (!existingGroups.has(g)) newSectionOrder.push(g);
    });

    const pinnedIndex = newSectionOrder.indexOf("pinned");
    if (pinnedIndex > 0) {
      const [pinned] = newSectionOrder.splice(pinnedIndex, 1);
      newSectionOrder.unshift(pinned);
    }
    const footerIndex = newSectionOrder.indexOf("footer");
    if (footerIndex !== -1 && footerIndex < newSectionOrder.length - 1) {
      const [footer] = newSectionOrder.splice(footerIndex, 1);
      newSectionOrder.push(footer);
    }

    setSectionOrder(newSectionOrder);
    setFixedSections(config.fixedSections || []);

    const existingItems = config.items || [];
    const userProfiles = profiles || [];
    const allProfile = { id: "all", name: t("allSounds"), isDefault: true };
    const allProfiles = [allProfile, ...userProfiles];

    const newItems = [];
    const processedIds = new Set();

    existingItems.forEach((item) => {
      if (!item.id) return;

      const isProfile = item.id.startsWith("profile-");
      const profileId = isProfile ? item.id.replace("profile-", "") : null;

      if (isProfile && !allProfiles.some((p) => p.id === profileId)) return;

      processedIds.add(item.id);

      if (isProfile) {
        const profile = allProfiles.find((p) => p.id === profileId);
        if (profile) {
          item.label = profile.name;
          item.icon = profile.id === "all" ? "ti-stack" : "ti-user";
          item.isDefaultProfile = profile.id === "all";
        }
      }

      if (!item.group) item.group = DEFAULT_GROUPS[item.id] || "other";
      if (!item.icon) item.icon = DEFAULT_ICONS[item.id] || "ti-circle";
      if (!item.label) item.label = item.id;

      item.pinned = !!item.pinned;
      item.visible = item.visible !== false;

      if (item.canHide === undefined) {
        item.canHide = isProfile ? false : !ACTION_IDS.includes(item.id);
      }
      if (item.order === undefined) item.order = newItems.length;

      newItems.push(item);
    });

    allProfiles.forEach((profile) => {
      const profileId = `profile-${profile.id}`;
      if (processedIds.has(profileId)) return;

      newItems.push({
        id: profileId,
        group: "profiles",
        label: profile.name,
        icon: profile.id === "all" ? "ti-stack" : "ti-user",
        visible: true,
        pinned: false,
        order: newItems.length,
        canHide: false,
        isProfile: true,
        isDefaultProfile: profile.id === "all",
      });
    });

    DEFAULT_ITEM_IDS.forEach((id) => {
      if (processedIds.has(id)) return;

      newItems.push({
        id,
        group: DEFAULT_GROUPS[id] || "navigation",
        label: id,
        icon: DEFAULT_ICONS[id] || "ti-circle",
        visible: true,
        pinned: false,
        order: newItems.length,
        canHide: !ACTION_IDS.includes(id),
        isProfile: false,
        isDefaultProfile: false,
        isAction: ACTION_IDS.includes(id),
      });
    });

    newItems.sort((a, b) => (a.order || 0) - (b.order || 0));

    setItems(newItems);
    setIsInitialized(true);
    initializingRef.current = false;
  }, [config, profiles, t, isInitialized]);

  // ─── SECTIONS ────────────────────────────────────────────────────────

  /**
   * Moves a section up in the order (except pinned and footer, which are
   * locked at the top/bottom).
   *
   * @param {string} section
   * @returns {void}
   */
  const moveSectionUp = useCallback(
    (section) => {
      if (section === "footer" || section === "pinned") return;

      const reorderable = sectionOrder.filter(
        (s) => s !== "footer" && s !== "pinned",
      );
      const currentIndex = reorderable.indexOf(section);
      if (currentIndex <= 0) return;

      const newOrder = [...sectionOrder];
      const sectionIndex = newOrder.indexOf(section);

      const prevSectionKey = reorderable[currentIndex - 1];
      const prevIndex = newOrder.indexOf(prevSectionKey);
      if (prevIndex === -1) return;

      const [removed] = newOrder.splice(sectionIndex, 1);
      newOrder.splice(prevIndex, 0, removed);

      setSectionOrder(newOrder);
    },
    [sectionOrder],
  );

  /**
   * Moves a section down in the order (except pinned and footer).
   *
   * @param {string} section
   * @returns {void}
   */
  const moveSectionDown = useCallback(
    (section) => {
      if (section === "footer" || section === "pinned") return;

      const reorderable = sectionOrder.filter(
        (s) => s !== "footer" && s !== "pinned",
      );
      const currentIndex = reorderable.indexOf(section);
      if (currentIndex >= reorderable.length - 1) return;

      const newOrder = [...sectionOrder];
      const sectionIndex = newOrder.indexOf(section);

      const nextSectionKey = reorderable[currentIndex + 1];
      const nextIndex = newOrder.indexOf(nextSectionKey);
      if (nextIndex === -1) return;

      const [removed] = newOrder.splice(sectionIndex, 1);
      // After removing, nextIndex may have shifted by 1 if section was before next
      const insertAt = sectionIndex < nextIndex ? nextIndex : nextIndex + 1;
      newOrder.splice(insertAt, 0, removed);

      setSectionOrder(newOrder);
    },
    [sectionOrder],
  );

  /**
   * Toggles a section as "fixed" (max 2). Fixed sections stay at the top of
   * the sidebar and don't scroll with the rest.
   *
   * @param {string} sectionKey
   * @returns {void}
   */
  const toggleFixedSection = useCallback((sectionKey) => {
    setFixedSections((prev) => {
      if (prev.includes(sectionKey))
        return prev.filter((s) => s !== sectionKey);
      if (prev.length >= 2) return prev;
      return [...prev, sectionKey];
    });
  }, []);

  /**
   * Returns whether a section is currently fixed.
   *
   * @param {string} sectionKey
   * @returns {boolean}
   */
  const isSectionFixed = useCallback(
    (sectionKey) => fixedSections.includes(sectionKey),
    [fixedSections],
  );

  // ─── ITEMS ───────────────────────────────────────────────────────────

  /**
   * Toggles an item's visibility (hidden items don't appear in the sidebar).
   * No-op if the item can't be hidden.
   *
   * @param {string} id
   * @returns {void}
   */
  const toggleVisibility = useCallback((id) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id && item.canHide
          ? { ...item, visible: !item.visible }
          : item,
      ),
    );
  }, []);

  /**
   * Toggles an item's pinned state. Pinned items move to the "pinned"
   * section; unpinning moves them back to their original group.
   *
   * @param {string} id
   * @returns {void}
   */
  const togglePinned = useCallback((id) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newPinned = !item.pinned;
        const newGroup = newPinned
          ? "pinned"
          : item.originalGroup && item.originalGroup !== "pinned"
            ? item.originalGroup
            : item.group;
        return {
          ...item,
          pinned: newPinned,
          group: newGroup,
          originalGroup: item.originalGroup || item.group,
        };
      }),
    );
  }, []);

  // ─── DRAG & DROP ─────────────────────────────────────────────────────

  /**
   * Resets all drag state.
   * @returns {void}
   */
  const resetDragState = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDraggedGroup(null);
    setDragOverGroup(null);
  }, []);

  /**
   * Starts dragging an item.
   *
   * @param {DragEvent} e
   * @param {number} index
   * @param {string} group
   * @returns {void}
   */
  const handleDragStart = useCallback((e, index, group) => {
    setDraggedIndex(index);
    setDraggedGroup(group);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({ index, group }));
    setTimeout(() => {
      if (e.target) e.target.style.opacity = "0.4";
    }, 0);
  }, []);

  /**
   * Ends the drag and resets all drag state.
   *
   * @param {DragEvent} e
   * @returns {void}
   */
  const handleDragEnd = useCallback(
    (e) => {
      if (e.target) e.target.style.opacity = "1";
      resetDragState();
    },
    [resetDragState],
  );

  /**
   * Handles the drag-over event on a target item.
   *
   * @param {DragEvent} e
   * @param {number} index
   * @param {string} group
   * @returns {void}
   */
  const handleDragOver = useCallback(
    (e, index, group) => {
      e.preventDefault();
      if (group === "actions") {
        try {
          const data = JSON.parse(e.dataTransfer.getData("text/plain"));
          const sourceItem = items[data.index];
          if (sourceItem && !sourceItem.isAction) {
            e.dataTransfer.dropEffect = "none";
            return;
          }
        } catch {
          e.dataTransfer.dropEffect = "none";
          return;
        }
      }
      setDragOverIndex(index);
      setDragOverGroup(group);
    },
    [items],
  );

  /**
   * Clears the drag-over state (used on dragleave).
   * @returns {void}
   */
  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
    setDragOverGroup(null);
  }, []);

  /**
   * Handles a drop on a target index/group.
   *
   * Supports two cases:
   * 1. Same-group reorder (move item within its own group)
   * 2. Cross-group move (move item to a different group at a specific index)
   *
   * Guards:
   * - Action items can only go to "actions"
   * - Profile items can only go to "profiles" or "pinned"
   * - Non-action items can't go to "actions"
   *
   * @param {DragEvent} e
   * @param {number} targetIndex
   * @param {string} targetGroup
   * @returns {void}
   */
  const handleDrop = useCallback(
    (e, targetIndex, targetGroup) => {
      e.preventDefault();

      let sourceData;
      try {
        sourceData = JSON.parse(e.dataTransfer.getData("text/plain"));
      } catch {
        resetDragState();
        return;
      }
      if (!sourceData) {
        resetDragState();
        return;
      }

      const { index: sourceIndex, group: sourceGroup } = sourceData;

      if (sourceGroup === targetGroup && sourceIndex === targetIndex) {
        resetDragState();
        return;
      }

      const sourceItems = items.filter((item) => item.group === sourceGroup);
      if (sourceIndex >= sourceItems.length) {
        resetDragState();
        return;
      }

      const sourceItem = sourceItems[sourceIndex];

      if (targetGroup === "actions" && !sourceItem.isAction) {
        resetDragState();
        return;
      }
      if (
        sourceItem.isAction &&
        targetGroup !== "actions" &&
        targetGroup !== "pinned"
      ) {
        resetDragState();
        return;
      }
      if (
        sourceItem.isProfile &&
        targetGroup !== "profiles" &&
        targetGroup !== "pinned"
      ) {
        resetDragState();
        return;
      }

      // Case 1: same-group reorder
      if (sourceGroup === targetGroup) {
        const groupItems = items.filter((item) => item.group === sourceGroup);
        const reordered = [...groupItems];
        const [removed] = reordered.splice(sourceIndex, 1);
        reordered.splice(targetIndex, 0, removed);

        const groupIds = new Set(groupItems.map((i) => i.id));
        const newItems = items.filter((i) => !groupIds.has(i.id));

        const insertIndex = items.findIndex((i) => i.id === groupItems[0]?.id);
        if (insertIndex === -1) {
          resetDragState();
          return;
        }

        setItems([
          ...newItems.slice(0, insertIndex),
          ...reordered,
          ...newItems.slice(insertIndex),
        ]);
        resetDragState();
        return;
      }

      // Case 2: cross-group move
      const movedItem = { ...sourceItems[sourceIndex] };
      const sourceId = movedItem.id;
      const newItems = items.filter((i) => i.id !== sourceId);

      movedItem.group = targetGroup;
      movedItem.pinned = targetGroup === "pinned";
      movedItem.originalGroup = movedItem.originalGroup || sourceGroup;

      const targetGroupItems = newItems.filter((i) => i.group === targetGroup);
      const targetInsertIndex = Math.min(targetIndex, targetGroupItems.length);

      let insertPos = newItems.length;
      if (targetGroupItems.length > 0) {
        const firstTargetId = targetGroupItems[0]?.id;
        const lastTargetId = targetGroupItems[targetGroupItems.length - 1]?.id;

        if (targetInsertIndex === 0) {
          insertPos = newItems.findIndex((i) => i.id === firstTargetId);
        } else if (targetInsertIndex >= targetGroupItems.length) {
          insertPos = newItems.findIndex((i) => i.id === lastTargetId) + 1;
        } else {
          const beforeId = targetGroupItems[targetInsertIndex - 1]?.id;
          const afterId = targetGroupItems[targetInsertIndex]?.id;
          const beforeIndex = newItems.findIndex((i) => i.id === beforeId);
          const afterIndex = newItems.findIndex((i) => i.id === afterId);
          insertPos = afterIndex !== -1 ? afterIndex : beforeIndex + 1;
        }
      }

      if (insertPos < 0) insertPos = 0;

      newItems.splice(insertPos, 0, movedItem);
      setItems(newItems);
      resetDragState();
    },
    [items, resetDragState],
  );

  // ─── SAVE ────────────────────────────────────────────────────────────

  /**
   * Computes the new sidebar config from the current editor state.
   *
   * - Re-numbers items (`order` = index in the flat list)
   * - Removes `originalGroup` helper property
   * - Ensures pinned is first and footer is last
   * - Filters out fixed sections that no longer exist
   *
   * @returns {Object} New config object ready to be saved.
   */
  const handleSave = useCallback(() => {
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index,
      originalGroup: undefined,
    }));

    const allGroups = new Set(
      items.map((item) => (item.pinned ? "pinned" : item.group)),
    );
    const finalSectionOrder = sectionOrder.filter((s) => allGroups.has(s));

    allGroups.forEach((group) => {
      if (!finalSectionOrder.includes(group)) finalSectionOrder.push(group);
    });

    const pinnedIdx = finalSectionOrder.indexOf("pinned");
    if (pinnedIdx > 0) {
      const [pinned] = finalSectionOrder.splice(pinnedIdx, 1);
      finalSectionOrder.unshift(pinned);
    }
    const footerIdx = finalSectionOrder.indexOf("footer");
    if (footerIdx !== -1 && footerIdx < finalSectionOrder.length - 1) {
      const [footer] = finalSectionOrder.splice(footerIdx, 1);
      finalSectionOrder.push(footer);
    }

    const validFixedSections = fixedSections.filter((s) =>
      finalSectionOrder.includes(s),
    );

    return {
      ...config,
      items: updatedItems,
      sectionOrder: finalSectionOrder,
      fixedSections: validFixedSections,
      mode: "custom",
    };
  }, [items, sectionOrder, fixedSections, config]);

  // ─── GROUPED ITEMS ──────────────────────────────────────────────────

  /**
   * Items grouped by section, in section order.
   * Recomputed when `items` or `sectionOrder` change.
   *
   * @type {Record<string, Array>}
   */
  const groupedItems = useMemo(() => {
    const groups = {};
    const allItems = [...items];

    let orderedSections = [...sectionOrder];

    const footerIndex = orderedSections.indexOf("footer");
    if (footerIndex !== -1 && footerIndex < orderedSections.length - 1) {
      const footer = orderedSections.splice(footerIndex, 1)[0];
      orderedSections.push(footer);
    }
    const pinnedIndex = orderedSections.indexOf("pinned");
    if (pinnedIndex > 0) {
      const pinned = orderedSections.splice(pinnedIndex, 1)[0];
      orderedSections.unshift(pinned);
    }

    orderedSections = orderedSections.filter((s) =>
      allItems.some(
        (item) =>
          (item.pinned && s === "pinned") || (!item.pinned && item.group === s),
      ),
    );

    const pinnedItems = allItems.filter((item) => item.pinned);
    if (pinnedItems.length > 0 && !orderedSections.includes("pinned")) {
      orderedSections.unshift("pinned");
    }

    orderedSections.forEach((section) => {
      if (section === "pinned") {
        groups[section] = pinnedItems;
      } else {
        groups[section] = allItems.filter(
          (item) => !item.pinned && item.group === section,
        );
      }
    });

    const remainingSections = new Set(
      allItems.map((item) => (item.pinned ? "pinned" : item.group)),
    );
    remainingSections.forEach((section) => {
      if (!groups[section]) {
        if (section === "pinned") {
          groups[section] = pinnedItems;
        } else {
          groups[section] = allItems.filter(
            (item) => !item.pinned && item.group === section,
          );
        }
      }
    });

    return groups;
  }, [items, sectionOrder]);

  return {
    // State
    items,
    sectionOrder,
    fixedSections,
    draggedIndex,
    dragOverIndex,
    draggedGroup,
    dragOverGroup,
    isInitialized,
    groupedItems,

    // Sections
    moveSectionUp,
    moveSectionDown,
    toggleFixedSection,
    isSectionFixed,

    // Items
    toggleVisibility,
    togglePinned,

    // Drag & drop
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,

    // Save
    handleSave,
  };
}
