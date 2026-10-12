// src/test/core/plugins/PluginManager/licenseManager.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── MOCKS ─────────────────────────────────────────────────────────────
vi.mock("@shared/utils/logger", () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

// ⚠️ État mutable partagé AVEC les factories de mock (via vi.hoisted)
const { mockState } = vi.hoisted(() => ({
  mockState: {
    publicKeyHex: "",
    revoked: new Set(),
  },
}));

// On utilise des GETTERS : la valeur est lue au moment de l'ACCÈS,
// pas au moment où Vitest appelle la factory (qui n'est appelée qu'une fois).
vi.mock("@core/plugins/PluginManager/licenseKeys", () => ({
  get PUBLIC_KEY_HEX() {
    return mockState.publicKeyHex;
  },
  TOKEN_VERSION: 1,
  TOKEN_PREFIX: "SDCK1",
  LICENSE_TIERS: {
    free: { rank: 0, label: "Free" },
    pro: { rank: 10, label: "Pro" },
    dev: { rank: 99, label: "Dev" },
  },
  isValidPublicKeyConfigured: () => {
    const k = mockState.publicKeyHex;
    return typeof k === "string" && k.length === 64 && /^[0-9a-f]+$/i.test(k);
  },
}));

vi.mock("@core/plugins/PluginManager/revokedDonors", () => ({
  get REVOKED_DONOR_IDS() {
    return mockState.revoked;
  },
  isDonorRevoked: (id) => mockState.revoked.has(id),
}));

// ─── IMPORTS RÉELS ─────────────────────────────────────────────────────
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

// ─── HELPERS ───────────────────────────────────────────────────────────
function toHex(bytes) {
  return Buffer.from(bytes).toString("hex");
}

function b64url(bytes) {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function buildSignedToken(payload, privateKey) {
  const payloadJson = JSON.stringify(payload);
  const payloadBytes = new TextEncoder().encode(payloadJson);
  const signature = await ed.signAsync(payloadBytes, privateKey);
  return `SDCK1.${b64url(payloadBytes)}.${b64url(signature)}`;
}

async function generateTestKeypair() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return { privateKey, publicKeyHex: toHex(publicKey) };
}

// ─── SETUP ─────────────────────────────────────────────────────────────
let privateKey;

beforeEach(async () => {
  vi.resetModules();
  const kp = await generateTestKeypair();
  privateKey = kp.privateKey;
  mockState.publicKeyHex = kp.publicKeyHex;
  mockState.revoked = new Set();
});

async function loadManager() {
  return await import("@core/plugins/PluginManager/licenseManager");
}

const VALID_PAYLOAD = {
  v: 1,
  tier: "pro",
  donorId: "abc-123",
  donorName: "Steve",
  issuedAt: 1735000000,
  neverExpires: true,
};

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════
describe("licenseManager.verifyLicense", () => {
  it("accepte un token valide signé", async () => {
    const token = await buildSignedToken(VALID_PAYLOAD, privateKey);
    const mgr = await loadManager();
    const result = await mgr.verifyLicense(token);

    expect(result.valid).toBe(true);
    expect(result.tier).toBe("pro");
    expect(result.donorId).toBe("abc-123");
    expect(result.donorName).toBe("Steve");
  });

  it('accepte tier="dev"', async () => {
    const token = await buildSignedToken(
      { ...VALID_PAYLOAD, tier: "dev" },
      privateKey,
    );
    const mgr = await loadManager();
    const result = await mgr.verifyLicense(token);

    expect(result.valid).toBe(true);
    expect(result.tier).toBe("dev");
    expect(result.rank).toBe(99);
  });

  it("rejette un token absent", async () => {
    const mgr = await loadManager();
    const result = await mgr.verifyLicense(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("MISSING_TOKEN");
  });

  it("rejette un token vide", async () => {
    const mgr = await loadManager();
    const result = await mgr.verifyLicense("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("MISSING_TOKEN");
  });

  it("rejette un format malformé (pas 3 parties)", async () => {
    const mgr = await loadManager();
    const result = await mgr.verifyLicense("SDCK1.onlytwo");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("MALFORMED_TOKEN");
  });

  it("rejette un préfixe inconnu", async () => {
    const token = await buildSignedToken(VALID_PAYLOAD, privateKey);
    const badToken = token.replace("SDCK1", "XXXXX");
    const mgr = await loadManager();
    const result = await mgr.verifyLicense(badToken);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("WRONG_PREFIX");
  });

  it("rejette une signature modifiée", async () => {
    const token = await buildSignedToken(VALID_PAYLOAD, privateKey);
    const parts = token.split(".");

    // ⚠️ Modifie un caractère AU MILIEU de la signature (pas à la fin).
    // En base64url sans padding, les derniers bits peuvent être ignorés
    // au décodage → modifier la fin peut ne rien changer aux bytes réels.
    const sig = parts[2];
    const midIdx = Math.floor(sig.length / 2);
    const replacement = sig[midIdx] === "A" ? "B" : "A";
    parts[2] = sig.slice(0, midIdx) + replacement + sig.slice(midIdx + 1);

    const tampered = parts.join(".");

    const mgr = await loadManager();
    const result = await mgr.verifyLicense(tampered);

    expect(result.valid).toBe(false);
    expect(["INVALID_SIGNATURE", "DECODE_ERROR"]).toContain(result.error);
  });

  it("rejette un payload modifié (signature ne matche plus)", async () => {
    const token = await buildSignedToken(VALID_PAYLOAD, privateKey);
    const parts = token.split(".");
    const tamperedPayload = { ...VALID_PAYLOAD, tier: "dev" };
    parts[1] = b64url(
      new TextEncoder().encode(JSON.stringify(tamperedPayload)),
    );
    const tampered = parts.join(".");

    const mgr = await loadManager();
    const result = await mgr.verifyLicense(tampered);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("INVALID_SIGNATURE");
  });

  it("rejette un token signé avec une mauvaise clé privée", async () => {
    const wrongKeypair = await generateTestKeypair();
    const token = await buildSignedToken(
      VALID_PAYLOAD,
      wrongKeypair.privateKey,
    );

    const mgr = await loadManager();
    const result = await mgr.verifyLicense(token);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("INVALID_SIGNATURE");
  });

  it("rejette un payload JSON invalide", async () => {
    // ✅ On SIGNE le payload "not json" avec la clé privée courante
    // → la signature est valide, c'est le parsing qui doit échouer
    const payloadBytes = new TextEncoder().encode("not json");
    const signature = await ed.signAsync(payloadBytes, privateKey);
    const token = `SDCK1.${b64url(payloadBytes)}.${b64url(signature)}`;

    const mgr = await loadManager();
    const result = await mgr.verifyLicense(token);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("BAD_PAYLOAD");
  });

  it("rejette une version non supportée", async () => {
    const token = await buildSignedToken(
      { ...VALID_PAYLOAD, v: 99 },
      privateKey,
    );
    const mgr = await loadManager();
    const result = await mgr.verifyLicense(token);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("UNSUPPORTED_VERSION");
  });

  it("rejette un tier inconnu", async () => {
    const token = await buildSignedToken(
      { ...VALID_PAYLOAD, tier: "ultra-mega" },
      privateKey,
    );
    const mgr = await loadManager();
    const result = await mgr.verifyLicense(token);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("UNKNOWN_TIER");
  });

  it("rejette un donorId révoqué", async () => {
    mockState.revoked = new Set(["abc-123"]);
    const token = await buildSignedToken(VALID_PAYLOAD, privateKey);

    const mgr = await loadManager();
    const result = await mgr.verifyLicense(token);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("REVOKED");
    expect(result.donorId).toBe("abc-123");
  });

  it("rejette si la clé publique n'est pas configurée", async () => {
    mockState.publicKeyHex = "__NOT_CONFIGURED__";
    const token = await buildSignedToken(VALID_PAYLOAD, privateKey);

    const mgr = await loadManager();
    const result = await mgr.verifyLicense(token);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("PUBLIC_KEY_NOT_CONFIGURED");
  });
});

describe("licenseManager.meetsTier", () => {
  it("free ne satisfait pas pro", async () => {
    const mgr = await loadManager();
    expect(mgr.meetsTier("free", "pro")).toBe(false);
  });

  it("pro satisfait pro", async () => {
    const mgr = await loadManager();
    expect(mgr.meetsTier("pro", "pro")).toBe(true);
  });

  it("pro satisfait free", async () => {
    const mgr = await loadManager();
    expect(mgr.meetsTier("pro", "free")).toBe(true);
  });

  it("dev satisfait pro", async () => {
    const mgr = await loadManager();
    expect(mgr.meetsTier("dev", "pro")).toBe(true);
  });

  it("dev satisfait dev", async () => {
    const mgr = await loadManager();
    expect(mgr.meetsTier("dev", "dev")).toBe(true);
  });

  it("tier inconnu retourne false", async () => {
    const mgr = await loadManager();
    expect(mgr.meetsTier("unknown", "pro")).toBe(false);
  });
});

describe("licenseManager.getDefaultTier", () => {
  it("retourne free", async () => {
    const mgr = await loadManager();
    expect(mgr.getDefaultTier()).toBe("free");
  });
});
