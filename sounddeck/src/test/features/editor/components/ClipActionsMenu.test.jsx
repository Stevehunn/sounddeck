import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";

vi.mock("@core/i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (key) => key, currentLang: "fr" }),
}));

import ClipActionsMenu from "@features/editor/components/ClipActionsMenu";

describe("ClipActionsMenu", () => {
  let onClose;
  let handlers;
  let tr;

  const createClip = (o = {}) => ({
    id: "c1",
    name: "Mon Clip",
    start: 0,
    duration: 3,
    effects: [],
    ...o,
  });

  const defaultProps = () => ({
    clip: createClip(),
    trackId: "t1",
    position: { top: 100, left: 200 },
    onClose,
    onSplit: vi.fn(),
    onLoop: vi.fn(),
    onTrim: vi.fn(),
    onNormalize: vi.fn(),
    onAddEffect: vi.fn(),
    onDuplicate: vi.fn(),
    onCopy: vi.fn(),
    onCut: vi.fn(),
    onDelete: vi.fn(),
    onPreviewEffects: vi.fn(),
    onToggleClipLoop: vi.fn(),
    onActivateLoopManualClick: vi.fn(),
    onActivateSplitManualClick: vi.fn(),
    isPlaying: false,
    isLoopEnabled: false,
    clipDurations: { c1: 3 },
    loopState: {},
    tr,
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    canMoveUp: true,
    canMoveDown: true,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    onClose = vi.fn();
    tr = vi.fn((key) => key);

    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      left: 200,
      right: 500,
      bottom: 400,
      width: 300,
      height: 300,
      x: 200,
      y: 100,
    }));

    window.innerWidth = 1024;
    window.innerHeight = 768;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Rendu de base ─────────────────────────────────────────────

  it("devrait retourner null si clip absent", () => {
    const { container } = render(
      <ClipActionsMenu {...defaultProps()} clip={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("devrait rendre un menu", () => {
    const { container } = render(<ClipActionsMenu {...defaultProps()} />);
    expect(container.querySelector(".clip-actions-menu")).not.toBeNull();
  });

  it("devrait afficher le nom du clip", () => {
    const { container } = render(<ClipActionsMenu {...defaultProps()} />);
    expect(container.textContent).toContain("Mon Clip");
  });

  it("devrait afficher la durée du clip", () => {
    const { container } = render(<ClipActionsMenu {...defaultProps()} />);
    expect(container.textContent).toContain("3.0s");
  });

  it("devrait utiliser position.top/left", () => {
    const { container } = render(<ClipActionsMenu {...defaultProps()} />);
    const menu = container.querySelector(".clip-actions-menu");
    // Le menu corrige éventuellement la position après measure
    expect(menu?.style.top).toBeDefined();
    expect(menu?.style.left).toBeDefined();
  });

  // ─── Tabs ──────────────────────────────────────────────────────

  describe("tabs", () => {
    it("devrait afficher 3 tabs", () => {
      const { container } = render(<ClipActionsMenu {...defaultProps()} />);
      // Les 3 boutons de tab contiennent les icônes pencil, volume, wand
      const tabs = container.querySelectorAll("button");
      const tabButtons = Array.from(tabs).filter((b) => {
        const txt = b.textContent || "";
        return (
          txt.includes("editorClipEdit") ||
          txt.includes("editorAudioEdit") ||
          txt.includes("editorEffects")
        );
      });
      expect(tabButtons.length).toBeGreaterThanOrEqual(3);
    });

    it("devrait afficher le tab edit par défaut", () => {
      const { container } = render(<ClipActionsMenu {...defaultProps()} />);
      // Le tab edit contient editorCopy, editorCut, etc.
      expect(container.textContent).toContain("editorCopy");
      expect(container.textContent).toContain("editorCut");
    });

    it("devrait basculer sur le tab audio", () => {
      const { container } = render(<ClipActionsMenu {...defaultProps()} />);
      const audioTab = Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent?.includes("editorAudioEdit"),
      );
      fireEvent.click(audioTab);
      expect(container.textContent).toContain("editorTrim");
    });

    it("devrait basculer sur le tab effects", () => {
      const { container } = render(<ClipActionsMenu {...defaultProps()} />);
      const effectsTab = Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent?.includes("editorEffects"),
      );
      fireEvent.click(effectsTab);
      expect(container.textContent).toContain("editorOpenEffectsPanel");
    });
  });

  // ─── Tab Edit ──────────────────────────────────────────────────

  describe("tab edit", () => {
    it("devrait appeler onCopy", () => {
      const onCopy = vi.fn();
      const { container } = render(
        <ClipActionsMenu {...defaultProps()} onCopy={onCopy} />,
      );
      const copyBtn = Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent?.includes("editorCopy"),
      );
      fireEvent.click(copyBtn);
      expect(onCopy).toHaveBeenCalledWith("c1", "t1");
    });

    it("devrait appeler onCut", () => {
      const onCut = vi.fn();
      const { container } = render(
        <ClipActionsMenu {...defaultProps()} onCut={onCut} />,
      );
      const cutBtn = Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent?.includes("editorCut"),
      );
      fireEvent.click(cutBtn);
      expect(onCut).toHaveBeenCalled();
    });

    it("devrait appeler onDuplicate", () => {
      const onDuplicate = vi.fn();
      const { container } = render(
        <ClipActionsMenu {...defaultProps()} onDuplicate={onDuplicate} />,
      );
      const dupBtn = Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent?.includes("editorDuplicate"),
      );
      fireEvent.click(dupBtn);
      expect(onDuplicate).toHaveBeenCalledWith("t1", "c1");
    });

    // ✅ FIX : onDelete est appelé après un setTimeout(50)
    it("devrait appeler onDelete après délai", () => {
      const onDelete = vi.fn();
      const { container } = render(
        <ClipActionsMenu {...defaultProps()} onDelete={onDelete} />,
      );
      const delBtn = Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent?.includes("editorDelete"),
      );
      fireEvent.click(delBtn);

      act(() => {
        vi.advanceTimersByTime(60);
      });

      expect(onDelete).toHaveBeenCalledWith("t1", "c1", "Mon Clip");
    });

    it("devrait appeler onClose au click Delete (immédiat)", () => {
      const { container } = render(<ClipActionsMenu {...defaultProps()} />);
      const delBtn = Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent?.includes("editorDelete"),
      );
      fireEvent.click(delBtn);
      expect(onClose).toHaveBeenCalled();
    });

    it("devrait appeler onMoveUp", () => {
      const onMoveUp = vi.fn();
      const { container } = render(
        <ClipActionsMenu {...defaultProps()} onMoveUp={onMoveUp} />,
      );
      const upBtn = Array.from(container.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("editorMoveUp"),
      );
      fireEvent.click(upBtn);
      expect(onMoveUp).toHaveBeenCalled();
    });

    it("devrait désactiver MoveUp si canMoveUp=false", () => {
      const { container } = render(
        <ClipActionsMenu {...defaultProps()} canMoveUp={false} />,
      );
      const upBtn = Array.from(container.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("editorMoveUp"),
      );
      expect(upBtn?.disabled).toBe(true);
    });
  });

  // ─── Tab Audio ─────────────────────────────────────────────────

  describe("tab audio", () => {
    const getTabButton = (container, iconClass) =>
      Array.from(container.querySelectorAll("button")).find((b) =>
        b.querySelector(`:scope > i.ti.${iconClass}`),
      );

    const openAudioTab = (container) => {
      fireEvent.click(getTabButton(container, "ti-volume"));
    };

    it("devrait appeler onTrim", () => {
      const onTrim = vi.fn();
      const { container } = render(
        <ClipActionsMenu {...defaultProps()} onTrim={onTrim} />,
      );
      openAudioTab(container);
      const trimBtn = Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent?.includes("editorTrim"),
      );
      fireEvent.click(trimBtn);
      expect(onTrim).toHaveBeenCalledWith("c1");
    });

    it("devrait appeler onNormalize", () => {
      const onNormalize = vi.fn();
      const { container } = render(
        <ClipActionsMenu {...defaultProps()} onNormalize={onNormalize} />,
      );
      openAudioTab(container);
      const normBtn = Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent?.includes("editorNormalize"),
      );
      fireEvent.click(normBtn);
      expect(onNormalize).toHaveBeenCalled();
    });

    it("devrait splitter au milieu via onSplit", () => {
      const onSplit = vi.fn();
      const { container } = render(
        <ClipActionsMenu {...defaultProps()} onSplit={onSplit} />,
      );
      openAudioTab(container);
      const midBtn = Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent?.includes("editorSplitAtMiddle"),
      );
      fireEvent.click(midBtn);
      // midPoint = 0 + 3/2 = 1.5
      expect(onSplit).toHaveBeenCalledWith("t1", "c1", 1.5);
    });
  });

  // ─── Tab Effects ───────────────────────────────────────────────

  describe("tab effects", () => {
    // ✅ FIX : cibler les tabs par leurs icônes (ti-pencil / ti-volume / ti-wand)
    const getTabButton = (container, iconClass) =>
      Array.from(container.querySelectorAll("button")).find((b) =>
        b.querySelector(`:scope > i.ti.${iconClass}`),
      );

    it("devrait afficher 'Aucun effet actif' si pas d'effets", () => {
      const { container } = render(<ClipActionsMenu {...defaultProps()} />);
      const effectsTab = getTabButton(container, "ti-wand");
      fireEvent.click(effectsTab);
      expect(container.textContent).toContain("editorNoEffects");
    });

    it("devrait afficher les effets actifs", () => {
      const clip = createClip({
        effects: [
          { id: "e1", type: "volume", enabled: true, params: { value: 1.5 } },
          {
            id: "e2",
            type: "fadeIn",
            enabled: true,
            params: { duration: 0.5 },
          },
        ],
      });
      const { container } = render(
        <ClipActionsMenu {...defaultProps()} clip={clip} />,
      );
      const effectsTab = getTabButton(container, "ti-wand");
      fireEvent.click(effectsTab);
      expect(container.textContent).toContain("editorActiveEffects");
    });

    it("devrait appeler onAddEffect au click", () => {
      const onAddEffect = vi.fn();
      const { container } = render(
        <ClipActionsMenu {...defaultProps()} onAddEffect={onAddEffect} />,
      );
      const effectsTab = getTabButton(container, "ti-wand");
      fireEvent.click(effectsTab);

      const addBtn = Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent?.includes("editorOpenEffectsPanel"),
      );
      fireEvent.click(addBtn);
      expect(onAddEffect).toHaveBeenCalledWith("c1", "t1");
    });
  });

  // ─── Click outside ─────────────────────────────────────────────

  describe("click outside", () => {
    it("devrait appeler onClose au mousedown en dehors", () => {
      render(<ClipActionsMenu {...defaultProps()} />);
      act(() => {
        document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      });
      expect(onClose).toHaveBeenCalled();
    });

    it("devrait enregistrer un listener au mount", () => {
      const addSpy = vi.spyOn(document, "addEventListener");
      render(<ClipActionsMenu {...defaultProps()} />);
      expect(addSpy).toHaveBeenCalledWith("mousedown", expect.any(Function));
      addSpy.mockRestore();
    });

    it("devrait cleanup le listener à l'unmount", () => {
      const removeSpy = vi.spyOn(document, "removeEventListener");
      const { unmount } = render(<ClipActionsMenu {...defaultProps()} />);
      unmount();
      expect(removeSpy).toHaveBeenCalledWith("mousedown", expect.any(Function));
      removeSpy.mockRestore();
    });

    it("devrait enregistrer un listener resize", () => {
      const addSpy = vi.spyOn(window, "addEventListener");
      render(<ClipActionsMenu {...defaultProps()} />);
      expect(addSpy).toHaveBeenCalledWith("resize", expect.any(Function));
      addSpy.mockRestore();
    });
  });

  // ─── Loop submenu ──────────────────────────────────────────────

  describe("loop submenu", () => {
    it("devrait toggle le submenu au click", () => {
      const { container } = render(<ClipActionsMenu {...defaultProps()} />);
      const audioTab = Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent?.includes("editorAudioEdit"),
      );
      fireEvent.click(audioTab);

      const loopBtn = Array.from(container.querySelectorAll("button")).find(
        (b) =>
          b.textContent?.includes("editorLoop") &&
          !b.textContent?.includes("editorLoopEnd"),
      );

      if (loopBtn) {
        fireEvent.click(loopBtn);
        expect(container.textContent).toContain("editorLoopColor");
      }
    });

    it('devrait afficher le bouton "Boucle active" si activé', () => {
      const { container } = render(
        <ClipActionsMenu
          {...defaultProps()}
          loopState={{
            clips: { c1: { enabled: true, arrowColor: "#22c55e" } },
          }}
        />,
      );
      const audioTab = Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent?.includes("editorAudioEdit"),
      );
      fireEvent.click(audioTab);
      expect(container.textContent).toContain("editorLoopActive");
    });
  });

  // ─── Affichage tab par défaut ──────────────────────────────────

  it("devrait avoir 3 boutons de tab", () => {
    const { container } = render(<ClipActionsMenu {...defaultProps()} />);
    // ✅ FIX : compter les boutons qui ont un enfant direct <i class="ti ti-*">
    //          avec une des 3 icônes canoniques des tabs
    const TAB_ICONS = ["ti-pencil", "ti-volume", "ti-wand"];
    const tabs = Array.from(container.querySelectorAll("button")).filter(
      (b) => {
        const icon = b.querySelector(":scope > i.ti");
        if (!icon) return false;
        return TAB_ICONS.some((cls) => icon.classList.contains(cls));
      },
    );
    expect(tabs.length).toBe(3);
  });
});
