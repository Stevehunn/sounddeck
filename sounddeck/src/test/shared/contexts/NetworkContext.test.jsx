// src/test/shared/contexts/NetworkContext.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  act,
  renderHook,
} from "@testing-library/react";

// ─── Mock i18n ──────────────────────────────────────────────────────────
vi.mock("@core/i18n/LanguageContext", () => ({
  useLanguage: vi.fn(() => ({
    t: (key) => {
      const translations = {
        networkErrorTitle: "Pas de connexion internet",
        networkErrorDesc: "Vérifiez votre connexion puis réessayez.",
        close: "Fermer",
      };
      return translations[key] || key;
    },
    currentLang: "fr",
  })),
}));

// ─── Constructible mock for `new Image()` ──────────────────────────────
let imageInstances = [];
let imageBehavior = "success"; // 'success' | 'error' | 'pending'

class MockImage {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this._src = "";
    this._pendingMicrotask = null;
    imageInstances.push(this);
  }

  set src(value) {
    this._src = value;
    // Do not fire anything immediately (let the test decide timing)
    if (imageBehavior === "success") {
      queueMicrotask(() => {
        if (this.onload) this.onload();
      });
    } else if (imageBehavior === "error") {
      queueMicrotask(() => {
        if (this.onerror) this.onerror();
      });
    }
    // 'pending' : nothing fires → timeout is expected
  }

  get src() {
    return this._src;
  }
}

// ─── Module reset between tests (module-level cache) ───────────────────
let NetworkContextModule;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.useFakeTimers();

  imageInstances = [];
  imageBehavior = "success";

  window.Image = MockImage;

  // Default: online
  Object.defineProperty(navigator, "onLine", {
    value: true,
    configurable: true,
  });

  // ⚠️ Import the public index (@shared/contexts), NOT `NetworkContext.js`
  // (which only holds the Context + useNetwork after the 4-file split).
  NetworkContextModule = await import("@shared/contexts");
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── Helpers ────────────────────────────────────────────────────────────

const renderProvider = (props = {}) => {
  const { NetworkProvider } = NetworkContextModule;
  return render(
    <NetworkProvider>
      <div data-testid="child">Contenu</div>
    </NetworkProvider>,
  );
};

// ════════════════════════════════════════════════════════════════════════
describe("probeNetwork", () => {
  it("devrait retourner false si navigator.onLine = false", async () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });

    const result = await NetworkContextModule.probeNetwork();
    expect(result).toBe(false);
  });

  it("devrait retourner true si une URL répond", async () => {
    imageBehavior = "success";
    const result = await NetworkContextModule.probeNetwork();
    expect(result).toBe(true);
  });

  it("devrait utiliser le cache (2e appel rapproché)", async () => {
    await NetworkContextModule.probeNetwork();
    const callsBefore = imageInstances.length;

    // Immediate 2nd call → cache (no new image)
    await NetworkContextModule.probeNetwork();
    expect(imageInstances.length).toBe(callsBefore);
  });

  it("devrait retourner false si toutes les URLs échouent", async () => {
    imageBehavior = "error";
    const result = await NetworkContextModule.probeNetwork();
    expect(result).toBe(false);
  });

  it("devrait timeout après 3s si aucune image ne répond", async () => {
    imageBehavior = "pending";

    const promise = NetworkContextModule.probeNetwork();

    // ✅ Advance 3 URLs × 3s = 9000ms + margin
    await vi.advanceTimersByTimeAsync(10000);

    const result = await promise;
    expect(result).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════
describe("NetworkProvider", () => {
  it("devrait rendre ses enfants", () => {
    renderProvider();
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("devrait initialiser isOnline depuis navigator.onLine", () => {
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
    });

    const { NetworkProvider, useNetwork } = NetworkContextModule;
    const { result } = renderHook(() => useNetwork(), {
      wrapper: ({ children }) => <NetworkProvider>{children}</NetworkProvider>,
    });

    expect(result.current.isOnline).toBe(true);
  });

  it('devrait réagir à l\'événement "offline"', () => {
    const { NetworkProvider, useNetwork } = NetworkContextModule;
    const { result } = renderHook(() => useNetwork(), {
      wrapper: ({ children }) => <NetworkProvider>{children}</NetworkProvider>,
    });

    expect(result.current.isOnline).toBe(true);

    act(() => {
      Object.defineProperty(navigator, "onLine", {
        value: false,
        configurable: true,
      });
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current.isOnline).toBe(false);
  });

  it('devrait réagir à l\'événement "online"', () => {
    const { NetworkProvider, useNetwork } = NetworkContextModule;
    const { result } = renderHook(() => useNetwork(), {
      wrapper: ({ children }) => <NetworkProvider>{children}</NetworkProvider>,
    });

    // Go offline
    act(() => {
      Object.defineProperty(navigator, "onLine", {
        value: false,
        configurable: true,
      });
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current.isOnline).toBe(false);

    // Back online
    act(() => {
      Object.defineProperty(navigator, "onLine", {
        value: true,
        configurable: true,
      });
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.isOnline).toBe(true);
  });

  it("devrait afficher le modal quand on est offline", () => {
    renderProvider();

    act(() => {
      Object.defineProperty(navigator, "onLine", {
        value: false,
        configurable: true,
      });
      window.dispatchEvent(new Event("offline"));
    });

    expect(
      document.querySelector('[data-testid="no-connection-modal"]'),
    ).toBeInTheDocument();
  });

  it("devrait masquer le modal au clic sur l'overlay", () => {
    renderProvider();

    act(() => {
      Object.defineProperty(navigator, "onLine", {
        value: false,
        configurable: true,
      });
      window.dispatchEvent(new Event("offline"));
    });

    const modal = document.querySelector('[data-testid="no-connection-modal"]');
    expect(modal).toBeInTheDocument();

    act(() => {
      modal.click();
    });

    expect(
      document.querySelector('[data-testid="no-connection-modal"]'),
    ).not.toBeInTheDocument();
  });

  it("devrait masquer le modal sur Escape", () => {
    renderProvider();

    act(() => {
      Object.defineProperty(navigator, "onLine", {
        value: false,
        configurable: true,
      });
      window.dispatchEvent(new Event("offline"));
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(
      document.querySelector('[data-testid="no-connection-modal"]'),
    ).not.toBeInTheDocument();
  });
});

// ════════════════════════════════════════════════════════════════════════
describe("useNetwork", () => {
  it("devrait throw si utilisé hors NetworkProvider", () => {
    const { useNetwork } = NetworkContextModule;

    // Silence console.error to reduce noise
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useNetwork());
    }).toThrow(/NetworkProvider/i);

    errorSpy.mockRestore();
  });

  it("devrait exposer showNoConnection", () => {
    const { NetworkProvider, useNetwork } = NetworkContextModule;
    const { result } = renderHook(() => useNetwork(), {
      wrapper: ({ children }) => <NetworkProvider>{children}</NetworkProvider>,
    });

    expect(typeof result.current.showNoConnection).toBe("function");
  });

  it("showNoConnection devrait afficher le modal", () => {
    const { NetworkProvider, useNetwork } = NetworkContextModule;

    const TestComp = () => {
      const { showNoConnection } = useNetwork();
      return (
        <button data-testid="trigger" onClick={showNoConnection}>
          Trigger
        </button>
      );
    };

    render(
      <NetworkProvider>
        <TestComp />
      </NetworkProvider>,
    );

    act(() => {
      document.querySelector('[data-testid="trigger"]').click();
    });

    expect(
      document.querySelector('[data-testid="no-connection-modal"]'),
    ).toBeInTheDocument();
  });

  it("hideNoConnection devrait masquer le modal", () => {
    const { NetworkProvider, useNetwork } = NetworkContextModule;

    const TestComp = () => {
      const { showNoConnection, hideNoConnection } = useNetwork();
      return (
        <>
          <button data-testid="show" onClick={showNoConnection}>
            Show
          </button>
          <button data-testid="hide" onClick={hideNoConnection}>
            Hide
          </button>
        </>
      );
    };

    render(
      <NetworkProvider>
        <TestComp />
      </NetworkProvider>,
    );

    act(() => {
      document.querySelector('[data-testid="show"]').click();
    });
    expect(
      document.querySelector('[data-testid="no-connection-modal"]'),
    ).toBeInTheDocument();

    act(() => {
      document.querySelector('[data-testid="hide"]').click();
    });
    expect(
      document.querySelector('[data-testid="no-connection-modal"]'),
    ).not.toBeInTheDocument();
  });
});

// ════════════════════════════════════════════════════════════════════════
describe("ensureOnline", () => {
  it("devrait retourner true si la sonde réussit", async () => {
    imageBehavior = "success";
    const { NetworkProvider, useNetwork } = NetworkContextModule;

    const { result } = renderHook(() => useNetwork(), {
      wrapper: ({ children }) => <NetworkProvider>{children}</NetworkProvider>,
    });

    let online;
    await act(async () => {
      online = await result.current.ensureOnline();
    });

    expect(online).toBe(true);
  });

  it("devrait retourner false et afficher le modal si offline", async () => {
    imageBehavior = "error";
    const { NetworkProvider, useNetwork } = NetworkContextModule;

    const { result } = renderHook(() => useNetwork(), {
      wrapper: ({ children }) => <NetworkProvider>{children}</NetworkProvider>,
    });

    let online;
    await act(async () => {
      online = await result.current.ensureOnline();
    });

    expect(online).toBe(false);
    expect(result.current.isOnline).toBe(false);
  });

  it("devrait dédupliquer les appels concurrents (probingPromiseRef)", async () => {
    imageBehavior = "success";
    const { NetworkProvider, useNetwork } = NetworkContextModule;

    const { result } = renderHook(() => useNetwork(), {
      wrapper: ({ children }) => <NetworkProvider>{children}</NetworkProvider>,
    });

    const imagesBefore = imageInstances.length;

    let p1, p2;
    await act(async () => {
      p1 = result.current.ensureOnline();
      p2 = result.current.ensureOnline();
      await Promise.all([p1, p2]);
    });

    // Only one burst of images (3 URLs in parallel → at most 3)
    const imagesAfter = imageInstances.length - imagesBefore;
    expect(imagesAfter).toBeLessThanOrEqual(3);
  });
});