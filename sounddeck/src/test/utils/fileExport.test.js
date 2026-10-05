// src/test/utils/fileExport.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@shared/utils/logger", () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
}));

import { saveAudioBuffer } from "@shared/utils/fileExport";

let mockClick;
let mockAppendChild;
let mockRemoveChild;
let mockCreateObjectURL;
let mockRevokeObjectURL;

beforeEach(() => {
  global.window.electronAPI = {};

  mockCreateObjectURL = vi.fn(() => "blob:fake-url");
  mockRevokeObjectURL = vi.fn();
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;

  mockClick = vi.fn();
  mockAppendChild = vi
    .spyOn(document.body, "appendChild")
    .mockImplementation(() => {});
  mockRemoveChild = vi
    .spyOn(document.body, "removeChild")
    .mockImplementation(() => {});

  // Mock createElement pour intercepter le <a>
  const originalCreate = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tag) => {
    if (tag === "a") {
      return { href: "", download: "", click: mockClick };
    }
    return originalCreate(tag);
  });
});

afterEach(() => {
  mockAppendChild.mockRestore();
  mockRemoveChild.mockRestore();
  vi.restoreAllMocks();
});

describe("saveAudioBuffer", () => {
  it("retourne erreur sans outputPath", async () => {
    const result = await saveAudioBuffer(new Uint8Array([1, 2]), null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("manquant");
  });

  it("utilise writeSoundFile en priorité", async () => {
    window.electronAPI.writeSoundFile = vi.fn().mockResolvedValue({
      success: true,
      path: "/out.wav",
    });

    const result = await saveAudioBuffer(new Uint8Array([1, 2]), "/out.wav");
    expect(result.success).toBe(true);
    expect(result.path).toBe("/out.wav");
    expect(window.electronAPI.writeSoundFile).toHaveBeenCalledWith(
      "/out.wav",
      [1, 2],
    );
  });

  it("fallback saveFileDialog si writeSoundFile échoue", async () => {
    window.electronAPI.writeSoundFile = vi
      .fn()
      .mockResolvedValue({ success: false });
    window.electronAPI.saveFileDialog = vi.fn().mockResolvedValue({
      success: true,
      path: "/saved.wav",
    });

    const result = await saveAudioBuffer(new Uint8Array([1]), "/out.wav");
    expect(result.success).toBe(true);
    expect(result.path).toBe("/saved.wav");
  });

  it("fallback exportAudioFile si les 2 premiers échouent", async () => {
    window.electronAPI.writeSoundFile = vi
      .fn()
      .mockResolvedValue({ success: false });
    window.electronAPI.saveFileDialog = vi
      .fn()
      .mockResolvedValue({ success: false });
    window.electronAPI.exportAudioFile = vi.fn().mockResolvedValue({
      success: true,
      path: "/exported.wav",
    });

    const result = await saveAudioBuffer(new Uint8Array([1]), "/out.wav");
    expect(result.success).toBe(true);
    expect(result.path).toBe("/exported.wav");
  });

  it("fallback download navigateur si tout échoue", async () => {
    // Aucune API electron
    const result = await saveAudioBuffer(new Uint8Array([1]), "/out.wav");
    expect(result.success).toBe(true);
    expect(result.downloaded).toBe(true);
    expect(result.path).toContain("download://");
    expect(mockClick).toHaveBeenCalled();
    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it("utilise le basename du path pour saveFileDialog", async () => {
    window.electronAPI.writeSoundFile = vi
      .fn()
      .mockResolvedValue({ success: false });
    window.electronAPI.saveFileDialog = vi.fn().mockResolvedValue({
      success: true,
      path: "/saved.wav",
    });

    await saveAudioBuffer(new Uint8Array([1]), "/folder/sub/file.wav");
    expect(window.electronAPI.saveFileDialog).toHaveBeenCalledWith(
      "file.wav",
      expect.anything(),
    );
  });

  it("extrait le basename sur un path avec slash", async () => {
    window.electronAPI.writeSoundFile = vi
      .fn()
      .mockResolvedValue({ success: false });
    window.electronAPI.saveFileDialog = vi.fn().mockResolvedValue({
      success: true,
      path: "/saved.wav",
    });

    await saveAudioBuffer(new Uint8Array([1]), "/folder/sub/file.wav");
    expect(window.electronAPI.saveFileDialog).toHaveBeenCalledWith(
      "file.wav",
      expect.anything(),
    );
  });

  it("BUG CONNU : path 100% backslash → pas de basename", async () => {
    window.electronAPI.writeSoundFile = vi
      .fn()
      .mockResolvedValue({ success: false });
    window.electronAPI.saveFileDialog = vi.fn().mockResolvedValue({
      success: true,
      path: "/saved.wav",
    });

    await saveAudioBuffer(new Uint8Array([1]), "C:\\folder\\file.wav");

    // ⚠️ Le code fait `split('/').pop() || split('\\').pop()` — mais le
    //    1er retourne la string ENTIÈRE (car pas de '/') donc le `||` ne
    //    passe jamais au 2ᵉ. Le nom complet est passé à saveFileDialog.
    //    → BUG : un path Windows arrive entier au lieu du basename.
    //    TODO : inverser l'ordre des splits ou utiliser path.basename.
    expect(window.electronAPI.saveFileDialog).toHaveBeenCalledWith(
      "C:\\folder\\file.wav",
      expect.anything(),
    );
  });

  it("convertit un ArrayBuffer en Uint8Array", async () => {
    window.electronAPI.writeSoundFile = vi.fn().mockResolvedValue({
      success: true,
      path: "/out.wav",
    });

    await saveAudioBuffer(new ArrayBuffer(8), "/out.wav");
    expect(window.electronAPI.writeSoundFile).toHaveBeenCalled();
    const [, data] = window.electronAPI.writeSoundFile.mock.calls[0];
    expect(Array.isArray(data)).toBe(true);
  });

  it("gère exception writeSoundFile et passe au suivant", async () => {
    window.electronAPI.writeSoundFile = vi
      .fn()
      .mockRejectedValue(new Error("boom"));
    window.electronAPI.saveFileDialog = vi.fn().mockResolvedValue({
      success: true,
      path: "/saved.wav",
    });

    const result = await saveAudioBuffer(new Uint8Array([1]), "/out.wav");
    expect(result.success).toBe(true);
    expect(result.path).toBe("/saved.wav");
  });

  it("retourne erreur si download navigateur throw", async () => {
    mockCreateObjectURL.mockImplementation(() => {
      throw new Error("url fail");
    });
    const result = await saveAudioBuffer(new Uint8Array([1]), "/out.wav");
    expect(result.success).toBe(false);
  });
});
