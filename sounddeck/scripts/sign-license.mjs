// scripts/sign-license.mjs
// Usage : node scripts/sign-license.mjs --email user@example.com [--name "Steve"] [--amount 10]
//         node scripts/sign-license.mjs --dev   (licence de développement)
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

const KEYS_DIR = path.join(os.homedir(), ".sounddeck", "keys");
const PRIVATE_PATH = path.join(KEYS_DIR, "private.key");
const DONORS_PATH = path.join(os.homedir(), ".sounddeck", "donors.json");

function hexToBytes(hex) {
  return new Uint8Array(Buffer.from(hex, "hex"));
}

function b64url(bytes) {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = process.argv[i + 1];
      if (value && !value.startsWith("--")) {
        args[key] = value;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

function loadDonors() {
  if (!fs.existsSync(DONORS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(DONORS_PATH, "utf-8"));
  } catch (e) {
    return {};
  }
}

function saveDonors(donors) {
  fs.mkdirSync(path.dirname(DONORS_PATH), { recursive: true });
  fs.writeFileSync(DONORS_PATH, JSON.stringify(donors, null, 2));
}

async function main() {
  const args = parseArgs();

  // ⚠️ On accepte : --email (donateur), --donorId (ré-émission), OU --dev (dev)
  if (args.help || (!args.email && !args.donorId && !args.dev)) {
    console.log(`
Usage :
  node scripts/sign-license.mjs --email user@example.com [options]

Options :
  --email <email>       Email du donateur
  --donorId <uuid>      Pour ré-émettre une licence existante
  --name <name>         Nom affiché (optionnel)
  --amount <number>     Montant du don en € (optionnel)
  --dev                 Mode développement (licence dev, pas de donateur)
  --tier <pro|dev>      Niveau de licence (défaut: pro)
  --help                Affiche cette aide

Exemples :
  node scripts/sign-license.mjs --email steve@x.com --name "Steve" --amount 10
  node scripts/sign-license.mjs --donorId abc-123          # ré-émission
  node scripts/sign-license.mjs --dev                      # licence de dev
`);
    process.exit(0);
  }

  if (!fs.existsSync(PRIVATE_PATH)) {
    console.error("❌ Clé privée introuvable :", PRIVATE_PATH);
    console.error("   Lance d'abord : node scripts/generate-keypair.mjs");
    process.exit(1);
  }

  const privateKey = hexToBytes(fs.readFileSync(PRIVATE_PATH, "utf-8").trim());

  const donors = loadDonors();
  let donorId = args.donorId;
  let donorName = args.name || null;
  let donorEmail = args.email || null;
  let amount = args.amount ? parseFloat(args.amount) : null;

  // ─── Cas 1 : ré-émission d'une licence existante ──────────────────
  if (donorId) {
    const existing = donors[donorId];
    if (!existing) {
      console.error("❌ donorId introuvable dans donors.json :", donorId);
      process.exit(1);
    }
    donorName = donorName || existing.name;
    donorEmail = donorEmail || existing.email;
    amount = amount ?? existing.amount;

    // ─── Cas 2 : nouveau donateur OU mode dev ─────────────────────────
  } else {
    if (!donorEmail && !args.dev) {
      console.error(
        "❌ --email requis pour un nouveau donateur (ou utilise --dev)",
      );
      process.exit(1);
    }
    // En mode dev sans email, on génère un uuid quand même
    donorId = crypto.randomUUID();
  }

  const tier = args.dev ? "dev" : args.tier || "pro";

  // ─── Payload (lisible en clair, ce n'est pas un secret) ───────────
  const payload = {
    v: 1,
    tier,
    donorId,
    donorName,
    issuedAt: Math.floor(Date.now() / 1000),
    neverExpires: true,
  };

  const payloadJson = JSON.stringify(payload);
  const payloadBytes = new TextEncoder().encode(payloadJson);
  const signature = await ed.signAsync(payloadBytes, privateKey);

  const token = `SDCK1.${b64url(payloadBytes)}.${b64url(signature)}`;

  // ─── Enregistrement dans le registre local ────────────────────────
  donors[donorId] = {
    donorId,
    name: donorName,
    email: donorEmail,
    amount,
    currency: "EUR",
    tier,
    issuedAt: payload.issuedAt,
    revoked: false,
    dev: !!args.dev,
  };
  saveDonors(donors);

  // ─── Écriture dans un fichier pour éviter les problèmes de wrap ────
  const LAST_LICENSE_PATH = path.join(
    os.homedir(),
    ".sounddeck",
    "last-license.txt",
  );
  fs.mkdirSync(path.dirname(LAST_LICENSE_PATH), { recursive: true });
  fs.writeFileSync(LAST_LICENSE_PATH, token, "utf-8");

  // ─── Affichage ────────────────────────────────────────────────────
  console.log("\n✅ Licence générée !\n");
  console.log("👤 Donateur :", donorEmail || "(mode dev — pas de compte)");
  console.log("🆔 donorId  :", donorId);
  console.log("🏷️  tier     :", tier);
  if (amount != null) {
    console.log("💰 Montant  :", amount, "€");
  }
  console.log("\n📋 Token (copié ici) :", LAST_LICENSE_PATH);
  console.log("\n💡 Teste directement avec :");
  console.log("   node scripts/verify-license.mjs --last\n");
  console.log("📁 Registre mis à jour :", DONORS_PATH);
  console.log(
    "💡 Pour révoquer plus tard : édite donors.json et mets revoked: true\n",
  );
}

main().catch((e) => {
  console.error("❌ Erreur:", e.message);
  console.error(e.stack);
  process.exit(1);
});
