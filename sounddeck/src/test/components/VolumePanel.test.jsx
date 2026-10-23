// src/test/components/VolumePanel.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import VolumePanel from "@shared/components/audio/SoundCard/VolumePanel";

// FR translations used by the component via useLanguage().t()
const FR = {
  menuVolume: "Volume",
  volumeReset: "Réinitialiser le volume",
  reset: "Réinitialiser",
  volumePanelClose: "Fermer",
  volumeDefault: "par défaut",
};

const defaultProps = (overrides = {}) => ({
  volume: 0,
  onChange: vi.fn(),
  onCommit: vi.fn(),
  onClose: vi.fn(),
  onDragStart: vi.fn(),
  onDragEnd: vi.fn(),
  soundName: "Airhorn",
  position: { top: 100, left: 200 },
  ...overrides,
});

beforeEach(() => {
  // Clean up any leftover portal from a previous test
  document.querySelectorAll("#volume-panel").forEach((el) => el.remove());
});

// ═══════════════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════════════
describe("VolumePanel > Rendu", () => {
  it("affiche la première lettre du soundName en majuscule", () => {
    render(<VolumePanel {...defaultProps({ soundName: "airhorn" })} />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("affiche 🔊 si soundName absent", () => {
    render(<VolumePanel {...defaultProps({ soundName: null })} />);
    expect(screen.getByText("🔊")).toBeInTheDocument();
  });

  it('affiche le titre "Volume"', () => {
    render(<VolumePanel {...defaultProps()} />);
    // "Volume" appears in the header
    expect(screen.getAllByText("Volume").length).toBeGreaterThan(0);
  });

  it("affiche le soundName dans le sous-titre", () => {
    render(<VolumePanel {...defaultProps({ soundName: "Mon Son" })} />);
    expect(screen.getByText("Mon Son")).toBeInTheDocument();
  });

  it("affiche la valeur dB formatée avec + pour positif", () => {
    render(<VolumePanel {...defaultProps({ volume: 6 })} />);
    expect(screen.getByText("+6")).toBeInTheDocument();
  });

  it("affiche la valeur négative avec -", () => {
    render(<VolumePanel {...defaultProps({ volume: -6 })} />);
    expect(screen.getByText("-6")).toBeInTheDocument();
  });

  it("affiche 0 sans signe +", () => {
    render(<VolumePanel {...defaultProps({ volume: 0 })} />);
    const spans = screen.getAllByText(/^0$/);
    expect(spans.length).toBeGreaterThan(0);
  });

  it("le slider a min=-24 max=24 step=0.5", () => {
    render(<VolumePanel {...defaultProps()} />);
    const slider = document.querySelector('input[type="range"]');
    expect(slider).toHaveAttribute("min", "-24");
    expect(slider).toHaveAttribute("max", "24");
    expect(slider).toHaveAttribute("step", "0.5");
  });

  it("le slider a la valeur fournie", () => {
    render(<VolumePanel {...defaultProps({ volume: 12 })} />);
    const slider = document.querySelector('input[type="range"]');
    expect(slider.value).toBe("12");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SLIDER
// ═══════════════════════════════════════════════════════════════════════
describe("VolumePanel > Slider", () => {
  it("onChange est appelé avec la nouvelle valeur", () => {
    const onChange = vi.fn();
    render(<VolumePanel {...defaultProps({ onChange })} />);
    const slider = document.querySelector('input[type="range"]');
    fireEvent.change(slider, { target: { value: "10" } });
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it("met à jour la valeur locale", () => {
    // VolumePanel is a controlled component: `volume` comes from the parent
    // (SoundCard/index.jsx), which owns `localVolume`. Simulate a parent
    // with local state to verify the round-trip: onChange → re-render →
    // slider.value.
    function Wrapper() {
      const [vol, setVol] = useState(0);
      return (
        <VolumePanel {...defaultProps({ volume: vol, onChange: setVol })} />
      );
    }

    render(<Wrapper />);
    const slider = document.querySelector('input[type="range"]');
    fireEvent.change(slider, { target: { value: "12" } });
    expect(slider.value).toBe("12");
  });

  it("onMouseDown appelle onDragStart", () => {
    const onDragStart = vi.fn();
    render(<VolumePanel {...defaultProps({ onDragStart })} />);
    const slider = document.querySelector('input[type="range"]');
    fireEvent.mouseDown(slider);
    expect(onDragStart).toHaveBeenCalled();
  });

  it("onMouseUp appelle onCommit + onDragEnd", () => {
    const onCommit = vi.fn();
    const onDragEnd = vi.fn();
    render(
      <VolumePanel {...defaultProps({ onCommit, onDragEnd, volume: 5 })} />,
    );
    const slider = document.querySelector('input[type="range"]');
    fireEvent.mouseUp(slider);
    expect(onCommit).toHaveBeenCalledWith(5);
    expect(onDragEnd).toHaveBeenCalled();
  });

  it("onTouchStart appelle onDragStart", () => {
    const onDragStart = vi.fn();
    render(<VolumePanel {...defaultProps({ onDragStart })} />);
    const slider = document.querySelector('input[type="range"]');
    fireEvent.touchStart(slider);
    expect(onDragStart).toHaveBeenCalled();
  });

  it("onTouchEnd appelle onCommit", () => {
    const onCommit = vi.fn();
    render(<VolumePanel {...defaultProps({ onCommit, volume: -3 })} />);
    const slider = document.querySelector('input[type="range"]');
    fireEvent.touchEnd(slider);
    expect(onCommit).toHaveBeenCalledWith(-3);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// RESET / CLOSE
// ═══════════════════════════════════════════════════════════════════════
describe("VolumePanel > Reset / Fermer", () => {
  it("resetToZero met la valeur à 0 et commit", () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    render(
      <VolumePanel {...defaultProps({ onChange, onCommit, volume: 10 })} />,
    );

    // Note: 'volumeReset' key does not exist in the mocked FR dict → t()
    // falls back to the key itself.
    fireEvent.click(screen.getByTitle("volumeReset"));
    expect(onChange).toHaveBeenCalledWith(0);
    expect(onCommit).toHaveBeenCalledWith(0);
  });

  it("bouton X en haut appelle onClose", () => {
    const onClose = vi.fn();
    const { container } = render(
      <VolumePanel {...defaultProps({ onClose })} />,
    );

    // The X button is the first button containing .ti-x
    const xBtns = container.querySelectorAll("button");
    const xBtn = Array.from(xBtns).find((b) => b.querySelector(".ti-x"));
    fireEvent.click(xBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('bouton "Fermer" en bas appelle onClose', () => {
    const onClose = vi.fn();
    render(<VolumePanel {...defaultProps({ onClose })} />);

    // The bottom "Fermer" button has the btn-primary class
    const primaryBtn = document.querySelector(".btn-primary");
    fireEvent.click(primaryBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("bouton Reset en bas réinitialise aussi", () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    render(
      <VolumePanel {...defaultProps({ onChange, onCommit, volume: 10 })} />,
    );

    // The button with the ti-refresh icon
    const btns = document.querySelectorAll("button");
    const resetBtn = Array.from(btns).find((b) =>
      b.querySelector(".ti-refresh"),
    );
    fireEvent.click(resetBtn);
    expect(onChange).toHaveBeenCalledWith(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// CLICK OUTSIDE
// ═══════════════════════════════════════════════════════════════════════
describe("VolumePanel > Click outside", () => {
  it("ferme le panel au clic en dehors", () => {
    const onClose = vi.fn();
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <VolumePanel {...defaultProps({ onClose })} />
      </div>,
    );

    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(onClose).toHaveBeenCalled();
  });

  it("ne ferme PAS au clic à l'intérieur", () => {
    const onClose = vi.fn();
    render(<VolumePanel {...defaultProps({ onClose })} />);

    const panel = document.getElementById("volume-panel");
    fireEvent.mouseDown(panel);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("retire le listener au unmount", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<VolumePanel {...defaultProps()} />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("mousedown", expect.any(Function));
    removeSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// PROPS SYNC
// ═══════════════════════════════════════════════════════════════════════
describe("VolumePanel > Sync", () => {
  it("met à jour la valeur locale quand la prop change", () => {
    const { rerender } = render(
      <VolumePanel {...defaultProps({ volume: 0 })} />,
    );
    const slider = document.querySelector('input[type="range"]');
    expect(slider.value).toBe("0");

    rerender(<VolumePanel {...defaultProps({ volume: 15 })} />);
    expect(document.querySelector('input[type="range"]').value).toBe("15");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// CONDITIONAL COLORS
// ═══════════════════════════════════════════════════════════════════════
describe("VolumePanel > Couleurs", () => {
  it("rendu OK avec volume 0", () => {
    render(<VolumePanel {...defaultProps({ volume: 0 })} />);
    expect(screen.getByText(/^0$/)).toBeInTheDocument();
  });

  it("rendu OK avec volume > 0", () => {
    render(<VolumePanel {...defaultProps({ volume: 5 })} />);
    expect(screen.getByText("+5")).toBeInTheDocument();
  });

  it("rendu OK avec volume < 0", () => {
    render(<VolumePanel {...defaultProps({ volume: -5 })} />);
    expect(screen.getByText("-5")).toBeInTheDocument();
  });
});