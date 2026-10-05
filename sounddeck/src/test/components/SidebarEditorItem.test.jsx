// src/test/components/SidebarEditorItem.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SidebarEditorItem from "@shared/components/navigation/SidebarEditor/SidebarEditorItem";

// ─── MOCKS ─────────────────────────────────────────────────────────────
vi.mock("@shared/constants/navigation", () => ({
  ACTION_IDS: ["loop", "shortcuts", "presentation"],
}));

vi.mock("@core/i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: "fr" }),
}));

// ─── HELPERS ───────────────────────────────────────────────────────────
const makeEditor = (overrides = {}) => ({
  dragOverIndex: null,
  dragOverGroup: null,
  draggedIndex: null,
  draggedGroup: null,
  handleDragStart: vi.fn(),
  handleDragEnd: vi.fn(),
  handleDragOver: vi.fn(),
  handleDragLeave: vi.fn(),
  handleDrop: vi.fn(),
  togglePinned: vi.fn(),
  toggleVisibility: vi.fn(),
  ...overrides,
});

const makeItem = (overrides = {}) => ({
  id: "home",
  label: "Accueil",
  icon: "ti-home",
  group: "navigation",
  visible: true,
  pinned: false,
  canHide: true,
  ...overrides,
});

const renderItem = (
  itemOverrides = {},
  editorOverrides = {},
  groupKey = "navigation",
) => {
  const item = makeItem(itemOverrides);
  const editor = makeEditor(editorOverrides);
  const result = render(
    <SidebarEditorItem
      item={item}
      groupKey={groupKey}
      index={0}
      editor={editor}
    />,
  );
  return { ...result, item, editor };
};

// ═══════════════════════════════════════════════════════════════════════
// RENDU DE BASE
// ═══════════════════════════════════════════════════════════════════════
describe("SidebarEditorItem > Rendu", () => {
  it("affiche le label et l'icône", () => {
    const { container } = renderItem();
    expect(screen.getByText("Accueil")).toBeInTheDocument();
    expect(container.querySelector(".ti-home")).toBeInTheDocument();
  });

  it("affiche une poignée drag si draggable", () => {
    const { container } = renderItem();
    expect(container.querySelector(".ti-grip-vertical")).toBeInTheDocument();
  });

  it("default profile : pas de poignée, affiche l'icône + badge ⭐", () => {
    const { container } = renderItem({ isDefaultProfile: true });
    // DefaultProfileItem : PAS de grip, PAS de ti-lock
    expect(
      container.querySelector(".ti-grip-vertical"),
    ).not.toBeInTheDocument();
    // Le badge ⭐ est présent
    expect(container.textContent).toContain("⭐");
  });

  it("affiche un cadenas dans un actionGroup (isDraggable=false)", () => {
    const { container } = renderItem(
      { id: "loop", isAction: true },
      {},
      "actions",
    );
    expect(container.querySelector(".ti-lock")).toBeInTheDocument();
    expect(
      container.querySelector(".ti-grip-vertical"),
    ).not.toBeInTheDocument();
  });

  it("affiche le badge 📌 si pinned", () => {
    renderItem({ pinned: true });
    expect(screen.getByText("📌")).toBeInTheDocument();
  });

  it("affiche le badge 👤 si isProfile", () => {
    renderItem({ id: "profile-p1", isProfile: true });
    expect(screen.getByText("👤")).toBeInTheDocument();
  });

  it("affiche le badge ⚡ pour une action", () => {
    renderItem({ id: "loop", group: "actions" }, {}, "actions");
    expect(screen.getByText("⚡")).toBeInTheDocument();
  });

  it("applique draggable=true par défaut", () => {
    const { container } = renderItem();
    const root = container.firstChild;
    expect(root).toHaveAttribute("draggable", "true");
  });

  it("applique draggable=false sur default profile", () => {
    const { container } = renderItem({ isDefaultProfile: true });
    const root = container.firstChild;
    expect(root).toHaveAttribute("draggable", "false");
  });

  it("applique draggable=false dans un actionGroup", () => {
    const { container } = renderItem({ id: "loop" }, {}, "actions");
    const root = container.firstChild;
    expect(root).toHaveAttribute("draggable", "false");
  });

  it("opacity=0.4 si item masqué", () => {
    const { container } = renderItem({ visible: false });
    const root = container.firstChild;
    expect(root.style.opacity).toBe("0.4");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TOGGLE PINNED / VISIBILITY
// ═══════════════════════════════════════════════════════════════════════
describe("SidebarEditorItem > Actions", () => {
  it("clic sur l'icône pin appelle togglePinned", () => {
    const { editor } = renderItem();
    const pinBtn = screen.getByTitle("Épingler");
    fireEvent.click(pinBtn);
    expect(editor.togglePinned).toHaveBeenCalledWith("home");
  });

  it("clic sur l'icône unpinned appelle togglePinned", () => {
    const { editor } = renderItem({ pinned: true });
    const pinBtn = screen.getByTitle("Désépingler");
    fireEvent.click(pinBtn);
    expect(editor.togglePinned).toHaveBeenCalledWith("home");
  });

  it("clic sur oeil appelle toggleVisibility si visible", () => {
    const { editor } = renderItem();
    const eyeBtn = screen.getByTitle("Masquer");
    fireEvent.click(eyeBtn);
    expect(editor.toggleVisibility).toHaveBeenCalledWith("home");
  });

  it("clic sur oeil barré appelle toggleVisibility si masqué", () => {
    const { editor } = renderItem({ visible: false });
    const eyeBtn = screen.getByTitle("Afficher");
    fireEvent.click(eyeBtn);
    expect(editor.toggleVisibility).toHaveBeenCalledWith("home");
  });

  it("ne rend PAS de bouton visibility si canHide=false", () => {
    renderItem({ canHide: false });
    expect(screen.queryByTitle("Masquer")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Afficher")).not.toBeInTheDocument();
  });

  it("default profile : pas de bouton visibility", () => {
    renderItem({ isDefaultProfile: true, canHide: false });
    expect(screen.queryByTitle("Masquer")).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// DRAG & DROP
// ═══════════════════════════════════════════════════════════════════════
describe("SidebarEditorItem > Drag", () => {
  const createDragEvent = () => ({
    preventDefault: vi.fn(),
    dataTransfer: {
      effectAllowed: "",
      dropEffect: "",
      setData: vi.fn(),
      getData: vi.fn(),
    },
  });

  it("handleDragStart appelé sur dragStart normal", () => {
    const { container, editor } = renderItem();
    const root = container.firstChild;

    fireEvent.dragStart(root, {
      dataTransfer: { effectAllowed: "", setData: vi.fn(), getData: vi.fn() },
    });

    expect(editor.handleDragStart).toHaveBeenCalled();
    // ⚠️ On ne peut pas tester dataTransfer.effectAllowed ici : c'est le
    //    hook réel (mocké) qui le positionne, pas le composant. On vérifie
    //    juste que le composant transmet les bons arguments au hook.
    const [, index, group] = editor.handleDragStart.mock.calls[0];
    expect(index).toBe(0);
    expect(group).toBe("navigation");
  });

  it("handleDragStart BLOQUÉ si isDefaultProfile", () => {
    const { container, editor } = renderItem({ isDefaultProfile: true });
    const root = container.firstChild;
    fireEvent.dragStart(root, {
      dataTransfer: { effectAllowed: "", setData: vi.fn(), getData: vi.fn() },
    });
    // ⚠️ Le code source appelle e.preventDefault() sur le SyntheticEvent
    //    → impossible de le mocker, mais on vérifie que handleDragStart
    //    n'a PAS été appelé (comportement observable).
    expect(editor.handleDragStart).not.toHaveBeenCalled();
  });

  it("handleDragEnd appelé au dragEnd", () => {
    const { container, editor } = renderItem();
    fireEvent.dragEnd(container.firstChild);
    expect(editor.handleDragEnd).toHaveBeenCalled();
  });

  it("handleDragOver appelé avec index et groupKey", () => {
    const { container, editor } = renderItem();
    fireEvent.dragOver(container.firstChild);
    expect(editor.handleDragOver).toHaveBeenCalledWith(
      expect.anything(),
      0,
      "navigation",
    );
  });

  it("handleDragLeave appelé", () => {
    const { container, editor } = renderItem();
    fireEvent.dragLeave(container.firstChild);
    expect(editor.handleDragLeave).toHaveBeenCalled();
  });

  it("handleDrop appelé avec index et groupKey", () => {
    const { container, editor } = renderItem();
    fireEvent.drop(container.firstChild);
    expect(editor.handleDrop).toHaveBeenCalledWith(
      expect.anything(),
      0,
      "navigation",
    );
  });

  it('style "dragging" si draggedIndex + draggedGroup matchent', () => {
    const { container } = renderItem(
      { id: "home" },
      { draggedIndex: 0, draggedGroup: "navigation" },
    );
    const root = container.firstChild;
    expect(root.style.opacity).toBe("0.4");
  });

  it('style "dragOver" si dragOverIndex + dragOverGroup matchent', () => {
    const { container } = renderItem(
      { id: "home" },
      { dragOverIndex: 0, dragOverGroup: "navigation" },
    );
    const root = container.firstChild;
    // Border accent
    expect(root.style.border).toContain("var(--accent)");
  });
});
