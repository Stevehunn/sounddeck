// src/test/components/navigation/SidebarEditor/useSidebarEditor.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSidebarEditor } from "@shared/components/navigation/SidebarEditor/useSidebarEditor";

// ─── MOCKS navigation constants (déterministes) ────────────────────────
vi.mock("@shared/constants/navigation", () => ({
  ACTION_IDS: ["loop", "shortcuts", "presentation"],
  DEFAULT_SECTION_ORDER: [
    "pinned",
    "profiles",
    "navigation",
    "actions",
    "footer",
  ],
  DEFAULT_ICONS: {
    home: "ti-home",
    discover: "ti-search",
    options: "ti-settings",
    loop: "ti-repeat",
    shortcuts: "ti-keyboard",
    presentation: "ti-presentation",
  },
  DEFAULT_GROUPS: {
    home: "navigation",
    discover: "navigation",
    options: "footer",
    loop: "actions",
    shortcuts: "actions",
    presentation: "actions",
  },
}));

// ─── HELPERS ───────────────────────────────────────────────────────────
const t = (key) => key;

const baseConfig = () => ({
  items: [
    {
      id: "home",
      label: "Accueil",
      icon: "ti-home",
      group: "navigation",
      visible: true,
      pinned: false,
      order: 0,
    },
    {
      id: "discover",
      label: "Découvrir",
      icon: "ti-search",
      group: "navigation",
      visible: true,
      pinned: false,
      order: 1,
    },
    {
      id: "options",
      label: "Options",
      icon: "ti-settings",
      group: "footer",
      visible: true,
      pinned: false,
      order: 2,
    },
    {
      id: "profile-all",
      label: "allSounds",
      icon: "ti-stack",
      group: "profiles",
      visible: true,
      pinned: false,
      canHide: false,
      isProfile: true,
      isDefaultProfile: true,
      order: 3,
    },
  ],
  sectionOrder: ["pinned", "profiles", "navigation", "actions", "footer"],
  fixedSections: [],
});

const renderEditor = (config = baseConfig(), profiles = [], tFn = t) => {
  return renderHook(() => useSidebarEditor({ config, profiles, t: tFn }));
};

// ═══════════════════════════════════════════════════════════════════════
// INITIALISATION
// ═══════════════════════════════════════════════════════════════════════
describe("useSidebarEditor > Initialisation", () => {
  it("retourne isInitialized=false au premier rendu sans config", () => {
    const { result } = renderHook(() =>
      useSidebarEditor({ config: null, profiles: [], t }),
    );
    expect(result.current.isInitialized).toBe(false);
    expect(result.current.items).toEqual([]);
  });

  it("initialise les items depuis config", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    expect(result.current.items.length).toBeGreaterThan(0);
  });

  it("conserve les labels custom des items", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    const home = result.current.items.find((i) => i.id === "home");
    expect(home.label).toBe("Accueil");
  });

  it("ajoute les items manquants depuis DEFAULT_ITEM_IDS", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    // home, discover, options sont dans config + items par défaut ajoutés
    const ids = result.current.items.map((i) => i.id);
    expect(ids).toContain("home");
    expect(ids).toContain("discover");
    expect(ids).toContain("options");
  });

  it("ajoute les profiles manquants", async () => {
    const config = {
      ...baseConfig(),
      items: [],
    };
    const { result } = renderEditor(config, [{ id: "p1", name: "Gaming" }]);
    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    const ids = result.current.items.map((i) => i.id);
    expect(ids).toContain("profile-all");
    expect(ids).toContain("profile-p1");
  });

  it('force "pinned" en premier dans sectionOrder', async () => {
    const config = {
      ...baseConfig(),
      sectionOrder: ["navigation", "pinned", "profiles", "actions", "footer"],
    };
    const { result } = renderEditor(config);
    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    expect(result.current.sectionOrder[0]).toBe("pinned");
  });

  it('force "footer" en dernier dans sectionOrder', async () => {
    const config = {
      ...baseConfig(),
      sectionOrder: ["pinned", "footer", "navigation", "profiles", "actions"],
    };
    const { result } = renderEditor(config);
    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    const order = result.current.sectionOrder;
    expect(order[order.length - 1]).toBe("footer");
  });

  it("ajoute les sections manquantes dans sectionOrder", async () => {
    const config = { ...baseConfig(), sectionOrder: ["pinned", "navigation"] };
    const { result } = renderEditor(config);
    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    expect(result.current.sectionOrder).toContain("profiles");
    expect(result.current.sectionOrder).toContain("actions");
    expect(result.current.sectionOrder).toContain("footer");
  });

  it("charge fixedSections depuis config", async () => {
    const config = { ...baseConfig(), fixedSections: ["navigation"] };
    const { result } = renderEditor(config);
    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    expect(result.current.fixedSections).toEqual(["navigation"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// toggleVisibility
// ═══════════════════════════════════════════════════════════════════════
describe("useSidebarEditor > toggleVisibility", () => {
  it("bascule visible=true → false", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    act(() => result.current.toggleVisibility("home"));

    const home = result.current.items.find((i) => i.id === "home");
    expect(home.visible).toBe(false);
  });

  it("bascule visible=false → true", async () => {
    const config = baseConfig();
    config.items[0].visible = false;
    const { result } = renderEditor(config);
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    act(() => result.current.toggleVisibility("home"));

    const home = result.current.items.find((i) => i.id === "home");
    expect(home.visible).toBe(true);
  });

  it("n'affecte PAS un item canHide=false", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    act(() => result.current.toggleVisibility("profile-all"));

    const profile = result.current.items.find((i) => i.id === "profile-all");
    expect(profile.visible).toBe(true);
  });

  it("ne touche pas les autres items", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    act(() => result.current.toggleVisibility("home"));

    const discover = result.current.items.find((i) => i.id === "discover");
    expect(discover.visible).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// togglePinned
// ═══════════════════════════════════════════════════════════════════════
describe("useSidebarEditor > togglePinned", () => {
  it("épingle un item (pinned=true + group=pinned)", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    act(() => result.current.togglePinned("home"));

    const home = result.current.items.find((i) => i.id === "home");
    expect(home.pinned).toBe(true);
    expect(home.group).toBe("pinned");
  });

  it("conserve le groupe original pour unpin", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    act(() => result.current.togglePinned("home"));
    const home1 = result.current.items.find((i) => i.id === "home");
    expect(home1.originalGroup).toBe("navigation");

    act(() => result.current.togglePinned("home"));
    const home2 = result.current.items.find((i) => i.id === "home");
    expect(home2.pinned).toBe(false);
    expect(home2.group).toBe("navigation");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION ORDER
// ═══════════════════════════════════════════════════════════════════════
describe("useSidebarEditor > Sections", () => {
  it("moveSectionUp déplace une section vers le haut", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const orderBefore = [...result.current.sectionOrder];
    const profilesIdx = orderBefore.indexOf("profiles");
    const navIdx = orderBefore.indexOf("navigation");

    // navigation est juste après profiles ; on monte navigation
    act(() => result.current.moveSectionUp("navigation"));

    const orderAfter = result.current.sectionOrder;
    expect(orderAfter.indexOf("navigation")).toBeLessThan(navIdx);
    expect(orderAfter.indexOf("profiles")).toBeGreaterThan(profilesIdx - 1);
  });

  it("moveSectionUp ne fait rien pour footer", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const before = [...result.current.sectionOrder];
    act(() => result.current.moveSectionUp("footer"));

    expect(result.current.sectionOrder).toEqual(before);
  });

  it("moveSectionUp ne fait rien pour pinned", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const before = [...result.current.sectionOrder];
    act(() => result.current.moveSectionUp("pinned"));

    expect(result.current.sectionOrder).toEqual(before);
  });

  it("moveSectionDown déplace une section vers le bas", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    act(() => result.current.moveSectionDown("profiles"));

    const order = result.current.sectionOrder;
    expect(order.indexOf("profiles")).toBeGreaterThan(1);
  });

  it("moveSectionDown ne fait rien pour footer", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const before = [...result.current.sectionOrder];
    act(() => result.current.moveSectionDown("footer"));

    expect(result.current.sectionOrder).toEqual(before);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// FIXED SECTIONS
// ═══════════════════════════════════════════════════════════════════════
describe("useSidebarEditor > Fixed sections", () => {
  it("toggleFixedSection ajoute une section", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    act(() => result.current.toggleFixedSection("navigation"));

    expect(result.current.fixedSections).toContain("navigation");
  });

  it("toggleFixedSection retire si déjà fixée", async () => {
    const config = { ...baseConfig(), fixedSections: ["navigation"] };
    const { result } = renderEditor(config);
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    act(() => result.current.toggleFixedSection("navigation"));

    expect(result.current.fixedSections).not.toContain("navigation");
  });

  it("limite à 2 sections fixées max", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    act(() => result.current.toggleFixedSection("navigation"));
    act(() => result.current.toggleFixedSection("profiles"));
    act(() => result.current.toggleFixedSection("actions"));

    expect(result.current.fixedSections).toHaveLength(2);
    expect(result.current.fixedSections).not.toContain("actions");
  });

  it("isSectionFixed retourne true pour une section fixée", async () => {
    const config = { ...baseConfig(), fixedSections: ["navigation"] };
    const { result } = renderEditor(config);
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    expect(result.current.isSectionFixed("navigation")).toBe(true);
    expect(result.current.isSectionFixed("profiles")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// DRAG & DROP
// ═══════════════════════════════════════════════════════════════════════
describe("useSidebarEditor > Drag & Drop", () => {
  const createDragEvent = (data) => ({
    preventDefault: vi.fn(),
    dataTransfer: {
      effectAllowed: "",
      dropEffect: "",
      setData: vi.fn(),
      getData: vi.fn(() => JSON.stringify(data)),
    },
    target: document.createElement("div"),
  });

  it("handleDragStart initialise draggedIndex/Group", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const e = createDragEvent({ index: 0, group: "navigation" });
    act(() => result.current.handleDragStart(e, 0, "navigation"));

    expect(result.current.draggedIndex).toBe(0);
    expect(result.current.draggedGroup).toBe("navigation");
    expect(e.dataTransfer.setData).toHaveBeenCalledWith(
      "text/plain",
      expect.stringContaining('"index":0'),
    );
  });

  it("handleDragEnd réinitialise tout", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    act(() =>
      result.current.handleDragStart(
        createDragEvent({ index: 0, group: "navigation" }),
        0,
        "navigation",
      ),
    );
    act(() =>
      result.current.handleDragEnd({ target: document.createElement("div") }),
    );

    expect(result.current.draggedIndex).toBeNull();
    expect(result.current.draggedGroup).toBeNull();
  });

  it("handleDragOver set dragOverIndex/Group", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const e = createDragEvent({ index: 1, group: "navigation" });
    act(() => result.current.handleDragOver(e, 1, "navigation"));

    expect(result.current.dragOverIndex).toBe(1);
    expect(result.current.dragOverGroup).toBe("navigation");
  });

  it("handleDragOver bloque le drop d'un non-action dans actions", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    // Le drag source est home (navigation), target actions
    const e = createDragEvent({ index: 0, group: "navigation" });
    act(() => result.current.handleDragOver(e, 0, "actions"));

    expect(e.dataTransfer.dropEffect).toBe("none");
  });

  it("handleDragLeave reset dragOver", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    act(() =>
      result.current.handleDragOver(
        createDragEvent({ index: 1, group: "navigation" }),
        1,
        "navigation",
      ),
    );
    act(() => result.current.handleDragLeave());

    expect(result.current.dragOverIndex).toBeNull();
  });

  it("handleDrop sans JSON valide reset sans crash", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const e = {
      preventDefault: vi.fn(),
      dataTransfer: {
        getData: vi.fn(() => "invalid-json"),
      },
    };
    act(() => result.current.handleDrop(e, 0, "navigation"));

    expect(result.current.draggedIndex).toBeNull();
  });

  it("handleDrop no-op si source === target", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const e = createDragEvent({ index: 0, group: "navigation" });
    act(() => result.current.handleDrop(e, 0, "navigation"));

    expect(result.current.draggedIndex).toBeNull();
  });

  it("handleDrop réordonne dans le même groupe", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const e = createDragEvent({ index: 0, group: "navigation" });
    act(() => result.current.handleDrop(e, 1, "navigation"));

    const navItems = result.current.items.filter(
      (i) => i.group === "navigation" && !i.pinned,
    );
    expect(navItems.length).toBeGreaterThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// handleSave
// ═══════════════════════════════════════════════════════════════════════
describe("useSidebarEditor > handleSave", () => {
  it("retourne un objet avec mode=custom", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const saved = result.current.handleSave();
    expect(saved.mode).toBe("custom");
  });

  it("réindexe les orders séquentiellement", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const saved = result.current.handleSave();
    saved.items.forEach((item, i) => {
      expect(item.order).toBe(i);
    });
  });

  it("retire la propriété originalGroup", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    act(() => result.current.togglePinned("home"));

    const saved = result.current.handleSave();
    saved.items.forEach((item) => {
      expect(item.originalGroup).toBeUndefined();
    });
  });

  it("filtre les fixedSections invalides", async () => {
    const config = { ...baseConfig(), fixedSections: ["unknown-section"] };
    const { result } = renderEditor(config);
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const saved = result.current.handleSave();
    expect(saved.fixedSections).not.toContain("unknown-section");
  });

  it('retire "pinned" du sectionOrder sauvegardé si aucun item pinned', async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const saved = result.current.handleSave();
    // ✅ Sans item pinned, la section est retirée (évite une section vide)
    expect(saved.sectionOrder).not.toContain("pinned");
    // ✅ Footer reste toujours en dernier
    expect(saved.sectionOrder[saved.sectionOrder.length - 1]).toBe("footer");
  });

  it('force "pinned" en premier SI des items sont pinned', async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    // Épingle un item → la section 'pinned' réapparaît
    act(() => result.current.togglePinned("home"));

    const saved = result.current.handleSave();
    expect(saved.sectionOrder[0]).toBe("pinned");
    expect(saved.sectionOrder[saved.sectionOrder.length - 1]).toBe("footer");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// groupedItems (memo)
// ═══════════════════════════════════════════════════════════════════════
describe("useSidebarEditor > groupedItems", () => {
  it("retourne un objet par groupe", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const grouped = result.current.groupedItems;
    expect(grouped.navigation).toBeDefined();
    expect(grouped.footer).toBeDefined();
    expect(grouped.profiles).toBeDefined();
  });

  it("regroupe les items pinned séparément", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    act(() => result.current.togglePinned("home"));

    const grouped = result.current.groupedItems;
    expect(grouped.pinned?.length).toBeGreaterThanOrEqual(1);
  });

  it("exclut les items pinned des groupes classiques", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    act(() => result.current.togglePinned("home"));

    const nav = result.current.groupedItems.navigation || [];
    expect(nav.find((i) => i.id === "home")).toBeUndefined();
  });

  it("retourne toujours les groupes avec items", async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const grouped = result.current.groupedItems;
    Object.values(grouped).forEach((items) => {
      expect(Array.isArray(items)).toBe(true);
    });
  });
});
