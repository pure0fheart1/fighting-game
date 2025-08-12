# Browser Brawl

A simple browser-based 2D fighting game rendered on an HTML5 Canvas. Local multiplayer on one keyboard, with optional touch controls for mobile.

## Run locally

Prerequisite: Node.js 18+

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Controls

- Player 1 (Red):
  - Move: A / D
  - Jump: W
  - Block: S
  - Attack: Space
- Player 2 (Blue):
  - Move: ← / →
  - Jump: ↑
  - Block: ↓
  - Attack: Enter
- Global:
  - Pause/Resume: Esc
  - Mute: M

Touch devices show on-screen controls automatically.

## Deploy

This repo includes a `Dockerfile` and a `cloudbuild.yaml` to deploy to Cloud Run.
- Local container run: `docker build -t browser-brawl . && docker run -p 8080:8080 browser-brawl`
- Cloud Run (via Cloud Build): configure `gcloud` and run the provided pipeline.
