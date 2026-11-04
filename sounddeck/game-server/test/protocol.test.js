import test from "node:test";
import assert from "node:assert/strict";
import { isRoomAction, isRoomUpdate, makeRoomCode, normalizePlayerName } from "../src/index.js";

test("room codes use six unambiguous characters", () => {
  const code = makeRoomCode();
  assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);
});

test("player names are trimmed and capped", () => {
  assert.equal(normalizePlayerName("  Steve  "), "Steve");
  assert.equal(normalizePlayerName("x".repeat(30)).length, 24);
  assert.equal(normalizePlayerName(" "), "Player");
  assert.equal(normalizePlayerName(null), null);
});

test("room updates accept the shared lobby snapshot shape", () => {
  assert.equal(
    isRoomUpdate({
      players: [{ id: "host", name: "Host" }],
      started: false,
      mode: null,
      roulette: null,
      bingo: null,
      cases: null,
    }),
    true,
  );
  assert.equal(
    isRoomUpdate({
      players: Array.from({ length: 11 }, (_, index) => ({ id: `${index}`, name: "Player" })),
      started: false,
      mode: null,
      roulette: null,
      bingo: null,
      cases: null,
    }),
    false,
  );
});

test("room actions reject unsupported and malformed requests", () => {
  assert.equal(isRoomAction({ mode: "roulette", action: "spin" }), true);
  assert.equal(isRoomAction({ mode: "roulette", action: "delete-room" }), false);
  assert.equal(isRoomAction({ mode: "bingo", action: "set-target", agentId: "jett" }), true);
  assert.equal(isRoomAction({ mode: "bingo", action: "set-target", agentId: {} }), false);
  assert.equal(isRoomAction({ mode: "cases", action: { type: "spin" } }), true);
  assert.equal(
    isRoomAction({
      mode: "cases",
      action: {
        type: "select-case",
        case: {
          id: "custom-case",
          name: "Custom case",
          items: [{ agentId: "jett", rarity: "blue" }, { agentId: "omen", rarity: "gold" }],
          odds: { blue: 50, purple: 0, pink: 0, red: 0, gold: 50 },
        },
      },
    }),
    true,
  );
  assert.equal(
    isRoomAction({
      mode: "cases",
      action: {
        type: "select-case",
        case: {
          id: "custom-case",
          name: "Custom case",
          items: [{ agentId: "jett", rarity: "blue" }],
          odds: { blue: 50, purple: 0, pink: 0, red: 0, gold: 50 },
        },
      },
    }),
    false,
  );
  assert.equal(isRoomAction({ mode: "unknown", action: "spin" }), false);
});
