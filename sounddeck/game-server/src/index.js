const ROOM_CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_BODY_BYTES = 1_048_576;
const ROOM_IDLE_TIMEOUT_MS = 4 * 60 * 60 * 1000;
const MAX_PLAYERS = 10;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function errorResponse(message, status) {
  return jsonResponse({ error: message }, status);
}

async function readJson(request, maxBytes = 4096) {
  const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
  if (declaredLength > maxBytes) return { error: "Request body is too large." };

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maxBytes) {
    return { error: "Request body is too large." };
  }

  try {
    return { value: JSON.parse(body) };
  } catch {
    return { error: "Request body must be valid JSON." };
  }
}

function makeRoomCode() {
  let code = "";
  const maxByte = Math.floor(256 / ROOM_CODE_CHARACTERS.length) * ROOM_CODE_CHARACTERS.length;
  const bytes = new Uint8Array(16);

  while (code.length < 6) {
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte < maxByte) code += ROOM_CODE_CHARACTERS[byte % ROOM_CODE_CHARACTERS.length];
      if (code.length === 6) break;
    }
  }
  return code;
}

function makeSecret() {
  return crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
}

function normalizePlayerName(value) {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, 24) || "Player";
}

function isRoomUpdate(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      Array.isArray(value.players) &&
      value.players.length <= MAX_PLAYERS &&
      value.players.every(
        (player) =>
          player &&
          typeof player.id === "string" &&
          player.id.length > 0 &&
          player.id.length <= 128 &&
          typeof player.name === "string" &&
          player.name.length <= 24,
      ) &&
      typeof value.started === "boolean" &&
      (value.mode === null ||
        value.mode === "roulette" ||
        value.mode === "bingo" ||
        value.mode === "gears" ||
        value.mode === "cases") &&
      (value.roulette === null || typeof value.roulette === "object") &&
      (value.bingo === null || typeof value.bingo === "object") &&
      (value.cases === null || typeof value.cases === "object"),
  );
}

function isRoomAction(value) {
  if (!value || typeof value !== "object" || typeof value.mode !== "string") return false;

  if (value.mode === "roulette") {
    return ["spin", "confirm", "exclude", "replay"].includes(value.action);
  }
  if (value.mode === "bingo") {
    return (
      ["set-target", "spin", "assign", "replay"].includes(value.action) &&
      (value.agentId === undefined ||
        (typeof value.agentId === "string" && value.agentId.length <= 128))
    );
  }
  if (value.mode === "cases" && value.action && typeof value.action === "object") {
    const action = value.action;
    if (["spin", "advance", "replay"].includes(action.type)) return true;
    if (action.type !== "select-case" || !action.case || typeof action.case !== "object") {
      return false;
    }

    const selectedCase = action.case;
    const rarities = ["blue", "purple", "pink", "red", "gold"];
    const itemIds = new Set();
    const validItems =
      Array.isArray(selectedCase.items) &&
      selectedCase.items.length > 0 &&
      selectedCase.items.length <= 256 &&
      selectedCase.items.every((item) => {
        if (
          !item ||
          typeof item.agentId !== "string" ||
          !item.agentId ||
          item.agentId.length > 128 ||
          !rarities.includes(item.rarity) ||
          itemIds.has(item.agentId)
        ) {
          return false;
        }
        itemIds.add(item.agentId);
        return true;
      });
    const odds = selectedCase.odds;

    return (
      typeof selectedCase.id === "string" &&
      selectedCase.id.length > 0 &&
      selectedCase.id.length <= 128 &&
      typeof selectedCase.name === "string" &&
      selectedCase.name.trim().length > 0 &&
      selectedCase.name.length <= 100 &&
      validItems &&
      odds &&
      typeof odds === "object" &&
      rarities.every(
        (rarity) =>
          Number.isInteger(odds[rarity]) && odds[rarity] >= 0 && odds[rarity] <= 100,
      ) &&
      rarities.reduce((total, rarity) => total + odds[rarity], 0) === 100 &&
      rarities.every(
        (rarity) =>
          odds[rarity] === 0 ||
          selectedCase.items.some((item) => item.rarity === rarity),
      )
    );
  }
  return false;
}

function isPlayerNameRequest(value) {
  return value && typeof value === "object" && normalizePlayerName(value.name) !== null;
}

function roomCodeFromPath(pathname, suffix) {
  const match = pathname.match(new RegExp(`^/rooms/([A-HJ-NP-Z2-9]{6})/${suffix}$`));
  return match?.[1] ?? null;
}

async function forwardToRoom(env, roomId, code, path, request) {
  const id = env.GAME_ROOMS.idFromName(roomId);
  const stub = env.GAME_ROOMS.get(id);
  const url = new URL(request.url);
  url.pathname = path;
  const forwardedRequest = new Request(url, request);
  forwardedRequest.headers.set("X-Room-Code", code);
  return stub.fetch(forwardedRequest);
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const { method } = request;

    if (method === "GET" && pathname === "/health") {
      return jsonResponse({ ok: true, service: "valogamble-game" });
    }

    const registry = env.GAME_REGISTRY.get(env.GAME_REGISTRY.idFromName("global"));
    return registry.fetch(request);
  },
};

export class RoomRegistry {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.queue = Promise.resolve();
  }

  enqueue(operation) {
    const result = this.queue.then(operation);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  fetch(request) {
    return this.enqueue(() => this.route(request));
  }

  async route(request) {
    const { pathname } = new URL(request.url);
    if (request.method === "POST" && pathname === "/rooms") {
      const parsed = await readJson(request);
      if (parsed.error) return errorResponse(parsed.error, 400);
      if (!isPlayerNameRequest(parsed.value)) {
        return errorResponse("A player name is required.", 400);
      }
      return this.createRoom(normalizePlayerName(parsed.value.name));
    }

    const joinCode = request.method === "POST" ? roomCodeFromPath(pathname, "join") : null;
    if (joinCode) {
      const parsed = await readJson(request);
      if (parsed.error) return errorResponse(parsed.error, 400);
      if (!isPlayerNameRequest(parsed.value)) {
        return errorResponse("A player name is required.", 400);
      }
      const forwarded = new Request("https://room.internal/internal/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: normalizePlayerName(parsed.value.name) }),
      });
      return this.forward(joinCode, "/internal/join", forwarded);
    }

    const connectCode = request.method === "GET" ? roomCodeFromPath(pathname, "connect") : null;
    if (connectCode) {
      if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
        return errorResponse("A WebSocket connection is required.", 426);
      }
      const ticket = new URL(request.url).searchParams.get("ticket");
      if (!ticket || ticket.length > 128) return errorResponse("Invalid connection ticket.", 401);
      return this.forward(connectCode, "/internal/connect", request);
    }

    const refreshCode = request.method === "POST" ? roomCodeFromPath(pathname, "refresh") : null;
    if (refreshCode) return this.refreshRoomCode(refreshCode, request);

    return errorResponse("Not found.", 404);
  }

  async createRoom(name) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = makeRoomCode();
      if (await this.state.storage.get(`room:${code}`)) continue;
      const roomId = crypto.randomUUID();
      const request = new Request("https://room.internal/internal/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, roomId }),
      });
      const response = await forwardToRoom(this.env, roomId, code, "/internal/create", request);
      if (response.status === 409) continue;
      if (!response.ok) return response;
      await this.state.storage.put(`room:${code}`, roomId);
      return response;
    }
    return errorResponse("Could not allocate a room. Please try again.", 503);
  }

  async forward(code, path, request) {
    const roomId = (await this.state.storage.get(`room:${code}`)) ?? code;
    return forwardToRoom(this.env, roomId, code, path, request);
  }

  async refreshRoomCode(currentCode, request) {
    const authorization = request.headers.get("Authorization");
    if (!authorization || authorization.length > 256) {
      return errorResponse("Only the host can refresh this room code.", 403);
    }

    const roomId = (await this.state.storage.get(`room:${currentCode}`)) ?? currentCode;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const newCode = makeRoomCode();
      if (newCode === currentCode || (await this.state.storage.get(`room:${newCode}`))) continue;
      const roomRequest = new Request("https://room.internal/internal/refresh-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
        },
        body: JSON.stringify({ code: newCode }),
      });
      const response = await forwardToRoom(
        this.env,
        roomId,
        currentCode,
        "/internal/refresh-code",
        roomRequest,
      );
      if (!response.ok) return response;
      await this.state.storage.put(`room:${newCode}`, roomId);
      if (await this.state.storage.get(`room:${currentCode}`)) {
        await this.state.storage.delete(`room:${currentCode}`);
      }
      return response;
    }
    return errorResponse("Could not allocate a new room code. Please try again.", 503);
  }
}

export class GameRoom {
  constructor(state) {
    this.state = state;
    this.queue = Promise.resolve();
  }

  enqueue(operation) {
    const result = this.queue.then(operation);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (request.method === "POST" && pathname === "/internal/create") {
      return this.enqueue(() => this.createRoom(request));
    }
    if (request.method === "POST" && pathname === "/internal/join") {
      return this.enqueue(() => this.joinRoom(request));
    }
    if (request.method === "GET" && pathname === "/internal/connect") {
      return this.enqueue(() => this.connect(request));
    }
    if (request.method === "POST" && pathname === "/internal/refresh-code") {
      return this.enqueue(() => this.refreshCode(request));
    }
    return errorResponse("Not found.", 404);
  }

  async createRoom(request) {
    const current = await this.state.storage.get("room");
    if (current) return errorResponse("Room code already in use.", 409);

    const { code, name, roomId } = await request.json();
    const playerId = crypto.randomUUID();
    const ticket = makeSecret();
    const hostToken = makeSecret();
    const room = {
      code,
      roomId: typeof roomId === "string" ? roomId : code,
      hostId: playerId,
      hostToken,
      players: [{ id: playerId, name }],
      update: {
        started: false,
        mode: null,
        roulette: null,
        bingo: null,
        cases: null,
      },
    };

    await this.state.storage.put("room", room);
    await this.state.storage.put("tickets", { [playerId]: ticket });
    await this.refreshAlarm();
    return jsonResponse({ code, playerId, ticket, hostToken }, 201);
  }

  async joinRoom(request) {
    const room = await this.state.storage.get("room");
    if (!room || request.headers.get("X-Room-Code") !== room.code) return errorResponse("Room not found.", 404);
    const { name } = await request.json();
    if (room.update.started) return errorResponse("This game has already started.", 409);
    if (room.players.length >= MAX_PLAYERS) {
      return errorResponse("This room already has 10 players.", 409);
    }

    const playerId = crypto.randomUUID();
    const ticket = makeSecret();
    room.players.push({ id: playerId, name });
    const tickets = (await this.state.storage.get("tickets")) ?? {};
    tickets[playerId] = ticket;
    await this.state.storage.put({ room, tickets });
    await this.broadcastRoom(room);
    await this.refreshAlarm();
    return jsonResponse({ playerId, ticket }, 201);
  }

  async connect(request) {
    const room = await this.state.storage.get("room");
    if (!room || request.headers.get("X-Room-Code") !== room.code) return errorResponse("Room not found.", 404);
    const ticket = new URL(request.url).searchParams.get("ticket");
    const tickets = (await this.state.storage.get("tickets")) ?? {};
    const player = room.players.find((candidate) => tickets[candidate.id] === ticket);
    if (!player) return errorResponse("Invalid or expired connection ticket.", 401);

    delete tickets[player.id];
    await this.state.storage.put("tickets", tickets);

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const role = player.id === room.hostId ? "host" : "client";
    server.serializeAttachment({ playerId: player.id, role });
    this.state.acceptWebSocket(server);
    server.send(JSON.stringify(this.roomEvent(room, player.id, role)));
    await this.refreshAlarm();
    return new Response(null, { status: 101, webSocket: client });
  }

  async refreshCode(request) {
    const room = await this.state.storage.get("room");
    if (!room || request.headers.get("X-Room-Code") !== room.code) {
      return errorResponse("Room not found.", 404);
    }
    if (!room.hostToken || request.headers.get("Authorization") !== `Bearer ${room.hostToken}`) {
      return errorResponse("Only the host can refresh this room code.", 403);
    }
    if (room.update.started) return errorResponse("The room code can only be refreshed before the game starts.", 409);
    if (!this.findHostSocket()) return errorResponse("The host is not connected.", 409);

    const { code } = await request.json();
    if (typeof code !== "string" || !/^[A-HJ-NP-Z2-9]{6}$/.test(code) || code === room.code) {
      return errorResponse("A different valid room code is required.", 400);
    }

    room.code = code;
    await this.state.storage.put("room", room);
    await this.broadcastRoom(room);
    await this.refreshAlarm();
    return jsonResponse({ code });
  }

  async webSocketMessage(socket, message) {
    return this.enqueue(async () => {
      if (typeof message !== "string" || new TextEncoder().encode(message).byteLength > MAX_BODY_BYTES) {
        this.sendError(socket, "Invalid or oversized message.");
        return;
      }

      let payload;
      try {
        payload = JSON.parse(message);
      } catch {
        this.sendError(socket, "Message must be valid JSON.");
        return;
      }

      const attachment = socket.deserializeAttachment();
      const room = await this.state.storage.get("room");
      if (!room || !attachment || !room.players.some(({ id }) => id === attachment.playerId)) {
        this.sendError(socket, "This player is no longer in the room.");
        socket.close(1008, "Room is no longer available.");
        return;
      }

      if (attachment.role === "host" && payload?.type === "publish") {
        if (!isRoomUpdate(payload.update)) {
          this.sendError(socket, "The game state is invalid.");
          return;
        }
        room.update = {
          started: payload.update.started,
          mode: payload.update.mode,
          roulette: payload.update.roulette,
          bingo: payload.update.bingo,
          cases: payload.update.cases,
        };
        await this.state.storage.put("room", room);
        await this.broadcastRoom(room);
        await this.refreshAlarm();
        return;
      }

      if (attachment.role === "client" && payload?.type === "action" && isRoomAction(payload.action)) {
        const hostSocket = this.findHostSocket();
        if (!hostSocket) {
          this.sendError(socket, "The host is not connected.");
          return;
        }
        hostSocket.send(
          JSON.stringify({
            type: "action",
            playerId: attachment.playerId,
            action: payload.action,
            requestId: crypto.randomUUID(),
          }),
        );
        await this.refreshAlarm();
        return;
      }

      this.sendError(socket, "This message is not allowed.");
    });
  }

  async webSocketClose(socket) {
    return this.enqueue(() => this.removePlayer(socket));
  }

  async webSocketError(socket) {
    return this.enqueue(() => this.removePlayer(socket));
  }

  async removePlayer(socket) {
    const attachment = socket.deserializeAttachment();
    if (!attachment) return;
    const room = await this.state.storage.get("room");
    if (!room) return;

    if (attachment.playerId === room.hostId) {
      for (const peer of this.state.getWebSockets()) {
        if (peer !== socket) {
          this.sendClosed(peer);
          peer.close(1000, "The host closed the room.");
        }
      }
      await this.deleteRoom();
      return;
    }

    room.players = room.players.filter(({ id }) => id !== attachment.playerId);
    const tickets = (await this.state.storage.get("tickets")) ?? {};
    delete tickets[attachment.playerId];
    await this.state.storage.put({ room, tickets });
    await this.broadcastRoom(room);
  }

  async broadcastRoom(room) {
    for (const socket of this.state.getWebSockets()) {
      const attachment = socket.deserializeAttachment();
      if (!attachment) continue;
      try {
        socket.send(JSON.stringify(this.roomEvent(room, attachment.playerId, attachment.role)));
      } catch (error) {
        console.error("Could not send room update:", error);
        socket.close(1011, "Could not send room update.");
      }
    }
  }

  roomEvent(room, playerId, role) {
    return {
      type: "room",
      room: {
        code: room.code,
        playerId,
        role,
        players: room.players,
        ...room.update,
      },
    };
  }

  findHostSocket() {
    return this.state.getWebSockets().find((socket) => {
      const attachment = socket.deserializeAttachment();
      return attachment?.role === "host";
    });
  }

  sendError(socket, message) {
    try {
      socket.send(JSON.stringify({ type: "error", message }));
    } catch (error) {
      console.error("Could not send room error:", error);
      socket.close(1011, "Could not send error.");
    }
  }

  sendClosed(socket) {
    try {
      socket.send(JSON.stringify({ type: "closed", message: "The host closed the room." }));
    } catch (error) {
      console.error("Could not notify room member:", error);
    }
  }

  async refreshAlarm() {
    await this.state.storage.setAlarm(Date.now() + ROOM_IDLE_TIMEOUT_MS);
  }

  async alarm() {
    for (const socket of this.state.getWebSockets()) {
      this.sendClosed(socket);
      socket.close(1000, "This room expired.");
    }
    await this.deleteRoom();
  }

  async deleteRoom() {
    await this.state.storage.deleteAlarm();
    await this.state.storage.deleteAll();
  }
}

export { isRoomAction, isRoomUpdate, makeRoomCode, normalizePlayerName };
