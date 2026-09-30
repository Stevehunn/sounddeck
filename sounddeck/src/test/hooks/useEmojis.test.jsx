import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useEmojis } from "@shared/hooks/useEmojis";

// ✅ vi.hoisted : hoisting-safe
const { mockListeners, mockEmojiService } = vi.hoisted(() => {
  const listeners = new Set();
  return {
    mockListeners: listeners,
    mockEmojiService: {
      loaded: false,
      customEmojis: [],
      load: vi.fn(),
      subscribe: vi.fn((listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }),
      getCustomEmojis: vi.fn(() => []),
      getCustomGrouped: vi.fn(() => ({})),
      getAllEmojis: vi.fn(() => ["😀", "😂"]),
      addEmoji: vi.fn(),
      addCategory: vi.fn(),
      removeEmoji: vi.fn(),
      removeCategory: vi.fn(),
      hasEmoji: vi.fn(() => false),
      isCustom: vi.fn(() => false),
      hasCategory: vi.fn(() => false),
      getMetadata: vi.fn(() => null),
    },
  };
});

vi.mock("@core/services/EmojiService", () => ({
  emojiService: mockEmojiService,
}));

describe("useEmojis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListeners.clear();
    mockEmojiService.loaded = false;
    mockEmojiService.load.mockImplementation(async () => {
      mockEmojiService.loaded = true;
    });
    mockEmojiService.addEmoji.mockResolvedValue({ success: true });
    mockEmojiService.addCategory.mockResolvedValue({ success: true, added: 3 });
    mockEmojiService.removeEmoji.mockResolvedValue({ success: true });
    mockEmojiService.removeCategory.mockResolvedValue({
      success: true,
      removed: 3,
    });
    mockEmojiService.getCustomEmojis.mockReturnValue([]);
    mockEmojiService.getCustomGrouped.mockReturnValue({});
    mockEmojiService.getAllEmojis.mockReturnValue(["😀", "😂"]);
    mockEmojiService.hasEmoji.mockReturnValue(false);
    mockEmojiService.isCustom.mockReturnValue(false);
    mockEmojiService.hasCategory.mockReturnValue(false);
    mockEmojiService.getMetadata.mockReturnValue(null);
  });

  // ─── CHARGEMENT ──────────────────────────────────────────────────────

  it("devrait charger le service si pas déjà chargé", async () => {
    renderHook(() => useEmojis());

    await waitFor(() => {
      expect(mockEmojiService.load).toHaveBeenCalled();
    });
  });

  it("ne devrait PAS recharger si déjà loaded", () => {
    mockEmojiService.loaded = true;
    renderHook(() => useEmojis());

    expect(mockEmojiService.load).not.toHaveBeenCalled();
  });

  it("devrait exposer loading=true au démarrage si non chargé", () => {
    const { result } = renderHook(() => useEmojis());
    expect(result.current.loading).toBe(true);
  });

  // ─── DONNÉES ─────────────────────────────────────────────────────────

  it("devrait exposer defaultEmojis depuis les constantes", () => {
    const { result } = renderHook(() => useEmojis());
    expect(Array.isArray(result.current.defaultEmojis)).toBe(true);
    expect(result.current.defaultEmojis.length).toBeGreaterThan(0);
  });

  it("devrait exposer categories", () => {
    const { result } = renderHook(() => useEmojis());
    expect(Array.isArray(result.current.categories)).toBe(true);
  });

  it("devrait exposer customEmojis depuis le service", () => {
    mockEmojiService.getCustomEmojis.mockReturnValue(["🦊", "🦄"]);
    const { result } = renderHook(() => useEmojis());

    expect(result.current.customEmojis).toEqual(["🦊", "🦄"]);
  });

  // ─── ACTIONS ─────────────────────────────────────────────────────────

  it("devrait déléguer addEmoji au service", async () => {
    const { result } = renderHook(() => useEmojis());

    await act(async () => {
      await result.current.addEmoji("🦄", "animals");
    });

    expect(mockEmojiService.addEmoji).toHaveBeenCalledWith("🦄", "animals");
  });

  it("devrait déléguer addEmoji sans categoryId par défaut", async () => {
    const { result } = renderHook(() => useEmojis());

    await act(async () => {
      await result.current.addEmoji("🦄");
    });

    expect(mockEmojiService.addEmoji).toHaveBeenCalledWith("🦄", null);
  });

  it("devrait déléguer addCategory", async () => {
    const { result } = renderHook(() => useEmojis());

    await act(async () => {
      await result.current.addCategory("smileys", ["😀", "😂"]);
    });

    expect(mockEmojiService.addCategory).toHaveBeenCalledWith("smileys", [
      "😀",
      "😂",
    ]);
  });

  it("devrait déléguer removeEmoji", async () => {
    const { result } = renderHook(() => useEmojis());

    await act(async () => {
      await result.current.removeEmoji("🦄");
    });

    expect(mockEmojiService.removeEmoji).toHaveBeenCalledWith("🦄");
  });

  it("devrait déléguer removeCategory", async () => {
    const { result } = renderHook(() => useEmojis());

    await act(async () => {
      await result.current.removeCategory("animals");
    });

    expect(mockEmojiService.removeCategory).toHaveBeenCalledWith("animals");
  });

  it("devrait déléguer hasEmoji", () => {
    mockEmojiService.hasEmoji.mockReturnValue(true);
    const { result } = renderHook(() => useEmojis());

    expect(result.current.hasEmoji("🦊")).toBe(true);
    expect(mockEmojiService.hasEmoji).toHaveBeenCalledWith("🦊");
  });

  it("devrait déléguer isCustom", () => {
    mockEmojiService.isCustom.mockReturnValue(true);
    const { result } = renderHook(() => useEmojis());

    expect(result.current.isCustom("🦊")).toBe(true);
  });

  it("devrait déléguer hasCategory", () => {
    mockEmojiService.hasCategory.mockReturnValue(true);
    const { result } = renderHook(() => useEmojis());

    expect(result.current.hasCategory("smileys", ["😀"])).toBe(true);
  });

  it("devrait déléguer getMetadata", () => {
    mockEmojiService.getMetadata.mockReturnValue({
      category: "animals",
      addedAt: 123,
    });
    const { result } = renderHook(() => useEmojis());

    expect(result.current.getMetadata("🦊")).toEqual({
      category: "animals",
      addedAt: 123,
    });
  });

  // ─── getCategoryInfo ─────────────────────────────────────────────────

  it("getCategoryInfo devrait retourner la catégorie par défaut si elle existe", () => {
    const { result } = renderHook(() => useEmojis());

    // "audio" est une catégorie par défaut
    const info = result.current.getCategoryInfo("audio");
    expect(info).toBeDefined();
    expect(info?.id).toBe("audio");
    expect(info?.isCustom).toBe(false);
  });

  it("getCategoryInfo devrait retourner null pour une catégorie inexistante", () => {
    const { result } = renderHook(() => useEmojis());

    const info = result.current.getCategoryInfo("nonexistent-cat");
    expect(info).toBeNull();
  });

  it("getCategoryInfo devrait détecter les customs groupées", () => {
    mockEmojiService.getCustomGrouped.mockReturnValue({
      myCat: ["🦄", "🦊"],
    });
    const { result } = renderHook(() => useEmojis());

    const info = result.current.getCategoryInfo("myCat");
    expect(info?.isCustom).toBe(true);
    expect(info?.emojis).toEqual(["🦄", "🦊"]);
  });

  // ─── SUBSCRIPTION / VERSION ──────────────────────────────────────────

  it("devrait re-render quand le service notifie", async () => {
    mockEmojiService.loaded = true;
    mockEmojiService.getCustomEmojis.mockReturnValue([]);
    const { result, rerender } = renderHook(() => useEmojis());

    expect(result.current.customEmojis).toEqual([]);

    // Simule une notification du service
    mockEmojiService.getCustomEmojis.mockReturnValue(["🦄"]);

    await act(async () => {
      mockListeners.forEach((cb) => cb());
    });

    expect(result.current.customEmojis).toEqual(["🦄"]);
  });

  it("devrait se désabonner au unmount", () => {
    mockEmojiService.loaded = true;
    const { unmount } = renderHook(() => useEmojis());

    const sizeBefore = mockListeners.size;
    unmount();
    expect(mockListeners.size).toBe(sizeBefore - 1);
  });
});
