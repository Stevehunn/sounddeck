# ValoGamble game server

This is a standalone Cloudflare Worker for ValoGamble rooms. It is intentionally
separate from the SoundDeck account and licensing API in `server/`.

Each room code maps to one Durable Object. The host publishes the game snapshot;
client actions are relayed to the host, which remains responsible for validating
and applying game rules. Room membership, the ten-player limit, host-only
publishing, and the room lifecycle are enforced by the Durable Object.

## Local development

```sh
npm install
npm test
npm run dev
```

The local API provides:

- `GET /health`
- `POST /rooms` with `{ "name": "Host" }` to create a room
- `POST /rooms/:code/join` with `{ "name": "Player" }` to join
- `GET /rooms/:code/connect?ticket=...` with a WebSocket upgrade to connect

Create and join responses contain a one-use `ticket` as well as a public
`playerId`. Keep the ticket private; it authorizes the corresponding WebSocket
connection. WebSocket clients send `{ "type": "publish", "update": ... }` as
the host or `{ "type": "action", "action": ... }` as a client. The event shapes
match ValoGamble's existing multiplayer room and action events.

Deploy with `npm run deploy` from this directory. Wrangler creates the
`valogamble-game` Worker and its Durable Object namespace. No SoundDeck D1
database or secrets are used. The deployed Worker is available at
`https://valogamble-game.sounddeck.workers.dev`. A custom domain such as
`game.sounddeck.stream` can be attached separately after its DNS configuration.

The ValoGamble desktop client can use this service by selecting **Internet
(Cloudflare)** in the multiplayer lobby. Its default endpoint is the Worker URL
above; override it in development with
`VALOGAMBLE_GAME_SERVER_URL`, for example `http://127.0.0.1:8788` for local
Worker testing. The desktop client keeps LAN hosting available as a separate
transport.
