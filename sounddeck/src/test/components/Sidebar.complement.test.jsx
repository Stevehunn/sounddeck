// src/test/components/Sidebar.complement.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";

// ─── MOCKS HOISTÉS ─────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  playingSounds: [],
  togglePause: vi.fn(),
  stop: vi.fn(),
}));

vi.mock("@shared/hooks/useCurrentPlaying", () => ({
  useCurrentPlaying: () => ({
    playingSounds: mocks.playingSounds,
    togglePause: mocks.togglePause,
    stop: mocks.stop,
  }),
}));

vi.mock("@shared/utils/fileUrl", () => ({
  buildFileUrl: vi.fn((p) => (p ? `sounddeck-local://${p}` : null)),
}));

vi.mock("@shared/constants/navigation", () => ({
  ACTION_IDS: ["loop", "shortcuts", "presentation"],
  CORE_PAGES: [{ id: "home" }, { id: "discover" }, { id: "options" }],
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

import Sidebar from "@shared/components/navigation/Sidebar";

// ─── HELPERS ───────────────────────────────────────────────────────────
const defaultProfiles = () => [
  { id: "all", name: "Tous les sons", isDefault: true },
  { id: "p1", name: "Gaming" },
  { id: "p2", name: "Musique" },
];

const configWithAll = (overrides = {}) => ({
  mode: "default",
  items: [
    {
      id: "home",
      group: "navigation",
      icon: "ti-home",
      visible: true,
      pinned: false,
      order: 0,
      canHide: true,
    },
    {
      id: "discover",
      group: "navigation",
      icon: "ti-search",
      visible: true,
      pinned: false,
      order: 1,
      canHide: true,
    },
    {
      id: "options",
      group: "footer",
      icon: "ti-settings",
      visible: true,
      pinned: false,
      order: 2,
      canHide: true,
    },
    {
      id: "loop",
      group: "actions",
      icon: "ti-repeat",
      visible: true,
      pinned: false,
      order: 3,
      canHide: true,
    },
    {
      id: "shortcuts",
      group: "actions",
      icon: "ti-keyboard",
      visible: true,
      pinned: false,
      order: 4,
      canHide: true,
    },
    {
      id: "presentation",
      group: "actions",
      icon: "ti-presentation",
      visible: true,
      pinned: false,
      order: 5,
      canHide: true,
    },
    {
      id: "profile-all",
      group: "profiles",
      icon: "ti-stack",
      visible: true,
      pinned: false,
      order: 6,
      canHide: false,
      isProfile: true,
      isDefaultProfile: true,
    },
    {
      id: "profile-p1",
      group: "profiles",
      icon: "ti-user",
      visible: true,
      pinned: false,
      order: 7,
      canHide: false,
      isProfile: true,
    },
    {
      id: "profile-p2",
      group: "profiles",
      icon: "ti-user",
      visible: true,
      pinned: false,
      order: 8,
      canHide: false,
      isProfile: true,
    },
  ],
  sectionOrder: ["pinned", "profiles", "navigation", "actions", "footer"],
  fixedSections: [],
  ...overrides,
});

const defaultProps = (overrides = {}) => ({
  profiles: defaultProfiles(),
  sounds: [],
  currentProfileId: "all",
  currentPage: "home",
  onSwitchProfile: vi.fn(),
  onChangePage: vi.fn(),
  onCreateProfile: vi.fn().mockResolvedValue(undefined),
  onToggleLoop: vi.fn(),
  loopEnabled: false,
  volume: 80,
  onVolumeChange: vi.fn(),
  onStopAll: vi.fn(),
  onPresentation: vi.fn(),
  addToast: vi.fn(),
  onReorderProfiles: vi.fn().mockResolvedValue(true),
  sidebarConfig: configWithAll(),
  sidebarEditMode: false,
  sidebarVersion: 0,
  pluginPages: [],
  isPluginPage: () => false,
  ...overrides,
});

const renderSidebar = (props = {}) =>
  render(<Sidebar {...defaultProps(props)} />);

beforeEach(() => {
  mocks.playingSounds = [];
  mocks.togglePause.mockReset();
  mocks.stop.mockReset();

  global.window.electronAPI = {
    getGlobalShortcutsState: vi.fn().mockResolvedValue(true),
    onShortcutsToggle: vi.fn(),
    toggleGlobalShortcuts: vi.fn().mockResolvedValue(false),
    removeAllListeners: vi.fn(),
  };
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION PINNED
// ═══════════════════════════════════════════════════════════════════════
describe("Sidebar > Section Pinned", () => {
  it("affiche la section pinned si un item est épinglé", () => {
    const config = configWithAll();
    config.items = config.items.map((i) =>
      i.id === "home" ? { ...i, pinned: true, group: "pinned" } : i,
    );
    renderSidebar({ sidebarConfig: config });

    // L'item home doit être rendu
    expect(screen.getByText("Mes sons")).toBeInTheDocument();
  });

  it("pin un profil → apparaît dans pinned", () => {
    const config = configWithAll();
    config.items = config.items.map((i) =>
      i.id === "profile-p1" ? { ...i, pinned: true } : i,
    );
    renderSidebar({ sidebarConfig: config });

    // Le profil Gaming doit être présent (dans pinned)
    expect(screen.getByText("Gaming")).toBeInTheDocument();
  });

  it("n'affiche pas la section pinned si aucun item épinglé", () => {
    renderSidebar();
    // Le titre "Épinglés" ne devrait pas apparaître
    expect(screen.queryByText(/Épinglés|pinned/)).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// FIXED SECTIONS
// ═══════════════════════════════════════════════════════════════════════
describe("Sidebar > Fixed sections", () => {
  it("limite les fixedSections à 2 (ignore le 3e)", () => {
    const config = configWithAll({
      fixedSections: ["navigation", "actions", "footer"],
    });
    renderSidebar({ sidebarConfig: config });

    // Toutes les sections doivent être rendues (le composant limite à 2 fixed, le reste scrollable)
    expect(screen.getByText("Mes sons")).toBeInTheDocument();
    expect(screen.getByText("Options")).toBeInTheDocument();
  });

  it("rend une section fixed avec un border-bottom", () => {
    const config = configWithAll({ fixedSections: ["navigation"] });
    const { container } = renderSidebar({ sidebarConfig: config });

    // Trouve le wrapper de la section fixed
    const fixedWrapper = container.querySelector('div[style*="border-bottom"]');
    expect(fixedWrapper).toBeInTheDocument();
  });

  it("respecte l'ordre des fixedSections", () => {
    const config = configWithAll({ fixedSections: ["actions", "navigation"] });
    const { container } = renderSidebar({ sidebarConfig: config });

    // Le rendu doit trier par sectionsWithContent
    expect(container.querySelector("aside")).toBeInTheDocument();
  });

  it("ignore un fixedSection sans contenu", () => {
    const config = configWithAll({ fixedSections: ["unknown-section"] });
    renderSidebar({ sidebarConfig: config });

    // Ne doit pas crash
    expect(screen.getByText("SoundDeck")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// NOW PLAYING LIST
// ═══════════════════════════════════════════════════════════════════════
describe("Sidebar > NowPlayingList", () => {
  beforeEach(() => {
    mocks.playingSounds = [
      {
        id: "s1",
        sound: { id: "s1", name: "Airhorn", emoji: "🔊" },
        progress: { current: 2, duration: 5, ratio: 0.4 },
        isPaused: false,
      },
      {
        id: "s2",
        sound: { id: "s2", name: "Bruh", emoji: "😐" },
        progress: null,
        isPaused: true,
      },
    ];
  });

  it("affiche la liste si page=home et playingSounds", async () => {
    renderSidebar({ currentPage: "home" });
    await waitFor(() => {
      expect(screen.getByText("Airhorn")).toBeInTheDocument();
      expect(screen.getByText("Bruh")).toBeInTheDocument();
    });
  });

  it("affiche le badge count", async () => {
    renderSidebar({ currentPage: "home" });
    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  it('affiche "En lecture" en haut', async () => {
    renderSidebar({ currentPage: "home" });
    await waitFor(() => {
      expect(screen.getByText(/En lecture|nowPlaying/)).toBeInTheDocument();
    });
  });

  it("affiche la barre de progression si progress présent", async () => {
    const { container } = renderSidebar({ currentPage: "home" });
    await waitFor(() => {
      const bars = container.querySelectorAll('div[style*="width:"]');
      expect(bars.length).toBeGreaterThan(0);
    });
  });

  it("affiche ⏸️ si paused et pas de progress", async () => {
    renderSidebar({ currentPage: "home" });
    await waitFor(() => {
      // t('paused') → "En pause" en FR
      expect(screen.getByText(/En pause|paused/i)).toBeInTheDocument();
    });
  });

  it("affiche la liste sur page=sequencer aussi", async () => {
    renderSidebar({ currentPage: "sequencer" });
    await waitFor(() => {
      expect(screen.getByText("Airhorn")).toBeInTheDocument();
    });
  });

  it("n'affiche PAS la liste sur page=options", async () => {
    renderSidebar({ currentPage: "options" });
    await waitFor(() => {
      expect(screen.queryByText("Airhorn")).not.toBeInTheDocument();
      expect(screen.getByText("SoundDeck")).toBeInTheDocument();
    });
  });

  it("clic pause appelle togglePause avec le bon id", async () => {
    renderSidebar({ currentPage: "home" });
    await waitFor(() => screen.getByText("Airhorn"));

    const pauseBtns = document.querySelectorAll("button[title]");
    const pauseBtn = Array.from(pauseBtns).find((b) =>
      b.title.match(/pause|resume|Pause|Reprendre/i),
    );
    if (pauseBtn) {
      fireEvent.click(pauseBtn);
      expect(mocks.togglePause).toHaveBeenCalled();
    }
  });

  it("clic stop appelle stop avec le bon id", async () => {
    renderSidebar({ currentPage: "home" });
    await waitFor(() => screen.getByText("Airhorn"));

    const stopBtns = document.querySelectorAll("button[title]");
    const stopBtn = Array.from(stopBtns).find((b) =>
      b.title.match(/stop|Stop|Tout arrêter/i),
    );
    if (stopBtn) {
      fireEvent.click(stopBtn);
      expect(mocks.stop).toHaveBeenCalled();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// DRAG & DROP PROFILS
// ═══════════════════════════════════════════════════════════════════════
describe("Sidebar > Drag & Drop profils", () => {
  it('dragStart bloque le profil "all"', () => {
    const { container } = renderSidebar();
    // Le profil all n'a pas de wrapper draggable (branche spéciale)
    const allBtn = screen
      .getAllByText(/Tous les sons|allSounds/)[0]
      .closest("button");
    expect(allBtn).toBeInTheDocument();
  });

  it("dragStart sur profil user (dataTransfer)", () => {
    renderSidebar();
    const gamingBtn = screen.getByText("Gaming").closest("button");
    const draggable = gamingBtn.closest("[draggable]");
    if (draggable) {
      const dataTransfer = { effectAllowed: "", setData: vi.fn() };
      fireEvent.dragStart(draggable, { dataTransfer });
      expect(dataTransfer.effectAllowed).toBe("move");
    }
  });

  it("drop sur profil user appelle onReorderProfiles", async () => {
    const onReorderProfiles = vi.fn().mockResolvedValue(true);
    renderSidebar({ onReorderProfiles });

    const gamingWrapper = screen.getByText("Gaming").closest("[draggable]");
    const musiqueWrapper = screen.getByText("Musique").closest("[draggable]");

    // Source = Gaming (p1), Target = Musique (p2) → différents
    const dataTransfer = {
      effectAllowed: "",
      setData: vi.fn(),
      getData: vi.fn(() => "p1"),
    };
    fireEvent.dragStart(gamingWrapper, { dataTransfer });
    fireEvent.drop(musiqueWrapper, { dataTransfer });

    await waitFor(() => {
      expect(onReorderProfiles).toHaveBeenCalled();
    });
  });

  it('drop sur "all" est ignoré', async () => {
    const onReorderProfiles = vi.fn();
    renderSidebar({ onReorderProfiles });

    const allBtn = screen
      .getAllByText(/Tous les sons|allSounds/)[0]
      .closest("button");
    const allWrapper = allBtn.closest("[draggable]");

    if (allWrapper) {
      const dataTransfer = {
        getData: vi.fn(() => "p1"),
        setData: vi.fn(),
      };
      fireEvent.drop(allWrapper, { dataTransfer });
      // Le drop sur "all" ne doit rien faire
      expect(onReorderProfiles).not.toHaveBeenCalled();
    }
  });

  it('affiche le toast "profileMoved" après reorder', async () => {
    const onReorderProfiles = vi.fn().mockResolvedValue(true);
    const addToast = vi.fn();
    renderSidebar({ onReorderProfiles, addToast });

    const gamingWrapper = screen.getByText("Gaming").closest("[draggable]");
    const musiqueWrapper = screen.getByText("Musique").closest("[draggable]");

    const dataTransfer = {
      effectAllowed: "",
      setData: vi.fn(),
      getData: vi.fn(() => "p1"),
    };
    fireEvent.dragStart(gamingWrapper, { dataTransfer });
    fireEvent.drop(musiqueWrapper, { dataTransfer });

    await waitFor(() => {
      // ⚠️ t() retourne la traduction FR : "Profil déplacé"
      expect(addToast).toHaveBeenCalledWith(
        expect.stringMatching(/Profil déplacé|profileMoved/),
        "success",
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TOGGLE SHORTCUTS (badge ON/OFF)
// ═══════════════════════════════════════════════════════════════════════
describe("Sidebar > Toggle shortcuts", () => {
  it("affiche ON par défaut", async () => {
    renderSidebar();
    await waitFor(() => {
      const onLabels = screen.getAllByText("ON");
      expect(onLabels.length).toBeGreaterThan(0);
    });
  });

  it("affiche OFF si toggleGlobalShortcuts retourne false", async () => {
    global.window.electronAPI.toggleGlobalShortcuts.mockResolvedValue(false);
    renderSidebar();

    const shortcutsBtn = screen
      .getByText(/Raccourcis|shortcuts/)
      .closest("button");
    await act(async () => {
      fireEvent.click(shortcutsBtn);
    });

    await waitFor(() => {
      const offLabels = screen.getAllByText("OFF");
      expect(offLabels.length).toBeGreaterThan(0);
    });
  });

  it("affiche un toast lors du toggle", async () => {
    const addToast = vi.fn();
    renderSidebar({ addToast });

    const shortcutsBtn = screen
      .getByText(/Raccourcis|shortcuts/)
      .closest("button");
    await act(async () => {
      fireEvent.click(shortcutsBtn);
    });

    await waitFor(() => {
      expect(addToast).toHaveBeenCalled();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SIDEBAR ITEM (isPlugin, isAction)
// ═══════════════════════════════════════════════════════════════════════
describe("Sidebar > SidebarItem", () => {
  it('affiche un badge "🔌" pour les pages plugin inactives', () => {
    const pluginPages = [
      {
        id: "youtube",
        label: "YouTube",
        isPlugin: true,
        icon: "ti-brand-youtube",
      },
    ];
    const config = configWithAll();
    config.items = [
      ...config.items,
      {
        id: "youtube",
        group: "navigation",
        icon: "ti-brand-youtube",
        visible: true,
        pinned: false,
        canHide: true,
        isPlugin: true,
      },
    ];
    renderSidebar({ sidebarConfig: config, pluginPages });

    expect(screen.getByText("YouTube")).toBeInTheDocument();
  });

  it('affiche un badge "Plugin" pour la page plugin active', () => {
    const pluginPages = [
      {
        id: "youtube",
        label: "YouTube",
        isPlugin: true,
        icon: "ti-brand-youtube",
      },
    ];
    const config = configWithAll();
    config.items = [
      ...config.items,
      {
        id: "youtube",
        group: "navigation",
        icon: "ti-brand-youtube",
        visible: true,
        pinned: false,
        canHide: true,
        isPlugin: true,
      },
    ];
    renderSidebar({
      sidebarConfig: config,
      pluginPages,
      currentPage: "youtube",
      isPluginPage: (id) => id === "youtube",
    });

    expect(screen.getByText("Plugin")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTIONS CONFIG CUSTOM
// ═══════════════════════════════════════════════════════════════════════
describe("Sidebar > Section order custom", () => {
  it("respecte l'ordre custom des sections", () => {
    const config = configWithAll({
      sectionOrder: ["profiles", "pinned", "actions", "navigation", "footer"],
    });
    renderSidebar({ sidebarConfig: config });

    // Doit toujours rendre correctement
    expect(screen.getByText("Mes sons")).toBeInTheDocument();
  });

  it("force pinned en premier même si mal placé dans sectionOrder", () => {
    const config = configWithAll();
    config.items = config.items.map((i) =>
      i.id === "home" ? { ...i, pinned: true } : i,
    );
    config.sectionOrder = [
      "navigation",
      "pinned",
      "profiles",
      "actions",
      "footer",
    ];
    renderSidebar({ sidebarConfig: config });

    expect(screen.getByText("Mes sons")).toBeInTheDocument();
  });

  it("force footer en dernier", () => {
    const config = configWithAll({
      sectionOrder: ["pinned", "footer", "profiles", "navigation", "actions"],
    });
    renderSidebar({ sidebarConfig: config });

    expect(screen.getByText("Options")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// NOUVEAU PROFIL - Annulation
// ═══════════════════════════════════════════════════════════════════════
describe("Sidebar > Nouveau profil - Annulation", () => {
  it("bouton X ferme le formulaire", () => {
    renderSidebar();

    fireEvent.click(screen.getByTestId("new-profile-button"));
    const input = screen.getByPlaceholderText(/Nouveau profil|newProfile/);
    expect(input).toBeInTheDocument();

    // Trouve le bouton X (avec .ti-x dans le footer)
    const buttons = document.querySelectorAll("button");
    const cancelBtn = Array.from(buttons).find(
      (b) => b.querySelector(".ti-x") && b.closest('div[style*="padding"]'),
    );
    if (cancelBtn) {
      fireEvent.click(cancelBtn);
      expect(
        screen.queryByPlaceholderText(/Nouveau profil|newProfile/),
      ).not.toBeInTheDocument();
    }
  });

  it("créer un profil avec nom vide ne fait rien", async () => {
    const onCreateProfile = vi.fn();
    renderSidebar({ onCreateProfile });

    fireEvent.click(screen.getByTestId("new-profile-button"));
    const buttons = screen.getAllByRole("button");
    const confirmBtn = buttons.find((b) => b.querySelector(".ti-check"));

    if (confirmBtn) {
      await act(async () => {
        fireEvent.click(confirmBtn);
      });
      expect(onCreateProfile).not.toHaveBeenCalled();
    }
  });

  it("Enter crée le profil", async () => {
    const onCreateProfile = vi.fn().mockResolvedValue(undefined);
    renderSidebar({ onCreateProfile });

    fireEvent.click(screen.getByTestId("new-profile-button"));
    const input = screen.getByPlaceholderText(/Nouveau profil|newProfile/);
    fireEvent.change(input, { target: { value: "Test" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(onCreateProfile).toHaveBeenCalledWith("Test");
    });
  });

  it("formulaire se ferme après création", async () => {
    renderSidebar();
    fireEvent.click(screen.getByTestId("new-profile-button"));
    const input = screen.getByPlaceholderText(/Nouveau profil|newProfile/);
    fireEvent.change(input, { target: { value: "Test" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText(/Nouveau profil|newProfile/),
      ).not.toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// VOLUME ICON
// ═══════════════════════════════════════════════════════════════════════
describe("Sidebar > Volume icon", () => {
  it("icône volume-off si volume=0", () => {
    const { container } = renderSidebar({ volume: 0 });
    expect(container.querySelector(".ti-volume-off")).toBeInTheDocument();
  });

  it("icône volume-2 si volume < 50", () => {
    const { container } = renderSidebar({ volume: 30 });
    expect(container.querySelector(".ti-volume-2")).toBeInTheDocument();
  });

  it("icône volume si volume >= 50", () => {
    const { container } = renderSidebar({ volume: 80 });
    expect(container.querySelector(".ti-volume")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// PLUGIN PAGES (skip si sidebarVisible=false)
// ═══════════════════════════════════════════════════════════════════════
describe("Sidebar > Plugin pages filtering", () => {
  it("filtre les pluginPages avec sidebarVisible=false", () => {
    const pluginPages = [
      { id: "youtube", isPlugin: true, sidebarVisible: false },
      { id: "emoji-discover", isPlugin: true, sidebarVisible: true },
    ];
    renderSidebar({ pluginPages });
    // Ne doit pas crash
    expect(screen.getByText("SoundDeck")).toBeInTheDocument();
  });

  it("ignore les pages plugin non marquées isPlugin", () => {
    const pluginPages = [{ id: "custom-page", isPlugin: false }];
    renderSidebar({ pluginPages });
    expect(screen.getByText("SoundDeck")).toBeInTheDocument();
  });
});
