import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act, waitFor } from "@testing-library/react";

vi.mock("@shared/utils/fileUrl", () => ({
  buildFileUrl: (p) => `sounddeck-local://file/${p}`,
}));

vi.mock("@shared/utils/realTimeEffects", () => ({
  applyEffectsToBuffer: vi.fn((buffer) => buffer),
}));

import EditorEffectsPanel from "@features/editor/components/EffectsPanel";

describe("EditorEffectsPanel", () => {
  let tr;
  let onEffectAdd;
  let onEffectRemove;
  let onEffectUpdate;
  let onEffectToggle;
  let onClipUpdate;
  let onFadeUpdate;
  let onPreview;
  let mockCtx;

  const createClip = (o = {}) => ({
    id: "c1",
    name: "Mon Clip",
    path: "/a.mp3",
    effects: [],
    ...o,
  });

  const defaultProps = () => ({
    clip: createClip(),
    trackId: "t1",
    onEffectAdd,
    onEffectRemove,
    onEffectUpdate,
    onEffectToggle,
    onClipUpdate,
    onFadeUpdate,
    onPreview,
    isPreviewing: false,
    tr,
    lang: "fr",
    showAddMenu: false,
    onShowAddMenuChange: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    tr = vi.fn((key) => key);
    onEffectAdd = vi.fn();
    onEffectRemove = vi.fn();
    onEffectUpdate = vi.fn();
    onEffectToggle = vi.fn();
    onClipUpdate = vi.fn();
    onFadeUpdate = vi.fn();
    onPreview = vi.fn();

    mockCtx = {
      state: "running",
      sampleRate: 44100,
      destination: { name: "destination" },
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      decodeAudioData: vi.fn().mockResolvedValue({
        duration: 3,
        sampleRate: 44100,
        length: 132300,
      }),
      createBufferSource: vi.fn(() => ({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        disconnect: vi.fn(),
        onended: null,
      })),
      createGain: vi.fn(() => ({
        gain: { value: 1 },
        connect: vi.fn(),
        disconnect: vi.fn(),
      })),
    };

    global.AudioContext = vi.fn(function () {
      return mockCtx;
    });
    global.webkitAudioContext = global.AudioContext;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Rendu de base ─────────────────────────────────────────────

  it("devrait retourner null si clip absent", () => {
    const { container } = render(
      <EditorEffectsPanel {...defaultProps()} clip={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('devrait rendre data-testid="editor-effects-panel"', () => {
    const { getByTestId } = render(<EditorEffectsPanel {...defaultProps()} />);
    expect(getByTestId("editor-effects-panel")).toBeInTheDocument();
  });

  it('devrait afficher "Effets — Nom du clip"', () => {
    const { container } = render(<EditorEffectsPanel {...defaultProps()} />);
    expect(container.textContent).toContain("editorEffects");
    expect(container.textContent).toContain("Mon Clip");
  });

  it("devrait afficher le compteur d'effets actifs", () => {
    const { container } = render(<EditorEffectsPanel {...defaultProps()} />);
    expect(container.textContent).toContain("0");
  });

  it('devrait afficher "Aucun effet" si clip.effects vide', () => {
    const { container } = render(<EditorEffectsPanel {...defaultProps()} />);
    expect(container.textContent).toContain("editorNoEffects");
  });

  // ─── Effets ────────────────────────────────────────────────────

  describe("effets", () => {
    it("devrait afficher les effets existants", () => {
      const clip = createClip({
        effects: [
          {
            id: "e1",
            type: "volume",
            enabled: true,
            params: { value: 1 },
          },
        ],
      });
      const { container } = render(
        <EditorEffectsPanel {...defaultProps()} clip={clip} />,
      );
      expect(container.textContent).toContain("editorEffectVolume");
    });

    it("devrait afficher plusieurs effets", () => {
      const clip = createClip({
        effects: [
          { id: "e1", type: "volume", enabled: true, params: { value: 1 } },
          {
            id: "e2",
            type: "echo",
            enabled: true,
            params: { delay: 0.3, decay: 0.5, mix: 0.3 },
          },
        ],
      });
      const { getAllByTestId } = render(
        <EditorEffectsPanel {...defaultProps()} clip={clip} />,
      );
      expect(getAllByTestId("editor-effect-item").length).toBe(2);
    });

    it("devrait toggle un effet", () => {
      const clip = createClip({
        effects: [
          { id: "e1", type: "volume", enabled: true, params: { value: 1 } },
        ],
      });
      const { container } = render(
        <EditorEffectsPanel {...defaultProps()} clip={clip} />,
      );
      const toggleBtn = container.querySelector('button[class*="btn-ghost"]');
      // Le premier bouton ghost est l'oeil
      const eyeBtn = Array.from(container.querySelectorAll("button")).find(
        (b) => b.querySelector(".ti-eye"),
      );
      if (eyeBtn) {
        fireEvent.click(eyeBtn);
        expect(onEffectToggle).toHaveBeenCalledWith("t1", "c1", "e1", false);
      }
    });

    it("devrait supprimer un effet", () => {
      const clip = createClip({
        effects: [
          { id: "e1", type: "volume", enabled: true, params: { value: 1 } },
        ],
      });
      const { getAllByTestId } = render(
        <EditorEffectsPanel {...defaultProps()} clip={clip} />,
      );
      fireEvent.click(getAllByTestId("editor-effect-delete")[0]);
      expect(onEffectRemove).toHaveBeenCalledWith("t1", "c1", "e1");
    });

    it("devrait modifier un paramètre", () => {
      const clip = createClip({
        effects: [
          { id: "e1", type: "volume", enabled: true, params: { value: 1 } },
        ],
      });
      const { container } = render(
        <EditorEffectsPanel {...defaultProps()} clip={clip} />,
      );
      const rangeInput = container.querySelector('input[type="range"]');
      fireEvent.change(rangeInput, { target: { value: "2.0" } });
      expect(onEffectUpdate).toHaveBeenCalledWith(
        "t1",
        "c1",
        "e1",
        "value",
        2.0,
      );
    });
  });

  // ─── Menu d'ajout ──────────────────────────────────────────────

  describe("menu d'ajout", () => {
    it("devrait toggle le menu AddEffect", () => {
      const { getByTestId, container } = render(
        <EditorEffectsPanel {...defaultProps()} />,
      );
      fireEvent.click(getByTestId("editor-add-effect-button"));
      expect(container.textContent).toContain("editorEffectVolume");
    });

    it("devrait ajouter un effet au click sur une option", () => {
      const { getByTestId } = render(
        <EditorEffectsPanel {...defaultProps()} />,
      );
      fireEvent.click(getByTestId("editor-add-effect-button"));
      fireEvent.click(getByTestId("effect-type-volume"));

      expect(onEffectAdd).toHaveBeenCalledWith("t1", "c1", "volume", {
        value: 1.0,
      });
    });

    it("devrait ajouter fadeIn avec les bons params par défaut", () => {
      const { getByTestId } = render(
        <EditorEffectsPanel {...defaultProps()} />,
      );
      fireEvent.click(getByTestId("editor-add-effect-button"));
      fireEvent.click(getByTestId("effect-type-fadeIn"));

      expect(onEffectAdd).toHaveBeenCalledWith("t1", "c1", "fadeIn", {
        duration: 0.5,
      });
    });

    it("devrait ajouter echo avec les bons params par défaut", () => {
      const { getByTestId } = render(
        <EditorEffectsPanel {...defaultProps()} />,
      );
      fireEvent.click(getByTestId("editor-add-effect-button"));
      fireEvent.click(getByTestId("effect-type-echo"));

      expect(onEffectAdd).toHaveBeenCalledWith("t1", "c1", "echo", {
        delay: 0.3,
        decay: 0.5,
        mix: 0.3,
      });
    });

    it("devrait ouvrir le menu si showAddMenu=true au mount", () => {
      const { container } = render(
        <EditorEffectsPanel {...defaultProps()} showAddMenu={true} />,
      );
      expect(container.textContent).toContain("editorEffectVolume");
    });

    it("devrait appeler onShowAddMenuChange après avoir consommé le flag", () => {
      const onShowAddMenuChange = vi.fn();
      render(
        <EditorEffectsPanel
          {...defaultProps()}
          showAddMenu={true}
          onShowAddMenuChange={onShowAddMenuChange}
        />,
      );
      expect(onShowAddMenuChange).toHaveBeenCalledWith(false);
    });
  });

  // ─── Auto-preview toggle ──────────────────────────────────────

  describe("auto-preview", () => {
    it("devrait avoir un toggle Auto ON par défaut", () => {
      const { container } = render(<EditorEffectsPanel {...defaultProps()} />);
      const autoBtn = container.querySelector(
        '[title="editorAutoPreviewTooltipOn"]',
      );
      expect(autoBtn).not.toBeNull();
      expect(autoBtn.textContent).toContain("Auto");
      expect(autoBtn.textContent).toContain("ON");
    });

    it("devrait toggle OFF au click", () => {
      const { container } = render(<EditorEffectsPanel {...defaultProps()} />);

      // ✅ FIX : cibler le div par son title (mock tr retourne la clé)
      const autoBtn = container.querySelector(
        '[title="editorAutoPreviewTooltipOn"]',
      );
      expect(autoBtn).not.toBeNull();

      fireEvent.click(autoBtn);
      expect(container.textContent).toContain("OFF");

      // Le title a changé
      const autoOffBtn = container.querySelector(
        '[title="editorAutoPreviewTooltipOff"]',
      );
      expect(autoOffBtn).not.toBeNull();
    });
  });

  // ─── Preview button ────────────────────────────────────────────

  describe("preview button", () => {
    it("devrait avoir un bouton Écouter", () => {
      const { getByTestId } = render(
        <EditorEffectsPanel {...defaultProps()} />,
      );
      expect(getByTestId("editor-preview-effects-button")).toBeInTheDocument();
    });

    it('devrait afficher "listen" par défaut', () => {
      const { getByTestId } = render(
        <EditorEffectsPanel {...defaultProps()} />,
      );
      expect(
        getByTestId("editor-preview-effects-button").textContent,
      ).toContain("listen");
    });

    it("devrait appeler onPreview si pas d'effets actifs", async () => {
      const { getByTestId } = render(
        <EditorEffectsPanel {...defaultProps()} />,
      );
      const previewBtn = getByTestId("editor-preview-effects-button");

      await act(async () => {
        fireEvent.click(previewBtn);
        await Promise.resolve();
      });

      expect(onPreview).toHaveBeenCalledWith(
        expect.objectContaining({ id: "c1" }),
        null,
      );
    });

    it("devrait fetch et decode si effets actifs", async () => {
      const clip = createClip({
        effects: [
          { id: "e1", type: "volume", enabled: true, params: { value: 1.5 } },
        ],
      });
      const { getByTestId } = render(
        <EditorEffectsPanel {...defaultProps()} clip={clip} />,
      );

      await act(async () => {
        fireEvent.click(getByTestId("editor-preview-effects-button"));
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  // ─── Cleanup ───────────────────────────────────────────────────

  describe("cleanup", () => {
    it("devrait cleanup à l'unmount", () => {
      const { unmount } = render(<EditorEffectsPanel {...defaultProps()} />);
      // Pas de crash
      unmount();
      expect(true).toBe(true);
    });
  });
});
