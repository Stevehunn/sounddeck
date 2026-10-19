/**
 * @file React hook exposing the emoji service with reactive state.
 *
 * Wraps the singleton `emojiService` (in `@core/services/EmojiService.js`)
 * and re-renders the component whenever the service emits an update (e.g.
 * after `addEmoji`, `removeCategory`, etc.).
 *
 * The hook exposes both reactive data (`customEmojis`, `customGrouped`,
 * `allEmojis`) and stable actions (`addEmoji`, `removeCategory`, …). Actions
 * are wrapped in `useCallback` so consumers can safely put them in
 * dependency arrays.
 *
 * The `version` counter is the reactive primitive: whenever the service
 * notifies a change, `version` is bumped, which invalidates the `useMemo`
 * blocks and causes the derived data to be recomputed.
 *
 * @see @core/services/EmojiService.js
 * @see @shared/constants/emojis.js
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { emojiService } from "@core/services/EmojiService";
import {
  DEFAULT_EMOJIS,
  EMOJI_CATEGORIES,
  getDefaultEmojiCategory,
} from "@shared/constants/emojis";

/**
 * Subscribes to the emoji service and returns a reactive view of its state.
 *
 * @returns {{
 *   defaultEmojis: string[],
 *   customEmojis: string[],
 *   customGrouped: Record<string, string[]>,
 *   allEmojis: string[],
 *   categories: Array<{id: string, label: string, icon: string, emojis: string[]}>,
 *   addEmoji: (emoji: string, categoryId?: string|null) => Promise<{success: boolean, error?: string}>,
 *   addCategory: (categoryId: string, emojis: string[]) => Promise<{success: boolean, error?: string}>,
 *   removeEmoji: (emoji: string) => Promise<{success: boolean}>,
 *   removeCategory: (categoryId: string) => Promise<{success: boolean}>,
 *   hasEmoji: (emoji: string) => boolean,
 *   isCustom: (emoji: string) => boolean,
 *   hasCategory: (categoryId: string, emojis: string[]) => boolean,
 *   getMetadata: (emoji: string) => object|null,
 *   getCategoryInfo: (categoryId: string) => object|null,
 *   getDefaultEmojiCategory: (emoji: string) => string,
 *   loading: boolean,
 * }}
 */
export function useEmojis() {
  const [version, setVersion] = useState(0);

  // Lazy initial state: `true` only if the service isn't already loaded.
  // This avoids the "setState in effect" pattern for the common case.
  const [loading, setLoading] = useState(() => !emojiService.loaded);

  // ─── Load the service (if needed) + subscribe to updates ────────────
  useEffect(() => {
    let mounted = true;

    if (!emojiService.loaded) {
      emojiService
        .load()
        .then(() => {
          if (mounted) {
            setLoading(false);
            setVersion((v) => v + 1);
          }
        })
        .catch((err) => {
          // Service failed to load — don't block the UI forever
          console.error("[useEmojis] Failed to load emoji service:", err);
          if (mounted) setLoading(false);
        });
    }

    const unsubscribe = emojiService.subscribe(() => {
      if (mounted) setVersion((v) => v + 1);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // ─── Derived data (recomputed on every `version` bump) ───────────────
  const customEmojis = useMemo(
    () => emojiService.getCustomEmojis(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const customGrouped = useMemo(
    () => emojiService.getCustomGrouped(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const allEmojis = useMemo(
    () => emojiService.getAllEmojis(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  // ─── Stable actions (never recreated) ────────────────────────────────

  /**
   * Adds a custom emoji (optionally to a given category).
   * @type {(emoji: string, categoryId?: string|null) => Promise<{success: boolean, error?: string}>}
   */
  const addEmoji = useCallback((emoji, categoryId = null) => {
    return emojiService.addEmoji(emoji, categoryId);
  }, []);

  /**
   * Creates a custom category with the given emojis.
   * @type {(categoryId: string, emojis: string[]) => Promise<{success: boolean, error?: string}>}
   */
  const addCategory = useCallback((categoryId, emojis) => {
    return emojiService.addCategory(categoryId, emojis);
  }, []);

  /**
   * Removes a custom emoji.
   * @type {(emoji: string) => Promise<{success: boolean}>}
   */
  const removeEmoji = useCallback((emoji) => {
    return emojiService.removeEmoji(emoji);
  }, []);

  /**
   * Removes a custom category and all its emojis.
   * @type {(categoryId: string) => Promise<{success: boolean}>}
   */
  const removeCategory = useCallback((categoryId) => {
    return emojiService.removeCategory(categoryId);
  }, []);

  /**
   * Returns `true` if the emoji exists in the service (default OR custom).
   * @type {(emoji: string) => boolean}
   */
  const hasEmoji = useCallback((emoji) => {
    return emojiService.hasEmoji(emoji);
  }, []);

  /**
   * Returns `true` if the emoji was added by the user (not a default one).
   * @type {(emoji: string) => boolean}
   */
  const isCustom = useCallback((emoji) => {
    return emojiService.isCustom(emoji);
  }, []);

  /**
   * Returns `true` if a category with the same ID and emojis already exists.
   * @type {(categoryId: string, emojis: string[]) => boolean}
   */
  const hasCategory = useCallback((categoryId, emojis) => {
    return emojiService.hasCategory(categoryId, emojis);
  }, []);

  /**
   * Returns metadata for a custom emoji (date added, category, etc.), or null.
   * @type {(emoji: string) => object|null}
   */
  const getMetadata = useCallback((emoji) => {
    return emojiService.getMetadata(emoji);
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────

  /**
   * Returns display info for a category ID (label, icon, emojis).
   *
   * Looks in default categories first, then custom categories. Returns
   * `null` if the category doesn't exist.
   *
   * @param {string} categoryId
   * @returns {{id: string, label: string, icon: string, emojis?: string[], isCustom: boolean}|null}
   */
  const getCategoryInfo = useCallback(
    (categoryId) => {
      const defCat = EMOJI_CATEGORIES.find((c) => c.id === categoryId);
      if (defCat) return { ...defCat, isCustom: false };

      const emojisInCat = customGrouped[categoryId];
      if (emojisInCat && emojisInCat.length > 0) {
        return {
          id: categoryId,
          label: categoryId,
          icon: "ti-folder",
          emojis: emojisInCat,
          isCustom: true,
        };
      }

      return null;
    },
    [customGrouped],
  );

  return {
    // Data
    defaultEmojis: DEFAULT_EMOJIS,
    customEmojis,
    customGrouped,
    allEmojis,
    categories: EMOJI_CATEGORIES,

    // Actions
    addEmoji,
    addCategory,
    removeEmoji,
    removeCategory,

    // Queries
    hasEmoji,
    isCustom,
    hasCategory,
    getMetadata,
    getCategoryInfo,
    getDefaultEmojiCategory,

    // State
    loading,
  };
}

export default useEmojis;
