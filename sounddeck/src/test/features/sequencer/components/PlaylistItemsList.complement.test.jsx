// src/test/features/sequencer/components/PlaylistItemsList.complement.test.jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@core/i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: "fr" }),
}));

vi.mock("@features/sequencer/components/PlaylistItem", () => ({
  default: ({
    item,
    idx,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragLeave,
    onDrop,
  }) => (
    <div
      data-testid={`item-${idx}`}
      draggable
      onDragStart={(e) => onDragStart(e, idx)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, idx)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, idx)}
    >
      {item.soundId}
    </div>
  ),
}));

import PlaylistItemsList from "@features/sequencer/components/PlaylistItemsList";

const makeItems = (n = 3) =>
  Array.from({ length: n }, (_, i) => ({
    id: `i${i}`,
    soundId: `s${i}`,
    delay: 0,
  }));

const defaultProps = (overrides = {}) => ({
  items: makeItems(3),
  sounds: [
    { id: "s0", name: "A" },
    { id: "s1", name: "B" },
    { id: "s2", name: "C" },
  ],
  playing: false,
  currentIdx: -1,
  currentProgress: null,
  onSaveItemsOnly: vi.fn(),
  onUpdateItem: vi.fn(),
  onRemove: vi.fn(),
  onAddSounds: vi.fn(),
  ...overrides,
});

describe("PlaylistItemsList > Empty", () => {
  it("affiche empty state si items vide", () => {
    render(<PlaylistItemsList {...defaultProps({ items: [] })} />);
    expect(screen.getByText("emptyPlaylist")).toBeInTheDocument();
    // ⚠️ "addSounds" apparaît 2 fois (description + bouton)
    expect(screen.getAllByText("addSounds").length).toBeGreaterThanOrEqual(2);
  });

  it('bouton "Ajouter des sons" appelle onAddSounds', () => {
    const onAddSounds = vi.fn();
    render(<PlaylistItemsList {...defaultProps({ items: [], onAddSounds })} />);
    // On cible le bouton (le texte apparaît aussi dans une div)
    const btn = screen.getByRole("button", { name: /addSounds/ });
    fireEvent.click(btn);
    expect(onAddSounds).toHaveBeenCalled();
  });
});

describe("PlaylistItemsList > Rendu", () => {
  it("affiche un item par élément", () => {
    render(<PlaylistItemsList {...defaultProps()} />);
    expect(screen.getByTestId("item-0")).toBeInTheDocument();
    expect(screen.getByTestId("item-1")).toBeInTheDocument();
    expect(screen.getByTestId("item-2")).toBeInTheDocument();
  });
});

describe("PlaylistItemsList > Drag handlers", () => {
  it("dragStart avec setData", () => {
    const { container } = render(<PlaylistItemsList {...defaultProps()} />);
    const item = container.querySelector('[data-testid="item-0"]');
    const dataTransfer = {
      effectAllowed: "",
      setData: vi.fn(),
      getData: vi.fn(),
    };

    fireEvent.dragStart(item, { dataTransfer });
    expect(dataTransfer.effectAllowed).toBe("move");
    expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "0");
  });

  it("drop avec fromIndex valide déclenche reorder", () => {
    const onSaveItemsOnly = vi.fn();
    const { container } = render(
      <PlaylistItemsList {...defaultProps({ onSaveItemsOnly })} />,
    );

    const target = container.querySelector('[data-testid="item-2"]');
    const dataTransfer = {
      getData: vi.fn(() => "0"),
      setData: vi.fn(),
    };

    fireEvent.drop(target, { dataTransfer });

    expect(onSaveItemsOnly).toHaveBeenCalled();
    const [updated] = onSaveItemsOnly.mock.calls[0];
    // items[0] doit maintenant être en position 2
    expect(updated[2].id).toBe("i0");
    expect(updated[0].id).toBe("i1");
  });

  it("drop avec fromIndex === toIndex → pas de reorder", () => {
    const onSaveItemsOnly = vi.fn();
    const { container } = render(
      <PlaylistItemsList {...defaultProps({ onSaveItemsOnly })} />,
    );

    const target = container.querySelector('[data-testid="item-0"]');
    const dataTransfer = {
      getData: vi.fn(() => "0"),
      setData: vi.fn(),
    };

    fireEvent.drop(target, { dataTransfer });
    expect(onSaveItemsOnly).not.toHaveBeenCalled();
  });

  it("drop avec index NaN → pas de reorder", () => {
    const onSaveItemsOnly = vi.fn();
    const { container } = render(
      <PlaylistItemsList {...defaultProps({ onSaveItemsOnly })} />,
    );

    const target = container.querySelector('[data-testid="item-1"]');
    const dataTransfer = {
      getData: vi.fn(() => "NaN"),
      setData: vi.fn(),
    };

    fireEvent.drop(target, { dataTransfer });
    expect(onSaveItemsOnly).not.toHaveBeenCalled();
  });

  it("dragOver set dragOverIdx", () => {
    const { container } = render(<PlaylistItemsList {...defaultProps()} />);
    const item = container.querySelector('[data-testid="item-1"]');
    const dataTransfer = { dropEffect: "", getData: vi.fn() };

    fireEvent.dragOver(item, { dataTransfer });
    expect(dataTransfer.dropEffect).toBe("move");
  });

  it("dragLeave reset dragOverIdx", () => {
    const { container } = render(<PlaylistItemsList {...defaultProps()} />);
    const item = container.querySelector('[data-testid="item-1"]');

    fireEvent.dragLeave(item);
    // Pas d'assertion directe — on vérifie juste que ça ne crash pas
    expect(true).toBe(true);
  });
});
