// src/test/components/SidebarEditorGroup.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ─── MOCKS ─────────────────────────────────────────────────────────────
vi.mock("@core/i18n/LanguageContext", () => ({
  useLanguage: () => ({
    t: (k) => {
      // Valeurs FR minimales pour les keys utilisées
      const FR = {
        pinned: "Épinglés",
        navigation: "Navigation",
        profiles: "Profils",
        actions: "Actions",
        unlockSection: "Déverrouiller la section",
        lockSection: "Verrouiller la section",
        fixed: "Fixé",
        unfixed: "Non fixé",
      };
      return FR[k] || k;
    },
    currentLang: "fr",
  }),
}));

vi.mock("@shared/components/navigation/SidebarEditor/constants", () => ({
  GROUP_ICONS: {
    pinned: "ti-pinned",
    navigation: "ti-compass",
    profiles: "ti-users",
    actions: "ti-bolt",
    footer: "ti-arrow-bar-to-down",
  },
  getGroupLabels: (t) => ({
    pinned: `📌 ${t("pinned")}`,
    navigation: `🧭 ${t("navigation")}`,
    profiles: `👤 ${t("profiles")}`,
    actions: `⚡ ${t("actions")}`,
    footer: "📌 Footer",
  }),
}));

vi.mock(
  "@shared/components/navigation/SidebarEditor/SidebarEditorItem",
  () => ({
    default: ({ item, index, groupKey }) => (
      <div
        data-testid={`item-${item.id}`}
        data-index={index}
        data-group={groupKey}
      >
        {item.label}
      </div>
    ),
  }),
);

import SidebarEditorGroup from "@shared/components/navigation/SidebarEditor/SidebarEditorGroup";

// ─── HELPERS ───────────────────────────────────────────────────────────
const makeItems = (count = 2) =>
  Array.from({ length: count }, (_, i) => ({
    id: `item${i}`,
    label: `Item ${i}`,
    group: "navigation",
    isAction: false,
    isProfile: false,
  }));

const makeEditor = (overrides = {}) => ({
  items: makeItems(),
  sectionOrder: ["pinned", "profiles", "navigation", "actions", "footer"],
  fixedSections: [],
  dragOverGroup: null,
  draggedGroup: null,
  isSectionFixed: vi.fn(() => false),
  moveSectionUp: vi.fn(),
  moveSectionDown: vi.fn(),
  toggleFixedSection: vi.fn(),
  handleDrop: vi.fn(),
  ...overrides,
});

const renderGroup = (
  groupKey = "navigation",
  items = makeItems(),
  editorOverrides = {},
) => {
  const editor = makeEditor({ items, ...editorOverrides });
  const result = render(
    <SidebarEditorGroup groupKey={groupKey} items={items} editor={editor} />,
  );
  return { ...result, editor };
};

// ═══════════════════════════════════════════════════════════════════════
// RENDU DU HEADER
// ═══════════════════════════════════════════════════════════════════════
describe("SidebarEditorGroup > Rendu", () => {
  it("affiche le label du groupe navigation", () => {
    renderGroup("navigation");
    expect(screen.getByText(/Navigation/)).toBeInTheDocument();
  });

  it("affiche le count entre parenthèses", () => {
    renderGroup("navigation", makeItems(3));
    expect(screen.getByText("(3)")).toBeInTheDocument();
  });

  it("affiche tous les items", () => {
    renderGroup("navigation", makeItems(3));
    expect(screen.getByTestId("item-item0")).toBeInTheDocument();
    expect(screen.getByTestId("item-item1")).toBeInTheDocument();
    expect(screen.getByTestId("item-item2")).toBeInTheDocument();
  });

  it("passe le bon groupKey aux items", () => {
    renderGroup("profiles", makeItems(1));
    expect(screen.getByTestId("item-item0")).toHaveAttribute(
      "data-group",
      "profiles",
    );
  });

  it("les items reçoivent leur index", () => {
    renderGroup("navigation", makeItems(3));
    expect(screen.getByTestId("item-item0")).toHaveAttribute("data-index", "0");
    expect(screen.getByTestId("item-item2")).toHaveAttribute("data-index", "2");
  });

  it("label footer statique", () => {
    renderGroup("footer", makeItems(1));
    expect(screen.getByText(/Footer/)).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// BOUTONS MOVE UP/DOWN
// ═══════════════════════════════════════════════════════════════════════
describe("SidebarEditorGroup > Move up/down", () => {
  it("bouton up présent pour navigation", () => {
    renderGroup("navigation");
    // Le bouton est identifiable par son icône ti-arrow-up
    const { container } = renderGroup("navigation");
    expect(container.querySelector(".ti-arrow-up")).toBeInTheDocument();
  });

  it("bouton down présent pour navigation", () => {
    const { container } = renderGroup("navigation");
    expect(container.querySelector(".ti-arrow-down")).toBeInTheDocument();
  });

  it("boutons up/down ABSENTS pour footer", () => {
    const { container } = renderGroup("footer", makeItems(1));
    expect(container.querySelector(".ti-arrow-up")).not.toBeInTheDocument();
    expect(container.querySelector(".ti-arrow-down")).not.toBeInTheDocument();
  });

  it("boutons up/down ABSENTS pour pinned", () => {
    const { container } = renderGroup("pinned", makeItems(1));
    expect(container.querySelector(".ti-arrow-up")).not.toBeInTheDocument();
  });

  it("boutons up/down ABSENTS pour actions", () => {
    const { container } = renderGroup("actions", makeItems(1));
    expect(container.querySelector(".ti-arrow-up")).not.toBeInTheDocument();
  });

  it("clic up appelle moveSectionUp", () => {
    const { container, editor } = renderGroup("navigation");
    const upBtn = container.querySelector(".ti-arrow-up").closest("button");
    fireEvent.click(upBtn);
    expect(editor.moveSectionUp).toHaveBeenCalledWith("navigation");
  });

  it("clic down appelle moveSectionDown", () => {
    const { container, editor } = renderGroup("navigation");
    const downBtn = container.querySelector(".ti-arrow-down").closest("button");
    fireEvent.click(downBtn);
    expect(editor.moveSectionDown).toHaveBeenCalledWith("navigation");
  });

  it("up désactivé si index 0 dans les réordonnables", () => {
    // profiles est à l'index 0 des réordonnables (pinned exclu)
    const { container } = renderGroup("profiles");
    const upBtn = container.querySelector(".ti-arrow-up")?.closest("button");
    expect(upBtn?.disabled).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// FIXED TOGGLE
// ═══════════════════════════════════════════════════════════════════════
describe("SidebarEditorGroup > Fixed toggle", () => {
  it("rendu si section non fixée et < 2 fixes", () => {
    const { container } = renderGroup("navigation");
    expect(container.querySelector(".ti-lock-open")).toBeInTheDocument();
  });

  it('affiche "Fixé" si section fixed', () => {
    renderGroup("navigation", makeItems(), {
      fixedSections: ["navigation"],
      isSectionFixed: vi.fn((s) => s === "navigation"),
    });
    expect(screen.getByText("Fixé")).toBeInTheDocument();
  });

  it('affiche "Non fixé" si non fixed', () => {
    renderGroup("navigation");
    expect(screen.getByText("Non fixé")).toBeInTheDocument();
  });

  it("toggle ABSENT si 2 fixes déjà et section non fixée (early return null)", () => {
    const { container } = renderGroup("navigation", makeItems(), {
      fixedSections: ["profiles", "actions"],
    });
    // Le composant fait `if (!enabled && !isFixed) return null`
    expect(container.querySelector(".ti-lock-open")).not.toBeInTheDocument();
    expect(container.querySelector(".ti-lock")).not.toBeInTheDocument();
  });

  it("toggle présent si 2 fixes mais section DÉJÀ fixée (unlock possible)", () => {
    const { container } = renderGroup("navigation", makeItems(), {
      fixedSections: ["profiles", "navigation"],
      isSectionFixed: vi.fn((s) => s === "navigation"),
    });
    // canUnlock=true → le bouton s'affiche malgré les 2 fixes
    expect(container.querySelector(".ti-lock")).toBeInTheDocument();
  });

  it("clic sur toggle appelle toggleFixedSection", () => {
    const { container, editor } = renderGroup("navigation");
    const btn = container.querySelector(".ti-lock-open").closest("button");
    fireEvent.click(btn);
    expect(editor.toggleFixedSection).toHaveBeenCalledWith("navigation");
  });

  it("Bouton ABSENT pour footer", () => {
    const { container } = renderGroup("footer", makeItems(1));
    // Footer a "ti-arrow-bar-to-down" comme icon mais pas de ti-lock
    expect(container.querySelector(".ti-lock-open")).not.toBeInTheDocument();
    expect(container.querySelector(".ti-lock")).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// DRAG OVER / DROP SUR LE GROUPE
// ═══════════════════════════════════════════════════════════════════════
describe("SidebarEditorGroup > Drag sur le groupe", () => {
  const createDragEvent = (sourceData = null) => ({
    preventDefault: vi.fn(),
    dataTransfer: {
      dropEffect: "",
      getData: vi.fn(() => (sourceData ? JSON.stringify(sourceData) : "")),
    },
  });

  it("applique style dragOver si dragOverGroup match", () => {
    const { container } = renderGroup("navigation", makeItems(), {
      dragOverGroup: "navigation",
      draggedGroup: "profiles",
    });
    expect(container.firstChild.style.border).toContain("var(--accent)");
  });

  it("DRAG-over : accepte si sourceItem n'est pas une action et target=navigation", () => {
    const items = [{ id: "home", isAction: false }];
    const editor = makeEditor({ items });
    const { container } = render(
      <SidebarEditorGroup
        groupKey="navigation"
        items={items}
        editor={editor}
      />,
    );
    const e = createDragEvent({ index: 0 });
    fireEvent.dragOver(container.firstChild, e);
    // Pas de dropEffect='none' → drop autorisé
    expect(e.dataTransfer.dropEffect).not.toBe("none");
  });

  it("DRAG-over sur actions : REJETTE si l'item source n'est pas une action", () => {
    const items = [{ id: "item0", isAction: false }];
    const editor = makeEditor({ items });
    const { container } = render(
      <SidebarEditorGroup groupKey="actions" items={items} editor={editor} />,
    );
    const e = createDragEvent({ index: 0 });
    fireEvent.dragOver(container.firstChild, e);
    expect(e.dataTransfer.dropEffect).toBe("none");
  });

  it("DRAG-over sur actions : accepte si la source est une action", () => {
    const items = [{ id: "loop", isAction: true }];
    const editor = makeEditor({ items });
    const { container } = render(
      <SidebarEditorGroup groupKey="actions" items={items} editor={editor} />,
    );
    const e = createDragEvent({ index: 0 });
    fireEvent.dragOver(container.firstChild, e);
    expect(e.dataTransfer.dropEffect).not.toBe("none");
  });

  it("DROP sur actions : rejette si source non-action", () => {
    const items = [{ id: "item0", isAction: false, group: "navigation" }];
    const editor = makeEditor({ items });
    const { container } = render(
      <SidebarEditorGroup groupKey="actions" items={items} editor={editor} />,
    );
    const e = createDragEvent({ index: 0, group: "navigation" });
    fireEvent.drop(container.firstChild, e);
    expect(editor.handleDrop).not.toHaveBeenCalled();
  });

  it("DROP inter-groupes : appelle handleDrop si sourceItem.group !== targetGroup", () => {
    const items = [{ id: "item0", isAction: false, group: "navigation" }];
    const editor = makeEditor({ items });
    const { container } = render(
      <SidebarEditorGroup groupKey="profiles" items={items} editor={editor} />,
    );
    fireEvent.drop(container.firstChild, {
      dataTransfer: {
        getData: vi.fn(() => JSON.stringify({ index: 0, group: "navigation" })),
      },
    });

    // ⚠️ On ne peut pas matcher le 1er arg (SyntheticEvent React wrapper)
    expect(editor.handleDrop).toHaveBeenCalled();
    const [, index, group] = editor.handleDrop.mock.calls[0];
    expect(index).toBe(1);
    expect(group).toBe("profiles");
  });

  it("DROP : pas d'appel si sourceItem est dans le même groupe", () => {
    const items = [{ id: "item0", isAction: false, group: "navigation" }];
    const editor = makeEditor({ items });
    const { container } = render(
      <SidebarEditorGroup
        groupKey="navigation"
        items={items}
        editor={editor}
      />,
    );
    const e = createDragEvent({ index: 0, group: "navigation" });
    fireEvent.drop(container.firstChild, e);
    expect(editor.handleDrop).not.toHaveBeenCalled();
  });

  it("DROP : silence si dataTransfer vide", () => {
    const items = [{ id: "item0", isAction: false, group: "navigation" }];
    const editor = makeEditor({ items });
    const { container } = render(
      <SidebarEditorGroup groupKey="profiles" items={items} editor={editor} />,
    );
    const e = createDragEvent(null); // dataTransfer.getData retourne ''
    fireEvent.drop(container.firstChild, e);
    expect(editor.handleDrop).not.toHaveBeenCalled();
  });

  it("DROP : silence si JSON invalide", () => {
    const items = [{ id: "item0", isAction: false, group: "navigation" }];
    const editor = makeEditor({ items });
    const { container } = render(
      <SidebarEditorGroup groupKey="profiles" items={items} editor={editor} />,
    );
    const e = {
      preventDefault: vi.fn(),
      dataTransfer: { getData: vi.fn(() => "invalid-json") },
    };
    fireEvent.drop(container.firstChild, e);
    expect(editor.handleDrop).not.toHaveBeenCalled();
  });

  it("DROP : silence si dataTransfer.getData throw", () => {
    const items = [{ id: "item0", isAction: false, group: "navigation" }];
    const editor = makeEditor({ items });
    const { container } = render(
      <SidebarEditorGroup groupKey="profiles" items={items} editor={editor} />,
    );
    const e = {
      preventDefault: vi.fn(),
      dataTransfer: {
        getData: vi.fn(() => {
          throw new Error("boom");
        }),
      },
    };
    expect(() => fireEvent.drop(container.firstChild, e)).not.toThrow();
    expect(editor.handleDrop).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// STYLES PAR GROUPE
// ═══════════════════════════════════════════════════════════════════════
describe("SidebarEditorGroup > Styles", () => {
  it("footer : opacité 0.8 + borderTop", () => {
    const { container } = renderGroup("footer", makeItems(1));
    const root = container.firstChild;
    expect(root.style.opacity).toBe("0.8");
    expect(root.style.borderTop).toContain("solid");
  });

  it("actions : background accent-tint", () => {
    const { container } = renderGroup("actions", makeItems(1));
    const root = container.firstChild;
    // ⚠️ jsdom/cssstyle normalise les espaces → on utilise une regex tolérante
    expect(root.style.backgroundColor).toMatch(/124,\s*111,\s*247/);
  });

  it("section fixed : background accent-tint + border accent", () => {
    const { container } = renderGroup("navigation", makeItems(), {
      fixedSections: ["navigation"],
      isSectionFixed: vi.fn((s) => s === "navigation"),
    });
    const root = container.firstChild;
    expect(root.style.border).toContain("var(--accent)");
  });
});
